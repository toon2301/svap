"""
Odošle testovací email z kontaktného formulára na SUPPORT_EMAIL.
Použitie: python manage.py send_test_contact_email
"""

from django.conf import settings
from django.core.management.base import BaseCommand

from accounts.views.contact import _send_contact_email


class Command(BaseCommand):
    help = "Odošle testovací kontaktný email na SUPPORT_EMAIL (overenie SMTP)."

    def handle(self, *args, **options):
        recipient = getattr(settings, "SUPPORT_EMAIL", "info@svaply.com")
        backend = getattr(settings, "EMAIL_BACKEND", "")

        self.stdout.write(f"EMAIL_BACKEND: {backend}")
        self.stdout.write(f"SUPPORT_EMAIL: {recipient}")
        self.stdout.write(f"DEFAULT_FROM_EMAIL: {getattr(settings, 'DEFAULT_FROM_EMAIL', '')}")

        if "console" in backend:
            self.stderr.write(
                self.style.WARNING(
                    "Console backend – email sa reálne neodošle, len vypíše do konzoly."
                )
            )

        _send_contact_email(
            user_email="test-contact-form@svaply.local",
            message="Svaply contact form SMTP test. You can ignore this message.",
        )
        self.stdout.write(self.style.SUCCESS(f"Testovací email odoslaný na {recipient}."))
