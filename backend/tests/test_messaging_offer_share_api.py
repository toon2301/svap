from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import OfferedSkill, UserBlock
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

    def _assert_offer_rejected_after_user_lock(
        self,
        *,
        offer_updates: dict | None = None,
        owner_updates: dict | None = None,
    ) -> None:
        owner = User.objects.create_user(
            username=f"locked-owner-{User.objects.count()}",
            email=f"locked-owner-{User.objects.count()}@example.com",
            password="StrongPass123",
            is_active=True,
            is_public=True,
        )
        offer = OfferedSkill.objects.create(
            user=owner,
            category="Repairs",
            description="Offer whose visibility changes after user locking.",
        )
        self.client.force_authenticate(user=self.sender)

        def update_after_user_lock(**_kwargs):
            if offer_updates:
                OfferedSkill.objects.filter(pk=offer.pk).update(**offer_updates)
            if owner_updates:
                User.objects.filter(pk=owner.pk).update(**owner_updates)

        with patch(
            "messaging.services.offer_shares.lock_users_for_update",
            side_effect=update_after_user_lock,
        ):
            response = self.client.post(
                self._url(),
                {
                    "shared_offer_id": offer.id,
                    "recipient_user_ids": [self.recipient.id],
                },
                format="json",
            )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert not Message.objects.filter(message_type=Message.Type.OFFER_SHARE).exists()

    def test_send_offer_share_to_recipient(self):
        self.client.force_authenticate(user=self.sender)

        with patch("messaging.api.notification_dispatch.notify_user") as notify_user_mock:
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

        with patch("messaging.api.notification_dispatch.notify_user") as notify_user_mock:
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

    def test_blocked_offer_owner_cannot_be_shared_by_known_id(self):
        owner = User.objects.create_user(
            username="third-owner",
            email="third-owner@example.com",
            password="StrongPass123",
            is_active=True,
            is_public=True,
        )
        offer = OfferedSkill.objects.create(
            user=owner,
            category="Repairs",
            description="Third-party offer",
        )
        UserBlock.objects.create(blocker=owner, blocked_user=self.sender)
        self.client.force_authenticate(user=self.sender)

        response = self.client.post(
            self._url(),
            {
                "shared_offer_id": offer.id,
                "recipient_user_ids": [self.recipient.id],
            },
            format="json",
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert not Message.objects.filter(message_type=Message.Type.OFFER_SHARE).exists()

    def test_offer_share_rechecks_block_state_after_lock(self):
        owner = User.objects.create_user(
            username="race-owner",
            email="race-owner@example.com",
            password="StrongPass123",
            is_active=True,
            is_public=True,
        )
        offer = OfferedSkill.objects.create(
            user=owner,
            category="Repairs",
            description="Race-protected offer",
        )
        self.client.force_authenticate(user=self.sender)

        def create_block_after_lock(**_kwargs):
            UserBlock.objects.create(blocker=owner, blocked_user=self.sender)

        with patch(
            "messaging.services.offer_shares.lock_users_for_update",
            side_effect=create_block_after_lock,
        ):
            response = self.client.post(
                self._url(),
                {
                    "shared_offer_id": offer.id,
                    "recipient_user_ids": [self.recipient.id],
                },
                format="json",
            )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert not Message.objects.filter(message_type=Message.Type.OFFER_SHARE).exists()

    def test_offer_share_rechecks_hidden_state_after_user_lock(self):
        self._assert_offer_rejected_after_user_lock(offer_updates={"is_hidden": True})

    def test_offer_share_rechecks_owner_active_state_after_user_lock(self):
        self._assert_offer_rejected_after_user_lock(owner_updates={"is_active": False})

    def test_offer_share_rechecks_owner_public_state_after_user_lock(self):
        self._assert_offer_rejected_after_user_lock(owner_updates={"is_public": False})

    def test_historical_offer_share_is_hidden_only_from_blocked_viewer(self):
        owner = User.objects.create_user(
            username="history-owner",
            email="history-owner@example.com",
            password="StrongPass123",
            is_active=True,
            is_public=True,
        )
        offer = OfferedSkill.objects.create(
            user=owner,
            category="Repairs",
            description="Historical shared offer",
        )
        self.client.force_authenticate(user=self.sender)
        sent = self.client.post(
            self._url(),
            {
                "shared_offer_id": offer.id,
                "recipient_user_ids": [self.recipient.id],
            },
            format="json",
        )
        conversation_id = sent.data["sent"][0]["conversation_id"]
        message_id = sent.data["sent"][0]["message"]["id"]
        history_url = reverse(
            "accounts:messaging_list_messages",
            kwargs={"conversation_id": conversation_id},
        )
        UserBlock.objects.create(blocker=owner, blocked_user=self.recipient)

        self.client.force_authenticate(user=self.recipient)
        recipient_history = self.client.get(history_url)
        recipient_message = next(
            item for item in recipient_history.data["results"] if item["id"] == message_id
        )

        self.client.force_authenticate(user=self.sender)
        sender_history = self.client.get(history_url)
        sender_message = next(
            item for item in sender_history.data["results"] if item["id"] == message_id
        )

        assert recipient_history.status_code == status.HTTP_200_OK
        assert recipient_message["offer_share"] is None
        assert sender_history.status_code == status.HTTP_200_OK
        assert sender_message["offer_share"]["id"] == offer.id
