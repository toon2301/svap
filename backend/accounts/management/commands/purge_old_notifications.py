"""
Údržbový príkaz: maže staré notifikácie podľa retenčnej politiky (BOD 1).

Určený na spúšťanie AJ v produkcii (napr. cron/scheduler) – preto NEMÁ DEBUG guard.
Default je bezpečný dry-run; reálne mazanie vyžaduje `--execute --confirm`.

Retenčné hodnoty (anchor = created_at, maže bez ohľadu na read stav – GDPR
minimalizácia dát) žijú v accounts.services.notifications.NOTIFICATION_RETENTION_DAYS.

Príklady:
  python manage.py purge_old_notifications                      # dry-run
  python manage.py purge_old_notifications --execute --confirm  # reálne mazanie
"""

import logging

from django.core.management.base import BaseCommand, CommandError

from accounts.services.notifications import (
    NOTIFICATION_RETENTION_DAYS,
    purge_old_notifications,
)

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Zmaže staré notifikácie podľa retenčnej politiky (default dry-run)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Len vypíše, čo by sa zmazalo (default, ak nie je --execute).",
        )
        parser.add_argument(
            "--execute",
            action="store_true",
            help="Reálne zmaže staré notifikácie (vyžaduje aj --confirm).",
        )
        parser.add_argument(
            "--confirm",
            action="store_true",
            help="Potvrdenie pre --execute (bez neho sa reálne nemaže).",
        )

    def handle(self, *args, **options):
        # --dry-run vždy vyhráva (bezpečnosť); execute len pri --execute bez --dry-run.
        execute = bool(options["execute"]) and not bool(options["dry_run"])
        if execute and not options["confirm"]:
            raise CommandError("--execute vyžaduje aj --confirm (bezpečnostný guard).")

        summary = purge_old_notifications(dry_run=not execute)
        total = sum(summary.values())

        self.stdout.write("Retenčná politika (dni) / počet dotknutých:")
        for notif_type in sorted(NOTIFICATION_RETENTION_DAYS):
            days = NOTIFICATION_RETENTION_DAYS[notif_type]
            count = summary.get(notif_type, 0)
            self.stdout.write(f"  {notif_type} (>{days}d): {count}")

        verb = "Zmazaných" if execute else "Na zmazanie (dry-run)"
        style = self.style.SUCCESS if execute else self.style.WARNING
        self.stdout.write(style(f"{verb}: {total} notifikácií."))

        if not execute:
            self.stdout.write(
                "Pre reálne mazanie spusti: "
                "python manage.py purge_old_notifications --execute --confirm"
            )

        logger.info(
            "purge_old_notifications executed=%s total=%s summary=%s",
            execute,
            total,
            summary,
        )
