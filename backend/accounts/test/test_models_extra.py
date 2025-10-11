import pytest
from django.utils import timezone
from accounts.models import EmailVerification, User


@pytest.mark.django_db
def test_email_verification_is_expired_and_verify_flow():
    user = User.objects.create_user(username='u1', email='u1@example.com', password='Pass12345')
    ev = EmailVerification.objects.create(user=user)
    assert ev.is_used is False
    assert ev.is_expired() is False

    ok = ev.verify()
    assert ok is True
    ev.refresh_from_db()
    user.refresh_from_db()
    assert ev.is_used is True
    assert user.is_verified is True


