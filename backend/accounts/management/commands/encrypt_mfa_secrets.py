"""
Management command na zašifrovanie existujúcich mfa_secret hodnôt v UserProfile.
Idempotentný: už zašifrované záznamy sa nezašifrujú dvakrát (decrypt_mfa_secret + encrypt_mfa_secret v save() to zabezpečuje).
"""

from django.core.management.base import BaseCommand
from accounts.models import UserProfile


class Command(BaseCommand):
    help = "Encrypt all existing plaintext mfa_secret values in UserProfile"

    def handle(self, *args, **options):
        # Všetky profily s neprázdnym mfa_secret
        profiles = UserProfile.objects.exclude(mfa_secret="").exclude(mfa_secret__isnull=True)
        total = profiles.count()
        processed = 0
        errors = []

        for profile in profiles:
            try:
                profile.save()
                processed += 1
            except Exception as e:
                errors.append((profile.pk, str(e)))

        self.stdout.write(
            self.style.SUCCESS(f"Spracovaných: {processed} z {total} záznamov.")
        )
        if errors:
            for pk, msg in errors:
                self.stdout.write(self.style.ERROR(f"  Profil id={pk}: {msg}"))
        else:
            self.stdout.write(self.style.SUCCESS("Žiadne chyby."))
