from __future__ import annotations

import uuid
from pathlib import Path

from django.conf import settings
from django.db import models

from swaply.validators import validate_image_file

from .storage import get_message_image_storage


def message_image_upload_to(instance: "Message", filename: str) -> str:
    suffix = Path(filename or "").suffix.lower()
    safe_suffix = suffix if suffix else ".jpg"
    conversation_id = instance.conversation_id or "pending"
    return f"messages/{conversation_id}/{uuid.uuid4().hex}{safe_suffix}"


def message_thumbnail_upload_to(instance: "Message", filename: str) -> str:
    suffix = Path(filename or "").suffix.lower()
    safe_suffix = suffix if suffix else ".webp"
    conversation_id = instance.conversation_id or "pending"
    return f"messages/{conversation_id}/thumbnails/{uuid.uuid4().hex}{safe_suffix}"


def conversation_avatar_upload_to(instance: "Conversation", filename: str) -> str:
    suffix = Path(filename or "").suffix.lower()
    safe_suffix = suffix if suffix else ".jpg"
    conversation_id = instance.pk or "pending"
    return f"conversation-avatars/{conversation_id}/{uuid.uuid4().hex}{safe_suffix}"


class Conversation(models.Model):
    class RequestStatus(models.TextChoices):
        ACCEPTED = "accepted", "Accepted"
        PENDING = "pending", "Pending"
        DELETED = "deleted", "Deleted"

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_conversations",
    )
    pinned_message = models.ForeignKey(
        "Message",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    is_group = models.BooleanField(default=False, db_index=True)
    name = models.CharField(max_length=120, blank=True, default="")
    avatar = models.ImageField(
        upload_to=conversation_avatar_upload_to,
        blank=True,
        null=True,
        validators=[validate_image_file],
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_message_at = models.DateTimeField(null=True, blank=True)
    request_status = models.CharField(
        max_length=20,
        choices=RequestStatus.choices,
        default=RequestStatus.ACCEPTED,
        db_index=True,
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="sent_message_requests",
        null=True,
        blank=True,
    )
    requested_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="received_message_requests",
        null=True,
        blank=True,
    )
    accepted_at = models.DateTimeField(null=True, blank=True)
    request_seen_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["last_message_at"], name="conv_last_msg_at_idx"),
            models.Index(
                fields=["requested_to", "request_status", "last_message_at"],
                name="conv_req_to_status_last_idx",
            ),
            models.Index(
                fields=["requested_by", "requested_to", "request_status"],
                name="conv_req_pair_status_idx",
            ),
        ]

    def __str__(self) -> str:
        return f"Conversation#{self.pk}"


class ConversationParticipant(models.Model):
    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        MEMBER = "member", "Member"

    class Status(models.TextChoices):
        INVITED = "invited", "Invited"
        ACTIVE = "active", "Active"
        LEFT = "left", "Left"
        REMOVED = "removed", "Removed"

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
    pinned_at = models.DateTimeField(null=True, blank=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.MEMBER)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    left_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["conversation", "user"],
                name="uniq_conversation_participant_user",
            ),
        ]
        indexes = [
            models.Index(fields=["user", "hidden_at"], name="conv_part_user_hidden_idx"),
            models.Index(fields=["user", "pinned_at"], name="conv_part_user_pinned_idx"),
            models.Index(fields=["conversation", "status"], name="conv_part_conv_status_idx"),
            models.Index(fields=["user", "status"], name="conv_part_user_status_idx"),
        ]

    def __str__(self) -> str:
        return f"ConversationParticipant(conv={self.conversation_id}, user={self.user_id})"


class Message(models.Model):
    class Type(models.TextChoices):
        USER = "user", "User"
        SYSTEM = "system", "System"
        GROUP_INVITATION = "group_invitation", "Group invitation"
        PROFILE_SHARE = "profile_share", "Profile share"
        OFFER_SHARE = "offer_share", "Offer share"

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
        storage=get_message_image_storage,
        blank=True,
        null=True,
        validators=[validate_image_file],
    )
    image_thumbnail = models.ImageField(
        upload_to=message_thumbnail_upload_to,
        storage=get_message_image_storage,
        blank=True,
        null=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    edited_at = models.DateTimeField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False)
    message_type = models.CharField(
        max_length=32,
        choices=Type.choices,
        default=Type.USER,
    )
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["conversation", "created_at"], name="msg_conv_created_at_idx"),
        ]
        ordering = ["created_at", "id"]

    def __str__(self) -> str:
        return f"Message#{self.pk} (conv={self.conversation_id})"


class GroupInvitation(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        DECLINED = "declined", "Declined"
        CANCELLED = "cancelled", "Cancelled"

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="group_invitations",
    )
    invited_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="received_group_invitations",
    )
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="sent_group_invitations",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    message = models.OneToOneField(
        Message,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="group_invitation",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["conversation", "invited_user"],
                condition=models.Q(status="pending"),
                name="uniq_pending_group_invitation_user",
            ),
        ]
        indexes = [
            models.Index(
                fields=["invited_user", "status", "created_at"],
                name="grp_inv_user_status_idx",
            ),
            models.Index(
                fields=["conversation", "status"], name="grp_inv_conv_status_idx"
            ),
        ]

    def __str__(self) -> str:
        return (
            f"GroupInvitation#{self.pk} "
            f"(conv={self.conversation_id}, user={self.invited_user_id})"
        )
