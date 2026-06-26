"""Pozvánky do skupiny: vytvorenie pozvánky a reakcia (accept/decline)."""
from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from accounts.services.notifications import create_group_invitation_notification

from ..models import Conversation, ConversationParticipant, GroupInvitation, Message
from .group_common import (
    MAX_GROUP_PARTICIPANTS,
    CannotInviteSelf,
    GroupInvitationResult,
    GroupLimitExceeded,
    GroupMutationResult,
    InvitationNotPending,
    NotActiveGroupMember,
    _active_or_invited_count,
    _active_participant_user_ids,
    _create_system_message,
    _ensure_group,
    ensure_group_owner,
)
from .push_enqueue import schedule_message_push_delivery


def invite_user_to_group(
    *,
    conversation: Conversation,
    actor,
    invited_user,
    already_locked: bool = False,
) -> GroupInvitationResult:
    if int(actor.id) == int(invited_user.id):
        raise CannotInviteSelf("Cannot invite yourself.")

    def _perform() -> GroupInvitationResult:
        _ensure_group(conversation)
        # Len owner skupiny smie pozývať. Vynucujeme to aj na service vrstve
        # (nielen na API), aby permission check neobišiel žiadny vstupný bod.
        ensure_group_owner(conversation=conversation, user_id=actor.id)

        existing_participant = (
            ConversationParticipant.objects.select_for_update()
            .filter(conversation=conversation, user=invited_user)
            .first()
        )
        if existing_participant and existing_participant.status in (
            ConversationParticipant.Status.ACTIVE,
            ConversationParticipant.Status.INVITED,
        ):
            existing_invitation = (
                GroupInvitation.objects.select_for_update()
                .filter(
                    conversation=conversation,
                    invited_user=invited_user,
                    status=GroupInvitation.Status.PENDING,
                )
                .select_related("message")
                .first()
            )
            if existing_invitation:
                return GroupInvitationResult(
                    invitation=existing_invitation,
                    message=existing_invitation.message,
                    participant_user_ids=_active_participant_user_ids(conversation=conversation)
                    + (invited_user.id,),
                    created=False,
                )
            raise InvitationNotPending("User is already in the group.")

        if _active_or_invited_count(conversation=conversation) >= MAX_GROUP_PARTICIPANTS:
            raise GroupLimitExceeded("Group cannot have more than 50 participants.")

        participant_defaults = {
            "role": ConversationParticipant.Role.MEMBER,
            "status": ConversationParticipant.Status.INVITED,
            "left_at": None,
        }
        if existing_participant:
            for field, value in participant_defaults.items():
                setattr(existing_participant, field, value)
            existing_participant.save(update_fields=["role", "status", "left_at"])
        else:
            ConversationParticipant.objects.create(
                conversation=conversation,
                user=invited_user,
                **participant_defaults,
            )

        now = timezone.now()
        invitation = GroupInvitation.objects.create(
            conversation=conversation,
            invited_user=invited_user,
            invited_by=actor,
            status=GroupInvitation.Status.PENDING,
        )
        message = Message.objects.create(
            conversation=conversation,
            sender=actor,
            text="",
            message_type=Message.Type.GROUP_INVITATION,
            metadata={
                "invitation_id": invitation.id,
                "invited_user_id": invited_user.id,
                "invited_by_id": actor.id,
            },
            created_at=now,
        )
        invitation.message = message
        invitation.save(update_fields=["message", "updated_at"])
        conversation.last_message_at = now
        conversation.save(update_fields=["last_message_at", "updated_at"])

        recipient_user_ids = tuple(
            sorted(set(_active_participant_user_ids(conversation=conversation) + (invited_user.id,)))
        )
        create_group_invitation_notification(invitation=invitation, actor=actor)
        schedule_message_push_delivery(message_id=message.id, recipient_user_ids=recipient_user_ids)
        return GroupInvitationResult(
            invitation=invitation,
            message=message,
            participant_user_ids=recipient_user_ids,
        )

    if already_locked:
        return _perform()
    with transaction.atomic():
        conversation = (
            Conversation.objects.select_for_update()
            .filter(id=conversation.id)
            .first()
        )
        if conversation is None:
            raise ValueError("Conversation not found.")
        return _perform()


def respond_to_group_invitation(*, invitation: GroupInvitation, actor, accept: bool) -> GroupMutationResult:
    with transaction.atomic():
        invitation = (
            GroupInvitation.objects.select_for_update()
            .select_related("conversation", "invited_user", "invited_by")
            .filter(id=invitation.id)
            .first()
        )
        if invitation is None:
            raise ValueError("Invitation not found.")
        if invitation.invited_user_id != actor.id:
            raise NotActiveGroupMember("Only the invited user can respond.")
        if invitation.status != GroupInvitation.Status.PENDING:
            raise InvitationNotPending("Invitation is not pending.")

        conversation = (
            Conversation.objects.select_for_update()
            .filter(id=invitation.conversation_id)
            .first()
        )
        if conversation is None:
            raise ValueError("Conversation not found.")
        _ensure_group(conversation)

        participant = (
            ConversationParticipant.objects.select_for_update()
            .filter(conversation=conversation, user=actor)
            .first()
        )
        if participant is None:
            raise NotActiveGroupMember("Invitation participant is missing.")

        now = timezone.now()
        invitation.status = (
            GroupInvitation.Status.ACCEPTED if accept else GroupInvitation.Status.DECLINED
        )
        invitation.responded_at = now
        invitation.save(update_fields=["status", "responded_at", "updated_at"])

        participant.status = (
            ConversationParticipant.Status.ACTIVE if accept else ConversationParticipant.Status.REMOVED
        )
        participant.left_at = None if accept else now
        participant.save(update_fields=["status", "left_at"])

        text = (
            f"{actor.display_name or actor.username} prijal/a pozvánku do skupiny."
            if accept
            else f"{actor.display_name or actor.username} odmietol/a pozvánku do skupiny."
        )
        message = _create_system_message(
            conversation=conversation,
            actor=actor,
            text=text,
            metadata={"event": "group_invitation_accepted" if accept else "group_invitation_declined"},
        )
        recipient_user_ids = _active_participant_user_ids(conversation=conversation)
        schedule_message_push_delivery(message_id=message.id, recipient_user_ids=recipient_user_ids)
        return GroupMutationResult(
            conversation=conversation,
            participant_user_ids=recipient_user_ids,
        )
