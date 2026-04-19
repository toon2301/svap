from io import BytesIO
import pytest
import shutil
import tempfile
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import patch

from accounts.models import OfferedSkill
from messaging.models import Conversation, ConversationParticipant, Message
from messaging.services.conversations import open_or_create_direct_conversation


User = get_user_model()


@pytest.mark.django_db
class TestMessagingApi(APITestCase):
    def setUp(self):
        cache.clear()
        self.temp_media_root = tempfile.mkdtemp()
        self.media_override = override_settings(
            MEDIA_ROOT=self.temp_media_root,
            SAFESEARCH_ENABLED=False,
        )
        self.media_override.enable()
        self.addCleanup(self.media_override.disable)
        self.addCleanup(lambda: shutil.rmtree(self.temp_media_root, ignore_errors=True))
        self.push_delay_patcher = patch(
            "messaging.services.push_enqueue.deliver_message_push_task.delay",
            return_value=None,
        )
        self.push_delay_mock = self.push_delay_patcher.start()
        self.addCleanup(self.push_delay_patcher.stop)
        self.u1 = User.objects.create_user(
            username="u1",
            email="u1@example.com",
            password="StrongPass123",
            is_verified=True,
            is_active=True,
        )
        self.u2 = User.objects.create_user(
            username="u2",
            email="u2@example.com",
            password="StrongPass123",
            is_verified=True,
            is_active=True,
        )
        self.u3 = User.objects.create_user(
            username="u3",
            email="u3@example.com",
            password="StrongPass123",
            is_verified=True,
            is_active=True,
        )

    def tearDown(self):
        cache.clear()

    def _create_direct_conversation(self, actor, target) -> Conversation:
        result = open_or_create_direct_conversation(actor=actor, target=target)
        return result.conversation

    def _sample_image_upload(self, name: str = "chat.png") -> SimpleUploadedFile:
        buffer = BytesIO()
        Image.new("RGB", (2, 2), (255, 0, 0)).save(buffer, format="PNG")
        return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")

    def test_open_conversation_returns_draft_without_creating_database_rows(self):
        self.client.force_authenticate(user=self.u1)
        url = reverse("accounts:messaging_open")

        response = self.client.post(url, {"target_user_id": self.u2.id}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] is None
        assert response.data["is_draft"] is True
        assert response.data["target_user_id"] == self.u2.id
        assert response.data["other_user"]["id"] == self.u2.id
        assert response.data["has_requestable_offers"] is False
        assert Conversation.objects.count() == 0
        assert ConversationParticipant.objects.count() == 0

    def test_open_conversation_keeps_old_empty_conversation_hidden(self):
        self._create_direct_conversation(actor=self.u1, target=self.u2)

        self.client.force_authenticate(user=self.u1)
        url = reverse("accounts:messaging_open")
        response = self.client.post(url, {"target_user_id": self.u2.id}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] is None
        assert response.data["is_draft"] is True
        assert Conversation.objects.count() == 1
        assert ConversationParticipant.objects.count() == 2
        assert Message.objects.count() == 0

    def test_open_conversation_draft_exposes_requestable_offers_flag(self):
        OfferedSkill.objects.create(
            user=self.u2,
            category="IT",
            subcategory="Frontend",
            description="Mentoring",
            location="Bratislava",
            district="Bratislava I",
            is_hidden=False,
            is_seeking=False,
        )

        self.client.force_authenticate(user=self.u1)
        url = reverse("accounts:messaging_open")

        response = self.client.post(url, {"target_user_id": self.u2.id}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] is None
        assert response.data["is_draft"] is True
        assert response.data["has_requestable_offers"] is True

    def test_open_conversation_returns_existing_started_conversation(self):
        convo = self._create_direct_conversation(actor=self.u1, target=self.u2)

        self.client.force_authenticate(user=self.u1)
        send_url = reverse("accounts:messaging_send_message", kwargs={"conversation_id": convo.id})
        send_response = self.client.post(send_url, {"text": "Ahoj"}, format="json")
        assert send_response.status_code == status.HTTP_201_CREATED

        open_url = reverse("accounts:messaging_open")
        open_response = self.client.post(open_url, {"target_user_id": self.u2.id}, format="json")

        assert open_response.status_code == status.HTTP_200_OK
        assert open_response.data["id"] == convo.id
        assert open_response.data["is_draft"] is False
        assert open_response.data["created"] is False

    def test_open_conversation_returns_draft_when_started_conversation_is_hidden_for_user(self):
        convo = self._create_direct_conversation(actor=self.u1, target=self.u2)

        self.client.force_authenticate(user=self.u2)
        send_url = reverse("accounts:messaging_send_message", kwargs={"conversation_id": convo.id})
        assert self.client.post(send_url, {"text": "Ahoj"}, format="json").status_code == status.HTTP_201_CREATED

        self.client.force_authenticate(user=self.u1)
        hide_url = reverse(
            "accounts:messaging_hide_conversation",
            kwargs={"conversation_id": convo.id},
        )
        hide_response = self.client.post(hide_url, {}, format="json")
        assert hide_response.status_code == status.HTTP_200_OK

        open_url = reverse("accounts:messaging_open")
        open_response = self.client.post(open_url, {"target_user_id": self.u2.id}, format="json")

        assert open_response.status_code == status.HTTP_200_OK
        assert open_response.data["id"] is None
        assert open_response.data["is_draft"] is True
        assert open_response.data["target_user_id"] == self.u2.id

    def test_start_direct_message_creates_conversation_and_emits_realtime_event(self):
        self.client.force_authenticate(user=self.u1)
        url = reverse("accounts:messaging_send_direct_message")

        with patch("messaging.api.views.notify_user") as notify_user_mock:
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.post(
                    url,
                    {"target_user_id": self.u2.id, "text": "Ahoj"},
                    format="json",
                )

        assert response.status_code == status.HTTP_201_CREATED
        assert Conversation.objects.count() == 1
        assert ConversationParticipant.objects.count() == 2
        assert Message.objects.count() == 1
        assert response.data["conversation_created"] is True
        assert isinstance(response.data["conversation_id"], int)
        assert response.data["message"]["text"] == "Ahoj"

        notify_user_mock.assert_called_once()
        called_user_id, event = notify_user_mock.call_args.args
        assert called_user_id == self.u2.id
        assert event["type"] == "messaging_message"
        assert event["conversation_id"] == response.data["conversation_id"]
        assert event["message_id"] == response.data["message"]["id"]
        assert event["sender_id"] == self.u1.id
        assert isinstance(event["created_at"], str)
        assert event["conversation_unread_count"] == 1
        assert event["total_unread_count"] == 1
        self.push_delay_mock.assert_called_once_with(
            message_id=response.data["message"]["id"],
            recipient_user_ids=[self.u2.id],
        )

    def test_send_message_enqueues_web_push_delivery_after_commit(self):
        convo = self._create_direct_conversation(actor=self.u1, target=self.u2)

        self.client.force_authenticate(user=self.u1)
        send_url = reverse(
            "accounts:messaging_send_message",
            kwargs={"conversation_id": convo.id},
        )
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(send_url, {"text": "Ahoj"}, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        self.push_delay_mock.assert_called_once_with(
            message_id=response.data["id"],
            recipient_user_ids=[self.u2.id],
        )

    def test_send_message_succeeds_when_push_enqueue_fails(self):
        convo = self._create_direct_conversation(actor=self.u1, target=self.u2)
        self.push_delay_mock.side_effect = RuntimeError("broker unavailable")

        self.client.force_authenticate(user=self.u1)
        send_url = reverse(
            "accounts:messaging_send_message",
            kwargs={"conversation_id": convo.id},
        )
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(send_url, {"text": "Ahoj"}, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert Message.objects.count() == 1

    def test_send_message_supports_image_only_messages(self):
        convo = self._create_direct_conversation(actor=self.u1, target=self.u2)

        self.client.force_authenticate(user=self.u1)
        send_url = reverse(
            "accounts:messaging_send_message",
            kwargs={"conversation_id": convo.id},
        )

        response = self.client.post(
            send_url,
            {"image": self._sample_image_upload()},
            format="multipart",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["text"] is None
        assert response.data["has_image"] is True
        assert response.data["image_url"].endswith(
            reverse(
                "accounts:messaging_message_image",
                kwargs={"conversation_id": convo.id, "message_id": response.data["id"]},
            )
        )

        message = Message.objects.get(id=response.data["id"])
        assert bool(message.image) is True

    def test_send_direct_message_supports_text_and_image(self):
        self.client.force_authenticate(user=self.u1)
        url = reverse("accounts:messaging_send_direct_message")

        response = self.client.post(
            url,
            {
                "target_user_id": self.u2.id,
                "text": "Ahoj",
                "image": self._sample_image_upload("direct.png"),
            },
            format="multipart",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["message"]["text"] == "Ahoj"
        assert response.data["message"]["has_image"] is True

    def test_message_image_endpoint_serves_participants_only(self):
        convo = self._create_direct_conversation(actor=self.u1, target=self.u2)

        self.client.force_authenticate(user=self.u1)
        send_url = reverse(
            "accounts:messaging_send_message",
            kwargs={"conversation_id": convo.id},
        )
        send_response = self.client.post(
            send_url,
            {"image": self._sample_image_upload("endpoint.png")},
            format="multipart",
        )
        assert send_response.status_code == status.HTTP_201_CREATED

        image_url = reverse(
            "accounts:messaging_message_image",
            kwargs={"conversation_id": convo.id, "message_id": send_response.data["id"]},
        )

        self.client.force_authenticate(user=self.u2)
        response = self.client.get(image_url)
        assert response.status_code == status.HTTP_200_OK
        assert response["Cache-Control"] == "private, max-age=3600"
        assert response["X-Content-Type-Options"] == "nosniff"
        assert response["Content-Type"].startswith("image/")
        assert b"PNG" in b"".join(response.streaming_content)

        self.client.force_authenticate(user=self.u3)
        forbidden_response = self.client.get(image_url)
        assert forbidden_response.status_code == status.HTTP_404_NOT_FOUND

    def test_conversation_list_marks_image_only_last_message(self):
        convo = self._create_direct_conversation(actor=self.u1, target=self.u2)

        self.client.force_authenticate(user=self.u1)
        send_url = reverse(
            "accounts:messaging_send_message",
            kwargs={"conversation_id": convo.id},
        )
        send_response = self.client.post(
            send_url,
            {"image": self._sample_image_upload("list.png")},
            format="multipart",
        )
        assert send_response.status_code == status.HTTP_201_CREATED

        list_url = reverse("accounts:messaging_list_conversations")
        list_response = self.client.get(list_url)

        assert list_response.status_code == status.HTTP_200_OK
        results = list_response.data.get("results", [])
        assert len(results) == 1
        assert results[0]["last_message_preview"] is None
        assert results[0]["last_message_has_image"] is True

    def test_non_participant_cannot_read_messages(self):
        convo = self._create_direct_conversation(actor=self.u1, target=self.u2)

        self.client.force_authenticate(user=self.u3)
        list_url = reverse("accounts:messaging_list_messages", kwargs={"conversation_id": convo.id})
        response = self.client.get(list_url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_non_participant_cannot_send_message(self):
        convo = self._create_direct_conversation(actor=self.u1, target=self.u2)

        self.client.force_authenticate(user=self.u3)
        send_url = reverse("accounts:messaging_send_message", kwargs={"conversation_id": convo.id})
        response = self.client.post(send_url, {"text": "hi"}, format="json")

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert Message.objects.count() == 0

    def test_mark_read_updates_last_read_at(self):
        convo = self._create_direct_conversation(actor=self.u1, target=self.u2)

        self.client.force_authenticate(user=self.u2)
        send_url = reverse("accounts:messaging_send_message", kwargs={"conversation_id": convo.id})
        send_response = self.client.post(send_url, {"text": "Ahoj"}, format="json")
        assert send_response.status_code == status.HTTP_201_CREATED

        self.client.force_authenticate(user=self.u1)
        read_url = reverse("accounts:messaging_mark_read", kwargs={"conversation_id": convo.id})
        with patch("messaging.api.views.notify_user") as notify_user_mock:
            read_response = self.client.post(read_url, {}, format="json")

        assert read_response.status_code == status.HTTP_200_OK
        assert read_response.data["conversation_unread_count"] == 0
        assert read_response.data["total_unread_count"] == 0
        participant = ConversationParticipant.objects.get(conversation_id=convo.id, user=self.u1)
        assert participant.last_read_at is not None
        assert notify_user_mock.call_count == 2

        calls = [call.args for call in notify_user_mock.call_args_list]
        self_read_call = next(args for args in calls if args[1]["type"] == "messaging_read")
        peer_read_call = next(
            args for args in calls if args[1]["type"] == "messaging_peer_read"
        )

        called_user_id, event = self_read_call
        assert called_user_id == self.u1.id
        assert event["conversation_id"] == convo.id
        assert event["conversation_unread_count"] == 0
        assert event["total_unread_count"] == 0

        peer_user_id, peer_event = peer_read_call
        assert peer_user_id == self.u2.id
        assert peer_event["conversation_id"] == convo.id
        assert peer_event["reader_id"] == self.u1.id
        assert isinstance(peer_event["peer_last_read_at"], str)

    def test_mark_read_can_be_called_repeatedly_without_failing(self):
        convo = self._create_direct_conversation(actor=self.u1, target=self.u2)

        self.client.force_authenticate(user=self.u2)
        send_url = reverse("accounts:messaging_send_message", kwargs={"conversation_id": convo.id})
        send_response = self.client.post(send_url, {"text": "Ahoj"}, format="json")
        assert send_response.status_code == status.HTTP_201_CREATED

        self.client.force_authenticate(user=self.u1)
        read_url = reverse("accounts:messaging_mark_read", kwargs={"conversation_id": convo.id})
        with patch("messaging.api.views.notify_user") as notify_user_mock:
            first = self.client.post(read_url, {}, format="json")
            second = self.client.post(read_url, {}, format="json")

        assert first.status_code == status.HTTP_200_OK
        assert second.status_code == status.HTTP_200_OK
        participant = ConversationParticipant.objects.get(conversation_id=convo.id, user=self.u1)
        assert participant.last_read_at is not None
        assert notify_user_mock.call_count == 4

    def test_message_author_can_delete_message_for_everyone_and_keep_placeholder_in_thread(self):
        convo = self._create_direct_conversation(actor=self.u1, target=self.u2)

        self.client.force_authenticate(user=self.u1)
        send_url = reverse("accounts:messaging_send_message", kwargs={"conversation_id": convo.id})
        send_response = self.client.post(send_url, {"text": "Ahoj"}, format="json")
        assert send_response.status_code == status.HTTP_201_CREATED
        message_id = send_response.data["id"]

        delete_url = reverse(
            "accounts:messaging_delete_message",
            kwargs={"conversation_id": convo.id, "message_id": message_id},
        )
        convo.refresh_from_db()
        last_message_at_before_delete = convo.last_message_at
        with patch("messaging.api.views.notify_user") as notify_user_mock:
            delete_response = self.client.post(delete_url, {}, format="json")

        assert delete_response.status_code == status.HTTP_200_OK
        assert delete_response.data["conversation_id"] == convo.id
        assert delete_response.data["message"]["id"] == message_id
        assert delete_response.data["message"]["is_deleted"] is True
        assert delete_response.data["message"]["text"] is None
        assert delete_response.data["message"]["image_url"] is None
        assert delete_response.data["message"]["has_image"] is False

        message = Message.objects.get(id=message_id)
        assert message.is_deleted is True

        self.client.force_authenticate(user=self.u2)
        summary_url = reverse("accounts:messaging_unread_summary")
        summary_response = self.client.get(summary_url)
        assert summary_response.status_code == status.HTTP_200_OK
        assert summary_response.data["count"] == 0

        list_url = reverse("accounts:messaging_list_messages", kwargs={"conversation_id": convo.id})
        list_response = self.client.get(list_url)
        assert list_response.status_code == status.HTTP_200_OK
        assert len(list_response.data["results"]) == 1
        assert list_response.data["results"][0]["id"] == message_id
        assert list_response.data["results"][0]["is_deleted"] is True
        assert list_response.data["results"][0]["text"] is None

        convo.refresh_from_db()
        assert convo.last_message_at == last_message_at_before_delete

        assert notify_user_mock.call_count == 2
        events = [call.args for call in notify_user_mock.call_args_list]
        for called_user_id, event in events:
            assert called_user_id in {self.u1.id, self.u2.id}
            assert event["type"] == "messaging_message_deleted"
            assert event["conversation_id"] == convo.id
            assert event["message_id"] == message_id
            assert event["deleted_by_id"] == self.u1.id
        recipient_event = next(args[1] for args in events if args[0] == self.u2.id)
        assert recipient_event["conversation_unread_count"] == 0
        assert recipient_event["total_unread_count"] == 0

    def test_deleting_an_image_message_clears_the_attachment(self):
        convo = self._create_direct_conversation(actor=self.u1, target=self.u2)

        self.client.force_authenticate(user=self.u1)
        send_url = reverse(
            "accounts:messaging_send_message",
            kwargs={"conversation_id": convo.id},
        )
        send_response = self.client.post(
            send_url,
            {"image": self._sample_image_upload("delete-image.png")},
            format="multipart",
        )
        assert send_response.status_code == status.HTTP_201_CREATED

        message_id = send_response.data["id"]
        delete_url = reverse(
            "accounts:messaging_delete_message",
            kwargs={"conversation_id": convo.id, "message_id": message_id},
        )

        delete_response = self.client.post(delete_url, {}, format="json")

        assert delete_response.status_code == status.HTTP_200_OK
        assert delete_response.data["message"]["text"] is None
        assert delete_response.data["message"]["image_url"] is None
        assert delete_response.data["message"]["has_image"] is False

        message = Message.objects.get(id=message_id)
        assert message.is_deleted is True
        assert bool(message.image) is False

    def test_deleting_latest_message_keeps_deleted_last_message_in_conversation_preview(self):
        convo = self._create_direct_conversation(actor=self.u1, target=self.u2)

        self.client.force_authenticate(user=self.u1)
        send_url = reverse("accounts:messaging_send_message", kwargs={"conversation_id": convo.id})
        first_response = self.client.post(send_url, {"text": "Prva sprava"}, format="json")
        assert first_response.status_code == status.HTTP_201_CREATED
        second_response = self.client.post(send_url, {"text": "Druha sprava"}, format="json")
        assert second_response.status_code == status.HTTP_201_CREATED

        delete_url = reverse(
            "accounts:messaging_delete_message",
            kwargs={"conversation_id": convo.id, "message_id": second_response.data["id"]},
        )
        convo.refresh_from_db()
        last_message_at_before_delete = convo.last_message_at
        delete_response = self.client.post(delete_url, {}, format="json")

        assert delete_response.status_code == status.HTTP_200_OK

        convo.refresh_from_db()
        assert convo.last_message_at == last_message_at_before_delete

        list_url = reverse("accounts:messaging_list_conversations")
        list_response = self.client.get(list_url)

        assert list_response.status_code == status.HTTP_200_OK
        results = list_response.data.get("results", [])
        assert len(results) == 1
        assert results[0]["last_message_preview"] is None
        assert results[0]["last_message_sender_id"] == self.u1.id
        assert results[0]["last_message_is_deleted"] is True

    def test_message_delete_is_idempotent(self):
        convo = self._create_direct_conversation(actor=self.u1, target=self.u2)

        self.client.force_authenticate(user=self.u1)
        send_url = reverse("accounts:messaging_send_message", kwargs={"conversation_id": convo.id})
        send_response = self.client.post(send_url, {"text": "Ahoj"}, format="json")
        assert send_response.status_code == status.HTTP_201_CREATED
        message_id = send_response.data["id"]

        delete_url = reverse(
            "accounts:messaging_delete_message",
            kwargs={"conversation_id": convo.id, "message_id": message_id},
        )
        with patch("messaging.api.views.notify_user") as notify_user_mock:
            first = self.client.post(delete_url, {}, format="json")
            second = self.client.post(delete_url, {}, format="json")

        assert first.status_code == status.HTTP_200_OK
        assert second.status_code == status.HTTP_200_OK
        assert Message.objects.get(id=message_id).is_deleted is True
        assert notify_user_mock.call_count == 2

    def test_user_cannot_delete_someone_elses_message(self):
        convo = self._create_direct_conversation(actor=self.u1, target=self.u2)

        self.client.force_authenticate(user=self.u1)
        send_url = reverse("accounts:messaging_send_message", kwargs={"conversation_id": convo.id})
        send_response = self.client.post(send_url, {"text": "Ahoj"}, format="json")
        assert send_response.status_code == status.HTTP_201_CREATED
        message_id = send_response.data["id"]

        self.client.force_authenticate(user=self.u2)
        delete_url = reverse(
            "accounts:messaging_delete_message",
            kwargs={"conversation_id": convo.id, "message_id": message_id},
        )
        delete_response = self.client.post(delete_url, {}, format="json")

        assert delete_response.status_code == status.HTTP_403_FORBIDDEN
        assert Message.objects.get(id=message_id).is_deleted is False

    def test_message_list_includes_peer_last_read_at(self):
        convo = self._create_direct_conversation(actor=self.u1, target=self.u2)

        self.client.force_authenticate(user=self.u1)
        send_url = reverse("accounts:messaging_send_message", kwargs={"conversation_id": convo.id})
        send_response = self.client.post(send_url, {"text": "Ahoj"}, format="json")
        assert send_response.status_code == status.HTTP_201_CREATED

        self.client.force_authenticate(user=self.u2)
        read_url = reverse("accounts:messaging_mark_read", kwargs={"conversation_id": convo.id})
        read_response = self.client.post(read_url, {}, format="json")
        assert read_response.status_code == status.HTTP_200_OK

        peer_participant = ConversationParticipant.objects.get(conversation_id=convo.id, user=self.u2)
        assert peer_participant.last_read_at is not None

        self.client.force_authenticate(user=self.u1)
        list_url = reverse("accounts:messaging_list_messages", kwargs={"conversation_id": convo.id})
        list_response = self.client.get(list_url)

        assert list_response.status_code == status.HTTP_200_OK
        assert list_response.data["peer_last_read_at"] == peer_participant.last_read_at.isoformat()
        assert len(list_response.data["results"]) == 1

    def test_hide_conversation_hides_it_only_for_the_actor(self):
        convo = self._create_direct_conversation(actor=self.u1, target=self.u2)

        self.client.force_authenticate(user=self.u2)
        send_url = reverse("accounts:messaging_send_message", kwargs={"conversation_id": convo.id})
        assert self.client.post(send_url, {"text": "Prva sprava"}, format="json").status_code == status.HTTP_201_CREATED

        self.client.force_authenticate(user=self.u1)
        hide_url = reverse(
            "accounts:messaging_hide_conversation",
            kwargs={"conversation_id": convo.id},
        )
        hide_response = self.client.post(hide_url, {}, format="json")

        assert hide_response.status_code == status.HTTP_200_OK
        assert hide_response.data["conversation_id"] == convo.id
        assert hide_response.data["conversation_unread_count"] == 0
        assert hide_response.data["total_unread_count"] == 0

        participant = ConversationParticipant.objects.get(conversation_id=convo.id, user=self.u1)
        assert participant.hidden_at is not None
        assert participant.last_read_at is not None

        list_url = reverse("accounts:messaging_list_conversations")
        list_response = self.client.get(list_url)
        assert list_response.status_code == status.HTTP_200_OK
        assert list_response.data.get("results", []) == []

        messages_url = reverse("accounts:messaging_list_messages", kwargs={"conversation_id": convo.id})
        messages_response = self.client.get(messages_url)
        assert messages_response.status_code == status.HTTP_404_NOT_FOUND

        self.client.force_authenticate(user=self.u2)
        other_list_response = self.client.get(list_url)
        assert other_list_response.status_code == status.HTTP_200_OK
        assert [item["id"] for item in other_list_response.data.get("results", [])] == [convo.id]

    def test_hidden_conversation_reappears_after_new_message_and_shows_only_new_history(self):
        convo = self._create_direct_conversation(actor=self.u1, target=self.u2)

        self.client.force_authenticate(user=self.u2)
        send_url = reverse("accounts:messaging_send_message", kwargs={"conversation_id": convo.id})
        first_response = self.client.post(send_url, {"text": "Stara sprava"}, format="json")
        assert first_response.status_code == status.HTTP_201_CREATED

        self.client.force_authenticate(user=self.u1)
        hide_url = reverse(
            "accounts:messaging_hide_conversation",
            kwargs={"conversation_id": convo.id},
        )
        hide_response = self.client.post(hide_url, {}, format="json")
        assert hide_response.status_code == status.HTTP_200_OK

        self.client.force_authenticate(user=self.u2)
        second_response = self.client.post(send_url, {"text": "Nova sprava"}, format="json")
        assert second_response.status_code == status.HTTP_201_CREATED

        self.client.force_authenticate(user=self.u1)
        list_url = reverse("accounts:messaging_list_conversations")
        list_response = self.client.get(list_url)

        assert list_response.status_code == status.HTTP_200_OK
        results = list_response.data.get("results", [])
        assert len(results) == 1
        assert results[0]["id"] == convo.id
        assert results[0]["last_message_preview"] == "Nova sprava"

        messages_url = reverse("accounts:messaging_list_messages", kwargs={"conversation_id": convo.id})
        messages_response = self.client.get(messages_url)
        assert messages_response.status_code == status.HTTP_200_OK
        returned_ids = [item["id"] for item in messages_response.data["results"]]
        assert returned_ids == [second_response.data["id"]]

    def test_conversation_list_returns_only_started_conversations_with_other_user(self):
        empty_convo = self._create_direct_conversation(actor=self.u1, target=self.u2)
        started_convo = self._create_direct_conversation(actor=self.u1, target=self.u3)
        OfferedSkill.objects.create(
            user=self.u3,
            category="IT",
            subcategory="Backend",
            description="API development",
            location="Kosice",
            district="Kosice I",
            is_hidden=False,
            is_seeking=False,
        )

        self.client.force_authenticate(user=self.u1)
        send_url = reverse("accounts:messaging_send_message", kwargs={"conversation_id": started_convo.id})
        send_response = self.client.post(send_url, {"text": "Ahoj"}, format="json")
        assert send_response.status_code == status.HTTP_201_CREATED

        list_url = reverse("accounts:messaging_list_conversations")
        response = self.client.get(list_url)

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get("results", [])
        assert len(results) == 1
        assert results[0]["id"] == started_convo.id
        assert results[0]["other_user"]["id"] == self.u3.id
        assert results[0]["other_user"]["display_name"]
        assert results[0]["has_requestable_offers"] is True
        assert results[0]["unread_count"] == 0
        assert all(item["id"] != empty_convo.id for item in results)

    def test_conversation_list_hides_request_picker_flag_when_peer_has_only_hidden_or_seeking_offers(self):
        convo = self._create_direct_conversation(actor=self.u1, target=self.u2)
        OfferedSkill.objects.create(
            user=self.u2,
            category="IT",
            subcategory="Frontend",
            description="Skryta ponuka",
            location="Bratislava",
            district="Bratislava I",
            is_hidden=True,
            is_seeking=False,
        )
        OfferedSkill.objects.create(
            user=self.u2,
            category="IT",
            subcategory="UX",
            description="Hladam pomoc",
            location="Bratislava",
            district="Bratislava II",
            is_hidden=False,
            is_seeking=True,
        )

        self.client.force_authenticate(user=self.u2)
        send_url = reverse("accounts:messaging_send_message", kwargs={"conversation_id": convo.id})
        assert self.client.post(send_url, {"text": "Ahoj"}, format="json").status_code == status.HTTP_201_CREATED

        self.client.force_authenticate(user=self.u1)
        list_url = reverse("accounts:messaging_list_conversations")
        response = self.client.get(list_url)

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get("results", [])
        assert len(results) == 1
        assert results[0]["id"] == convo.id
        assert results[0]["has_requestable_offers"] is False

    def test_conversation_list_includes_unread_count_and_summary_endpoint_returns_total(self):
        convo = self._create_direct_conversation(actor=self.u2, target=self.u1)

        self.client.force_authenticate(user=self.u2)
        send_url = reverse("accounts:messaging_send_message", kwargs={"conversation_id": convo.id})
        assert self.client.post(send_url, {"text": "Prva"}, format="json").status_code == status.HTTP_201_CREATED
        assert self.client.post(send_url, {"text": "Druha"}, format="json").status_code == status.HTTP_201_CREATED

        self.client.force_authenticate(user=self.u1)
        list_url = reverse("accounts:messaging_list_conversations")
        list_response = self.client.get(list_url)

        assert list_response.status_code == status.HTTP_200_OK
        results = list_response.data.get("results", [])
        assert len(results) == 1
        assert results[0]["id"] == convo.id
        assert results[0]["has_unread"] is True
        assert results[0]["unread_count"] == 2

        summary_url = reverse("accounts:messaging_unread_summary")
        summary_response = self.client.get(summary_url)

        assert summary_response.status_code == status.HTTP_200_OK
        assert summary_response.data["count"] == 2

    def test_conversation_list_exposes_server_timing_breakdown(self):
        convo = self._create_direct_conversation(actor=self.u1, target=self.u2)

        self.client.force_authenticate(user=self.u1)
        send_url = reverse("accounts:messaging_send_message", kwargs={"conversation_id": convo.id})
        assert self.client.post(send_url, {"text": "Ahoj"}, format="json").status_code == status.HTTP_201_CREATED

        list_url = reverse("accounts:messaging_list_conversations")
        response = self.client.get(list_url)

        assert response.status_code == status.HTTP_200_OK
        server_timing = response.headers.get("Server-Timing", "")
        assert "conversations_db_connect" in server_timing
        assert "conversations_sql" in server_timing
        assert "conversations_sql_count" in server_timing
        assert "conversations_sql_page" in server_timing
        assert "conversations_sql_prefetch_participants" in server_timing
        assert "conversations_sql_prefetch_users" in server_timing
        assert "conversations_serialize" in server_timing
        assert "conversations_total" in server_timing

    @override_settings(
        RATE_LIMITING_ENABLED=True,
        RATE_LIMIT_DISABLED=False,
        RATE_LIMIT_ALLOW_PATHS=[],
        RATE_LIMIT_OVERRIDES={
            "messaging_open": {"max_attempts": 1, "window_minutes": 1, "block_minutes": 1},
        },
    )
    def test_open_conversation_is_rate_limited_after_override_threshold(self):
        self.client.force_authenticate(user=self.u1)
        url = reverse("accounts:messaging_open")

        first = self.client.post(url, {"target_user_id": self.u2.id}, format="json")
        second = self.client.post(url, {"target_user_id": self.u3.id}, format="json")

        assert first.status_code == status.HTTP_200_OK
        assert first.data["is_draft"] is True
        assert second.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert second.json()["code"] == "RATE_LIMITED"

    @override_settings(
        RATE_LIMITING_ENABLED=True,
        RATE_LIMIT_DISABLED=False,
        RATE_LIMIT_ALLOW_PATHS=[],
        RATE_LIMIT_OVERRIDES={
            "messaging_send": {"max_attempts": 1, "window_minutes": 1, "block_minutes": 1},
        },
    )
    def test_send_message_is_rate_limited_after_override_threshold(self):
        convo = self._create_direct_conversation(actor=self.u1, target=self.u2)

        self.client.force_authenticate(user=self.u1)
        send_url = reverse("accounts:messaging_send_message", kwargs={"conversation_id": convo.id})
        first = self.client.post(send_url, {"text": "Ahoj"}, format="json")
        second = self.client.post(send_url, {"text": "Znova"}, format="json")

        assert first.status_code == status.HTTP_201_CREATED
        assert second.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert second.json()["code"] == "RATE_LIMITED"

    @override_settings(
        RATE_LIMITING_ENABLED=True,
        RATE_LIMIT_DISABLED=False,
        RATE_LIMIT_ALLOW_PATHS=[],
        RATE_LIMIT_OVERRIDES={
            "messaging_mark_read": {"max_attempts": 1, "window_minutes": 1, "block_minutes": 1},
        },
    )
    def test_mark_read_is_rate_limited_after_override_threshold(self):
        convo = self._create_direct_conversation(actor=self.u1, target=self.u2)

        self.client.force_authenticate(user=self.u2)
        send_url = reverse("accounts:messaging_send_message", kwargs={"conversation_id": convo.id})
        assert self.client.post(send_url, {"text": "Ahoj"}, format="json").status_code == status.HTTP_201_CREATED

        self.client.force_authenticate(user=self.u1)
        read_url = reverse("accounts:messaging_mark_read", kwargs={"conversation_id": convo.id})
        first = self.client.post(read_url, {}, format="json")
        second = self.client.post(read_url, {}, format="json")

        assert first.status_code == status.HTTP_200_OK
        assert second.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert second.json()["code"] == "RATE_LIMITED"
