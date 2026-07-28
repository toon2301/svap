"""
Údržbový príkaz: maže staré návštevy profilu podľa retenčnej politiky (Fáza 4.1).

Určený na spúšťanie AJ v produkcii (napr. cron/scheduler) – preto NEMÁ DEBUG guard.
Default je bezpečný dry-run; reálne mazanie vyžaduje `--execute --confirm`.

Retenčná hodnota (anchor = created_at) žije v
accounts.services.profile_visits.PROFILE_VISIT_RETENTION_DAYS.

Príklady:
  python manage.py purge_old_profile_visits                      # dry-run
  python manage.py purge_old_profile_visits --execute --confirm  # reálne mazanie
"""

import logging

from django.core.management.base import BaseCommand, CommandError

from accounts.services.profile_visits import (
    PROFILE_VISIT_RETENTION_DAYS,
    purge_old_profile_visits,
)

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Zmaže staré návštevy profilu podľa retenčnej politiky (default dry-run)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Len vypíše, čo by sa zmazalo (default, ak nie je --execute).",
        )
        parser.add_argument(
            "--execute",
            action="store_true",
            help="Reálne zmaže staré návštevy (vyžaduje aj --confirm).",
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

        total = purge_old_profile_visits(dry_run=not execute)

        verb = "Zmazaných" if execute else "Na zmazanie (dry-run)"
        style = self.style.SUCCESS if execute else self.style.WARNING
        self.stdout.write(
            style(f"{verb}: {total} návštev (>{PROFILE_VISIT_RETENTION_DAYS}d).")
        )

        if not execute:
            self.stdout.write(
                "Pre reálne mazanie spusti: "
                "python manage.py purge_old_profile_visits --execute --confirm"
            )

        logger.info(
            "purge_old_profile_visits executed=%s total=%s",
            execute,
            total,
        )
