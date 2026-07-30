"""Application services for technical bug reports."""

from __future__ import annotations

from datetime import timedelta
import logging

from django.db import transaction
from django.utils import timezone

from accounts.models import BugReport, BugReportStatus

logger = logging.getLogger(__name__)

BUG_REPORT_RETENTION_DAYS = 365
_PURGE_BATCH_SIZE = 1000


def schedule_bug_report_notification(*, report_id: int) -> None:
    """Enqueue support notification only after the report transaction commits."""

    normalized_report_id = int(report_id)

    def _enqueue() -> None:
        try:
            from accounts.tasks import send_bug_report_notification_task

            send_bug_report_notification_task.delay(report_id=normalized_report_id)
        except Exception:
            logger.warning(
                "Bug report notification task could not be enqueued.",
                extra={"bug_report_id": normalized_report_id},
                exc_info=True,
            )

    transaction.on_commit(_enqueue)


def purge_old_bug_reports(*, dry_run: bool = True, now=None) -> int:
    """Delete only resolved/closed reports older than the retention period."""

    cutoff = (now or timezone.now()) - timedelta(days=BUG_REPORT_RETENTION_DAYS)
    eligible = BugReport.objects.filter(
        status__in=(BugReportStatus.RESOLVED, BugReportStatus.CLOSED),
        resolved_at__lt=cutoff,
    )
    if dry_run:
        return eligible.count()

    deleted_total = 0
    while True:
        report_ids = list(
            eligible.order_by("id").values_list("id", flat=True)[:_PURGE_BATCH_SIZE]
        )
        if not report_ids:
            break
        _, deleted_by_model = eligible.filter(id__in=report_ids).delete()
        deleted_total += deleted_by_model.get(BugReport._meta.label, 0)
    return deleted_total
