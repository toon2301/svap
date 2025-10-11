import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from accounts.serializers import (
    UserRegistrationSerializer,
    UserLoginSerializer,
    UserProfileSerializer,
)
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse


User = get_user_model()


@pytest.mark.django_db
class TestUserRegistrationSerializer:
    def test_password_mismatch(self):
        s = UserRegistrationSerializer(data={
            'username': 'u1', 'email': 'u1@example.com',
            'password': 'StrongPass123', 'password_confirm': 'Mismatch123',
            'user_type': 'individual', 'captcha_token': 'test_captcha_token'
        })
        assert s.is_valid() is False
        assert 'Heslá sa nezhodujú' in str(s.errors)

    def test_company_requires_name(self):
        s = UserRegistrationSerializer(data={
            'username': 'u2', 'email': 'u2@example.com',
            'password': 'StrongPass123', 'password_confirm': 'StrongPass123',
            'user_type': 'company', 'captcha_token': 'test_captcha_token'
        })
        assert s.is_valid() is False
        assert 'Názov firmy je povinný' in str(s.errors)

    def test_underage_rejected(self):
        s = UserRegistrationSerializer(data={
            'username': 'u3', 'email': 'u3@example.com',
            'password': 'StrongPass123', 'password_confirm': 'StrongPass123',
            'user_type': 'individual',
            'birth_day': '01', 'birth_month': '01', 'birth_year': '2020',
            'captcha_token': 'test_captcha_token'
        })
        assert s.is_valid() is False
        assert 'aspoň 13 rokov' in str(s.errors)

    def test_unique_email_username(self):
        User.objects.create_user(username='taken', email='taken@example.com', password='StrongPass123', is_verified=True)
        s1 = UserRegistrationSerializer(data={
            'username': 'taken', 'email': 'new@example.com',
            'password': 'StrongPass123', 'password_confirm': 'StrongPass123',
            'user_type': 'individual', 'captcha_token': 'test_captcha_token'
        })
        assert s1.is_valid() is False

        s2 = UserRegistrationSerializer(data={
            'username': 'new', 'email': 'taken@example.com',
            'password': 'StrongPass123', 'password_confirm': 'StrongPass123',
            'user_type': 'individual', 'captcha_token': 'test_captcha_token'
        })
        assert s2.is_valid() is False


@pytest.mark.django_db
class TestUserLoginSerializer:
    def test_unverified_user_allowed_temporarily(self):
        User.objects.create_user(username='u', email='u@example.com', password='StrongPass123', is_verified=False)
        s = UserLoginSerializer(data={'email': 'u@example.com', 'password': 'StrongPass123'})
        assert s.is_valid() is True


@pytest.mark.django_db
class TestUserProfileSerializerValidators:
    def setup_method(self):
        self.user = User.objects.create_user(username='v', email='v@example.com', password='StrongPass123', is_verified=True)

    def test_invalid_phone(self):
        s = UserProfileSerializer(instance=self.user, data={'phone': 'abc'}, partial=True)
        assert s.is_valid() is False

    def test_invalid_website_scheme(self):
        s = UserProfileSerializer(instance=self.user, data={'website': 'ftp://example.com'}, partial=True)
        assert s.is_valid() is False

    def test_invalid_linkedin(self):
        s = UserProfileSerializer(instance=self.user, data={'linkedin': 'javascript:alert(1)'}, partial=True)
        assert s.is_valid() is False

    def test_location_too_long(self):
        s = UserProfileSerializer(instance=self.user, data={'location': 'x' * 101}, partial=True)
        assert s.is_valid() is False


@pytest.mark.django_db
class TestBioAnd2FAFlows(APITestCase):
    def test_bio_sanitization_filters_script(self):
        user = User.objects.create_user(username='bio', email='bio@example.com', password='StrongPass123', is_verified=True)
        self.client.force_authenticate(user=user)
        url = reverse('accounts:update_profile')
        payload = {'bio': '<script>alert(1)</script>Clean'}
        r = self.client.patch(url, payload, format='json')
        assert r.status_code == status.HTTP_200_OK
        assert 'Clean' in r.data['user']['bio']
        assert '<script>' not in r.data['user']['bio']

    def test_login_requires_totp_when_enabled(self):
        from accounts.models import UserProfile
        import pyotp
        user = User.objects.create_user(username='mfa', email='mfa@example.com', password='StrongPass123', is_verified=True)
        secret = pyotp.random_base32()
        UserProfile.objects.create(user=user, mfa_enabled=True, mfa_secret=secret)
        url = reverse('accounts:login')
        # Bez TOTP
        r = self.client.post(url, {'email': 'mfa@example.com', 'password': 'StrongPass123'}, format='json')
        assert r.status_code == status.HTTP_400_BAD_REQUEST
        # S TOTP
        totp = pyotp.TOTP(secret)
        code = totp.now()
        r2 = self.client.post(url, {'email': 'mfa@example.com', 'password': 'StrongPass123', 'totp': code}, format='json')
        assert r2.status_code == status.HTTP_200_OK

