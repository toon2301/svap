"""Testy pre code-review fixy (BOD 1 – lockout PII/atomicita, BOD 3 – MFA, BOD 7 – cancel)."""

import pytest
from cryptography.fernet import Fernet
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.exceptions import ImproperlyConfigured
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import OfferedSkill, SkillRequest, SkillRequestStatus
from accounts.models.mfa import _get_fernet, decrypt_mfa_secret, encrypt_mfa_secret
from accounts.views.auth_helpers import (
    _lock_keys_for_email,
    is_account_locked,
    register_login_failure,
)

User = get_user_model()


# ── BOD 1 – PII v lockout kľúčoch + atomický counter ──────────────────────────
def test_lockout_keys_do_not_contain_raw_email():
    fail_key, lock_key = _lock_keys_for_email("Jan.Novak@Gmail.com")
    assert "jan.novak@gmail.com" not in fail_key
    assert "gmail" not in fail_key.lower()
    assert "jan.novak@gmail.com" not in lock_key
    assert fail_key.startswith("login_failures:")
    assert lock_key.startswith("login_locked:")
    # Stabilné mapovanie: rovnaký email (case/space-insensitive) -> rovnaké kľúče.
    assert _lock_keys_for_email("  jan.novak@gmail.com ") == (fail_key, lock_key)


@pytest.mark.django_db
class TestLockoutCounter:
    def setup_method(self):
        cache.clear()

    def teardown_method(self):
        cache.clear()

    def test_lockout_triggers_after_max_attempts(self):
        # BOD 2: atomický incr – 5 neúspešných pokusov uzamkne účet.
        User.objects.create_user("lock", "lock@e.com", "StrongPass123")
        for _ in range(4):
            assert register_login_failure("lock@e.com") is False
        assert register_login_failure("lock@e.com") is True
        assert is_account_locked("lock@e.com") is True

    def test_no_lockout_for_nonexistent_account(self):
        assert register_login_failure("ghost@e.com") is False
        assert is_account_locked("ghost@e.com") is False


# ── BOD 5 – slug generovanie: retry pri UniqueConstraint kolízii ──────────────
@pytest.mark.django_db
class TestSlugRetry:
    def test_slug_collision_retries_and_succeeds(self):
        # Simulujeme race: druhý user má vynútene rovnaký slug ako existujúci ->
        # prvý super().save() spadne na IntegrityError, retry vygeneruje nový slug.
        a = User.objects.create_user("alpha", "alpha@e.com", "StrongPass123")

        b = User(username="beta", email="beta@e.com")
        b.set_password("StrongPass123")
        b.slug = a.slug  # vynútená kolízia

        b.save()  # nesmie vyhodiť IntegrityError – retry to vyrieši

        b.refresh_from_db()
        assert b.pk is not None
        assert b.slug and b.slug != a.slug


# ── BOD 3 – MFA šifrovanie: rozlíš chýbajúci vs neplatný kľúč ──────────────────
class TestMfaEncryption:
    def test_empty_key_returns_none_plaintext_fallback(self, settings):
        settings.MFA_ENCRYPTION_KEY = ""
        assert _get_fernet() is None
        assert encrypt_mfa_secret("abc") == "abc"  # plaintext fallback (spätná kompat.)

    def test_invalid_key_raises_improperly_configured(self, settings):
        settings.MFA_ENCRYPTION_KEY = "toto-nie-je-platny-fernet-kluc"
        with pytest.raises(ImproperlyConfigured):
            _get_fernet()
        with pytest.raises(ImproperlyConfigured):
            encrypt_mfa_secret("abc")  # fail loud, NIE tiché plaintext uloženie

    def test_valid_key_roundtrip(self, settings):
        settings.MFA_ENCRYPTION_KEY = Fernet.generate_key().decode()
        enc = encrypt_mfa_secret("super-secret")
        assert enc != "super-secret"
        assert decrypt_mfa_secret(enc) == "super-secret"


# ── BOD 7 – cancel len na PENDING žiadosti ────────────────────────────────────
@pytest.mark.django_db
class TestCancelValidation:
    def setup_method(self):
        cache.clear()
        self.client = APIClient()
        self.requester = User.objects.create_user(
            "req", "req@e.com", "StrongPass123", is_verified=True
        )
        self.owner = User.objects.create_user(
            "own", "own@e.com", "StrongPass123", is_verified=True
        )
        self.offer = OfferedSkill.objects.create(
            user=self.owner, category="IT", subcategory="Web"
        )

    def _make_request(self, status_value):
        return SkillRequest.objects.create(
            requester=self.requester,
            recipient=self.owner,
            offer=self.offer,
            status=status_value,
        )

    def test_cancel_on_accepted_returns_400(self):
        obj = self._make_request(SkillRequestStatus.ACCEPTED)
        self.client.force_authenticate(user=self.requester)
        r = self.client.patch(
            f"/api/auth/skill-requests/{obj.id}/", {"action": "cancel"}, format="json"
        )
        assert r.status_code == status.HTTP_400_BAD_REQUEST
        obj.refresh_from_db()
        assert obj.status == SkillRequestStatus.ACCEPTED  # stav nezmenený

    def test_cancel_on_pending_succeeds(self):
        obj = self._make_request(SkillRequestStatus.PENDING)
        self.client.force_authenticate(user=self.requester)
        r = self.client.patch(
            f"/api/auth/skill-requests/{obj.id}/", {"action": "cancel"}, format="json"
        )
        assert r.status_code == status.HTTP_200_OK
        obj.refresh_from_db()
        assert obj.status == SkillRequestStatus.CANCELLED


# ── BOD 8 – orphaned S3 objekt po SafeSearch odmietnutí ───────────────────────
@pytest.mark.django_db
class TestUploadModerationCleanup:
    def test_rejected_upload_deletes_staging_object(self, settings):
        from unittest.mock import MagicMock, patch

        from swaply.staged_image_moderation import ModerationRejectedError

        settings.SAFESEARCH_ENABLED = True
        settings.AWS_STORAGE_BUCKET_NAME = "test-bucket"

        owner = User.objects.create_user(
            "up", "up@e.com", "StrongPass123", is_verified=True
        )
        skill = OfferedSkill.objects.create(
            user=owner, category="IT", subcategory="Web"
        )
        key = f"uploads/offers/{skill.id}/img.jpg"

        s3 = MagicMock()
        s3.head_object.return_value = {
            "ContentLength": 1000,
            "ContentType": "image/jpeg",
        }

        client = APIClient()
        client.force_authenticate(user=owner)

        with patch(
            "accounts.views.skills_upload._get_s3_client", return_value=s3
        ), patch(
            "swaply.staged_image_moderation.moderate_staged_s3_image",
            side_effect=ModerationRejectedError("Nevhodný obsah."),
        ):
            r = client.post(
                f"/api/auth/skills/{skill.id}/images/upload-complete/",
                {"key": key},
                format="json",
            )

        assert r.status_code == status.HTTP_400_BAD_REQUEST
        # Orphan cleanup: staging objekt sa zmazal zo S3.
        s3.delete_object.assert_called_once_with(Bucket="test-bucket", Key=key)
