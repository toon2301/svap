"""Robustnosť Celery spracovania portfólio obrázkov (final-failure cleanup)."""

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase

from portfolio.image_processing import (
    PROCESSING_FAILED_REASON,
    mark_processing_failed,
)
from portfolio.models import PortfolioImage, PortfolioItem
from swaply.tasks.portfolio_images import process_portfolio_image

User = get_user_model()


class PortfolioImageTaskFailureTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="task-failure-owner",
            email="task-failure-owner@example.com",
            password="testpass123",
        )
        self.item = PortfolioItem.objects.create(
            owner=self.owner,
            title="Kitchen",
            category="Craft",
        )

    def _pending_image(self, **overrides):
        data = {
            "item": self.item,
            "status": PortfolioImage.Status.PENDING,
            "pending_key": f"uploads/portfolio/{self.item.id}/work.jpg",
        }
        data.update(overrides)
        return PortfolioImage.objects.create(**data)

    def test_mark_processing_failed_rejects_pending_and_deletes_staging(self):
        image = self._pending_image()

        with patch("portfolio.image_processing.delete_storage_keys") as delete_mock:
            mark_processing_failed(image.id)

        image.refresh_from_db()
        self.assertEqual(image.status, PortfolioImage.Status.REJECTED)
        self.assertEqual(image.rejected_reason, PROCESSING_FAILED_REASON)
        self.assertIsNotNone(image.processed_at)
        delete_mock.assert_called_once_with([image.pending_key])

    def test_mark_processing_failed_leaves_non_pending_untouched(self):
        image = self._pending_image(
            status=PortfolioImage.Status.APPROVED,
            approved_key=f"media/portfolio/{self.item.id}/x-large.webp",
        )

        with patch("portfolio.image_processing.delete_storage_keys") as delete_mock:
            mark_processing_failed(image.id)

        image.refresh_from_db()
        self.assertEqual(image.status, PortfolioImage.Status.APPROVED)
        delete_mock.assert_not_called()

    def test_mark_processing_failed_missing_image_is_noop(self):
        with patch("portfolio.image_processing.delete_storage_keys") as delete_mock:
            mark_processing_failed(999999)

        delete_mock.assert_not_called()

    def test_task_marks_image_failed_on_final_retry_attempt(self):
        image = self._pending_image()

        # Simuluj posledný pokus (initial beh + 5 retries): request.retries = 5.
        process_portfolio_image.push_request(retries=5)
        try:
            with (
                patch(
                    "swaply.tasks.portfolio_images.process_portfolio_image_record",
                    side_effect=RuntimeError("S3 down"),
                ),
                patch("portfolio.image_processing.delete_storage_keys") as delete_mock,
                self.assertRaises(Exception),
            ):
                process_portfolio_image.run(image.id)
        finally:
            process_portfolio_image.pop_request()

        image.refresh_from_db()
        self.assertEqual(image.status, PortfolioImage.Status.REJECTED)
        self.assertEqual(image.rejected_reason, PROCESSING_FAILED_REASON)
        delete_mock.assert_called_once_with([image.pending_key])

    def test_task_keeps_image_pending_on_non_final_attempt(self):
        image = self._pending_image()

        # Skorší pokus (retries < max) – obrázok ostáva PENDING pre ďalší retry.
        process_portfolio_image.push_request(retries=1)
        try:
            with (
                patch(
                    "swaply.tasks.portfolio_images.process_portfolio_image_record",
                    side_effect=RuntimeError("S3 down"),
                ),
                patch("portfolio.image_processing.delete_storage_keys") as delete_mock,
                self.assertRaises(Exception),
            ):
                process_portfolio_image.run(image.id)
        finally:
            process_portfolio_image.pop_request()

        image.refresh_from_db()
        self.assertEqual(image.status, PortfolioImage.Status.PENDING)
        delete_mock.assert_not_called()
