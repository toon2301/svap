"""Celery tasks owned by the accounts application."""

from __future__ import annotations

import logging
from urllib.parse import urljoin

from celery import shared_task
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.db.models import F
from django.urls import reverse
from django.utils import timezone

from .models import BugReport, BugReportNotificationOutbox
from .services.bug_reports import purge_old_bug_reports

logger = logging.getLogger(__name__)
_NOTIFICATION_RECOVERY_BATCH_SIZE = 100


@shared_task(
    bind=True,
    max_retries=3,
    autoretry_for=(Exception,),
    retry_backoff=True,
    time_limit=30,
)
def send_bug_report_notification_task(self, *, report_id: int) -> None:
    """Notify support without placing user-authored content in the email."""

    normalized_report_id = int(report_id)
    claimed_at = timezone.now()
    claimed_count = BugReport.objects.filter(
        pk=normalized_report_id,
        support_notified_at__isnull=True,
    ).update(support_notified_at=claimed_at)
    if claimed_count == 0:
        return

    try:
        report = BugReport.objects.select_related("reported_by").get(
            pk=normalized_report_id
        )
        BugReportNotificationOutbox.objects.filter(
            bug_report_id=normalized_report_id
        ).update(
            attempt_count=F("attempt_count") + 1,
            last_attempt_at=claimed_at,
        )
        admin_path = reverse("admin:accounts_bugreport_change", args=[report.pk])
        admin_url = urljoin(
            f"{settings.BUG_REPORT_ADMIN_ORIGIN.rstrip('/')}/",
            admin_path.lstrip("/"),
        )
        body = "\n".join(
            (
                "V aplikácii bolo vytvorené nové hlásenie chyby.",
                f"Referencia: {report.reference}",
                f"Kategória: {report.category}",
                f"Používateľ ID: {report.reported_by_id}",
                f"Vytvorené: {report.created_at.isoformat()}",
                f"Administrácia: {admin_url}",
            )
        )
        email = EmailMultiAlternatives(
            subject=f"[Svaply] Nové hlásenie chyby {report.reference}",
            body=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[settings.BUG_REPORT_EMAIL],
        )
        if email.send(fail_silently=False) < 1:
            raise RuntimeError("Bug report email backend did not accept the message.")
    except BugReport.DoesNotExist:
        logger.info(
            "Bug report notification skipped because the report no longer exists.",
            extra={"bug_report_id": normalized_report_id},
        )
        return
    except Exception:
        BugReport.objects.filter(
            pk=normalized_report_id,
            support_notified_at=claimed_at,
        ).update(support_notified_at=None)
        raise

    BugReportNotificationOutbox.objects.filter(
        bug_report_id=normalized_report_id
    ).delete()
    logger.info(
        "Bug report support notification sent.",
        extra={
            "bug_report_id": report.pk,
            "reported_by_id": report.reported_by_id,
        },
    )


@shared_task(
    bind=True,
    max_retries=3,
    autoretry_for=(Exception,),
    retry_backoff=True,
    time_limit=30,
)
def recover_pending_bug_report_notifications_task(self) -> int:
    """Re-enqueue durable notification intents left pending by broker outages."""

    report_ids = list(
        BugReportNotificationOutbox.objects.filter(
            bug_report__support_notified_at__isnull=True
        )
        .order_by("id")
        .values_list("bug_report_id", flat=True)[:_NOTIFICATION_RECOVERY_BATCH_SIZE]
    )
    for pending_report_id in report_ids:
        send_bug_report_notification_task.delay(report_id=pending_report_id)
    return len(report_ids)


@shared_task(
    bind=True,
    max_retries=3,
    autoretry_for=(Exception,),
    retry_backoff=True,
    time_limit=300,
)
def purge_old_bug_reports_task(self) -> int:
    """Scheduled GDPR retention purge for completed bug reports."""

    deleted_count = purge_old_bug_reports(dry_run=False)
    logger.info(
        "Scheduled bug report retention purge finished.",
        extra={"deleted_bug_report_count": deleted_count},
    )
    return deleted_count
