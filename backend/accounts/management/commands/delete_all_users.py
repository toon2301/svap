"""
Management command na vymazanie všetkých používateľov z databázy
POUŽÍVAJTE OPATRNE - TOTO VYMAŽE VŠETKY ÚČTY!
"""

from django.core.management.base import BaseCommand
from accounts.models import User, UserProfile, EmailVerification
from django.db import transaction


class Command(BaseCommand):
    help = "Vymaže všetkých používateľov z databázy (POUŽÍVAJTE OPATRNE!)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--confirm",
            action="store_true",
            help="Potvrdenie, že naozaj chceš vymazať všetkých používateľov",
        )

    def handle(self, *args, **options):
        if not options["confirm"]:
            self.stdout.write(
                self.style.ERROR(
                    "VAROVANIE: Tento prikaz vymaze VSETKY ucty z databazy!"
                )
            )
            self.stdout.write(
                "Ak naozaj chces pokracovat, spusti prikaz s --confirm flagom:"
            )
            self.stdout.write("python manage.py delete_all_users --confirm")
            return

        # Pocitat pouzivatelov pred vymazaním
        user_count = User.objects.count()

        if user_count == 0:
            self.stdout.write(
                self.style.SUCCESS("V databaze nie su ziadni pouzivatelia.")
            )
            return

        self.stdout.write(
            self.style.WARNING(f"Vymazavam {user_count} pouzivatelov z databazy...")
        )

        try:
            with transaction.atomic():
                # Vymazat vsetky suvisiace objekty
                EmailVerification.objects.all().delete()
                UserProfile.objects.all().delete()

                # Vymazat vsetkych pouzivatelov
                deleted_count = User.objects.all().delete()[0]

                self.stdout.write(
                    self.style.SUCCESS(
                        f"Uspešne vymazanych {deleted_count} pouzivatelov z databazy."
                    )
                )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Chyba pri vymazavani pouzivatelov: {e}")
            )
            raise
