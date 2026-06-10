"""
Odošle jednoduchý testovací email cez aktuálne nakonfigurovaný EMAIL_BACKEND.

Použitie:
  python manage.py send_test_email recipient@example.com
  python manage.py send_test_email recipient@example.com --subject "Test" --body "Hello"
"""

from django.conf import settings
from django.core.mail import send_mail
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Odošle testovací email (overenie Resend / EMAIL_BACKEND konfigurácie)."

    def add_arguments(self, parser):
        parser.add_argument(
            "recipient",
            nargs="?",
            default=None,
            help="Cieľová adresa (default: SUPPORT_EMAIL alebo DEFAULT_FROM_EMAIL)",
        )
        parser.add_argument("--subject", default="Svaply test email")
        parser.add_argument(
            "--body",
            default="Svaply Resend test email. You can ignore this message.",
        )

    def handle(self, *args, **options):
        recipient = (
            options["recipient"]
            or getattr(settings, "SUPPORT_EMAIL", None)
            or settings.DEFAULT_FROM_EMAIL
        )
        backend = getattr(settings, "EMAIL_BACKEND", "")

        self.stdout.write(f"EMAIL_BACKEND: {backend}")
        self.stdout.write(f"DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
        self.stdout.write(f"Recipient: {recipient}")

        if "console" in backend:
            self.stderr.write(
                self.style.WARNING(
                    "Console backend – email sa reálne neodošle, len vypíše do konzoly."
                )
            )

        send_mail(
            subject=options["subject"],
            message=options["body"],
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient],
            fail_silently=False,
        )
        self.stdout.write(self.style.SUCCESS(f"Testovací email odoslaný na {recipient}."))
