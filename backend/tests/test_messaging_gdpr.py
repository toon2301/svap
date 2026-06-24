"""
GDPR testy messagingu:
- anonymizácia obsahu vlastných správ pri zmazaní účtu (_scrub_user_messages)
- orphan S3 cleanup pri tvrdom zmazaní Message (post_delete signál)
"""

import shutil
import tempfile
from io import BytesIO
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image
from rest_framework.test import APITestCase

from accounts.account_deletion import anonymize_user
from messaging.models import Conversation, Message
from messaging.services.conversations import open_or_create_direct_conversation
from messaging.services.messages import send_message

User = get_user_model()


@pytest.mark.django_db
class TestMessagingGdpr(APITestCase):
    def setUp(self):
        cache.clear()
        self.temp_media_root = tempfile.mkdtemp()
        media_override = override_settings(
            MEDIA_ROOT=self.temp_media_root,
            SAFESEARCH_ENABLED=False,
        )
        media_override.enable()
        self.addCleanup(media_override.disable)
        self.addCleanup(lambda: shutil.rmtree(self.temp_media_root, ignore_errors=True))
        push_patcher = patch(
            "messaging.services.push_enqueue.deliver_message_push_task.delay",
            return_value=None,
        )
        push_patcher.start()
        self.addCleanup(push_patcher.stop)
        self.sender = User.objects.create_user(
            username="sender",
            email="sender@example.com",
            password="StrongPass123",
            is_active=True,
            is_verified=True,
        )
        self.other = User.objects.create_user(
            username="other",
            email="other@example.com",
            password="StrongPass123",
            is_active=True,
            is_verified=True,
        )

    def _image_upload(self, name: str = "msg.png") -> SimpleUploadedFile:
        buffer = BytesIO()
        Image.new("RGB", (4, 4), (0, 255, 0)).save(buffer, format="PNG")
        return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")

    # ------------------------------------------------------------------ #
    # BOD 1 – anonymizácia obsahu vlastných správ
    # ------------------------------------------------------------------ #
    def test_anonymize_scrubs_sender_messages_and_keeps_counterpart(self):
        convo = open_or_create_direct_conversation(
            actor=self.sender, target=self.other
        ).conversation

        with self.captureOnCommitCallbacks(execute=True):
            text_msg = send_message(
                conversation=convo, sender=self.sender, text="moj tajny text"
            ).message
            image_msg = send_message(
                conversation=convo, sender=self.sender, image=self._image_upload()
            ).message
            counterpart = send_message(
                conversation=convo, sender=self.other, text="odpoved protistrany"
            ).message

        image_msg.refresh_from_db()
        image_name = image_msg.image.name
        thumb_name = image_msg.image_thumbnail.name
        assert image_name and default_storage.exists(image_name)
        assert thumb_name and default_storage.exists(thumb_name)

        with self.captureOnCommitCallbacks(execute=True):
            anonymize_user(self.sender)

        text_msg.refresh_from_db()
        image_msg.refresh_from_db()
        counterpart.refresh_from_db()

        # Vlastné správy: obsah anonymizovaný, sender FK ostáva.
        assert text_msg.is_deleted is True
        assert text_msg.text == ""
        assert text_msg.sender_id == self.sender.id
        assert image_msg.is_deleted is True
        assert image_msg.text == ""
        assert not image_msg.image
        assert not image_msg.image_thumbnail

        # Obrázky zmazané zo storage.
        assert not default_storage.exists(image_name)
        assert not default_storage.exists(thumb_name)

        # Protistrana nedotknutá.
        assert counterpart.is_deleted is False
        assert counterpart.text == "odpoved protistrany"
        assert counterpart.sender_id == self.other.id

        # Konverzácia stále existuje (PROTECT FK).
        assert Conversation.objects.filter(id=convo.id).exists()

    def test_anonymize_user_without_messages_does_not_fail(self):
        with self.captureOnCommitCallbacks(execute=True):
            anonymize_user(self.sender)
        self.sender.refresh_from_db()
        assert self.sender.is_active is False

    # ------------------------------------------------------------------ #
    # BOD 2 – orphan S3 cleanup pri tvrdom zmazaní Message
    # ------------------------------------------------------------------ #
    def test_hard_delete_message_removes_image_from_storage(self):
        convo = open_or_create_direct_conversation(
            actor=self.sender, target=self.other
        ).conversation
        with self.captureOnCommitCallbacks(execute=True):
            msg = send_message(
                conversation=convo, sender=self.sender, image=self._image_upload()
            ).message

        msg.refresh_from_db()
        image_name = msg.image.name
        thumb_name = msg.image_thumbnail.name
        assert default_storage.exists(image_name)
        assert default_storage.exists(thumb_name)

        with self.captureOnCommitCallbacks(execute=True):
            msg.delete()

        assert not default_storage.exists(image_name)
        assert not default_storage.exists(thumb_name)

    def test_cascade_delete_conversation_removes_message_images(self):
        convo = open_or_create_direct_conversation(
            actor=self.sender, target=self.other
        ).conversation
        with self.captureOnCommitCallbacks(execute=True):
            msg = send_message(
                conversation=convo, sender=self.sender, image=self._image_upload()
            ).message

        msg.refresh_from_db()
        image_name = msg.image.name
        assert default_storage.exists(image_name)

        with self.captureOnCommitCallbacks(execute=True):
            convo.delete()  # CASCADE → Message zmazaná → post_delete signál

        assert not Message.objects.filter(id=msg.id).exists()
        assert not default_storage.exists(image_name)

    def test_hard_delete_text_only_message_does_not_crash(self):
        convo = open_or_create_direct_conversation(
            actor=self.sender, target=self.other
        ).conversation
        with self.captureOnCommitCallbacks(execute=True):
            msg = send_message(
                conversation=convo, sender=self.sender, text="len text"
            ).message

        with self.captureOnCommitCallbacks(execute=True):
            msg.delete()

        assert not Message.objects.filter(id=msg.id).exists()
