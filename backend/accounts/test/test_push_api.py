from cryptography.fernet import Fernet
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import WebPushSubscription

User = get_user_model()


TEST_PUSH_SETTINGS = {
    "WEB_PUSH_VAPID_PUBLIC_KEY": "test-public-key",
    "WEB_PUSH_SUBSCRIPTION_ENCRYPTION_KEY": Fernet.generate_key().decode("utf-8"),
}


@override_settings(**TEST_PUSH_SETTINGS)
class WebPushApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="push-user",
            email="push@example.com",
            password="testpass123",
        )
        self.other_user = User.objects.create_user(
            username="other-push-user",
            email="other-push@example.com",
            password="testpass123",
        )
        self.client.force_authenticate(user=self.user)
        self.subscribe_url = reverse("accounts:push_subscriptions")
        self.delete_url = reverse("accounts:push_subscription_current")
        self.public_key_url = reverse("accounts:push_vapid_public_key")
        self.subscription = {
            "endpoint": "https://push.example.test/subscriptions/device-1",
            "keys": {
                "p256dh": "p256dh-test-key",
                "auth": "auth-test-key",
            },
        }

    def test_vapid_public_key_returns_configured_value(self):
        response = self.client.get(self.public_key_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {"public_key": TEST_PUSH_SETTINGS["WEB_PUSH_VAPID_PUBLIC_KEY"]},
        )

    def test_vapid_public_key_requires_authentication(self):
        client = APIClient()

        response = client.get(self.public_key_url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_subscribe_creates_encrypted_subscription(self):
        response = self.client.post(
            self.subscribe_url,
            {
                "subscription": self.subscription,
                "device_label": "Chrome desktop",
            },
            format="json",
            HTTP_USER_AGENT="pytest-agent",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data, {"ok": True, "created": True})

        subscription = WebPushSubscription.objects.get()
        self.assertEqual(subscription.user, self.user)
        self.assertEqual(subscription.device_label, "Chrome desktop")
        self.assertEqual(subscription.user_agent, "pytest-agent")
        self.assertNotEqual(
            subscription.endpoint_encrypted,
            self.subscription["endpoint"],
        )
        self.assertNotIn(self.subscription["endpoint"], subscription.endpoint_encrypted)
        self.assertEqual(subscription.endpoint, self.subscription["endpoint"])
        self.assertEqual(subscription.p256dh, self.subscription["keys"]["p256dh"])
        self.assertEqual(subscription.auth, self.subscription["keys"]["auth"])

    def test_subscribe_rebinds_existing_endpoint_to_latest_user(self):
        self.client.post(
            self.subscribe_url,
            {"subscription": self.subscription},
            format="json",
        )

        other_client = APIClient()
        other_client.force_authenticate(user=self.other_user)
        response = other_client.post(
            self.subscribe_url,
            {
                "subscription": {
                    "endpoint": self.subscription["endpoint"],
                    "keys": {
                        "p256dh": "new-p256dh",
                        "auth": "new-auth",
                    },
                }
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {"ok": True, "created": False})
        self.assertEqual(WebPushSubscription.objects.count(), 1)

        subscription = WebPushSubscription.objects.get()
        self.assertEqual(subscription.user, self.other_user)
        self.assertEqual(subscription.p256dh, "new-p256dh")
        self.assertEqual(subscription.auth, "new-auth")

    def test_delete_current_removes_only_matching_subscription(self):
        self.client.post(
            self.subscribe_url,
            {"subscription": self.subscription},
            format="json",
        )

        second_subscription = {
            "endpoint": "https://push.example.test/subscriptions/device-2",
            "keys": {
                "p256dh": "second-p256dh",
                "auth": "second-auth",
            },
        }
        other_client = APIClient()
        other_client.force_authenticate(user=self.other_user)
        other_client.post(
            self.subscribe_url,
            {"subscription": second_subscription},
            format="json",
        )

        response = self.client.delete(
            self.delete_url,
            {"endpoint": self.subscription["endpoint"]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {"ok": True, "deleted": True})
        self.assertEqual(WebPushSubscription.objects.count(), 1)
        self.assertEqual(WebPushSubscription.objects.get().user, self.other_user)

    @override_settings(
        WEB_PUSH_VAPID_PUBLIC_KEY="test-public-key",
        WEB_PUSH_SUBSCRIPTION_ENCRYPTION_KEY="",
    )
    def test_subscribe_returns_503_when_encryption_key_is_missing(self):
        response = self.client.post(
            self.subscribe_url,
            {"subscription": self.subscription},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(
            response.data,
            {"error": "Push notifikácie momentálne nie sú dostupné."},
        )
        self.assertEqual(WebPushSubscription.objects.count(), 0)
