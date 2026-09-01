import pytest
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import default_token_generator
from unittest.mock import patch

from accounts.views.password_reset import PASSWORD_RESET_REQUEST_MESSAGE

# View si task importuje až pri volaní, takže sa patchuje na mieste definície.
MAIL_TASK = "accounts.password_reset_tasks.send_password_reset_email_task"

User = get_user_model()


@pytest.mark.django_db
class TestPasswordResetAPI(APITestCase):
    """Regresné testy verejného API pre vyžiadanie a potvrdenie resetu hesla."""

    def setUp(self):
        """Vytvorí aktívny lokálny účet používaný v jednotlivých scenároch."""
        self.user = User.objects.create_user(
            username="resetuser",
            email="reset@example.com",
            password="StrongPass123",
            is_verified=True,
        )

    @patch(MAIL_TASK)
    def test_password_reset_request_existing_email(self, mock_task):
        """Aktívny účet dostane neutrálnu odpoveď a e-mail sa zaradí na pozadie."""
        url = reverse("accounts:password_reset_request")
        r = self.client.post(url, {"email": "reset@example.com"}, format="json")
        assert r.status_code == status.HTTP_200_OK
        assert r.json() == {"message": PASSWORD_RESET_REQUEST_MESSAGE}
        mock_task.delay.assert_called_once_with(user_id=self.user.pk)

    @patch(MAIL_TASK)
    def test_password_reset_request_unknown_email(self, mock_task):
        """Neexistujúci účet dostane rovnakú neutrálnu odpoveď."""
        url = reverse("accounts:password_reset_request")
        r = self.client.post(url, {"email": "unknown@example.com"}, format="json")
        assert r.status_code == status.HTTP_200_OK
        assert r.json() == {"message": PASSWORD_RESET_REQUEST_MESSAGE}
        mock_task.delay.assert_not_called()

    @patch(MAIL_TASK)
    def test_password_reset_request_inactive_email_is_neutral(self, mock_task):
        """Neaktívny účet neprezradí svoj stav a nedostane resetovací e-mail."""
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])

        url = reverse("accounts:password_reset_request")
        response = self.client.post(url, {"email": self.user.email}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {"message": PASSWORD_RESET_REQUEST_MESSAGE}
        mock_task.delay.assert_not_called()

    @patch(MAIL_TASK)
    def test_password_reset_request_ignores_stale_inactive_cookie(self, mock_task):
        """Stará cookie deaktivovaného účtu nesmie zablokovať verejný reset endpoint."""
        access_token = RefreshToken.for_user(self.user).access_token
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        self.client.cookies["access_token"] = str(access_token)

        url = reverse("accounts:password_reset_request")
        response = self.client.post(url, {"email": self.user.email}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {"message": PASSWORD_RESET_REQUEST_MESSAGE}
        mock_task.delay.assert_not_called()

    @patch(MAIL_TASK)
    def test_password_reset_request_normalizes_email_input(self, mock_task):
        """Medzery a veľkosť písmen v e-maile neblokujú aktívny účet."""
        url = reverse("accounts:password_reset_request")
        response = self.client.post(
            url,
            {"email": "  RESET@EXAMPLE.COM  "},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        mock_task.delay.assert_called_once_with(user_id=self.user.pk)

    @patch(MAIL_TASK)
    def test_password_reset_request_rejects_invalid_email(self, mock_task):
        """Backend odmietne syntakticky neplatný e-mail ešte pred vyhľadaním účtu."""
        url = reverse("accounts:password_reset_request")
        response = self.client.post(url, {"email": "invalid"}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        mock_task.delay.assert_not_called()

    def test_password_reset_confirm_invalid_uid(self):
        """Potvrdenie odmietne neplatne zakódované ID používateľa."""
        url = reverse(
            "accounts:password_reset_confirm", kwargs={"uidb64": "!!", "token": "abc"}
        )
        r = self.client.post(url, {"password": "NewStrong123"}, format="json")
        assert r.status_code == status.HTTP_400_BAD_REQUEST

    def test_password_reset_confirm_invalid_token(self):
        """Potvrdenie odmietne token, ktorý nepatrí používateľovi."""
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        url = reverse(
            "accounts:password_reset_confirm",
            kwargs={"uidb64": uid, "token": "invalid-token"},
        )
        r = self.client.post(url, {"password": "NewStrong123"}, format="json")
        assert r.status_code == status.HTTP_400_BAD_REQUEST

    def test_password_reset_confirm_success(self):
        """Platný token aktívneho účtu umožní nastaviť nové heslo."""
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)
        url = reverse(
            "accounts:password_reset_confirm", kwargs={"uidb64": uid, "token": token}
        )
        r = self.client.post(url, {"password": "NewStrong123"}, format="json")
        assert r.status_code == status.HTTP_200_OK

    def test_password_reset_confirm_rejects_user_deactivated_after_token_issue(self):
        """Token vydaný pred deaktiváciou nesmie zmeniť heslo neaktívneho účtu."""
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)
        original_password = self.user.password
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        url = reverse(
            "accounts:password_reset_confirm", kwargs={"uidb64": uid, "token": token}
        )

        response = self.client.post(url, {"password": "NewStrong123"}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        self.user.refresh_from_db()
        assert self.user.password == original_password
        assert self.user.is_active is False

    def test_password_reset_verify_token_invalid(self):
        """Overenie označí poškodený resetovací odkaz za neplatný."""
        url = reverse(
            "accounts:password_reset_verify", kwargs={"uidb64": "!!", "token": "abc"}
        )
        r = self.client.get(url)
        assert r.status_code == status.HTTP_400_BAD_REQUEST

    def test_password_reset_verify_token_valid(self):
        """Overenie potvrdí platný token aktívneho účtu."""
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)
        url = reverse(
            "accounts:password_reset_verify", kwargs={"uidb64": uid, "token": token}
        )
        r = self.client.get(url)
        assert r.status_code == status.HTTP_200_OK
        assert r.json()["valid"] is True

    def test_password_reset_verify_rejects_user_deactivated_after_token_issue(self):
        """Overenie odmietne token, ak bol účet po jeho vydaní deaktivovaný."""
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        url = reverse(
            "accounts:password_reset_verify", kwargs={"uidb64": uid, "token": token}
        )

        response = self.client.get(url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json()["valid"] is False

    def test_password_reset_link_ignores_cookie_from_another_inactive_account(self):
        """Overenie aj potvrdenie odkazu fungujú napriek cudzej starej auth cookie."""
        stale_user = User.objects.create_user(
            username="staleresetuser",
            email="stale-reset@example.com",
            password="StrongPass123",
            is_verified=True,
        )
        stale_access_token = RefreshToken.for_user(stale_user).access_token
        stale_user.is_active = False
        stale_user.save(update_fields=["is_active"])
        self.client.cookies["access_token"] = str(stale_access_token)

        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)
        verify_url = reverse(
            "accounts:password_reset_verify", kwargs={"uidb64": uid, "token": token}
        )
        confirm_url = reverse(
            "accounts:password_reset_confirm", kwargs={"uidb64": uid, "token": token}
        )

        verify_response = self.client.get(verify_url)
        confirm_response = self.client.post(
            confirm_url,
            {"password": "NewStrong123"},
            format="json",
        )

        assert verify_response.status_code == status.HTTP_200_OK
        assert confirm_response.status_code == status.HTTP_200_OK
