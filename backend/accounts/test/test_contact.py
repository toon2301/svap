import pytest
from django.core import mail
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import patch


@pytest.mark.django_db
class TestContactForm(APITestCase):
    def setUp(self):
        self.url = reverse("contact")

    @override_settings(
        CAPTCHA_ENABLED=False,
        RATE_LIMITING_ENABLED=False,
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
        SUPPORT_EMAIL="info@svaply.com",
    )
    def test_contact_post_success(self):
        payload = {
            "email": "user@example.com",
            "message": "Potrebujem pomoc s účtom.",
        }
        response = self.client.post(self.url, payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert "message" in response.data
        assert len(mail.outbox) == 1
        assert mail.outbox[0].to == ["info@svaply.com"]
        assert mail.outbox[0].reply_to == ["user@example.com"]

    @override_settings(CAPTCHA_ENABLED=False, RATE_LIMITING_ENABLED=False)
    def test_contact_missing_email(self):
        response = self.client.post(
            self.url, {"message": "Ahoj"}, format="json"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "email" in response.data

    @override_settings(CAPTCHA_ENABLED=False, RATE_LIMITING_ENABLED=False)
    def test_contact_invalid_email(self):
        response = self.client.post(
            self.url,
            {"email": "not-an-email", "message": "Ahoj"},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "email" in response.data

    @override_settings(CAPTCHA_ENABLED=False, RATE_LIMITING_ENABLED=False)
    def test_contact_missing_message(self):
        response = self.client.post(
            self.url, {"email": "user@example.com", "message": "   "}, format="json"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "message" in response.data

    @override_settings(
        CAPTCHA_ENABLED=False,
        RATE_LIMITING_ENABLED=False,
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    )
    def test_contact_honeypot_returns_success_without_email(self):
        response = self.client.post(
            self.url,
            {
                "email": "bot@example.com",
                "message": "Spam",
                "website": "https://spam.example",
            },
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert len(mail.outbox) == 0

    @override_settings(
        CAPTCHA_ENABLED=False,
        RATE_LIMITING_ENABLED=False,
        EMAIL_BACKEND="django.core.mail.backends.console.EmailBackend",
        SUPPORT_EMAIL="info@svaply.com",
    )
    def test_contact_console_backend_skips_smtp_send(self):
        with patch("accounts.views.contact.EmailMultiAlternatives.send") as mock_send:
            response = self.client.post(
                self.url,
                {"email": "user@example.com", "message": "Pomoc s účtom"},
                format="json",
            )
        assert response.status_code == status.HTTP_200_OK
        mock_send.assert_not_called()

    @override_settings(
        CAPTCHA_ENABLED=False,
        RATE_LIMITING_ENABLED=False,
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
        SUPPORT_EMAIL="info@svaply.com",
    )
    def test_contact_send_zero_raises_500(self):
        with patch("accounts.views.contact.EmailMultiAlternatives.send", return_value=0):
            response = self.client.post(
                self.url,
                {"email": "user@example.com", "message": "Pomoc"},
                format="json",
            )
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    @override_settings(CAPTCHA_ENABLED=False, RATE_LIMITING_ENABLED=False)
    @patch("accounts.views.contact._send_contact_email")
    def test_contact_email_failure_returns_500(self, mock_send):
        mock_send.side_effect = Exception("SMTP error")
        response = self.client.post(
            self.url,
            {"email": "user@example.com", "message": "Pomoc"},
            format="json",
        )
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert "error" in response.data
