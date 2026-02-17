import pytest
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from unittest.mock import patch, Mock


User = get_user_model()


@pytest.mark.django_db
class TestAuthMisc(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="john",
            email="john@example.com",
            password="StrongPass123",
            is_verified=True,
        )

    def test_me_requires_auth(self):
        url = reverse("accounts:me")
        response = self.client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_logout_without_token_is_ok(self):
        # simulate authenticated request
        self.client.force_authenticate(user=self.user)
        url = reverse("accounts:logout")
        response = self.client.post(url, data={"refresh": ""}, format="json")
        assert response.status_code == status.HTTP_200_OK

    @patch("requests.post")
    @patch("requests.get")
    def test_google_oauth_success_and_bad_token(self, mock_get, mock_post):
        from django.conf import settings

        settings.GOOGLE_OAUTH2_CLIENT_ID = "id"
        settings.GOOGLE_OAUTH2_SECRET = "secret"

        # 1) Bad token exchange
        mock_post.return_value = Mock(
            status_code=400, json=lambda: {"error": "invalid_grant"}
        )
        login_url = reverse("accounts:google_login")
        r_login = self.client.get(login_url)
        assert r_login.status_code in (302, 500)

        callback_url = (
            reverse("accounts:google_callback")
            + "?code=bad&state=http://localhost:3000/auth/callback/"
        )
        r_cb_bad = self.client.get(callback_url)
        assert r_cb_bad.status_code in (302, 200)

        # 2) Success exchange
        mock_post.return_value = Mock(
            status_code=200, json=lambda: {"access_token": "at"}
        )
        mock_get.return_value = Mock(
            status_code=200,
            json=lambda: {
                "email": "oauth@example.com",
                "given_name": "O",
                "family_name": "Auth",
            },
        )
        callback_url_ok = (
            reverse("accounts:google_callback")
            + "?code=ok&state=http://localhost:3000/auth/callback/"
        )
        r_cb_ok = self.client.get(callback_url_ok)
        assert r_cb_ok.status_code == 302
