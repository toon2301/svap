from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError
from importlib import import_module
from threading import Event
from unittest.mock import patch

import pytest
from django.apps import apps as django_apps
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import close_old_connections, connection, transaction
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import (
    Notification,
    NotificationType,
    OfferedSkill,
    Review,
    SkillRequest,
    SkillRequestStatus,
    SkillRequestTermination,
    SkillRequestTerminationReason,
    UserBlock,
)
from accounts.services.skill_request_transitions import (
    lock_skill_request_for_transition,
)
from accounts.services.user_blocks import (
    BlockedUserInteractionError,
    create_user_block,
)

User = get_user_model()


class SkillRequestBlockingApiTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.requester = self._create_user("skill-block-requester")
        self.recipient = self._create_user("skill-block-recipient")
        self.offer = self._create_offer("Primary offer")

    def tearDown(self):
        cache.clear()

    @staticmethod
    def _create_user(username: str):
        return User.objects.create_user(
            username=username,
            email=f"{username}@example.com",
            password="StrongPass123",
            is_active=True,
            is_public=True,
            is_verified=True,
        )

    def _create_offer(self, subcategory: str) -> OfferedSkill:
        return OfferedSkill.objects.create(
            user=self.recipient,
            category="Services",
            subcategory=subcategory,
            description="Blocking regression offer",
            is_hidden=False,
        )

    def _create_request(
        self,
        request_status: str,
        *,
        offer: OfferedSkill | None = None,
    ) -> SkillRequest:
        return SkillRequest.objects.create(
            requester=self.requester,
            recipient=self.recipient,
            offer=offer or self.offer,
            status=request_status,
        )

    def test_block_cancels_pending_request_and_unblock_does_not_restore_it(self):
        skill_request = self._create_request(SkillRequestStatus.PENDING)
        self.client.force_authenticate(user=self.requester)
        pending_url = reverse("accounts:skill_requests")
        warmed = self.client.get(pending_url, {"status": "pending"})
        self.assertEqual(len(warmed.data["sent"]), 1)

        with self.captureOnCommitCallbacks(execute=True):
            blocked = self.client.post(
                reverse("accounts:user_block_detail", args=[self.recipient.id])
            )
        self.assertEqual(blocked.status_code, status.HTTP_201_CREATED)

        skill_request.refresh_from_db()
        self.assertEqual(skill_request.status, SkillRequestStatus.CANCELLED)
        refreshed = self.client.get(pending_url, {"status": "pending"})
        self.assertEqual(refreshed.data["sent"], [])

        self.client.force_authenticate(user=self.recipient)
        accepted = self.client.patch(
            reverse("accounts:skill_request_detail", args=[skill_request.id]),
            {"action": "accept"},
            format="json",
        )
        self.assertEqual(accepted.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(
            Notification.objects.filter(
                skill_request=skill_request,
                type=NotificationType.SKILL_REQUEST_ACCEPTED,
            ).exists()
        )

        self.client.force_authenticate(user=self.requester)
        unblocked = self.client.delete(
            reverse("accounts:user_block_detail", args=[self.recipient.id])
        )
        self.assertEqual(unblocked.status_code, status.HTTP_200_OK)
        skill_request.refresh_from_db()
        self.assertEqual(skill_request.status, SkillRequestStatus.CANCELLED)

    def test_block_terminates_active_requests_without_notification(self):
        accepted = self._create_request(SkillRequestStatus.ACCEPTED)
        completion_offer = self._create_offer("Completion offer")
        completion_requested = self._create_request(
            SkillRequestStatus.COMPLETION_REQUESTED,
            offer=completion_offer,
        )
        self.client.force_authenticate(user=self.recipient)

        response = self.client.post(
            reverse("accounts:user_block_detail", args=[self.requester.id])
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        for obj in (accepted, completion_requested):
            obj.refresh_from_db()
            self.assertEqual(obj.status, SkillRequestStatus.TERMINATED)
            termination = SkillRequestTermination.objects.get(skill_request=obj)
            self.assertEqual(
                termination.reason,
                SkillRequestTerminationReason.INTERACTION_UNAVAILABLE,
            )
            self.assertEqual(termination.terminated_by_id, self.recipient.id)

        self.assertFalse(
            Notification.objects.filter(
                type=NotificationType.SKILL_REQUEST_TERMINATED
            ).exists()
        )

        history = self.client.get(
            reverse("accounts:skill_requests"),
            {"status": "terminated"},
        )
        self.assertEqual(history.status_code, status.HTTP_200_OK)
        serialized = {item["id"]: item for item in history.data["received"]}
        self.assertIsNone(serialized[accepted.id]["termination"]["terminated_by"])
        self.assertEqual(
            serialized[accepted.id]["termination"]["terminated_by_display_name"],
            "",
        )

    def test_blocked_pair_cannot_change_shared_request_state(self):
        pending = self._create_request(SkillRequestStatus.PENDING)
        accepted_offer = self._create_offer("Accepted offer")
        accepted = self._create_request(
            SkillRequestStatus.ACCEPTED,
            offer=accepted_offer,
        )
        completion_offer = self._create_offer("Awaiting confirmation")
        completion = self._create_request(
            SkillRequestStatus.COMPLETION_REQUESTED,
            offer=completion_offer,
        )
        UserBlock.objects.create(blocker=self.requester, blocked_user=self.recipient)

        detail_url = reverse("accounts:skill_request_detail", args=[pending.id])
        self.client.force_authenticate(user=self.recipient)
        for action in ("accept", "reject"):
            response = self.client.patch(detail_url, {"action": action}, format="json")
            self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        completion_response = self.client.post(
            reverse("accounts:skill_request_request_completion", args=[accepted.id]),
            {},
            format="json",
        )
        self.assertEqual(completion_response.status_code, status.HTTP_404_NOT_FOUND)

        self.client.force_authenticate(user=self.requester)
        cancel = self.client.patch(detail_url, {"action": "cancel"}, format="json")
        confirm = self.client.post(
            reverse("accounts:skill_request_confirm_completion", args=[completion.id]),
            {},
            format="json",
        )
        terminate = self.client.post(
            reverse("accounts:skill_request_terminate", args=[accepted.id]),
            {"reason": "other", "description": "Must not be stored"},
            format="json",
        )
        for response in (cancel, confirm, terminate):
            self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        pending.refresh_from_db()
        accepted.refresh_from_db()
        completion.refresh_from_db()
        self.assertEqual(pending.status, SkillRequestStatus.PENDING)
        self.assertEqual(accepted.status, SkillRequestStatus.ACCEPTED)
        self.assertEqual(completion.status, SkillRequestStatus.COMPLETION_REQUESTED)
        self.assertFalse(SkillRequestTermination.objects.exists())
        self.assertFalse(Notification.objects.exists())

    def test_local_hide_remains_available_for_blocked_history(self):
        cancelled = self._create_request(SkillRequestStatus.CANCELLED)
        UserBlock.objects.create(blocker=self.recipient, blocked_user=self.requester)
        self.client.force_authenticate(user=self.requester)

        response = self.client.patch(
            reverse("accounts:skill_request_detail", args=[cancelled.id]),
            {"action": "hide"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        cancelled.refresh_from_db()
        self.assertTrue(cancelled.hidden_by_requester)

    def test_completed_blocked_exchange_is_not_reviewable(self):
        completed = self._create_request(SkillRequestStatus.COMPLETED)
        UserBlock.objects.create(blocker=self.recipient, blocked_user=self.requester)
        self.client.force_authenticate(user=self.requester)

        response = self.client.get(
            reverse("accounts:skill_requests"),
            {"status": "completed"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item = next(row for row in response.data["sent"] if row["id"] == completed.id)
        self.assertFalse(item["offer_summary"]["can_review"])

    def test_block_terminated_exchange_stays_not_reviewable_after_unblock(self):
        accepted = self._create_request(SkillRequestStatus.ACCEPTED)
        self.client.force_authenticate(user=self.recipient)
        block_response = self.client.post(
            reverse("accounts:user_block_detail", args=[self.requester.id])
        )
        self.assertEqual(block_response.status_code, status.HTTP_201_CREATED)

        accepted.refresh_from_db()
        self.assertEqual(accepted.status, SkillRequestStatus.TERMINATED)
        termination = SkillRequestTermination.objects.get(skill_request=accepted)
        self.assertEqual(
            termination.reason, SkillRequestTerminationReason.INTERACTION_UNAVAILABLE
        )

        unblock_response = self.client.delete(
            reverse("accounts:user_block_detail", args=[self.requester.id])
        )
        self.assertEqual(unblock_response.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(user=self.requester)
        list_response = self.client.get(
            reverse("accounts:skill_requests"), {"status": "terminated"}
        )
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        item = next(
            row for row in list_response.data["sent"] if row["id"] == accepted.id
        )
        self.assertFalse(item["offer_summary"]["can_review"])

        review_response = self.client.post(
            reverse("accounts:reviews_list", args=[self.offer.id]),
            {"rating": 5, "text": "Should not be allowed"},
            format="json",
        )
        self.assertEqual(review_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(
            Review.objects.filter(offer=self.offer, reviewer=self.requester).exists()
        )

    def test_non_block_termination_reason_remains_reviewable(self):
        legit_offer = self._create_offer("Legit termination offer")
        accepted = self._create_request(SkillRequestStatus.ACCEPTED, offer=legit_offer)
        self.client.force_authenticate(user=self.requester)

        terminate_response = self.client.post(
            reverse("accounts:skill_request_terminate", args=[accepted.id]),
            {"reason": SkillRequestTerminationReason.NO_RESPONSE},
            format="json",
        )
        self.assertEqual(terminate_response.status_code, status.HTTP_200_OK)
        accepted.refresh_from_db()
        self.assertEqual(accepted.status, SkillRequestStatus.TERMINATED)
        termination = SkillRequestTermination.objects.get(skill_request=accepted)
        self.assertEqual(
            termination.reason, SkillRequestTerminationReason.NO_RESPONSE
        )

        list_response = self.client.get(
            reverse("accounts:skill_requests"), {"status": "terminated"}
        )
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        item = next(
            row for row in list_response.data["sent"] if row["id"] == accepted.id
        )
        self.assertTrue(item["offer_summary"]["can_review"])

        review_response = self.client.post(
            reverse("accounts:reviews_list", args=[legit_offer.id]),
            {"rating": 4, "text": "Thanks anyway"},
            format="json",
        )
        self.assertEqual(review_response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            Review.objects.filter(offer=legit_offer, reviewer=self.requester).exists()
        )

    def test_internal_termination_reason_cannot_be_submitted_by_user(self):
        accepted = self._create_request(SkillRequestStatus.ACCEPTED)
        self.client.force_authenticate(user=self.requester)

        response = self.client.post(
            reverse("accounts:skill_request_terminate", args=[accepted.id]),
            {"reason": SkillRequestTerminationReason.INTERACTION_UNAVAILABLE},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        accepted.refresh_from_db()
        self.assertEqual(accepted.status, SkillRequestStatus.ACCEPTED)

    def test_reconciliation_migration_closes_legacy_blocked_requests(self):
        pending = self._create_request(SkillRequestStatus.PENDING)
        accepted = self._create_request(
            SkillRequestStatus.ACCEPTED,
            offer=self._create_offer("Legacy accepted offer"),
        )
        completion_requested = self._create_request(
            SkillRequestStatus.COMPLETION_REQUESTED,
            offer=self._create_offer("Legacy completion offer"),
        )
        UserBlock.objects.create(blocker=self.requester, blocked_user=self.recipient)

        migration = import_module(
            "accounts.migrations.0092_reconcile_blocked_skill_requests"
        )
        migration.reconcile_blocked_skill_requests(django_apps, None)

        pending.refresh_from_db()
        self.assertEqual(pending.status, SkillRequestStatus.CANCELLED)
        self.assertFalse(
            SkillRequestTermination.objects.filter(skill_request=pending).exists()
        )
        for obj in (accepted, completion_requested):
            obj.refresh_from_db()
            self.assertEqual(obj.status, SkillRequestStatus.TERMINATED)
            termination = SkillRequestTermination.objects.get(skill_request=obj)
            self.assertEqual(
                termination.reason,
                SkillRequestTerminationReason.INTERACTION_UNAVAILABLE,
            )
            self.assertEqual(termination.terminated_by_id, self.requester.id)


@pytest.mark.django_db(transaction=True)
class TestSkillRequestBlockConcurrency:
    def setup_method(self):
        cache.clear()
        self.requester = SkillRequestBlockingApiTests._create_user(
            "skill-concurrent-requester"
        )
        self.recipient = SkillRequestBlockingApiTests._create_user(
            "skill-concurrent-recipient"
        )
        self.offer = OfferedSkill.objects.create(
            user=self.recipient,
            category="Services",
            subcategory="Concurrent offer",
            description="Concurrency regression",
            is_hidden=False,
        )
        self.skill_request = SkillRequest.objects.create(
            requester=self.requester,
            recipient=self.recipient,
            offer=self.offer,
            status=SkillRequestStatus.PENDING,
        )

    def teardown_method(self):
        cache.clear()

    def test_block_serializes_with_acceptance(self):
        if not connection.features.has_select_for_update:
            pytest.skip("The configured database does not support row-level locks.")

        block_lock_held = Event()
        accept_lock_attempted = Event()
        release_block = Event()
        from accounts.services import user_blocks as user_blocks_service

        original_cleanup = user_blocks_service.remove_blocked_social_connections

        def hold_block_transaction(*, first_user_id: int, second_user_id: int):
            block_lock_held.set()
            if not release_block.wait(timeout=10):
                raise TimeoutError("Timed out waiting to release block transaction")
            return original_cleanup(
                first_user_id=first_user_id,
                second_user_id=second_user_id,
            )

        def signal_accept_lock(*, request_id: int, enforce_interaction: bool = True):
            accept_lock_attempted.set()
            return lock_skill_request_for_transition(
                request_id=request_id,
                enforce_interaction=enforce_interaction,
            )

        def block_user():
            close_old_connections()
            try:
                return create_user_block(
                    blocker=User.objects.get(pk=self.requester.pk),
                    blocked_user=User.objects.get(pk=self.recipient.pk),
                )
            finally:
                close_old_connections()

        def accept_request():
            close_old_connections()
            try:
                with transaction.atomic():
                    obj = signal_accept_lock(request_id=self.skill_request.pk)
                    obj.status = SkillRequestStatus.ACCEPTED
                    obj.save(update_fields=["status", "updated_at"])
            finally:
                close_old_connections()

        with (
            patch(
                "accounts.services.user_blocks.remove_blocked_social_connections",
                side_effect=hold_block_transaction,
            ),
            ThreadPoolExecutor(max_workers=2) as executor,
        ):
            block_future = executor.submit(block_user)
            assert block_lock_held.wait(timeout=5)
            accept_future = executor.submit(accept_request)
            assert accept_lock_attempted.wait(timeout=5)
            try:
                with pytest.raises(FutureTimeoutError):
                    accept_future.result(timeout=0.2)
            finally:
                release_block.set()

            block_future.result(timeout=10)
            with pytest.raises(BlockedUserInteractionError):
                accept_future.result(timeout=10)

        self.skill_request.refresh_from_db()
        assert self.skill_request.status == SkillRequestStatus.CANCELLED
        assert UserBlock.objects.filter(
            blocker=self.requester,
            blocked_user=self.recipient,
        ).exists()
