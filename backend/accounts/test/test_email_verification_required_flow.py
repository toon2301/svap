"""Povinná email verifikácia (EMAIL_VERIFICATION_REQUIRED=True) – celý flow.

Testová suita globálne beží s vypnutou verifikáciou (conftest env pin, legacy
správanie); tieto testy zapínajú produkčný default explicitne cez
override_settings a pokrývajú: registráciu (neoverený účet + odoslaný email),
login gate, GET verifikačný link a jeho idempotenciu (prefetch/StrictMode).
"""

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import EmailVerification

User = get_user_model()

VERIFICATION_REQUIRED = override_settings(
    EMAIL_VERIFICATION_REQUIRED=True,
    ALLOW_UNVERIFIED_LOGIN=False,
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
)


@VERIFICATION_REQUIRED
class EmailVerificationRequiredFlowTests(APITestCase):
    def _register_payload(self, **overrides):
        data = {
            "username": "flowuser",
            "email": "flowuser@example.com",
            "password": "Strongpass123",
            "password_confirm": "Strongpass123",
            "user_type": "individual",
            "captcha_token": "test_captcha_token",
        }
        data.update(overrides)
        return data

    def test_registration_creates_unverified_user_and_sends_email(self):
        with patch("threading.Thread") as thread_mock:
            # Thread mock: e-mail pošleme synchrónne, aby bol test deterministický.
            thread_mock.side_effect = lambda target, args, daemon: type(
                "T", (), {"start": lambda self: target(*args)}
            )()
            response = self.client.post(
                reverse("accounts:register"), self._register_payload(), format="json"
            )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["email_verification_required"])
        self.assertTrue(response.data["email_sent"])

        user = User.objects.get(email="flowuser@example.com")
        self.assertFalse(user.is_verified)
        self.assertTrue(EmailVerification.objects.filter(user=user).exists())
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("verify-email?token=", mail.outbox[0].body)

    def test_login_is_blocked_until_email_is_verified(self):
        user = User.objects.create_user(
            username="unverified-login",
            email="unverified-login@example.com",
            password="Strongpass123",
            is_verified=False,
        )

        blocked = self.client.post(
            reverse("accounts:login"),
            {"email": user.email, "password": "Strongpass123"},
            format="json",
        )
        self.assertEqual(blocked.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("nie je overen", str(blocked.data).lower())

        user.is_verified = True
        user.save(update_fields=["is_verified"])
        allowed = self.client.post(
            reverse("accounts:login"),
            {"email": user.email, "password": "Strongpass123"},
            format="json",
        )
        self.assertEqual(allowed.status_code, status.HTTP_200_OK)

    def test_get_verification_link_verifies_user(self):
        user = User.objects.create_user(
            username="verify-get",
            email="verify-get@example.com",
            password="Strongpass123",
            is_verified=False,
        )
        verification = EmailVerification.objects.create(user=user)

        response = self.client.get(
            reverse("accounts:verify_email"), {"token": str(verification.token)}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["verified"])
        user.refresh_from_db()
        self.assertTrue(user.is_verified)

    def test_verification_link_is_idempotent_on_repeated_get(self):
        """Prefetch email klienta / StrictMode double-effect nesmie ukázať chybu."""
        user = User.objects.create_user(
            username="verify-idempotent",
            email="verify-idempotent@example.com",
            password="Strongpass123",
            is_verified=False,
        )
        verification = EmailVerification.objects.create(user=user)
        url = reverse("accounts:verify_email")

        first = self.client.get(url, {"token": str(verification.token)})
        second = self.client.get(url, {"token": str(verification.token)})

        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertTrue(second.data["verified"])
        self.assertTrue(second.data.get("already_verified"))

    def test_full_email_link_flow_verifies_user(self):
        """Repro celého linku: URL z emailu → token z query → GET → overený.

        Presne kopíruje, čo robí klik na link (get_verification_url →
        /verify-email?token=… → FE GET na verify endpoint).
        """
        from urllib.parse import parse_qs, urlparse

        user = User.objects.create_user(
            username="verify-link",
            email="verify-link@example.com",
            password="Strongpass123",
            is_verified=False,
        )
        verification = EmailVerification.objects.create(user=user)

        link = verification.get_verification_url()
        token_from_link = parse_qs(urlparse(link).query)["token"][0]
        self.assertEqual(token_from_link, str(verification.token))

        response = self.client.get(
            reverse("accounts:verify_email"), {"token": token_from_link}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["verified"])
        user.refresh_from_db()
        self.assertTrue(user.is_verified)

    def test_token_with_surrounding_whitespace_still_verifies(self):
        """Email klienty vedia pri zalomení linku vniesť whitespace do tokenu."""
        user = User.objects.create_user(
            username="verify-ws",
            email="verify-ws@example.com",
            password="Strongpass123",
            is_verified=False,
        )
        verification = EmailVerification.objects.create(user=user)

        response = self.client.get(
            reverse("accounts:verify_email"),
            {"token": f"  {verification.token}\n"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["verified"])
        user.refresh_from_db()
        self.assertTrue(user.is_verified)

    def test_verification_link_uses_configured_frontend_domain(self):
        """Link v emaile musí smerovať na nakonfigurovaný FRONTEND_URL (nie cudziu doménu)."""
        user = User.objects.create_user(
            username="verify-domain",
            email="verify-domain@example.com",
            password="Strongpass123",
            is_verified=False,
        )
        verification = EmailVerification.objects.create(user=user)

        with override_settings(FRONTEND_URL="https://svaply.com"):
            link = verification.get_verification_url()

        self.assertTrue(link.startswith("https://svaply.com/verify-email?token="))

    def test_invalid_token_still_returns_error(self):
        response = self.client.get(
            reverse("accounts:verify_email"),
            {"token": "00000000-0000-0000-0000-000000000000"},
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data.get("verified", False))
