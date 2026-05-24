from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import OfferedSkill
from messaging.models import Conversation, Message


User = get_user_model()


@pytest.mark.django_db
class TestMessagingOfferShareApi(APITestCase):
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
            is_public=True,
        )
        self.recipient = User.objects.create_user(
            username="recipient",
            email="recipient@example.com",
            password="StrongPass123",
            is_verified=True,
            is_active=True,
            is_public=True,
        )
        self.offer = OfferedSkill.objects.create(
            user=self.sender,
            category="Teaching",
            subcategory="English",
            description="English tutoring",
            location="Bratislava",
        )

    def tearDown(self):
        cache.clear()

    def _url(self) -> str:
        return reverse("accounts:messaging_send_offer_share")

    def test_send_offer_share_to_recipient(self):
        self.client.force_authenticate(user=self.sender)

        with patch("messaging.api.offer_share_views.notify_user") as notify_user_mock:
            response = self.client.post(
                self._url(),
                {
                    "shared_offer_id": self.offer.id,
                    "recipient_user_ids": [self.recipient.id],
                },
                format="json",
            )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["failed"] == []
        assert response.data["sent"][0]["user_id"] == self.recipient.id

        message_data = response.data["sent"][0]["message"]
        assert message_data["message_type"] == Message.Type.OFFER_SHARE
        assert message_data["metadata"] == {}
        assert message_data["offer_share"]["id"] == self.offer.id
        assert message_data["offer_share"]["title"] == "English tutoring"
        assert message_data["offer_share"]["location"] == "Bratislava"
        assert message_data["offer_share"]["owner"]["id"] == self.sender.id

        message = Message.objects.get(message_type=Message.Type.OFFER_SHARE)
        assert message.metadata == {"shared_offer_id": self.offer.id}
        assert Conversation.objects.filter(
            requested_by=self.sender,
            requested_to=self.recipient,
            request_status=Conversation.RequestStatus.PENDING,
        ).exists()
        assert [call.args[0] for call in notify_user_mock.call_args_list] == [
            self.recipient.id
        ]

    def test_send_offer_share_partial_failure_for_multiple_recipients(self):
        unavailable_recipient_id = self.sender.id
        self.client.force_authenticate(user=self.sender)

        with patch("messaging.api.offer_share_views.notify_user") as notify_user_mock:
            response = self.client.post(
                self._url(),
                {
                    "shared_offer_id": self.offer.id,
                    "recipient_user_ids": [
                        self.recipient.id,
                        unavailable_recipient_id,
                    ],
                },
                format="json",
            )

        assert response.status_code == status.HTTP_200_OK
        assert [item["user_id"] for item in response.data["sent"]] == [
            self.recipient.id
        ]
        assert response.data["failed"] == [
            {"user_id": unavailable_recipient_id, "code": "recipient_unavailable"}
        ]
        assert Message.objects.filter(message_type=Message.Type.OFFER_SHARE).count() == 1
        assert Conversation.objects.filter(
            requested_by=self.sender,
            requested_to=self.recipient,
            request_status=Conversation.RequestStatus.PENDING,
        ).count() == 1
        assert Conversation.objects.filter(
            requested_by=self.sender,
            requested_to=self.sender,
        ).count() == 0
        assert [call.args[0] for call in notify_user_mock.call_args_list] == [
            self.recipient.id
        ]

    def test_share_nonexistent_offer_returns_404(self):
        self.client.force_authenticate(user=self.sender)
        missing_offer_id = self.offer.id + 10_000

        response = self.client.post(
            self._url(),
            {
                "shared_offer_id": missing_offer_id,
                "recipient_user_ids": [self.recipient.id],
            },
            format="json",
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert Message.objects.filter(message_type=Message.Type.OFFER_SHARE).count() == 0

    def test_offer_share_requires_public_visible_offer(self):
        self.offer.is_hidden = True
        self.offer.save(update_fields=["is_hidden"])
        self.client.force_authenticate(user=self.sender)

        response = self.client.post(
            self._url(),
            {
                "shared_offer_id": self.offer.id,
                "recipient_user_ids": [self.recipient.id],
            },
            format="json",
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert Message.objects.filter(message_type=Message.Type.OFFER_SHARE).count() == 0
