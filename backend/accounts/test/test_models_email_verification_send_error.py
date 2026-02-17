import pytest
from django.contrib.auth import get_user_model
from accounts.models import EmailVerification
from unittest.mock import patch


User = get_user_model()


@pytest.mark.django_db
def test_send_verification_email_error_path():
    user = User.objects.create_user(
        username="ev",
        email="ev@example.com",
        password="StrongPass123",
        is_verified=False,
    )
    ev = EmailVerification.objects.create(user=user)

    with patch("accounts.models.send_mail", side_effect=Exception("smtp error")):
        ok = ev.send_verification_email()
        assert ok is False
