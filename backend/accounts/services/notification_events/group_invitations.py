"""Notifikácie k pozvánkam do skupinového chatu."""

from __future__ import annotations

from accounts.models import Notification, NotificationType

from ..notification_core import create_notification


def create_group_invitation_notification(*, invitation, actor) -> Notification | None:
    conversation = invitation.conversation
    return create_notification(
        user=invitation.invited_user,
        notif_type=NotificationType.GROUP_INVITATION,
        title="Pozvánka do skupiny",
        body="Dostali ste pozvánku do skupinového chatu.",
        actor=actor,
        conversation=conversation,
        group_invitation=invitation,
        data={
            "conversation_id": conversation.id,
            "group_invitation_id": invitation.id,
            "from_user_id": actor.id,
        },
    )
