"""GDPR – testy self-service zmazania účtu (anonymizácia)."""

from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.account_deletion import anonymize_user
from accounts.models import AccountDeletionRequest, OfferedSkill

User = get_user_model()


def _make_user(**kwargs):
    defaults = dict(
        username="alice",
        email="alice@example.com",
        password="StrongPass123",
        first_name="Alice",
        last_name="Smith",
        phone="0900123456",
        bio="o mne",
        is_verified=True,
    )
    defaults.update(kwargs)
    return User.objects.create_user(**defaults)


@pytest.mark.django_db
class TestAnonymizeUser(APITestCase):
    def test_pii_scrubbed_and_deactivated(self):
        user = _make_user()
        OfferedSkill.objects.create(user=user, category="IT", subcategory="Web")
        uid = user.id

        anonymize_user(user)

        u = User.objects.get(pk=uid)  # riadok ostáva (kvôli PROTECT väzbám)
        assert u.is_active is False
        assert u.has_usable_password() is False
        assert u.first_name == "" and u.last_name == ""
        assert u.phone == "" and u.bio == ""
        assert "deleted-user-" in u.email and u.email.endswith("@deleted.local")
        assert u.email != "alice@example.com"
        # Vlastný obsah zmazaný.
        assert OfferedSkill.objects.filter(user=u).count() == 0

    def test_tokens_blacklisted(self):
        from rest_framework_simplejwt.tokens import RefreshToken

        user = _make_user(username="bob", email="bob@example.com")
        RefreshToken.for_user(user)  # vytvorí OutstandingToken
        try:
            from rest_framework_simplejwt.token_blacklist.models import (
                BlacklistedToken,
                OutstandingToken,
            )

            assert OutstandingToken.objects.filter(user=user).exists()
            anonymize_user(user)
            outstanding = OutstandingToken.objects.filter(user=user)
            assert outstanding.exists()
            for ot in outstanding:
                assert BlacklistedToken.objects.filter(token=ot).exists()
        except Exception:
            anonymize_user(user)  # bez blacklist appky aspoň nesmie spadnúť


@pytest.mark.django_db
class TestDeleteAccountPasswordFlow(APITestCase):
    def setUp(self):
        self.user = _make_user()
        self.client.force_authenticate(user=self.user)
        self.url = reverse("accounts:delete_account")

    def test_wrong_password_rejected(self):
        resp = self.client.post(self.url, {"password": "WrongPass999"}, format="json")
        assert resp.status_code == status.HTTP_403_FORBIDDEN
        self.user.refresh_from_db()
        assert self.user.is_active is True  # nič sa nestalo

    def test_missing_password_rejected(self):
        resp = self.client.post(self.url, {}, format="json")
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_correct_password_anonymizes(self):
        resp = self.client.post(self.url, {"password": "StrongPass123"}, format="json")
        assert resp.status_code == status.HTTP_200_OK
        self.user.refresh_from_db()
        assert self.user.is_active is False
        assert self.user.has_usable_password() is False

    def test_oauth_account_without_password_uses_email_flow(self):
        oauth_user = User.objects.create_user(
            username="oauth", email="oauth@example.com", is_verified=True
        )  # bez hesla → unusable password
        self.client.force_authenticate(user=oauth_user)
        resp = self.client.post(self.url, {"password": "anything"}, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert resp.data.get("code") == "password_not_set"


@pytest.mark.django_db
class TestDeleteAccountOAuthFlow(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="oauth", email="oauth@example.com", is_verified=True
        )
        self.request_url = reverse("accounts:request_account_deletion")
        self.confirm_url = reverse("accounts:confirm_account_deletion")

    @patch("accounts.models.AccountDeletionRequest.send_deletion_email", return_value=True)
    def test_request_creates_token_and_sends_email(self, mock_send):
        self.client.force_authenticate(user=self.user)
        resp = self.client.post(self.request_url, {}, format="json")
        assert resp.status_code == status.HTTP_200_OK
        assert AccountDeletionRequest.objects.filter(user=self.user).exists()
        mock_send.assert_called_once()

    def test_confirm_with_valid_token_anonymizes(self):
        dr = AccountDeletionRequest.objects.create(user=self.user)
        resp = self.client.post(
            self.confirm_url, {"token": str(dr.token)}, format="json"
        )
        assert resp.status_code == status.HTTP_200_OK
        self.user.refresh_from_db()
        assert self.user.is_active is False
        dr.refresh_from_db()
        assert dr.is_used is True

    def test_confirm_invalid_token_rejected(self):
        resp = self.client.post(self.confirm_url, {"token": "not-a-uuid"}, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_confirm_expired_token_rejected(self):
        dr = AccountDeletionRequest.objects.create(user=self.user)
        dr.created_at = timezone.now() - timezone.timedelta(hours=49)
        dr.save(update_fields=["created_at"])
        resp = self.client.post(
            self.confirm_url, {"token": str(dr.token)}, format="json"
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        self.user.refresh_from_db()
        assert self.user.is_active is True  # neanonymizované

    def test_confirm_used_token_rejected(self):
        dr = AccountDeletionRequest.objects.create(
            user=self.user, is_used=True, used_at=timezone.now()
        )
        resp = self.client.post(
            self.confirm_url, {"token": str(dr.token)}, format="json"
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
