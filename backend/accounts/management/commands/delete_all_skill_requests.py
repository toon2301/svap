"""
Management príkaz na vymazanie všetkých žiadostí (SkillRequest) z databázy.
Používajte pri testovaní – vymaže všetky prijaté/odoslané žiadosti o karty.
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import SkillRequest


class Command(BaseCommand):
    help = "Vymaže všetky žiadosti (SkillRequest) z databázy (pre testovanie)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--confirm",
            action="store_true",
            help="Potvrdenie, že naozaj chceš vymazať všetky žiadosti",
        )

    def handle(self, *args, **options):
        if not options["confirm"]:
            self.stdout.write(
                self.style.WARNING(
                    "Tento príkaz vymaže VŠETKY žiadosti (SkillRequest) z databázy."
                )
            )
            self.stdout.write("Ak naozaj chceš pokračovať, spusti príkaz s --confirm:")
            self.stdout.write("  python manage.py delete_all_skill_requests --confirm")
            return

        count = SkillRequest.objects.count()
        if count == 0:
            self.stdout.write(self.style.SUCCESS("V databáze nie sú žiadne žiadosti."))
            return

        self.stdout.write(
            self.style.WARNING(f"Vymazávam {count} žiadostí z databázy...")
        )

        try:
            with transaction.atomic():
                # Notifikácie majú skill_request s on_delete=SET_NULL, stačí vymazať žiadosti
                deleted = SkillRequest.objects.all().delete()[0]
                self.stdout.write(self.style.SUCCESS(f"Vymazaných {deleted} žiadostí."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Chyba pri vymazávaní: {e}"))
            raise
