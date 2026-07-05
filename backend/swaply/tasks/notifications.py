from __future__ import annotations

import logging

from celery import shared_task
from django.core.management import call_command

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=3,
    autoretry_for=(Exception,),
    retry_backoff=True,
    time_limit=300,
)
def purge_old_notifications_task(self) -> None:
    """
    Denná údržba: zmaže staré notifikácie podľa retenčnej politiky
    (accounts.services.notifications.NOTIFICATION_RETENTION_DAYS – 30/60/90 dní).

    Spúšťa management command s --execute --confirm (reálne mazanie, NIE dry-run).
    Command sám loguje počty per-typ (logger v accounts.management.commands...).

    Odolnosť: pri zlyhaní (napr. DB timeout) autoretry_for + retry_backoff skúsi
    znova (max 3×); time_limit=300s bráni nekonečnému visení tasku.
    """
    logger.info("purge_old_notifications_task: starting scheduled purge")
    call_command("purge_old_notifications", "--execute", "--confirm")
    logger.info("purge_old_notifications_task: finished")
