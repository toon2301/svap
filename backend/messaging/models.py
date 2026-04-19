from __future__ import annotations

import uuid
from pathlib import Path

from django.conf import settings
from django.db import models

from swaply.validators import validate_image_file


def message_image_upload_to(instance: "Message", filename: str) -> str:
    suffix = Path(filename or "").suffix.lower()
    safe_suffix = suffix if suffix else ".jpg"
    conversation_id = instance.conversation_id or "pending"
    return f"messages/{conversation_id}/{uuid.uuid4().hex}{safe_suffix}"


class Conversation(models.Model):
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_conversations",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_message_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["last_message_at"], name="conv_last_msg_at_idx"),
        ]

    def __str__(self) -> str:
        return f"Conversation#{self.pk}"


class ConversationParticipant(models.Model):
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="participants",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="conversation_participations",
    )
    joined_at = models.DateTimeField(auto_now_add=True)
    last_read_at = models.DateTimeField(null=True, blank=True)
    hidden_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["conversation", "user"],
                name="uniq_conversation_participant_user",
            ),
        ]
        indexes = [
            models.Index(fields=["user", "hidden_at"], name="conv_part_user_hidden_idx"),
        ]

    def __str__(self) -> str:
        return f"ConversationParticipant(conv={self.conversation_id}, user={self.user_id})"


class Message(models.Model):
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="sent_messages",
    )
    text = models.TextField(blank=True, default="")
    image = models.ImageField(
        upload_to=message_image_upload_to,
        blank=True,
        null=True,
        validators=[validate_image_file],
    )
    created_at = models.DateTimeField(auto_now_add=True)
    edited_at = models.DateTimeField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        indexes = [
            models.Index(fields=["conversation", "created_at"], name="msg_conv_created_at_idx"),
        ]
        ordering = ["created_at", "id"]

    def __str__(self) -> str:
        return f"Message#{self.pk} (conv={self.conversation_id})"

