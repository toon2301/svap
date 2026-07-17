"""Skupinové konverzácie – životný cyklus (vytvorenie, úprava, členstvo, zmazanie).

Pozvánky: group_invitations.py. Zdieľané typy/helpery: group_common.py.
Tento modul re-exportuje verejné API (messaging.services.groups) pre spätnú kompatibilitu.
"""
from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from accounts.services.user_blocks import exclude_blocked_users

from ..models import Conversation, ConversationParticipant, GroupInvitation
from .group_common import (  # noqa: F401  (re-export verejného API)
    MAX_GROUP_PARTICIPANTS,
    CannotInviteSelf,
    ConversationNotGroup,
    GroupInvitationResult,
    GroupLimitExceeded,
    GroupMutationResult,
    GroupNameRequired,
    GroupServiceError,
    InvitationNotPending,
    NotActiveGroupMember,
    NotGroupOwner,
    _active_participant_user_ids,
    _create_system_message,
    ensure_active_group_member,
    ensure_group_owner,
)
from .group_invitations import (  # noqa: F401  (re-export)
    invite_user_to_group,
    respond_to_group_invitation,
)

User = get_user_model()


def create_group_conversation(
    *,
    actor,
    name: str,
    invited_user_ids=None,
) -> GroupMutationResult:
    clean_name = (name or "").strip()
    if not clean_name:
        raise GroupNameRequired("Group name is required.")

    unique_invited_ids = sorted(
        {
            int(user_id)
            for user_id in (invited_user_ids or [])
            if int(user_id) > 0 and int(user_id) != int(actor.id)
        }
    )
    if len(unique_invited_ids) + 1 > MAX_GROUP_PARTICIPANTS:
        raise GroupLimitExceeded("Group cannot have more than 50 participants.")

    invited_users = User.objects.filter(
        id__in=unique_invited_ids,
        is_active=True,
        is_public=True,
        is_staff=False,
        is_superuser=False,
    )
    invited_users = exclude_blocked_users(
        invited_users,
        viewer_user_id=actor.id,
    )
    users_by_id = {
        user.id: user
        for user in invited_users
    }

    with transaction.atomic():
        conversation = Conversation.objects.create(
            created_by=actor,
            is_group=True,
            name=clean_name,
        )
        ConversationParticipant.objects.create(
            conversation=conversation,
            user=actor,
            role=ConversationParticipant.Role.OWNER,
            status=ConversationParticipant.Status.ACTIVE,
        )
        _create_system_message(
            conversation=conversation,
            actor=actor,
            text=f"{actor.display_name or actor.username} vytvoril/a skupinu {clean_name}.",
            metadata={"event": "group_created"},
        )

        for invited_user_id in unique_invited_ids:
            target = users_by_id.get(invited_user_id)
            if target is not None:
                invite_user_to_group(
                    conversation=conversation,
                    actor=actor,
                    invited_user=target,
                    already_locked=True,
                )

        return GroupMutationResult(
            conversation=conversation,
            participant_user_ids=_active_participant_user_ids(conversation=conversation),
        )


def update_group_conversation(
    *,
    conversation: Conversation,
    actor,
    name: str | None = None,
) -> GroupMutationResult:
    with transaction.atomic():
        conversation = (
            Conversation.objects.select_for_update()
            .filter(id=conversation.id)
            .first()
        )
        if conversation is None:
            raise ValueError("Conversation not found.")
        ensure_group_owner(conversation=conversation, user_id=actor.id)

        update_fields: list[str] = []
        if name is not None:
            clean_name = name.strip()
            if not clean_name:
                raise GroupNameRequired("Group name is required.")
            conversation.name = clean_name
            update_fields.append("name")
        if update_fields:
            update_fields.append("updated_at")
            conversation.save(update_fields=update_fields)

        return GroupMutationResult(
            conversation=conversation,
            participant_user_ids=_active_participant_user_ids(conversation=conversation),
            changed=bool(update_fields),
        )


def remove_group_member(*, conversation: Conversation, actor, user_id: int) -> GroupMutationResult:
    with transaction.atomic():
        conversation = (
            Conversation.objects.select_for_update()
            .filter(id=conversation.id)
            .first()
        )
        if conversation is None:
            raise ValueError("Conversation not found.")
        ensure_group_owner(conversation=conversation, user_id=actor.id)
        if int(user_id) == int(actor.id):
            raise NotGroupOwner("The group owner cannot remove themselves.")

        participant = (
            ConversationParticipant.objects.select_for_update()
            .filter(
                conversation=conversation,
                user_id=user_id,
                status__in=[
                    ConversationParticipant.Status.ACTIVE,
                    ConversationParticipant.Status.INVITED,
                ],
            )
            .first()
        )
        if participant is None:
            raise NotActiveGroupMember("User is not a removable group member.")

        now = timezone.now()
        participant.status = ConversationParticipant.Status.REMOVED
        participant.left_at = now
        participant.save(update_fields=["status", "left_at"])
        GroupInvitation.objects.filter(
            conversation=conversation,
            invited_user_id=user_id,
            status=GroupInvitation.Status.PENDING,
        ).update(status=GroupInvitation.Status.CANCELLED, responded_at=now)

        removed_user = User.objects.filter(id=user_id).first()
        name = getattr(removed_user, "display_name", "") or getattr(removed_user, "username", "")
        _create_system_message(
            conversation=conversation,
            actor=actor,
            text=f"{name or 'Používateľ'} bol/a odobraný/á zo skupiny.",
            metadata={"event": "group_member_removed", "user_id": user_id},
        )
        return GroupMutationResult(
            conversation=conversation,
            participant_user_ids=_active_participant_user_ids(conversation=conversation),
        )


def leave_group(*, conversation: Conversation, actor) -> GroupMutationResult:
    with transaction.atomic():
        conversation = (
            Conversation.objects.select_for_update()
            .filter(id=conversation.id)
            .first()
        )
        if conversation is None:
            raise ValueError("Conversation not found.")
        participant = ensure_active_group_member(conversation=conversation, user_id=actor.id)
        if participant.role == ConversationParticipant.Role.OWNER:
            raise NotGroupOwner("The group owner cannot leave the group.")

        now = timezone.now()
        participant.status = ConversationParticipant.Status.LEFT
        participant.left_at = now
        participant.save(update_fields=["status", "left_at"])
        _create_system_message(
            conversation=conversation,
            actor=actor,
            text=f"{actor.display_name or actor.username} opustil/a skupinu.",
            metadata={"event": "group_member_left", "user_id": actor.id},
        )
        return GroupMutationResult(
            conversation=conversation,
            participant_user_ids=_active_participant_user_ids(conversation=conversation),
        )


def delete_group(*, conversation: Conversation, actor) -> GroupMutationResult:
    with transaction.atomic():
        conversation = (
            Conversation.objects.select_for_update()
            .filter(id=conversation.id)
            .first()
        )
        if conversation is None:
            raise ValueError("Conversation not found.")
        ensure_group_owner(conversation=conversation, user_id=actor.id)
        participant_user_ids = tuple(
            ConversationParticipant.objects.filter(conversation=conversation).values_list(
                "user_id",
                flat=True,
            )
        )
        conversation.delete()
        return GroupMutationResult(
            conversation=conversation,
            participant_user_ids=participant_user_ids,
        )
