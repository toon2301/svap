from io import BytesIO
import itertools
import pytest
import shutil
import tempfile
from datetime import timedelta
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from PIL import Image
from PIL.TiffImagePlugin import IFDRational
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import patch

from accounts.models import FavoriteUser, OfferedSkill
from messaging.models import Conversation, ConversationParticipant, GroupInvitation, Message
from messaging.services.conversations import open_or_create_direct_conversation
from messaging.services.presence import store_message_presence


User = get_user_model()


def _strictly_increasing_now_patch():
    """
    Patch `timezone.now()` na striktne rastúce hodnoty (každé volanie +1s).

    Eliminuje flakinu hidden_at/last_message_at testov: pod záťažou suite môžu
    dve volania now() vrátiť rovnaký čas → hranica `last_message_at >= hidden_at`
    sa správa nedeterministicky. Striktne rastúci čas zaručí jednoznačné poradie
    (správa < skrytie < nová správa). Scope je na konkrétny test (start/stop).
    """
    base = timezone.now()
    counter = itertools.count(1)
    return patch(
        "django.utils.timezone.now",
        side_effect=lambda: base + timedelta(seconds=next(counter)),
    )


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

    def _jpeg_with_gps_exif(self, name: str = "gps.jpg") -> SimpleUploadedFile:
        """JPEG s EXIF metadátami vrátane GPS lokácie (na test stripovania)."""
        image = Image.new("RGB", (8, 8), (0, 128, 255))
        exif = image.getexif()
        exif[0x010F] = "EvilCam"  # Make
        exif[0x0110] = "ModelX"  # Model
        exif[0x0132] = "2021:01:01 12:00:00"  # DateTime
        gps_ifd = exif.get_ifd(0x8825)  # GPSInfo
        gps_ifd[1] = "N"
        gps_ifd[2] = (IFDRational(48, 1), IFDRational(8, 1), IFDRational(0, 1))
        gps_ifd[3] = "E"
        gps_ifd[4] = (IFDRational(17, 1), IFDRational(7, 1), IFDRational(0, 1))
        # GPS sub-IFD treba pripojiť späť na hlavný EXIF objekt, inak ho Pillow
        # pri save() neserializuje (cache z get_ifd sa do súboru nezapíše) a JPEG
        # by reálne GPS neobsahoval – test stripovania by falošne prešiel.
        exif[0x8825] = gps_ifd
        buffer = BytesIO()
        image.save(buffer, format="JPEG", exif=exif)
        return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/jpeg")

    def _results(self, response):
        return response.data.get("results", response.data)

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
        now_patcher = _strictly_increasing_now_patch()
        now_patcher.start()
        self.addCleanup(now_patcher.stop)
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

        with patch("messaging.api.notification_dispatch.notify_user") as notify_user_mock:
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
        convo = Conversation.objects.get(id=response.data["conversation_id"])
        assert convo.request_status == Conversation.RequestStatus.PENDING
        assert convo.requested_by_id == self.u1.id
        assert convo.requested_to_id == self.u2.id

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

    def test_message_request_is_separated_from_recipient_conversation_list(self):
        self.client.force_authenticate(user=self.u1)
        send_url = reverse("accounts:messaging_send_direct_message")
        response = self.client.post(
            send_url,
            {"target_user_id": self.u2.id, "text": "Ahoj"},
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        conversation_id = response.data["conversation_id"]

        list_url = reverse("accounts:messaging_list_conversations")
        request_list_url = reverse("accounts:messaging_list_message_requests")

        self.client.force_authenticate(user=self.u1)
        sender_list = self.client.get(list_url)
        sender_results = self._results(sender_list)
        assert [item["id"] for item in sender_results] == [conversation_id]
        assert sender_results[0]["message_request_role"] == "sender"

        self.client.force_authenticate(user=self.u2)
        recipient_list = self.client.get(list_url)
        assert self._results(recipient_list) == []

        request_list = self.client.get(request_list_url)
        request_results = self._results(request_list)
        assert [item["id"] for item in request_results] == [conversation_id]
        assert request_results[0]["message_request_role"] == "recipient"
        assert request_results[0]["request_unseen"] is True

    def test_pending_message_request_allows_only_two_sender_messages(self):
        self.client.force_authenticate(user=self.u1)
        direct_url = reverse("accounts:messaging_send_direct_message")
        first = self.client.post(
            direct_url,
            {"target_user_id": self.u2.id, "text": "Prvá"},
            format="json",
        )
        assert first.status_code == status.HTTP_201_CREATED
        conversation_id = first.data["conversation_id"]
        send_url = reverse("accounts:messaging_send_message", kwargs={"conversation_id": conversation_id})

        second = self.client.post(send_url, {"text": "Druhá"}, format="json")
        assert second.status_code == status.HTTP_201_CREATED

        third = self.client.post(send_url, {"text": "Tretia"}, format="json")
        assert third.status_code == status.HTTP_403_FORBIDDEN
        assert third.data["code"] == "message_request_pending"
        assert Message.objects.filter(conversation_id=conversation_id).count() == 2

    def test_recipient_accepts_message_request_and_it_moves_to_conversations(self):
        self.client.force_authenticate(user=self.u1)
        direct_url = reverse("accounts:messaging_send_direct_message")
        response = self.client.post(
            direct_url,
            {"target_user_id": self.u2.id, "text": "Ahoj"},
            format="json",
        )
        conversation_id = response.data["conversation_id"]

        self.client.force_authenticate(user=self.u2)
        accept_url = reverse(
            "accounts:messaging_accept_message_request",
            kwargs={"conversation_id": conversation_id},
        )
        accepted = self.client.post(accept_url, {}, format="json")
        assert accepted.status_code == status.HTTP_200_OK
        assert accepted.data["request_status"] == Conversation.RequestStatus.ACCEPTED

        Conversation.objects.get(id=conversation_id, request_status=Conversation.RequestStatus.ACCEPTED)
        assert self._results(self.client.get(reverse("accounts:messaging_list_message_requests"))) == []
        conversations = self.client.get(reverse("accounts:messaging_list_conversations"))
        assert [item["id"] for item in self._results(conversations)] == [conversation_id]

    def test_recipient_reply_auto_accepts_message_request(self):
        self.client.force_authenticate(user=self.u1)
        direct_url = reverse("accounts:messaging_send_direct_message")
        response = self.client.post(
            direct_url,
            {"target_user_id": self.u2.id, "text": "Ahoj"},
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        conversation_id = response.data["conversation_id"]

        self.client.force_authenticate(user=self.u2)
        send_url = reverse(
            "accounts:messaging_send_message",
            kwargs={"conversation_id": conversation_id},
        )
        with patch("messaging.api.notification_dispatch.notify_user") as notify_user_mock:
            reply = self.client.post(send_url, {"text": "Jasne, odpovedam"}, format="json")

        assert reply.status_code == status.HTTP_201_CREATED
        assert reply.data["text"] == "Jasne, odpovedam"
        convo = Conversation.objects.get(id=conversation_id)
        assert convo.request_status == Conversation.RequestStatus.ACCEPTED
        assert convo.accepted_at is not None
        assert convo.request_seen_at is not None
        assert Message.objects.filter(conversation_id=conversation_id).count() == 2
        assert self._results(
            self.client.get(reverse("accounts:messaging_list_message_requests"))
        ) == []
        conversations = self.client.get(reverse("accounts:messaging_list_conversations"))
        assert [item["id"] for item in self._results(conversations)] == [conversation_id]

        notify_user_mock.assert_called_once()
        called_user_id, event = notify_user_mock.call_args.args
        assert called_user_id == self.u1.id
        assert event["type"] == "messaging_message"
        assert event["sender_id"] == self.u2.id

    def test_deleting_message_request_hides_it_without_notifying_sender(self):
        self.client.force_authenticate(user=self.u1)
        direct_url = reverse("accounts:messaging_send_direct_message")
        response = self.client.post(
            direct_url,
            {"target_user_id": self.u2.id, "text": "Ahoj"},
            format="json",
        )
        conversation_id = response.data["conversation_id"]

        self.client.force_authenticate(user=self.u2)
        delete_url = reverse(
            "accounts:messaging_delete_message_request",
            kwargs={"conversation_id": conversation_id},
        )
        with patch("messaging.api.notification_dispatch.notify_user") as notify_user_mock:
            deleted = self.client.post(delete_url, {}, format="json")

        assert deleted.status_code == status.HTTP_200_OK
        assert deleted.data["message_request_unseen_count"] == 0
        assert notify_user_mock.call_count == 0
        assert Conversation.objects.get(id=conversation_id).request_status == Conversation.RequestStatus.DELETED
        assert self._results(self.client.get(reverse("accounts:messaging_list_message_requests"))) == []

    def test_pending_message_request_does_not_emit_peer_read_receipt(self):
        self.client.force_authenticate(user=self.u1)
        direct_url = reverse("accounts:messaging_send_direct_message")
        response = self.client.post(
            direct_url,
            {"target_user_id": self.u2.id, "text": "Ahoj"},
            format="json",
        )
        conversation_id = response.data["conversation_id"]

        self.client.force_authenticate(user=self.u2)
        messages_url = reverse("accounts:messaging_list_messages", kwargs={"conversation_id": conversation_id})
        messages_response = self.client.get(messages_url)
        assert messages_response.status_code == status.HTTP_200_OK
        assert messages_response.data["peer_last_read_at"] is None

        read_url = reverse("accounts:messaging_mark_read", kwargs={"conversation_id": conversation_id})
        with patch("messaging.api.notification_dispatch.notify_user") as notify_user_mock:
            read_response = self.client.post(read_url, {}, format="json")

        assert read_response.status_code == status.HTTP_200_OK
        emitted_types = [call.args[1]["type"] for call in notify_user_mock.call_args_list]
        assert "messaging_read" in emitted_types
        assert "messaging_peer_read" not in emitted_types

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

        with self.captureOnCommitCallbacks(execute=True):
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
        assert response.data["image_thumbnail_url"].endswith(
            reverse(
                "accounts:messaging_message_image_thumbnail",
                kwargs={"conversation_id": convo.id, "message_id": response.data["id"]},
            )
        )

        message = Message.objects.get(id=response.data["id"])
        assert bool(message.image) is True
        assert bool(message.image_thumbnail) is True

    def test_send_message_strips_exif_gps_metadata(self):
        upload = self._jpeg_with_gps_exif()

        # Precondition: nahraný obrázok skutočne nesie EXIF metadáta vrátane GPS
        # (inak by test overoval stripovanie niečoho, čo tam ani nebolo).
        with Image.open(BytesIO(upload.read())) as src:
            source_exif = src.getexif()
            source_gps = src.getexif().get_ifd(0x8825)
        upload.seek(0)
        assert len(source_exif) > 0
        assert source_exif.get(0x010F) == "EvilCam"
        assert source_gps, "fixture musí obsahovať reálne GPS metadáta"

        convo = self._create_direct_conversation(actor=self.u1, target=self.u2)
        self.client.force_authenticate(user=self.u1)
        send_url = reverse(
            "accounts:messaging_send_message",
            kwargs={"conversation_id": convo.id},
        )

        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                send_url, {"image": upload}, format="multipart"
            )

        assert response.status_code == status.HTTP_201_CREATED
        message = Message.objects.get(id=response.data["id"])
        assert bool(message.image) is True

        message.image.open("rb")
        try:
            with Image.open(message.image.file) as stored:
                stored_exif = stored.getexif()
                gps_ifd = stored_exif.get_ifd(0x8825)
        finally:
            message.image.close()

        # Po uložení nesmú ostať žiadne EXIF metadáta ani GPS lokácia.
        assert len(stored_exif) == 0
        assert not gps_ifd

    def test_open_conversation_hides_private_user_existence(self):
        private_user = User.objects.create_user(
            username="private_user",
            email="private@example.com",
            password="StrongPass123",
            is_verified=True,
            is_active=True,
        )
        private_user.is_public = False
        private_user.save(update_fields=["is_public"])

        self.client.force_authenticate(user=self.u1)
        url = reverse("accounts:messaging_open")

        resp_private = self.client.post(
            url, {"target_user_id": private_user.id}, format="json"
        )
        resp_missing = self.client.post(
            url, {"target_user_id": 99_999_999}, format="json"
        )

        assert resp_private.status_code == status.HTTP_404_NOT_FOUND
        assert resp_missing.status_code == status.HTTP_404_NOT_FOUND

        def _without_timestamp(data):
            payload = dict(data or {})
            payload.pop("timestamp", None)
            return payload

        # Telo odpovede musí byť identické (okrem časovej pečiatky), aby sa
        # nedala odlíšiť existencia private/staff účtu od neexistujúceho.
        assert _without_timestamp(resp_private.data) == _without_timestamp(
            resp_missing.data
        )

    def test_send_direct_message_supports_text_and_image(self):
        self.client.force_authenticate(user=self.u1)
        url = reverse("accounts:messaging_send_direct_message")

        with self.captureOnCommitCallbacks(execute=True):
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
        assert response.data["message"]["image_thumbnail_url"]

    def test_message_image_endpoint_serves_participants_only(self):
        convo = self._create_direct_conversation(actor=self.u1, target=self.u2)

        self.client.force_authenticate(user=self.u1)
        send_url = reverse(
            "accounts:messaging_send_message",
            kwargs={"conversation_id": convo.id},
        )
        with self.captureOnCommitCallbacks(execute=True):
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
        thumbnail_url = reverse(
            "accounts:messaging_message_image_thumbnail",
            kwargs={"conversation_id": convo.id, "message_id": send_response.data["id"]},
        )

        self.client.force_authenticate(user=self.u2)
        response = self.client.get(image_url)
        assert response.status_code == status.HTTP_200_OK
        assert response["Cache-Control"] == "private, max-age=3600"
        assert response["X-Content-Type-Options"] == "nosniff"
        assert response["Content-Type"].startswith("image/")
        assert b"PNG" in b"".join(response.streaming_content)

        thumbnail_response = self.client.get(thumbnail_url)
        assert thumbnail_response.status_code == status.HTTP_200_OK
        assert thumbnail_response["Cache-Control"] == "private, max-age=3600"
        assert thumbnail_response["X-Content-Type-Options"] == "nosniff"
        assert thumbnail_response["Content-Type"].startswith("image/")
        assert b"WEBP" in b"".join(thumbnail_response.streaming_content)

        self.client.force_authenticate(user=self.u3)
        forbidden_response = self.client.get(image_url)
        assert forbidden_response.status_code == status.HTTP_404_NOT_FOUND
        forbidden_thumbnail_response = self.client.get(thumbnail_url)
        assert forbidden_thumbnail_response.status_code == status.HTTP_404_NOT_FOUND

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
        with patch("messaging.api.notification_dispatch.notify_user") as notify_user_mock:
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
        with patch("messaging.api.notification_dispatch.notify_user") as notify_user_mock:
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
        with patch("messaging.api.notification_dispatch.notify_user") as notify_user_mock:
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
        with patch("messaging.api.notification_dispatch.notify_user") as notify_user_mock:
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

    def test_participant_can_pin_and_unpin_any_message_and_emit_realtime_event(self):
        convo = self._create_direct_conversation(actor=self.u1, target=self.u2)

        self.client.force_authenticate(user=self.u1)
        send_url = reverse("accounts:messaging_send_message", kwargs={"conversation_id": convo.id})
        send_response = self.client.post(send_url, {"text": "Ahoj"}, format="json")
        assert send_response.status_code == status.HTTP_201_CREATED
        message_id = send_response.data["id"]

        self.client.force_authenticate(user=self.u2)
        pin_url = reverse("accounts:messaging_pin_message", kwargs={"conversation_id": convo.id})
        with patch("messaging.api.notification_dispatch.notify_user") as notify_user_mock:
            pin_response = self.client.post(pin_url, {"message_id": message_id}, format="json")

        assert pin_response.status_code == status.HTTP_200_OK
        assert pin_response.data["conversation_id"] == convo.id
        assert pin_response.data["pinned_message"]["id"] == message_id

        convo.refresh_from_db()
        assert convo.pinned_message_id == message_id
        assert notify_user_mock.call_count == 2

        for called_user_id, event in [call.args for call in notify_user_mock.call_args_list]:
            assert called_user_id in {self.u1.id, self.u2.id}
            assert event["type"] == "messaging_pinned_message_updated"
            assert event["conversation_id"] == convo.id
            assert event["actor_id"] == self.u2.id
            assert event["pinned_message"]["id"] == message_id

        with patch("messaging.api.notification_dispatch.notify_user") as notify_user_mock:
            unpin_response = self.client.post(pin_url, {"message_id": None}, format="json")

        assert unpin_response.status_code == status.HTTP_200_OK
        assert unpin_response.data["pinned_message"] is None

        convo.refresh_from_db()
        assert convo.pinned_message_id is None
        assert notify_user_mock.call_count == 2
        for called_user_id, event in [call.args for call in notify_user_mock.call_args_list]:
            assert called_user_id in {self.u1.id, self.u2.id}
            assert event["type"] == "messaging_pinned_message_updated"
            assert event["conversation_id"] == convo.id
            assert event["actor_id"] == self.u2.id
            assert event["pinned_message"] is None

    def test_non_participant_cannot_pin_message(self):
        convo = self._create_direct_conversation(actor=self.u1, target=self.u2)

        self.client.force_authenticate(user=self.u1)
        send_url = reverse("accounts:messaging_send_message", kwargs={"conversation_id": convo.id})
        send_response = self.client.post(send_url, {"text": "Ahoj"}, format="json")
        assert send_response.status_code == status.HTTP_201_CREATED

        self.client.force_authenticate(user=self.u3)
        pin_url = reverse("accounts:messaging_pin_message", kwargs={"conversation_id": convo.id})
        response = self.client.post(
            pin_url,
            {"message_id": send_response.data["id"]},
            format="json",
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_deleted_message_cannot_be_pinned(self):
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
        delete_response = self.client.post(delete_url, {}, format="json")
        assert delete_response.status_code == status.HTTP_200_OK

        self.client.force_authenticate(user=self.u2)
        pin_url = reverse("accounts:messaging_pin_message", kwargs={"conversation_id": convo.id})
        pin_response = self.client.post(pin_url, {"message_id": message_id}, format="json")

        assert pin_response.status_code == status.HTTP_400_BAD_REQUEST
        convo.refresh_from_db()
        assert convo.pinned_message_id is None

    def test_message_list_includes_pinned_message(self):
        convo = self._create_direct_conversation(actor=self.u1, target=self.u2)

        self.client.force_authenticate(user=self.u1)
        send_url = reverse("accounts:messaging_send_message", kwargs={"conversation_id": convo.id})
        first_response = self.client.post(send_url, {"text": "Prva sprava"}, format="json")
        assert first_response.status_code == status.HTTP_201_CREATED
        second_response = self.client.post(send_url, {"text": "Druha sprava"}, format="json")
        assert second_response.status_code == status.HTTP_201_CREATED

        convo.pinned_message_id = first_response.data["id"]
        convo.save(update_fields=["pinned_message"])

        self.client.force_authenticate(user=self.u2)
        list_url = reverse("accounts:messaging_list_messages", kwargs={"conversation_id": convo.id})
        list_response = self.client.get(list_url)

        assert list_response.status_code == status.HTTP_200_OK
        assert list_response.data["pinned_message"]["id"] == first_response.data["id"]
        assert list_response.data["pinned_message"]["text"] == "Prva sprava"
        assert list_response.data["results"][0]["id"] == second_response.data["id"]

    def test_deleting_pinned_message_clears_conversation_pin(self):
        convo = self._create_direct_conversation(actor=self.u1, target=self.u2)

        self.client.force_authenticate(user=self.u1)
        send_url = reverse("accounts:messaging_send_message", kwargs={"conversation_id": convo.id})
        send_response = self.client.post(send_url, {"text": "Pripnuta sprava"}, format="json")
        assert send_response.status_code == status.HTTP_201_CREATED
        message_id = send_response.data["id"]

        convo.pinned_message_id = message_id
        convo.save(update_fields=["pinned_message"])

        delete_url = reverse(
            "accounts:messaging_delete_message",
            kwargs={"conversation_id": convo.id, "message_id": message_id},
        )
        delete_response = self.client.post(delete_url, {}, format="json")

        assert delete_response.status_code == status.HTTP_200_OK
        convo.refresh_from_db()
        assert convo.pinned_message_id is None

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
        now_patcher = _strictly_increasing_now_patch()
        now_patcher.start()
        self.addCleanup(now_patcher.stop)
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
        now_patcher = _strictly_increasing_now_patch()
        now_patcher.start()
        self.addCleanup(now_patcher.stop)
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

    def test_conversation_pin_state_is_stored_per_participant_and_exposed_in_list(self):
        convo = self._create_direct_conversation(actor=self.u1, target=self.u2)

        self.client.force_authenticate(user=self.u2)
        send_url = reverse("accounts:messaging_send_message", kwargs={"conversation_id": convo.id})
        assert self.client.post(send_url, {"text": "Ahoj"}, format="json").status_code == status.HTTP_201_CREATED

        self.client.force_authenticate(user=self.u1)
        pin_url = reverse(
            "accounts:messaging_conversation_pin_state",
            kwargs={"conversation_id": convo.id},
        )
        pin_response = self.client.post(pin_url, {"is_pinned": True}, format="json")

        assert pin_response.status_code == status.HTTP_200_OK
        assert pin_response.data["conversation_id"] == convo.id
        assert pin_response.data["is_pinned"] is True

        participant = ConversationParticipant.objects.get(conversation_id=convo.id, user=self.u1)
        other_participant = ConversationParticipant.objects.get(conversation_id=convo.id, user=self.u2)
        assert participant.pinned_at is not None
        assert other_participant.pinned_at is None

        list_url = reverse("accounts:messaging_list_conversations")
        list_response = self.client.get(list_url)
        assert list_response.status_code == status.HTTP_200_OK
        results = list_response.data.get("results", [])
        assert len(results) == 1
        assert results[0]["id"] == convo.id
        assert results[0]["is_pinned"] is True

        self.client.force_authenticate(user=self.u2)
        other_list_response = self.client.get(list_url)
        assert other_list_response.status_code == status.HTTP_200_OK
        other_results = other_list_response.data.get("results", [])
        assert len(other_results) == 1
        assert other_results[0]["id"] == convo.id
        assert other_results[0]["is_pinned"] is False

    def test_conversation_pin_state_can_be_cleared(self):
        convo = self._create_direct_conversation(actor=self.u1, target=self.u2)

        self.client.force_authenticate(user=self.u2)
        send_url = reverse("accounts:messaging_send_message", kwargs={"conversation_id": convo.id})
        assert self.client.post(send_url, {"text": "Ahoj"}, format="json").status_code == status.HTTP_201_CREATED

        self.client.force_authenticate(user=self.u1)
        pin_url = reverse(
            "accounts:messaging_conversation_pin_state",
            kwargs={"conversation_id": convo.id},
        )
        assert self.client.post(pin_url, {"is_pinned": True}, format="json").status_code == status.HTTP_200_OK

        unpin_response = self.client.post(pin_url, {"is_pinned": False}, format="json")
        assert unpin_response.status_code == status.HTTP_200_OK
        assert unpin_response.data["is_pinned"] is False

        participant = ConversationParticipant.objects.get(conversation_id=convo.id, user=self.u1)
        assert participant.pinned_at is None

    def test_non_participant_cannot_update_conversation_pin_state(self):
        convo = self._create_direct_conversation(actor=self.u1, target=self.u2)

        self.client.force_authenticate(user=self.u2)
        send_url = reverse("accounts:messaging_send_message", kwargs={"conversation_id": convo.id})
        assert self.client.post(send_url, {"text": "Ahoj"}, format="json").status_code == status.HTTP_201_CREATED

        self.client.force_authenticate(user=self.u3)
        pin_url = reverse(
            "accounts:messaging_conversation_pin_state",
            kwargs={"conversation_id": convo.id},
        )
        response = self.client.post(pin_url, {"is_pinned": True}, format="json")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_conversation_list_orders_pinned_conversations_before_newer_unpinned_ones(self):
        pinned_convo = self._create_direct_conversation(actor=self.u1, target=self.u2)
        newer_convo = self._create_direct_conversation(actor=self.u1, target=self.u3)

        self.client.force_authenticate(user=self.u2)
        send_pinned_url = reverse(
            "accounts:messaging_send_message",
            kwargs={"conversation_id": pinned_convo.id},
        )
        assert self.client.post(send_pinned_url, {"text": "Starsia sprava"}, format="json").status_code == status.HTTP_201_CREATED

        self.client.force_authenticate(user=self.u3)
        send_newer_url = reverse(
            "accounts:messaging_send_message",
            kwargs={"conversation_id": newer_convo.id},
        )
        assert self.client.post(send_newer_url, {"text": "Novsia sprava"}, format="json").status_code == status.HTTP_201_CREATED

        self.client.force_authenticate(user=self.u1)
        pin_url = reverse(
            "accounts:messaging_conversation_pin_state",
            kwargs={"conversation_id": pinned_convo.id},
        )
        assert self.client.post(pin_url, {"is_pinned": True}, format="json").status_code == status.HTTP_200_OK

        list_url = reverse("accounts:messaging_list_conversations")
        list_response = self.client.get(list_url)

        assert list_response.status_code == status.HTTP_200_OK
        results = list_response.data.get("results", [])
        assert [item["id"] for item in results] == [pinned_convo.id, newer_convo.id]
        assert results[0]["is_pinned"] is True
        assert results[1]["is_pinned"] is False

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

    def test_conversation_list_exposes_other_user_verification_badge(self):
        convo = self._create_direct_conversation(actor=self.u1, target=self.u3)
        self.u3.is_verified = True
        self.u3.save(update_fields=["is_verified"])

        self.client.force_authenticate(user=self.u1)
        send_url = reverse(
            "accounts:messaging_send_message", kwargs={"conversation_id": convo.id}
        )
        assert (
            self.client.post(send_url, {"text": "Ahoj"}, format="json").status_code
            == status.HTTP_201_CREATED
        )

        response = self.client.get(reverse("accounts:messaging_list_conversations"))

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get("results", [])
        assert results[0]["other_user"]["is_verified"] is True

        # Neoverený používateľ → badge flag False.
        self.u3.is_verified = False
        self.u3.save(update_fields=["is_verified"])
        response = self.client.get(reverse("accounts:messaging_list_conversations"))
        assert response.data["results"][0]["other_user"]["is_verified"] is False

    def test_message_list_includes_requestable_offers_for_empty_conversation(self):
        empty_convo = self._create_direct_conversation(actor=self.u1, target=self.u2)
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
        messages_url = reverse(
            "accounts:messaging_list_messages",
            kwargs={"conversation_id": empty_convo.id},
        )
        response = self.client.get(messages_url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["conversation"]["id"] == empty_convo.id
        assert response.data["conversation"]["has_requestable_offers"] is True
        assert response.data["conversation"]["other_user"]["id"] == self.u2.id

    def test_conversation_list_search_matches_other_participant_name_tokens(self):
        self.u2.first_name = "Jana"
        self.u2.last_name = "Novakova"
        self.u2.save(update_fields=["first_name", "last_name"])
        self.u3.first_name = "Peter"
        self.u3.last_name = "Hrasko"
        self.u3.save(update_fields=["first_name", "last_name"])

        convo_one = self._create_direct_conversation(actor=self.u1, target=self.u2)
        convo_two = self._create_direct_conversation(actor=self.u1, target=self.u3)

        self.client.force_authenticate(user=self.u2)
        send_url_one = reverse(
            "accounts:messaging_send_message",
            kwargs={"conversation_id": convo_one.id},
        )
        assert self.client.post(send_url_one, {"text": "Ahoj Jana"}, format="json").status_code == status.HTTP_201_CREATED

        self.client.force_authenticate(user=self.u3)
        send_url_two = reverse(
            "accounts:messaging_send_message",
            kwargs={"conversation_id": convo_two.id},
        )
        assert self.client.post(send_url_two, {"text": "Ahoj Peter"}, format="json").status_code == status.HTTP_201_CREATED

        self.client.force_authenticate(user=self.u1)
        list_url = reverse("accounts:messaging_list_conversations")
        response = self.client.get(list_url, {"search": "  jana   nova "})

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get("results", [])
        assert len(results) == 1
        assert results[0]["id"] == convo_one.id
        assert results[0]["other_user"]["display_name"] == "Jana Novakova"

    def test_conversation_list_search_matches_company_name(self):
        self.u2.user_type = "company"
        self.u2.company_name = "Acme Studio"
        self.u2.first_name = ""
        self.u2.last_name = ""
        self.u2.save(update_fields=["user_type", "company_name", "first_name", "last_name"])

        convo = self._create_direct_conversation(actor=self.u1, target=self.u2)

        self.client.force_authenticate(user=self.u2)
        send_url = reverse("accounts:messaging_send_message", kwargs={"conversation_id": convo.id})
        assert self.client.post(send_url, {"text": "Firemna sprava"}, format="json").status_code == status.HTTP_201_CREATED

        self.client.force_authenticate(user=self.u1)
        list_url = reverse("accounts:messaging_list_conversations")
        response = self.client.get(list_url, {"search": "studio"})

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get("results", [])
        assert len(results) == 1
        assert results[0]["id"] == convo.id
        assert results[0]["other_user"]["display_name"] == "Acme Studio"

    def test_conversation_list_search_rejects_too_long_query(self):
        self.client.force_authenticate(user=self.u1)
        list_url = reverse("accounts:messaging_list_conversations")

        response = self.client.get(list_url, {"search": "a" * 101})

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["code"] == "VALIDATION_ERROR"

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

    def test_create_group_conversation_creates_owner_and_pending_invitation(self):
        self.client.force_authenticate(user=self.u1)
        url = reverse("accounts:messaging_create_group_conversation")

        response = self.client.post(
            url,
            {"name": "Test skupina", "invited_user_ids": [self.u2.id]},
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["is_group"] is True
        assert response.data["name"] == "Test skupina"
        conversation = Conversation.objects.get(id=response.data["id"])
        assert conversation.is_group is True
        assert ConversationParticipant.objects.get(
            conversation=conversation,
            user=self.u1,
        ).role == ConversationParticipant.Role.OWNER
        invited_participant = ConversationParticipant.objects.get(
            conversation=conversation,
            user=self.u2,
        )
        assert invited_participant.status == ConversationParticipant.Status.INVITED
        invitation = GroupInvitation.objects.get(conversation=conversation, invited_user=self.u2)
        assert invitation.status == GroupInvitation.Status.PENDING
        assert Message.objects.filter(
            conversation=conversation,
            message_type=Message.Type.GROUP_INVITATION,
        ).exists()

    def test_invited_user_can_accept_group_invitation(self):
        self.client.force_authenticate(user=self.u1)
        create_url = reverse("accounts:messaging_create_group_conversation")
        create_response = self.client.post(
            create_url,
            {"name": "Test skupina", "invited_user_ids": [self.u2.id]},
            format="json",
        )
        assert create_response.status_code == status.HTTP_201_CREATED
        invitation = GroupInvitation.objects.get(invited_user=self.u2)

        self.client.force_authenticate(user=self.u2)
        response_url = reverse(
            "accounts:messaging_group_invitation_response",
            kwargs={"invitation_id": invitation.id, "action": "accept"},
        )
        response = self.client.post(response_url, {}, format="json")

        assert response.status_code == status.HTTP_200_OK
        invitation.refresh_from_db()
        assert invitation.status == GroupInvitation.Status.ACCEPTED
        participant = ConversationParticipant.objects.get(
            conversation=invitation.conversation,
            user=self.u2,
        )
        assert participant.status == ConversationParticipant.Status.ACTIVE

    def test_group_owner_can_remove_member_but_regular_member_cannot(self):
        self.client.force_authenticate(user=self.u1)
        create_response = self.client.post(
            reverse("accounts:messaging_create_group_conversation"),
            {"name": "Test skupina", "invited_user_ids": [self.u2.id]},
            format="json",
        )
        invitation = GroupInvitation.objects.get(invited_user=self.u2)
        self.client.force_authenticate(user=self.u2)
        response = self.client.post(
            reverse(
                "accounts:messaging_group_invitation_response",
                kwargs={"invitation_id": invitation.id, "action": "accept"},
            ),
            {},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK

        conversation_id = create_response.data["id"]
        self.client.force_authenticate(user=self.u2)
        forbidden = self.client.delete(
            reverse(
                "accounts:messaging_group_member_detail",
                kwargs={"conversation_id": conversation_id, "user_id": self.u1.id},
            )
        )
        assert forbidden.status_code == status.HTTP_403_FORBIDDEN

        self.client.force_authenticate(user=self.u1)
        removed = self.client.delete(
            reverse(
                "accounts:messaging_group_member_detail",
                kwargs={"conversation_id": conversation_id, "user_id": self.u2.id},
            )
        )
        assert removed.status_code == status.HTTP_204_NO_CONTENT
        assert ConversationParticipant.objects.get(
            conversation_id=conversation_id,
            user=self.u2,
        ).status == ConversationParticipant.Status.REMOVED

    def test_group_participant_limit_is_enforced(self):
        users = [
            User.objects.create_user(
                username=f"limit-{index}",
                email=f"limit-{index}@example.com",
                password="StrongPass123",
                is_verified=True,
                is_active=True,
            )
            for index in range(50)
        ]
        self.client.force_authenticate(user=self.u1)

        response = self.client.post(
            reverse("accounts:messaging_create_group_conversation"),
            {"name": "Príliš veľa", "invited_user_ids": [user.id for user in users]},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_group_member_candidates_include_direct_contacts_and_favorites(self):
        convo = self._create_direct_conversation(actor=self.u1, target=self.u2)
        now = timezone.now()
        Message.objects.create(conversation=convo, sender=self.u1, text="Ahoj", created_at=now)
        convo.last_message_at = now
        convo.save(update_fields=["last_message_at", "updated_at"])
        FavoriteUser.objects.create(user=self.u1, favorite_user=self.u3)
        store_message_presence(user_id=self.u2.id, visible=True, active_conversation_id=convo.id)

        self.client.force_authenticate(user=self.u1)
        response = self.client.get(reverse("accounts:messaging_group_member_candidates"))

        assert response.status_code == status.HTTP_200_OK
        ids = [item["id"] for item in response.data["results"]]
        assert self.u2.id in ids
        assert self.u3.id in ids
        u2_result = next(item for item in response.data["results"] if item["id"] == self.u2.id)
        assert u2_result["presence_status"] == "online"
        assert "email" not in u2_result

    def test_group_member_candidates_search_excludes_existing_members(self):
        self.u3.first_name = "Anna"
        self.u3.save(update_fields=["first_name"])
        self.client.force_authenticate(user=self.u1)
        create_response = self.client.post(
            reverse("accounts:messaging_create_group_conversation"),
            {"name": "Test skupina", "invited_user_ids": [self.u2.id]},
            format="json",
        )
        assert create_response.status_code == status.HTTP_201_CREATED

        response = self.client.get(
            reverse("accounts:messaging_group_member_candidates"),
            {"conversation_id": create_response.data["id"], "q": "Anna"},
        )

        assert response.status_code == status.HTTP_200_OK
        ids = [item["id"] for item in response.data["results"]]
        assert self.u1.id not in ids
        assert self.u2.id not in ids
        assert self.u3.id in ids

    def test_invited_group_user_cannot_read_group_history_before_accepting(self):
        self.client.force_authenticate(user=self.u1)
        create_response = self.client.post(
            reverse("accounts:messaging_create_group_conversation"),
            {"name": "Tajna skupina", "invited_user_ids": [self.u2.id]},
            format="json",
        )
        assert create_response.status_code == status.HTTP_201_CREATED
        conversation_id = create_response.data["id"]
        send_response = self.client.post(
            reverse("accounts:messaging_send_message", kwargs={"conversation_id": conversation_id}),
            {"text": "secret group history"},
            format="json",
        )
        assert send_response.status_code == status.HTTP_201_CREATED

        self.client.force_authenticate(user=self.u2)
        messages_response = self.client.get(
            reverse("accounts:messaging_list_messages", kwargs={"conversation_id": conversation_id})
        )
        list_response = self.client.get(reverse("accounts:messaging_list_conversations"))

        assert messages_response.status_code == status.HTTP_200_OK
        message_texts = [item["text"] for item in messages_response.data["results"]]
        assert "secret group history" not in message_texts
        assert all(item["message_type"] == Message.Type.GROUP_INVITATION for item in messages_response.data["results"])

        assert list_response.status_code == status.HTTP_200_OK
        group_item = next(item for item in list_response.data["results"] if item["id"] == conversation_id)
        assert group_item["last_message_preview"] is None
        assert group_item["last_message_type"] == Message.Type.GROUP_INVITATION
        assert group_item["participants"] == []
