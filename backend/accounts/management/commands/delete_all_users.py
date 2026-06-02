"""
Management command na vymazanie všetkých používateľov z databázy
POUŽÍVAJTE OPATRNE - TOTO VYMAŽE VŠETKY ÚČTY!
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import EmailVerification, User, UserProfile


class Command(BaseCommand):
    help = "Vymaže všetkých používateľov z databázy (POUŽÍVAJTE OPATRNE!)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--confirm",
            action="store_true",
            help="Potvrdenie, že naozaj chceš vymazať všetkých používateľov",
        )

    def _safe_delete_step(self, step_label, delete_fn):
        """Vymaže queryset; pri chybe zaloguje varovanie a pokračuje."""
        try:
            deleted_count, _ = delete_fn()
            self.stdout.write(
                self.style.SUCCESS(f"Vymazane: {deleted_count} x {step_label}")
            )
            return deleted_count
        except Exception as exc:
            self.stdout.write(
                self.style.WARNING(
                    f"Varovanie: krok '{step_label}' preskoceny ({exc})"
                )
            )
            return 0

    def _delete_messaging_records(self):
        """
        Vymaže messaging záznamy s PROTECT FK na User.
        Poradie: GroupInvitation → Message → ConversationParticipant → Conversation.
        """
        try:
            from messaging.models import (
                Conversation,
                ConversationParticipant,
                GroupInvitation,
                Message,
            )
        except ImportError as exc:
            self.stdout.write(
                self.style.WARNING(
                    f"Varovanie: messaging modely nie su dostupne ({exc}), preskakujem."
                )
            )
            return

        self.stdout.write("Vymazavam messaging zaznamy...")
        self._safe_delete_step(
            "pozvanky do skupin (GroupInvitation)",
            lambda: GroupInvitation.objects.all().delete(),
        )
        self._safe_delete_step(
            "spravy (Message)",
            lambda: Message.objects.all().delete(),
        )
        self._safe_delete_step(
            "ucastnikov konverzacii (ConversationParticipant)",
            lambda: ConversationParticipant.objects.all().delete(),
        )
        self._safe_delete_step(
            "konverzacie (Conversation)",
            lambda: Conversation.objects.all().delete(),
        )

    def _delete_accounts_protect_records(self):
        """Vymaže accounts záznamy s PROTECT FK na User (mimo messaging)."""
        try:
            from accounts.models import SkillRequestTermination
        except ImportError as exc:
            self.stdout.write(
                self.style.WARNING(
                    f"Varovanie: SkillRequestTermination nie je dostupny ({exc}), preskakujem."
                )
            )
            return

        self._safe_delete_step(
            "ukoncenia spoluprac (SkillRequestTermination)",
            lambda: SkillRequestTermination.objects.all().delete(),
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
                self._delete_messaging_records()
                self._delete_accounts_protect_records()

                EmailVerification.objects.all().delete()
                UserProfile.objects.all().delete()

                deleted_count = User.objects.all().delete()[0]

                self.stdout.write(
                    self.style.SUCCESS(
                        f"Uspesne vymazanych {deleted_count} pouzivatelov z databazy."
                    )
                )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Chyba pri vymazavani pouzivatelov: {e}")
            )
            raise
