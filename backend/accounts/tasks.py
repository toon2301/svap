"""Celery tasks owned by the accounts application."""

from __future__ import annotations

import logging

from celery import shared_task
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.urls import reverse
from django.utils import timezone

from .models import BugReport
from .services.bug_reports import purge_old_bug_reports

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=3,
    autoretry_for=(Exception,),
    retry_backoff=True,
    time_limit=30,
)
def send_bug_report_notification_task(self, *, report_id: int) -> None:
    """Notify support without placing user-authored content in the email."""

    try:
        report = BugReport.objects.select_related("reported_by").get(pk=report_id)
    except BugReport.DoesNotExist:
        logger.info(
            "Bug report notification skipped because the report no longer exists.",
            extra={"bug_report_id": int(report_id)},
        )
        return
    if report.support_notified_at is not None:
        return

    admin_path = reverse("admin:accounts_bugreport_change", args=[report.pk])
    body = "\n".join(
        (
            "V aplikácii bolo vytvorené nové hlásenie chyby.",
            f"Referencia: {report.reference}",
            f"Kategória: {report.category}",
            f"Používateľ ID: {report.reported_by_id}",
            f"Vytvorené: {report.created_at.isoformat()}",
            f"Administrácia: {admin_path}",
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

    BugReport.objects.filter(
        pk=report.pk,
        support_notified_at__isnull=True,
    ).update(support_notified_at=timezone.now())
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
