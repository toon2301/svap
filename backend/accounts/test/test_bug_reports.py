"""Phase 1 tests for technical bug reporting."""

from datetime import timedelta
from io import StringIO
from unittest.mock import patch

from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.account_deletion import anonymize_user
from accounts.admin.bug_reports import BugReportAdmin
from accounts.models import (
    BugReport,
    BugReportCategory,
    BugReportNotificationOutbox,
    BugReportPriority,
    BugReportStatus,
)
from accounts.services.bug_reports import purge_old_bug_reports
from accounts.tasks import (
    recover_pending_bug_report_notifications_task,
    send_bug_report_notification_task,
)

User = get_user_model()


def _create_user(suffix: str = "owner"):
    return User.objects.create_user(
        username=f"bug-{suffix}",
        email=f"bug-{suffix}@example.com",
        password="StrongPass123",
    )


def _payload(**overrides):
    payload = {
        "category": BugReportCategory.NOT_WORKING,
        "title": "Nefunguje odoslanie",
        "description": "Po kliknutí sa nič nestane.",
        "reproduction_steps": "Otvoriť formulár a kliknúť.",
        "source_screen": "/dashboard/settings",
        "device_type": "desktop",
        "locale": "sk",
        "app_version": "1.2.3",
        "browser": "Firefox 128",
    }
    payload.update(overrides)
    return payload


@override_settings(RATE_LIMITING_ENABLED=False)
class BugReportApiTests(APITestCase):
    def setUp(self):
        self.user = _create_user()
        self.url = reverse("accounts:bug_report_create")

    def test_authentication_is_required(self):
        response = self.client.post(self.url, _payload(), format="json")

        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )
        self.assertFalse(BugReport.objects.exists())

    def test_only_post_is_exposed(self):
        self.client.force_authenticate(user=self.user)

        for method in ("get", "put", "patch", "delete"):
            response = getattr(self.client, method)(self.url, {}, format="json")
            self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_create_owns_report_and_queues_notification_after_commit(self):
        self.client.force_authenticate(user=self.user)

        with patch(
            "accounts.tasks.send_bug_report_notification_task.delay"
        ) as enqueue:
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.post(self.url, _payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        report = BugReport.objects.get()
        self.assertEqual(report.reported_by, self.user)
        self.assertEqual(report.status, BugReportStatus.NEW)
        self.assertEqual(report.priority, BugReportPriority.NORMAL)
        self.assertEqual(
            set(response.data),
            {"reference", "status", "created_at"},
        )
        self.assertEqual(response.data["reference"], report.reference)
        self.assertTrue(
            BugReportNotificationOutbox.objects.filter(
                bug_report=report
            ).exists()
        )
        enqueue.assert_called_once_with(report_id=report.id)

    def test_workflow_and_unknown_fields_cannot_be_mass_assigned(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.url,
            _payload(status=BugReportStatus.CLOSED, priority="critical"),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(BugReport.objects.exists())

    def test_plain_text_is_sanitized_and_tag_only_required_value_is_rejected(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.url,
            _payload(
                title="<b>Názov</b>",
                description="<i>Popis</i>",
                browser="<b>Firefox</b>",
            ),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        report = BugReport.objects.get()
        self.assertEqual(report.title, "Názov")
        self.assertEqual(report.description, "Popis")
        self.assertEqual(report.browser, "Firefox")

        rejected = self.client.post(
            self.url,
            _payload(title="<div></div>"),
            format="json",
        )
        self.assertEqual(rejected.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_metadata_and_oversized_content_are_rejected(self):
        self.client.force_authenticate(user=self.user)

        invalid_payloads = (
            _payload(category="security"),
            _payload(locale="xx"),
            _payload(source_screen="settings?<script>"),
            _payload(title="x" * 121),
            _payload(description="x" * 2001),
        )
        for payload in invalid_payloads:
            response = self.client.post(self.url, payload, format="json")
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(BugReport.objects.exists())

    def test_duplicate_reports_are_allowed_as_independent_observations(self):
        self.client.force_authenticate(user=self.user)

        first = self.client.post(self.url, _payload(), format="json")
        second = self.client.post(self.url, _payload(), format="json")

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)
        self.assertEqual(BugReport.objects.count(), 2)
        self.assertNotEqual(first.data["reference"], second.data["reference"])

    def test_broker_failure_does_not_rollback_saved_report(self):
        self.client.force_authenticate(user=self.user)

        with patch(
            "accounts.tasks.send_bug_report_notification_task.delay",
            side_effect=RuntimeError("broker unavailable"),
        ):
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.post(self.url, _payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(BugReport.objects.count(), 1)
        self.assertTrue(BugReportNotificationOutbox.objects.exists())


class BugReportRateLimitTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = _create_user("limited")
        self.url = reverse("accounts:bug_report_create")
        self.client.force_authenticate(user=self.user)

    @override_settings(
        RATE_LIMITING_ENABLED=True,
        RATE_LIMIT_DISABLED=False,
        RATE_LIMIT_OVERRIDES={
            "bug_report": {
                "max_attempts": 2,
                "window_minutes": 60,
                "block_minutes": 60,
            }
        },
    )
    def test_dedicated_per_user_limit_blocks_third_report(self):
        first = self.client.post(self.url, _payload(), format="json")
        second = self.client.post(self.url, _payload(), format="json")
        blocked = self.client.post(self.url, _payload(), format="json")

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)
        self.assertEqual(blocked.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertEqual(BugReport.objects.count(), 2)


class BugReportNotificationTaskTests(APITestCase):
    def test_missing_report_is_ignored_without_retrying_or_sending_email(self):
        send_bug_report_notification_task.run(report_id=999999)

        self.assertEqual(len(mail.outbox), 0)

    @override_settings(
        BUG_REPORT_EMAIL="bugs@example.com",
        BUG_REPORT_ADMIN_ORIGIN="https://api.example.com",
        DEFAULT_FROM_EMAIL="no-reply@example.com",
    )
    def test_task_sends_minimal_email_and_is_idempotent_after_success(self):
        user = _create_user("email")
        report = BugReport.objects.create(
            reported_by=user,
            category=BugReportCategory.VISUAL,
            title="Sensitive authored title",
            description="Sensitive authored description",
        )

        send_bug_report_notification_task.run(report_id=report.id)
        send_bug_report_notification_task.run(report_id=report.id)

        report.refresh_from_db()
        self.assertIsNotNone(report.support_notified_at)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["bugs@example.com"])
        self.assertIn(report.reference, mail.outbox[0].body)
        self.assertIn(
            f"https://api.example.com/admin/accounts/bugreport/{report.id}/change/",
            mail.outbox[0].body,
        )
        self.assertNotIn(report.title, mail.outbox[0].body)
        self.assertNotIn(report.description, mail.outbox[0].body)
        self.assertNotIn(user.email, mail.outbox[0].body)

    @override_settings(
        BUG_REPORT_EMAIL="bugs@example.com",
        BUG_REPORT_ADMIN_ORIGIN="https://api.example.com",
        DEFAULT_FROM_EMAIL="no-reply@example.com",
    )
    def test_failed_send_releases_claim_and_preserves_retryable_intent(self):
        user = _create_user("email-failure")
        report = BugReport.objects.create(
            reported_by=user,
            category=BugReportCategory.OTHER,
            title="Email failure",
            description="Description",
        )
        intent = BugReportNotificationOutbox.objects.create(bug_report=report)

        with patch(
            "accounts.tasks.EmailMultiAlternatives.send",
            side_effect=RuntimeError("email unavailable"),
        ), self.assertRaises(Exception):
            send_bug_report_notification_task.run(report_id=report.id)

        report.refresh_from_db()
        intent.refresh_from_db()
        self.assertIsNone(report.support_notified_at)
        self.assertEqual(intent.attempt_count, 1)
        self.assertIsNotNone(intent.last_attempt_at)

    def test_existing_claim_prevents_overlapping_delivery(self):
        user = _create_user("email-claimed")
        claimed_at = timezone.now()
        report = BugReport.objects.create(
            reported_by=user,
            category=BugReportCategory.OTHER,
            title="Claimed report",
            description="Description",
            support_notified_at=claimed_at,
        )
        BugReportNotificationOutbox.objects.create(bug_report=report)

        send_bug_report_notification_task.run(report_id=report.id)

        self.assertEqual(len(mail.outbox), 0)
        report.refresh_from_db()
        self.assertEqual(report.support_notified_at, claimed_at)

    def test_recovery_requeues_only_unclaimed_durable_intents(self):
        user = _create_user("email-recovery")
        pending = BugReport.objects.create(
            reported_by=user,
            category=BugReportCategory.OTHER,
            title="Pending report",
            description="Description",
        )
        claimed = BugReport.objects.create(
            reported_by=user,
            category=BugReportCategory.OTHER,
            title="Claimed report",
            description="Description",
            support_notified_at=timezone.now(),
        )
        BugReportNotificationOutbox.objects.create(bug_report=pending)
        BugReportNotificationOutbox.objects.create(bug_report=claimed)

        with patch(
            "accounts.tasks.send_bug_report_notification_task.delay"
        ) as enqueue:
            recovered_count = recover_pending_bug_report_notifications_task.run()

        self.assertEqual(recovered_count, 1)
        enqueue.assert_called_once_with(report_id=pending.id)


class BugReportAdminTests(APITestCase):
    def test_completed_status_sets_retention_anchor_and_reopening_clears_it(self):
        user = _create_user('admin-status')
        report = BugReport.objects.create(
            reported_by=user,
            category=BugReportCategory.OTHER,
            title='Admin workflow',
            description='Description',
        )
        model_admin = BugReportAdmin(BugReport, AdminSite())

        report.status = BugReportStatus.RESOLVED
        model_admin.save_model(None, report, form=None, change=True)
        report.refresh_from_db()
        self.assertIsNotNone(report.resolved_at)

        report.status = BugReportStatus.IN_PROGRESS
        model_admin.save_model(None, report, form=None, change=True)
        report.refresh_from_db()
        self.assertIsNone(report.resolved_at)


class BugReportRetentionTests(APITestCase):
    def setUp(self):
        self.user = _create_user("retention")
        self.now = timezone.now()

    def _report(self, status_value, resolved_at):
        report = BugReport.objects.create(
            reported_by=self.user,
            category=BugReportCategory.OTHER,
            title=f"Report {status_value}",
            description="Description",
            status=status_value,
        )
        BugReport.objects.filter(pk=report.pk).update(resolved_at=resolved_at)
        report.refresh_from_db()
        return report

    def test_purge_only_removes_completed_reports_past_365_days(self):
        old = self.now - timedelta(days=366)
        recent = self.now - timedelta(days=364)
        resolved = self._report(BugReportStatus.RESOLVED, old)
        closed = self._report(BugReportStatus.CLOSED, old)
        active = self._report(BugReportStatus.IN_PROGRESS, old)
        recent_report = self._report(BugReportStatus.RESOLVED, recent)
        no_resolution_date = self._report(BugReportStatus.RESOLVED, None)

        self.assertEqual(purge_old_bug_reports(dry_run=True, now=self.now), 2)
        self.assertEqual(BugReport.objects.count(), 5)
        self.assertEqual(purge_old_bug_reports(dry_run=False, now=self.now), 2)

        self.assertFalse(BugReport.objects.filter(pk=resolved.pk).exists())
        self.assertFalse(BugReport.objects.filter(pk=closed.pk).exists())
        self.assertTrue(BugReport.objects.filter(pk=active.pk).exists())
        self.assertTrue(BugReport.objects.filter(pk=recent_report.pk).exists())
        self.assertTrue(BugReport.objects.filter(pk=no_resolution_date.pk).exists())

    def test_management_command_requires_confirmation_for_delete(self):
        with self.assertRaises(CommandError):
            call_command("purge_old_bug_reports", "--execute", stdout=StringIO())

    def test_account_erasure_deletes_report_content(self):
        report = self._report(BugReportStatus.NEW, None)

        anonymize_user(self.user)

        self.assertFalse(BugReport.objects.filter(pk=report.pk).exists())
