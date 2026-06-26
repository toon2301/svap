"""
BOD 3 – do skupiny smie pozývať LEN owner; vynútené aj na SERVICE vrstve.

Pred opravou invite_user_to_group používalo ensure_active_group_member, takže
ktorýkoľvek aktívny člen (nielen owner) mohol pozývať – a API vrstva owner-check
pri invite tiež nemala. Po oprave service vynucuje ensure_group_owner, takže
permission check nemožno obísť žiadnym vstupným bodom (backend = zdroj pravdy).
"""

from __future__ import annotations

from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from messaging.models import ConversationParticipant, GroupInvitation
from messaging.services.group_common import NotGroupOwner
from messaging.services.group_invitations import (
    invite_user_to_group,
    respond_to_group_invitation,
)
from messaging.services.groups import create_group_conversation

User = get_user_model()


@pytest.mark.django_db
class TestGroupInvitationPermissions(APITestCase):
    def setUp(self):
        cache.clear()
        push_patcher = patch(
            "messaging.services.push_enqueue.deliver_message_push_task.delay",
            return_value=None,
        )
        push_patcher.start()
        self.addCleanup(push_patcher.stop)
        self.addCleanup(cache.clear)

        self.owner = self._user("owner")
        self.member = self._user("member")
        self.outsider = self._user("outsider")

    def _user(self, username):
        return User.objects.create_user(
            username=username,
            email=f"{username}@example.com",
            password="StrongPass123",
            is_active=True,
            is_verified=True,
            is_public=True,
        )

    def _group_with_active_member(self):
        """Skupina: owner + member (member pozvánku prijal → ACTIVE, role MEMBER)."""
        convo = create_group_conversation(
            actor=self.owner, name="Test skupina", invited_user_ids=[self.member.id]
        ).conversation
        invitation = GroupInvitation.objects.get(
            conversation=convo, invited_user=self.member
        )
        respond_to_group_invitation(invitation=invitation, actor=self.member, accept=True)
        member_participant = ConversationParticipant.objects.get(
            conversation=convo, user=self.member
        )
        assert member_participant.status == ConversationParticipant.Status.ACTIVE
        assert member_participant.role == ConversationParticipant.Role.MEMBER
        return convo

    # ------------------------- SERVICE vrstva ------------------------- #
    def test_service_owner_can_invite(self):
        convo = self._group_with_active_member()

        result = invite_user_to_group(
            conversation=convo, actor=self.owner, invited_user=self.outsider
        )

        assert result.created is True
        assert ConversationParticipant.objects.get(
            conversation=convo, user=self.outsider
        ).status == ConversationParticipant.Status.INVITED

    def test_service_non_owner_member_cannot_invite(self):
        convo = self._group_with_active_member()

        with pytest.raises(NotGroupOwner):
            invite_user_to_group(
                conversation=convo, actor=self.member, invited_user=self.outsider
            )

        # Žiadny participant pre outsidera nevznikol.
        assert not ConversationParticipant.objects.filter(
            conversation=convo, user=self.outsider
        ).exists()

    # --------------------------- API vrstva --------------------------- #
    def _invite_url(self, conversation_id):
        return reverse(
            "accounts:messaging_group_invite",
            kwargs={"conversation_id": conversation_id},
        )

    def test_api_owner_can_invite(self):
        convo = self._group_with_active_member()
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            self._invite_url(convo.id), {"user_id": self.outsider.id}, format="json"
        )

        assert response.status_code == status.HTTP_201_CREATED

    def test_api_non_owner_member_gets_403(self):
        convo = self._group_with_active_member()
        self.client.force_authenticate(user=self.member)

        response = self.client.post(
            self._invite_url(convo.id), {"user_id": self.outsider.id}, format="json"
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert not ConversationParticipant.objects.filter(
            conversation=convo, user=self.outsider
        ).exists()
