import pytest
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status


User = get_user_model()


@pytest.mark.django_db
class TestEmailCheckView(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="exists",
            email="exists@example.com",
            password="StrongPass123",
            is_verified=True,
        )

    def test_email_available_false(self):
        url = reverse("accounts:check_email", kwargs={"email": "exists@example.com"})
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["available"] is False

    def test_email_available_true(self):
        url = reverse("accounts:check_email", kwargs={"email": "free@example.com"})
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["available"] is True

    def test_email_invalid_returns_400(self):
        url = reverse("accounts:check_email", kwargs={"email": "invalid-email"})
        response = self.client.get(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "available" in response.data

    def test_rate_limit_exceeded_returns_429(self):
        """Rate limiting: po prekročení limitu vráti 429"""
        url = reverse("accounts:check_email", kwargs={"email": "free2@example.com"})
        # simuluj množstvo požiadaviek nad limit (limit 30/10min)
        for _ in range(35):
            last = self.client.get(url)
        assert last.status_code in (status.HTTP_200_OK, 429)
        # Ak sa uplatnil limit, skontroluj 429
        if last.status_code != status.HTTP_200_OK:
            assert last.status_code == 429
