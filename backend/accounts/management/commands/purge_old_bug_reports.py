"""Safely purge completed bug reports past their retention period."""

from django.core.management.base import BaseCommand, CommandError

from accounts.services.bug_reports import (
    BUG_REPORT_RETENTION_DAYS,
    purge_old_bug_reports,
)


class Command(BaseCommand):
    help = (
        "Zmaže vyriešené alebo zatvorené hlásenia chýb po retenčnej lehote. "
        "Predvolene iba dry-run."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Iba vypíše počet hlásení určených na zmazanie.",
        )
        parser.add_argument(
            "--execute",
            action="store_true",
            help="Vykoná zmazanie; vyžaduje aj --confirm.",
        )
        parser.add_argument(
            "--confirm",
            action="store_true",
            help="Bezpečnostné potvrdenie povinné pri --execute.",
        )

    def handle(self, *args, **options):
        execute = bool(options["execute"]) and not bool(options["dry_run"])
        if execute and not options["confirm"]:
            raise CommandError("--execute vyžaduje aj --confirm.")

        report_count = purge_old_bug_reports(dry_run=not execute)
        action = "Zmazaných" if execute else "Na zmazanie (dry-run)"
        style = self.style.SUCCESS if execute else self.style.WARNING
        self.stdout.write(
            style(
                f"{action}: {report_count} hlásení "
                f"(retencia {BUG_REPORT_RETENTION_DAYS} dní)."
            )
        )
        if not execute:
            self.stdout.write(
                "Pre reálne zmazanie spusti: "
                "python manage.py purge_old_bug_reports --execute --confirm"
            )
