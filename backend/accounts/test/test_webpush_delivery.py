from __future__ import annotations

from cryptography.fernet import Fernet
from celery.exceptions import Retry
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from unittest.mock import patch

from accounts.services.webpush_delivery import (
    MESSAGE_PUSH_BODY,
    MESSAGE_PUSH_TITLE,
    MESSAGE_PUSH_TYPE,
    MessagePushDeliveryResult,
    TemporaryWebPushDeliveryError,
    WebPushSubscriptionGone,
    deliver_message_push,
)
from accounts.services.webpush_subscriptions import upsert_web_push_subscription
from messaging.models import Conversation, ConversationParticipant, Message
from swaply.tasks.webpush import deliver_message_push_task

User = get_user_model()


@override_settings(
    WEB_PUSH_SUBSCRIPTION_ENCRYPTION_KEY=Fernet.generate_key().decode("utf-8"),
    WEB_PUSH_VAPID_PRIVATE_KEY="test-private-key",
    WEB_PUSH_VAPID_SUBJECT="mailto:info@svaply.com",
)
class WebPushDeliveryTests(TestCase):
    def setUp(self):
        self.sender = User.objects.create_user(
            username="push-sender",
            email="push-sender@example.com",
            password="testpass123",
        )
        self.recipient = User.objects.create_user(
            username="push-recipient",
            email="push-recipient@example.com",
            password="testpass123",
        )

        self.conversation = Conversation.objects.create(created_by=self.sender)
        ConversationParticipant.objects.create(
            conversation=self.conversation,
            user=self.sender,
        )
        ConversationParticipant.objects.create(
            conversation=self.conversation,
            user=self.recipient,
        )
        self.message = Message.objects.create(
            conversation=self.conversation,
            sender=self.sender,
            text="Citlivy text spravy sa nesmie dostat do push payloadu.",
        )
        self.subscription, _ = upsert_web_push_subscription(
            user=self.recipient,
            endpoint="https://push.example.test/subscriptions/device-1",
            p256dh="p256dh-test-key",
            auth="auth-test-key",
            user_agent="pytest-agent",
            device_label="Chrome desktop",
        )

    def test_deliver_message_push_sends_generic_payload_and_marks_success(self):
        with patch(
            "accounts.services.webpush_delivery.send_web_push_request",
            return_value=object(),
        ) as send_web_push_request_mock:
            result = deliver_message_push(
                message_id=self.message.id,
                recipient_user_ids=[self.recipient.id],
            )

        self.assertEqual(result.delivered_count, 1)
        self.assertEqual(result.retry_subscription_ids, ())
        send_web_push_request_mock.assert_called_once()

        payload = send_web_push_request_mock.call_args.kwargs["payload"]
        self.assertEqual(payload["type"], MESSAGE_PUSH_TYPE)
        self.assertEqual(payload["conversationId"], self.conversation.id)
        self.assertEqual(
            payload["url"],
            f"/dashboard/messages?conversationId={self.conversation.id}",
        )
        self.assertEqual(payload["title"], MESSAGE_PUSH_TITLE)
        self.assertEqual(payload["body"], MESSAGE_PUSH_BODY)
        self.assertEqual(
            payload["tag"],
            f"messages-conversation-{self.conversation.id}",
        )
        self.assertNotIn("Citlivy text", payload["body"])

        self.subscription.refresh_from_db()
        self.assertIsNotNone(self.subscription.last_success_at)
        self.assertEqual(self.subscription.failure_count, 0)
        self.assertIsNone(self.subscription.last_failure_at)
        self.assertTrue(self.subscription.is_active)

    def test_deliver_message_push_deactivates_subscription_after_gone_response(self):
        with patch(
            "accounts.services.webpush_delivery.send_web_push_request",
            side_effect=WebPushSubscriptionGone("gone"),
        ):
            result = deliver_message_push(
                message_id=self.message.id,
                recipient_user_ids=[self.recipient.id],
            )

        self.assertEqual(result.delivered_count, 0)
        self.assertEqual(result.retry_subscription_ids, ())

        self.subscription.refresh_from_db()
        self.assertFalse(self.subscription.is_active)
        self.assertEqual(self.subscription.failure_count, 1)
        self.assertIsNotNone(self.subscription.last_failure_at)

    def test_deliver_message_push_collects_retry_ids_for_temporary_failures(self):
        with patch(
            "accounts.services.webpush_delivery.send_web_push_request",
            side_effect=TemporaryWebPushDeliveryError("temporary"),
        ):
            result = deliver_message_push(
                message_id=self.message.id,
                recipient_user_ids=[self.recipient.id],
            )

        self.assertEqual(result.delivered_count, 0)
        self.assertEqual(result.retry_subscription_ids, (self.subscription.id,))

        self.subscription.refresh_from_db()
        self.assertTrue(self.subscription.is_active)
        self.assertEqual(self.subscription.failure_count, 1)
        self.assertIsNotNone(self.subscription.last_failure_at)

    def test_deliver_message_push_skips_users_with_disabled_push_preference(self):
        self.recipient.profile.push_notifications = False
        self.recipient.profile.save(update_fields=["push_notifications"])

        with patch(
            "accounts.services.webpush_delivery.send_web_push_request",
        ) as send_web_push_request_mock:
            result = deliver_message_push(
                message_id=self.message.id,
                recipient_user_ids=[self.recipient.id],
            )

        self.assertEqual(result.delivered_count, 0)
        self.assertEqual(result.retry_subscription_ids, ())
        send_web_push_request_mock.assert_not_called()

    def test_deliver_message_push_task_retries_only_failed_subscription_ids(self):
        retry_result = MessagePushDeliveryResult(
            delivered_count=1,
            retry_subscription_ids=(self.subscription.id,),
        )

        with patch(
            "swaply.tasks.webpush.deliver_message_push",
            return_value=retry_result,
        ), patch.object(
            deliver_message_push_task,
            "retry",
            side_effect=Retry(),
        ) as retry_mock:
            with self.assertRaises(Retry):
                deliver_message_push_task.run(
                    message_id=self.message.id,
                    recipient_user_ids=[self.recipient.id],
                )

        retry_mock.assert_called_once_with(
            kwargs={
                "message_id": self.message.id,
                "recipient_user_ids": [self.recipient.id],
                "subscription_ids": [self.subscription.id],
            },
            countdown=60,
        )
