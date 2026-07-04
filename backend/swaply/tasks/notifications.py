from __future__ import annotations

import logging

from celery import shared_task
from django.core.management import call_command

logger = logging.getLogger(__name__)


@shared_task
def purge_old_notifications_task() -> None:
    """
    Denná údržba: zmaže staré notifikácie podľa retenčnej politiky
    (accounts.services.notifications.NOTIFICATION_RETENTION_DAYS – 30/60/90 dní).

    Spúšťa management command s --execute --confirm (reálne mazanie, NIE dry-run).
    Command sám loguje počty per-typ (logger v accounts.management.commands...).
    """
    logger.info("purge_old_notifications_task: starting scheduled purge")
    call_command("purge_old_notifications", "--execute", "--confirm")
    logger.info("purge_old_notifications_task: finished")
