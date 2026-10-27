"""Správy: multipart požiadavka bez tela (fotka z iPhonu nedorazila) dostane vlastný kód, nie „Neplatné údaje“."""

import shutil
import tempfile
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from messaging.models import Message
from messaging.services.conversations import open_or_create_direct_conversation

User = get_user_model()

MULTIPART = "multipart/form-data; boundary=----WebKitFormBoundaryAbCdEf123456"
IPHONE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_1 like Mac OS X) AppleWebKit/605.1.15"


@pytest.mark.django_db
class TestMessagingEmptyUpload(APITestCase):
    def setUp(self):
        cache.clear()
        media_root = tempfile.mkdtemp()
        override = override_settings(MEDIA_ROOT=media_root, SAFESEARCH_ENABLED=False)
        override.enable()
        self.addCleanup(override.disable)
        self.addCleanup(lambda: shutil.rmtree(media_root, ignore_errors=True))
        push = patch(
            "messaging.services.push_enqueue.deliver_message_push_task.delay",
            return_value=None,
        )
        push.start()
        self.addCleanup(push.stop)
        self.u1 = User.objects.create_user(
            username="u1", email="u1@example.com", password="StrongPass123",
            is_verified=True, is_active=True,
        )
        self.u2 = User.objects.create_user(
            username="u2", email="u2@example.com", password="StrongPass123",
            is_verified=True, is_active=True,
        )
        self.convo = open_or_create_direct_conversation(actor=self.u1, target=self.u2).conversation
        self.send_url = reverse(
            "accounts:messaging_send_message", kwargs={"conversation_id": self.convo.id}
        )
        self.direct_url = reverse("accounts:messaging_send_direct_message")

    def tearDown(self):
        cache.clear()

    def _post_empty_multipart(self, url, **extra):
        """Pošle POST s hlavičkou multipart, ale bez tela (ako chybný iOS)."""
        return self.client.generic(
            "POST", url, data=b"", content_type=MULTIPART, CONTENT_LENGTH="0", **extra
        )

    def test_empty_multipart_send_gets_a_dedicated_code(self):
        self.client.force_authenticate(user=self.u1)

        response = self._post_empty_multipart(self.send_url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data == {"code": "empty_message_upload"}
        assert Message.objects.count() == 0

    def test_empty_multipart_direct_send_gets_a_dedicated_code(self):
        self.client.force_authenticate(user=self.u1)

        response = self._post_empty_multipart(self.direct_url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data == {"code": "empty_message_upload"}
        assert Message.objects.count() == 0

    def test_empty_multipart_is_logged_with_the_device_but_without_personal_data(self):
        self.client.force_authenticate(user=self.u1)

        with self.assertLogs("swaply.empty_upload", level="WARNING") as logs:
            self._post_empty_multipart(self.send_url, HTTP_USER_AGENT=IPHONE_UA)

        output = "\n".join(logs.output)
        assert "iPhone OS 27_0_1" in output
        assert "code=empty_message_upload" in output
        assert self.send_url in output
        assert "u1@example.com" not in output

    def test_unauthenticated_empty_multipart_is_still_rejected_by_auth(self):
        response = self._post_empty_multipart(self.send_url)

        assert response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
        assert Message.objects.count() == 0

    def test_multipart_with_text_only_is_not_treated_as_an_empty_upload(self):
        self.client.force_authenticate(user=self.u1)

        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(self.send_url, {"text": "Ahoj"}, format="multipart")

        assert response.status_code == status.HTTP_201_CREATED
        assert Message.objects.get().text == "Ahoj"

    def test_json_message_still_works(self):
        self.client.force_authenticate(user=self.u1)

        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(self.send_url, {"text": "Ahoj"}, format="json")

        assert response.status_code == status.HTTP_201_CREATED
