from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from messaging.models import Conversation, Message


User = get_user_model()


@pytest.mark.django_db
class TestMessagingProfileShareApi(APITestCase):
    def setUp(self):
        cache.clear()
        self.push_delay_patcher = patch(
            "messaging.services.push_enqueue.deliver_message_push_task.delay",
            return_value=None,
        )
        self.push_delay_patcher.start()
        self.addCleanup(self.push_delay_patcher.stop)
        self.sender = User.objects.create_user(
            username="sender",
            email="sender@example.com",
            password="StrongPass123",
            is_verified=True,
            is_active=True,
        )
        self.recipient = User.objects.create_user(
            username="recipient",
            email="recipient@example.com",
            password="StrongPass123",
            is_verified=True,
            is_active=True,
        )
        self.second_recipient = User.objects.create_user(
            username="recipient2",
            email="recipient2@example.com",
            password="StrongPass123",
            is_verified=True,
            is_active=True,
        )
        self.shared_user = User.objects.create_user(
            username="shared",
            email="shared@example.com",
            password="StrongPass123",
            first_name="Shared",
            last_name="Profile",
            is_verified=True,
            is_active=True,
            is_public=True,
        )

    def tearDown(self):
        cache.clear()

    def _url(self) -> str:
        return reverse("accounts:messaging_send_profile_share")

    def test_send_profile_share_to_multiple_recipients(self):
        self.client.force_authenticate(user=self.sender)

        with patch("messaging.api.profile_share_views.notify_user") as notify_user_mock:
            response = self.client.post(
                self._url(),
                {
                    "shared_user_id": self.shared_user.id,
                    "recipient_user_ids": [self.recipient.id, self.second_recipient.id],
                },
                format="json",
            )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["failed"] == []
        assert [item["user_id"] for item in response.data["sent"]] == [
            self.recipient.id,
            self.second_recipient.id,
        ]

        first_message = response.data["sent"][0]["message"]
        assert first_message["message_type"] == Message.Type.PROFILE_SHARE
        assert first_message["metadata"] == {}
        assert first_message["profile_share"]["id"] == self.shared_user.id
        assert first_message["profile_share"]["display_name"] == "Shared Profile"

        messages = Message.objects.filter(message_type=Message.Type.PROFILE_SHARE)
        assert messages.count() == 2
        assert all(
            message.metadata == {"shared_user_id": self.shared_user.id}
            for message in messages
        )
        assert (
            Conversation.objects.filter(
                requested_by=self.sender,
                requested_to__in=[self.recipient, self.second_recipient],
                request_status=Conversation.RequestStatus.PENDING,
            ).count()
            == 2
        )
        notified_user_ids = [call.args[0] for call in notify_user_mock.call_args_list]
        assert notified_user_ids == [self.recipient.id, self.second_recipient.id]

    def test_profile_share_requires_public_active_shared_profile(self):
        self.shared_user.is_public = False
        self.shared_user.save(update_fields=["is_public"])
        self.client.force_authenticate(user=self.sender)

        response = self.client.post(
            self._url(),
            {
                "shared_user_id": self.shared_user.id,
                "recipient_user_ids": [self.recipient.id],
            },
            format="json",
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert (
            Message.objects.filter(message_type=Message.Type.PROFILE_SHARE).count() == 0
        )

    def test_profile_share_respects_pending_request_message_limit(self):
        self.client.force_authenticate(user=self.sender)

        first = self.client.post(
            self._url(),
            {
                "shared_user_id": self.shared_user.id,
                "recipient_user_ids": [self.recipient.id],
            },
            format="json",
        )
        second = self.client.post(
            self._url(),
            {
                "shared_user_id": self.shared_user.id,
                "recipient_user_ids": [self.recipient.id],
            },
            format="json",
        )
        third = self.client.post(
            self._url(),
            {
                "shared_user_id": self.shared_user.id,
                "recipient_user_ids": [self.recipient.id],
            },
            format="json",
        )

        assert first.status_code == status.HTTP_200_OK
        assert second.status_code == status.HTTP_200_OK
        assert third.status_code == status.HTTP_200_OK
        assert third.data["sent"] == []
        assert third.data["failed"] == [
            {"user_id": self.recipient.id, "code": "message_request_pending"}
        ]
        assert (
            Message.objects.filter(message_type=Message.Type.PROFILE_SHARE).count() == 2
        )
