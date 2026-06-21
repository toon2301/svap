"""
Management príkaz na vymazanie všetkých recenzií (Review) z databázy.
Používajte pri testovaní – vymaže všetky recenzie ponúk.
"""

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from accounts.models import Review


class Command(BaseCommand):
    help = "Vymaže všetky recenzie (Review) z databázy (pre testovanie)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--confirm",
            action="store_true",
            help="Potvrdenie, že naozaj chceš vymazať všetky recenzie",
        )

    def handle(self, *args, **options):
        # Bezpečnostný guard: nezvratné zmazanie VŠETKÝCH recenzií nikdy nesmie
        # bežať v produkcii (DEBUG=False). --confirm flag nižšie ostáva ako
        # dodatočná vrstva ochrany.
        if not settings.DEBUG:
            raise CommandError(
                "delete_all_reviews je dostupný len v DEBUG režime (dev/test). "
                "V produkcii (DEBUG=False) je zakázaný – nezvratne maže všetky recenzie."
            )

        if not options["confirm"]:
            self.stdout.write(
                self.style.WARNING(
                    "Tento príkaz vymaže VŠETKY recenzie (Review) z databázy."
                )
            )
            self.stdout.write("Ak naozaj chceš pokračovať, spusti príkaz s --confirm:")
            self.stdout.write("  python manage.py delete_all_reviews --confirm")
            return

        count = Review.objects.count()
        if count == 0:
            self.stdout.write(self.style.SUCCESS("V databáze nie sú žiadne recenzie."))
            return

        self.stdout.write(
            self.style.WARNING(f"Vymazávam {count} recenzií z databázy...")
        )

        try:
            with transaction.atomic():
                deleted = Review.objects.all().delete()[0]
                self.stdout.write(self.style.SUCCESS(f"Vymazaných {deleted} recenzií."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Chyba pri vymazávaní: {e}"))
            raise
