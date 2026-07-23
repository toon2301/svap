from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError
from threading import Barrier, Event
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import close_old_connections, connection, transaction
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Notification, OfferedSkill, UserBlock
from accounts.services.user_blocks import (
    BlockedUserInteractionError,
    create_user_block,
    delete_user_block,
    lock_users_and_ensure_interaction_allowed,
)
from messaging.models import Conversation, ConversationParticipant, GroupInvitation, Message
from messaging.services.conversations import (
    open_or_create_direct_conversation,
    send_direct_message,
)
from messaging.services.groups import create_group_conversation
from messaging.services.group_invitations import (
    invite_user_to_group,
    respond_to_group_invitation,
)


User = get_user_model()


@pytest.mark.django_db
class TestMessagingBlockEnforcement(APITestCase):
    def setUp(self):
        cache.clear()
        self.push_delay_patcher = patch(
            "messaging.services.push_enqueue.deliver_message_push_task.delay",
            return_value=None,
        )
        self.push_delay_mock = self.push_delay_patcher.start()
        self.addCleanup(self.push_delay_patcher.stop)

        self.u1 = self._create_user("block-message-one", "One")
        self.u2 = self._create_user("block-message-two", "Two")
        self.u3 = self._create_user("block-message-three", "Three")

    def tearDown(self):
        cache.clear()

    def _create_user(self, username: str, first_name: str):
        return User.objects.create_user(
            username=username,
            email=f"{username}@example.com",
            password="StrongPass123",
            first_name=first_name,
            is_verified=True,
            is_active=True,
            is_public=True,
        )

    def _create_started_direct_conversation(self, actor, target) -> Conversation:
        conversation = open_or_create_direct_conversation(
            actor=actor,
            target=target,
        ).conversation
        now = timezone.now()
        Message.objects.create(
            conversation=conversation,
            sender=actor,
            text="Existing history",
            created_at=now,
        )
        conversation.last_message_at = now
        conversation.save(update_fields=["last_message_at", "updated_at"])
        return conversation

    def test_blocked_pair_cannot_open_or_start_direct_conversation(self):
        UserBlock.objects.create(blocker=self.u2, blocked_user=self.u1)
        self.client.force_authenticate(user=self.u1)

        open_response = self.client.post(
            reverse("accounts:messaging_open"),
            {"target_user_id": self.u2.id},
            format="json",
        )
        send_response = self.client.post(
            reverse("accounts:messaging_send_direct_message"),
            {"target_user_id": self.u2.id, "text": "Blocked"},
            format="json",
        )

        assert open_response.status_code == status.HTTP_404_NOT_FOUND
        assert send_response.status_code == status.HTTP_404_NOT_FOUND
        assert Conversation.objects.count() == 0
        assert Message.objects.count() == 0
        self.push_delay_mock.assert_not_called()

    def test_existing_direct_history_remains_but_both_sides_cannot_send(self):
        conversation = self._create_started_direct_conversation(self.u1, self.u2)
        UserBlock.objects.create(blocker=self.u1, blocked_user=self.u2)
        send_url = reverse(
            "accounts:messaging_send_message",
            kwargs={"conversation_id": conversation.id},
        )
        list_url = reverse(
            "accounts:messaging_list_messages",
            kwargs={"conversation_id": conversation.id},
        )

        for actor in (self.u1, self.u2):
            with self.subTest(actor_id=actor.id):
                self.client.force_authenticate(user=actor)
                conversations_response = self.client.get(
                    reverse("accounts:messaging_list_conversations")
                )
                history_response = self.client.get(list_url)
                with patch(
                    "messaging.api.notification_dispatch.notify_user"
                ) as notify_user_mock:
                    blocked_send = self.client.post(
                        send_url,
                        {"text": "Must not be sent"},
                        format="json",
                    )

                assert conversations_response.status_code == status.HTTP_200_OK
                serialized_conversation = next(
                    item
                    for item in conversations_response.data["results"]
                    if item["id"] == conversation.id
                )
                expected_outgoing_block = actor.id == self.u1.id
                assert serialized_conversation["is_blocked_by_me"] is expected_outgoing_block
                assert history_response.status_code == status.HTTP_200_OK
                assert history_response.data["results"][0]["text"] == "Existing history"
                assert (
                    history_response.data["conversation"]["is_blocked_by_me"]
                    is expected_outgoing_block
                )
                assert blocked_send.status_code == status.HTTP_403_FORBIDDEN
                assert blocked_send.data["code"] == "recipient_unavailable"
                notify_user_mock.assert_not_called()

        assert Message.objects.filter(conversation=conversation).count() == 1
        self.push_delay_mock.assert_not_called()

    def test_block_keeps_pending_request_accessible_but_blocks_interaction(self):
        # Revised design (2026-07): blocking no longer closes the PENDING request
        # (previously it was set to DELETED, creating a "ghost" conversation the
        # blocker saw in the list query but could not open). It now stays PENDING:
        # both sides retain read access, the blocked accept/reply is refused by the
        # existing interaction-block checks. See create_user_block for the rationale.
        self.client.force_authenticate(user=self.u1)
        first_send = self.client.post(
            reverse("accounts:messaging_send_direct_message"),
            {"target_user_id": self.u2.id, "text": "Pending request"},
            format="json",
        )
        assert first_send.status_code == status.HTTP_201_CREATED
        conversation_id = first_send.data["conversation_id"]
        self.push_delay_mock.reset_mock()

        # u2 (the recipient) blocks u1 (the sender) — blocker need not be the sender.
        self.client.force_authenticate(user=self.u2)
        block_response = self.client.post(
            reverse("accounts:user_block_detail", args=[self.u1.id]),
            {},
            format="json",
        )
        assert block_response.status_code == status.HTTP_201_CREATED

        conversation = Conversation.objects.get(id=conversation_id)
        assert conversation.request_status == Conversation.RequestStatus.PENDING
        assert Message.objects.filter(conversation=conversation).count() == 1

        # The blocker (u2, requested_to) still sees it in the message-requests list.
        request_list = self.client.get(
            reverse("accounts:messaging_list_message_requests")
        )
        assert request_list.status_code == status.HTTP_200_OK
        assert any(
            item["id"] == conversation_id for item in request_list.data["results"]
        )
        # ... but accepting it is refused by the interaction-block check.
        accept_response = self.client.post(
            reverse(
                "accounts:messaging_accept_message_request",
                kwargs={"conversation_id": conversation_id},
            ),
            {},
            format="json",
        )
        assert accept_response.status_code == status.HTTP_404_NOT_FOUND
        # Neutral code so the client shows a friendly "can't message" message.
        assert accept_response.data["code"] == "recipient_unavailable"

        # The blocked sender (u1) can still OPEN the conversation (no 404 ghost) ...
        self.client.force_authenticate(user=self.u1)
        history = self.client.get(
            reverse(
                "accounts:messaging_list_messages",
                kwargs={"conversation_id": conversation_id},
            )
        )
        assert history.status_code == status.HTTP_200_OK
        assert history.data["results"][0]["text"] == "Pending request"
        # ... but cannot send another message while the block stands.
        blocked_send = self.client.post(
            reverse(
                "accounts:messaging_send_message",
                kwargs={"conversation_id": conversation_id},
            ),
            {"text": "Must not be sent"},
            format="json",
        )
        assert blocked_send.status_code == status.HTTP_403_FORBIDDEN
        assert blocked_send.data["code"] == "recipient_unavailable"
        assert Message.objects.filter(conversation=conversation).count() == 1

        # Unblocking keeps the same PENDING request (never deleted) and lets the
        # recipient accept it afterwards.
        self.client.force_authenticate(user=self.u2)
        unblock_response = self.client.delete(
            reverse("accounts:user_block_detail", args=[self.u1.id])
        )
        assert unblock_response.status_code == status.HTTP_200_OK
        conversation.refresh_from_db()
        assert conversation.request_status == Conversation.RequestStatus.PENDING
        accept_after_unblock = self.client.post(
            reverse(
                "accounts:messaging_accept_message_request",
                kwargs={"conversation_id": conversation_id},
            ),
            {},
            format="json",
        )
        assert accept_after_unblock.status_code == status.HTTP_200_OK
        conversation.refresh_from_db()
        assert conversation.request_status == Conversation.RequestStatus.ACCEPTED

    def test_block_by_sender_keeps_request_and_lets_blocker_open_it(self):
        # Symmetric case: the sender blocks the recipient. The blocker (requested_by)
        # keeps the conversation in their main list flagged is_blocked_by_me (drives
        # the banner) and can open it; the blocked recipient still sees the request
        # but cannot accept it.
        self.client.force_authenticate(user=self.u1)
        first_send = self.client.post(
            reverse("accounts:messaging_send_direct_message"),
            {"target_user_id": self.u2.id, "text": "Pending request"},
            format="json",
        )
        assert first_send.status_code == status.HTTP_201_CREATED
        conversation_id = first_send.data["conversation_id"]

        block_response = self.client.post(
            reverse("accounts:user_block_detail", args=[self.u2.id]), {}, format="json"
        )
        assert block_response.status_code == status.HTTP_201_CREATED
        assert (
            Conversation.objects.get(id=conversation_id).request_status
            == Conversation.RequestStatus.PENDING
        )

        conversations = self.client.get(
            reverse("accounts:messaging_list_conversations")
        )
        assert conversations.status_code == status.HTTP_200_OK
        item = next(
            row
            for row in conversations.data["results"]
            if row["id"] == conversation_id
        )
        assert item["is_blocked_by_me"] is True
        history = self.client.get(
            reverse(
                "accounts:messaging_list_messages",
                kwargs={"conversation_id": conversation_id},
            )
        )
        assert history.status_code == status.HTTP_200_OK

        # Blocked recipient still sees the request but cannot accept it.
        self.client.force_authenticate(user=self.u2)
        request_list = self.client.get(
            reverse("accounts:messaging_list_message_requests")
        )
        assert any(
            row["id"] == conversation_id for row in request_list.data["results"]
        )
        accept_response = self.client.post(
            reverse(
                "accounts:messaging_accept_message_request",
                kwargs={"conversation_id": conversation_id},
            ),
            {},
            format="json",
        )
        assert accept_response.status_code == status.HTTP_404_NOT_FOUND

    def test_blocked_recipient_rejects_forward_profile_and_offer_shares(self):
        source_conversation = self._create_started_direct_conversation(self.u1, self.u3)
        source_message = source_conversation.messages.get(text="Existing history")
        offer = OfferedSkill.objects.create(
            user=self.u1,
            category="Teaching",
            subcategory="English",
            description="English tutoring",
            location="Bratislava",
        )
        UserBlock.objects.create(blocker=self.u2, blocked_user=self.u1)
        self.client.force_authenticate(user=self.u1)

        with patch(
            "messaging.api.notification_dispatch.notify_user"
        ) as notify_user_mock:
            forward_response = self.client.post(
                reverse(
                    "accounts:messaging_forward_message",
                    kwargs={
                        "conversation_id": source_conversation.id,
                        "message_id": source_message.id,
                    },
                ),
                {"recipient_user_ids": [self.u2.id]},
                format="json",
            )
            profile_share_response = self.client.post(
                reverse("accounts:messaging_send_profile_share"),
                {
                    "shared_user_id": self.u3.id,
                    "recipient_user_ids": [self.u2.id],
                },
                format="json",
            )
            offer_share_response = self.client.post(
                reverse("accounts:messaging_send_offer_share"),
                {
                    "shared_offer_id": offer.id,
                    "recipient_user_ids": [self.u2.id],
                },
                format="json",
            )

        expected_failure = [
            {"user_id": self.u2.id, "code": "recipient_unavailable"}
        ]
        for response in (
            forward_response,
            profile_share_response,
            offer_share_response,
        ):
            assert response.status_code == status.HTTP_200_OK
            assert response.data["sent"] == []
            assert response.data["failed"] == expected_failure

        assert Message.objects.count() == 1
        notify_user_mock.assert_not_called()
        self.push_delay_mock.assert_not_called()

    def test_block_does_not_stop_existing_group_messages_but_prevents_new_invite(self):
        existing_group = Conversation.objects.create(
            created_by=self.u1,
            is_group=True,
            name="Existing group",
        )
        ConversationParticipant.objects.bulk_create(
            [
                ConversationParticipant(
                    conversation=existing_group,
                    user=self.u1,
                    role=ConversationParticipant.Role.OWNER,
                    status=ConversationParticipant.Status.ACTIVE,
                ),
                ConversationParticipant(
                    conversation=existing_group,
                    user=self.u2,
                    role=ConversationParticipant.Role.MEMBER,
                    status=ConversationParticipant.Status.ACTIVE,
                ),
            ]
        )
        new_group = Conversation.objects.create(
            created_by=self.u1,
            is_group=True,
            name="New group",
        )
        ConversationParticipant.objects.create(
            conversation=new_group,
            user=self.u1,
            role=ConversationParticipant.Role.OWNER,
            status=ConversationParticipant.Status.ACTIVE,
        )
        UserBlock.objects.create(blocker=self.u2, blocked_user=self.u1)
        self.client.force_authenticate(user=self.u1)

        group_send = self.client.post(
            reverse(
                "accounts:messaging_send_message",
                kwargs={"conversation_id": existing_group.id},
            ),
            {"text": "Visible in the shared group"},
            format="json",
        )
        candidates = self.client.get(
            reverse("accounts:messaging_group_member_candidates"),
            {"q": self.u2.username},
        )
        invite_response = self.client.post(
            reverse(
                "accounts:messaging_group_invite",
                kwargs={"conversation_id": new_group.id},
            ),
            {"user_id": self.u2.id},
            format="json",
        )
        create_group_response = self.client.post(
            reverse("accounts:messaging_create_group_conversation"),
            {"name": "Filtered group", "invited_user_ids": [self.u2.id]},
            format="json",
        )

        assert group_send.status_code == status.HTTP_201_CREATED
        assert Message.objects.filter(
            conversation=existing_group,
            text="Visible in the shared group",
        ).exists()
        assert candidates.status_code == status.HTTP_200_OK
        assert self.u2.id not in [item["id"] for item in candidates.data["results"]]
        assert invite_response.status_code == status.HTTP_404_NOT_FOUND
        assert invite_response.data["code"] == "recipient_unavailable"
        assert create_group_response.status_code == status.HTTP_201_CREATED
        assert not ConversationParticipant.objects.filter(
            conversation=new_group,
            user=self.u2,
        ).exists()
        assert not ConversationParticipant.objects.filter(
            conversation_id=create_group_response.data["id"],
            user=self.u2,
        ).exists()

    def _group_with_pending_invitation(self, *, owner, invited_user, other_active_member=None):
        conversation = create_group_conversation(
            actor=owner, name="Blocking regression group", invited_user_ids=[invited_user.id]
        ).conversation
        if other_active_member is not None:
            invite_user_to_group(
                conversation=conversation, actor=owner, invited_user=other_active_member
            )
            other_invitation = GroupInvitation.objects.get(
                conversation=conversation, invited_user=other_active_member
            )
            respond_to_group_invitation(
                invitation=other_invitation, actor=other_active_member, accept=True
            )
        invitation = GroupInvitation.objects.get(
            conversation=conversation, invited_user=invited_user
        )
        return conversation, invitation

    def test_block_by_invited_user_cancels_pending_group_invitation(self):
        conversation, invitation = self._group_with_pending_invitation(
            owner=self.u1, invited_user=self.u2, other_active_member=self.u3
        )

        self.client.force_authenticate(user=self.u2)
        block_response = self.client.post(
            reverse("accounts:user_block_detail", args=[self.u1.id])
        )
        assert block_response.status_code == status.HTTP_201_CREATED

        invitation.refresh_from_db()
        assert invitation.status == GroupInvitation.Status.CANCELLED
        assert invitation.responded_at is not None
        invited_participant = ConversationParticipant.objects.get(
            conversation=conversation, user=self.u2
        )
        assert invited_participant.status == ConversationParticipant.Status.REMOVED
        assert invited_participant.left_at is not None

        # Existing active members are untouched by the block-driven cancellation.
        owner_participant = ConversationParticipant.objects.get(
            conversation=conversation, user=self.u1
        )
        assert owner_participant.status == ConversationParticipant.Status.ACTIVE
        other_participant = ConversationParticipant.objects.get(
            conversation=conversation, user=self.u3
        )
        assert other_participant.status == ConversationParticipant.Status.ACTIVE

        respond_url = reverse(
            "accounts:messaging_group_invitation_response",
            args=[invitation.id, "accept"],
        )
        # Still blocked: the second guard in respond_to_group_invitation
        # rejects it before even looking at the (already cancelled) status.
        accept_while_blocked = self.client.post(respond_url, {}, format="json")
        assert accept_while_blocked.status_code == status.HTTP_404_NOT_FOUND
        assert accept_while_blocked.data["code"] == "recipient_unavailable"

        unblock_response = self.client.delete(
            reverse("accounts:user_block_detail", args=[self.u1.id])
        )
        assert unblock_response.status_code == status.HTTP_200_OK
        invitation.refresh_from_db()
        assert invitation.status == GroupInvitation.Status.CANCELLED
        invited_participant.refresh_from_db()
        assert invited_participant.status == ConversationParticipant.Status.REMOVED

        # Unblocking does not resurrect the cancelled invitation.
        accept_after_unblock = self.client.post(respond_url, {}, format="json")
        assert accept_after_unblock.status_code == status.HTTP_400_BAD_REQUEST

    def test_block_by_inviter_cancels_pending_group_invitation(self):
        conversation, invitation = self._group_with_pending_invitation(
            owner=self.u1, invited_user=self.u2
        )

        self.client.force_authenticate(user=self.u1)
        block_response = self.client.post(
            reverse("accounts:user_block_detail", args=[self.u2.id])
        )
        assert block_response.status_code == status.HTTP_201_CREATED

        invitation.refresh_from_db()
        assert invitation.status == GroupInvitation.Status.CANCELLED
        invited_participant = ConversationParticipant.objects.get(
            conversation=conversation, user=self.u2
        )
        assert invited_participant.status == ConversationParticipant.Status.REMOVED

    def test_respond_to_invitation_rejects_when_pair_already_blocked(self):
        """Second guard: even a pending invitation left over from a data edge
        case (block existed before the row was created/reconciled) must not
        be acceptable while the block stands."""
        conversation, invitation = self._group_with_pending_invitation(
            owner=self.u1, invited_user=self.u2
        )
        UserBlock.objects.create(blocker=self.u1, blocked_user=self.u2)

        with pytest.raises(BlockedUserInteractionError):
            respond_to_group_invitation(invitation=invitation, actor=self.u2, accept=True)

        invitation.refresh_from_db()
        assert invitation.status == GroupInvitation.Status.PENDING
        invited_participant = ConversationParticipant.objects.get(
            conversation=conversation, user=self.u2
        )
        assert invited_participant.status == ConversationParticipant.Status.INVITED


@pytest.mark.django_db(transaction=True)
class TestMessagingBlockConcurrency:
    def setup_method(self):
        cache.clear()
        self.u1 = self._create_user("concurrent-block-one")
        self.u2 = self._create_user("concurrent-block-two")
        self.u3 = self._create_user("concurrent-block-three")

    def teardown_method(self):
        cache.clear()

    @staticmethod
    def _create_user(username: str):
        return User.objects.create_user(
            username=username,
            email=f"{username}@example.com",
            password="StrongPass123",
            is_verified=True,
            is_active=True,
            is_public=True,
        )

    @staticmethod
    def _require_row_locks() -> None:
        if not connection.features.has_select_for_update:
            pytest.skip("The configured database does not support row-level locks.")

    def test_block_serializes_with_direct_message_send(self):
        self._require_row_locks()
        block_lock_held = Event()
        send_lock_attempted = Event()
        release_block = Event()

        from accounts.services import user_blocks as user_blocks_service

        original_cleanup = user_blocks_service.remove_blocked_social_connections

        def hold_block_transaction(*, first_user_id: int, second_user_id: int):
            block_lock_held.set()
            if not release_block.wait(timeout=10):
                raise TimeoutError("Timed out waiting to release the block transaction.")
            return original_cleanup(
                first_user_id=first_user_id,
                second_user_id=second_user_id,
            )

        def signal_message_lock(*, first_user_id: int, second_user_id: int):
            send_lock_attempted.set()
            return lock_users_and_ensure_interaction_allowed(
                first_user_id=first_user_id,
                second_user_id=second_user_id,
            )

        def block_user():
            close_old_connections()
            try:
                blocker = User.objects.get(pk=self.u1.pk)
                blocked_user = User.objects.get(pk=self.u2.pk)
                _, created = create_user_block(
                    blocker=blocker,
                    blocked_user=blocked_user,
                )
                return created
            finally:
                close_old_connections()

        def send_message():
            close_old_connections()
            try:
                actor = User.objects.get(pk=self.u2.pk)
                target = User.objects.get(pk=self.u1.pk)
                return send_direct_message(
                    actor=actor,
                    target=target,
                    text="Must not survive the concurrent block",
                )
            finally:
                close_old_connections()

        with (
            patch(
                "accounts.services.user_blocks.remove_blocked_social_connections",
                side_effect=hold_block_transaction,
            ),
            patch(
                "messaging.services.conversations.lock_users_and_ensure_interaction_allowed",
                side_effect=signal_message_lock,
            ),
            patch(
                "messaging.services.push_enqueue.deliver_message_push_task.delay"
            ) as push_delay_mock,
            ThreadPoolExecutor(max_workers=2) as executor,
        ):
            block_future = executor.submit(block_user)
            assert block_lock_held.wait(timeout=5)
            send_future = executor.submit(send_message)
            assert send_lock_attempted.wait(timeout=5)

            try:
                with pytest.raises(FutureTimeoutError):
                    send_future.result(timeout=0.2)
            finally:
                release_block.set()

            assert block_future.result(timeout=10) is True
            with pytest.raises(BlockedUserInteractionError):
                send_future.result(timeout=10)

        assert UserBlock.objects.filter(
            blocker=self.u1,
            blocked_user=self.u2,
        ).exists()
        assert not Message.objects.filter(
            text="Must not survive the concurrent block"
        ).exists()
        assert not Notification.objects.filter(user=self.u1).exists()
        push_delay_mock.assert_not_called()

    def test_block_serializes_with_group_invitation_acceptance(self):
        self._require_row_locks()
        with patch("messaging.services.push_enqueue.deliver_message_push_task.delay"):
            conversation = create_group_conversation(
                actor=self.u1, name="Concurrent invitation group", invited_user_ids=[self.u2.id]
            ).conversation
        invitation = GroupInvitation.objects.get(
            conversation=conversation, invited_user=self.u2
        )

        block_lock_held = Event()
        accept_lock_attempted = Event()
        release_block = Event()

        from accounts.services import user_blocks as user_blocks_service

        original_cleanup = user_blocks_service.remove_blocked_social_connections

        def hold_block_transaction(*, first_user_id: int, second_user_id: int):
            block_lock_held.set()
            if not release_block.wait(timeout=10):
                raise TimeoutError("Timed out waiting to release the block transaction.")
            return original_cleanup(
                first_user_id=first_user_id,
                second_user_id=second_user_id,
            )

        def signal_accept_lock(*, first_user_id: int, second_user_id: int):
            accept_lock_attempted.set()
            return lock_users_and_ensure_interaction_allowed(
                first_user_id=first_user_id,
                second_user_id=second_user_id,
            )

        def block_user():
            close_old_connections()
            try:
                blocker = User.objects.get(pk=self.u1.pk)
                blocked_user = User.objects.get(pk=self.u2.pk)
                _, created = create_user_block(
                    blocker=blocker,
                    blocked_user=blocked_user,
                )
                return created
            finally:
                close_old_connections()

        def accept_invitation():
            close_old_connections()
            try:
                actor = User.objects.get(pk=self.u2.pk)
                return respond_to_group_invitation(
                    invitation=invitation, actor=actor, accept=True
                )
            finally:
                close_old_connections()

        with (
            patch(
                "accounts.services.user_blocks.remove_blocked_social_connections",
                side_effect=hold_block_transaction,
            ),
            patch(
                "messaging.services.group_invitations.lock_users_and_ensure_interaction_allowed",
                side_effect=signal_accept_lock,
            ),
            patch(
                "messaging.services.push_enqueue.deliver_message_push_task.delay"
            ) as push_delay_mock,
            ThreadPoolExecutor(max_workers=2) as executor,
        ):
            block_future = executor.submit(block_user)
            assert block_lock_held.wait(timeout=5)
            accept_future = executor.submit(accept_invitation)
            assert accept_lock_attempted.wait(timeout=5)

            try:
                with pytest.raises(FutureTimeoutError):
                    accept_future.result(timeout=0.2)
            finally:
                release_block.set()

            assert block_future.result(timeout=10) is True
            with pytest.raises(BlockedUserInteractionError):
                accept_future.result(timeout=10)

        invitation.refresh_from_db()
        assert invitation.status == GroupInvitation.Status.CANCELLED
        assert UserBlock.objects.filter(
            blocker=self.u1,
            blocked_user=self.u2,
        ).exists()
        push_delay_mock.assert_not_called()

    def test_unblock_serializes_with_direct_message_send(self):
        self._require_row_locks()
        UserBlock.objects.create(blocker=self.u1, blocked_user=self.u2)
        unblock_delete_reached = Event()
        send_lock_attempted = Event()
        release_unblock = Event()

        from django.db.models.query import QuerySet

        original_delete = QuerySet.delete

        def hold_user_block_delete(queryset):
            if queryset.model is UserBlock:
                unblock_delete_reached.set()
                if not release_unblock.wait(timeout=10):
                    raise TimeoutError(
                        "Timed out waiting to release the unblock transaction."
                    )
            return original_delete(queryset)

        def signal_message_lock(*, first_user_id: int, second_user_id: int):
            send_lock_attempted.set()
            return lock_users_and_ensure_interaction_allowed(
                first_user_id=first_user_id,
                second_user_id=second_user_id,
            )

        def unblock_user():
            close_old_connections()
            try:
                blocker = User.objects.get(pk=self.u1.pk)
                return delete_user_block(
                    blocker=blocker,
                    blocked_user_id=self.u2.pk,
                )
            finally:
                close_old_connections()

        def send_message():
            close_old_connections()
            try:
                actor = User.objects.get(pk=self.u2.pk)
                target = User.objects.get(pk=self.u1.pk)
                return send_direct_message(
                    actor=actor,
                    target=target,
                    text="Allowed after serialized unblock",
                )
            finally:
                close_old_connections()

        with (
            patch.object(QuerySet, "delete", new=hold_user_block_delete),
            patch(
                "messaging.services.conversations.lock_users_and_ensure_interaction_allowed",
                side_effect=signal_message_lock,
            ),
            patch(
                "messaging.services.push_enqueue.deliver_message_push_task.delay"
            ),
            ThreadPoolExecutor(max_workers=2) as executor,
        ):
            unblock_future = executor.submit(unblock_user)
            assert unblock_delete_reached.wait(timeout=5)
            send_future = executor.submit(send_message)
            assert send_lock_attempted.wait(timeout=5)

            try:
                with pytest.raises(FutureTimeoutError):
                    send_future.result(timeout=0.2)
            finally:
                release_unblock.set()

            assert unblock_future.result(timeout=10) is True
            send_future.result(timeout=10)

        assert not UserBlock.objects.filter(
            blocker=self.u1,
            blocked_user=self.u2,
        ).exists()
        assert Message.objects.filter(
            text="Allowed after serialized unblock"
        ).exists()

    def test_group_creation_locks_all_users_once(self):
        with (
            patch("messaging.services.groups.lock_users_for_update") as lock_users,
            patch(
                "messaging.services.group_invitations.create_group_invitation_notification"
            ),
            patch(
                "messaging.services.group_invitations.schedule_message_push_delivery"
            ),
        ):
            result = create_group_conversation(
                actor=self.u1,
                name="Stable lock order",
                invited_user_ids=[self.u3.id, self.u2.id],
            )

        lock_users.assert_called_once()
        assert set(lock_users.call_args.kwargs["user_ids"]) == {
            self.u1.id,
            self.u2.id,
            self.u3.id,
        }
        assert ConversationParticipant.objects.filter(
            conversation=result.conversation
        ).count() == 3

    def test_prelocked_invitation_only_validates_block_state(self):
        conversation = Conversation.objects.create(
            created_by=self.u1,
            is_group=True,
            name="Prelocked group",
        )
        ConversationParticipant.objects.create(
            conversation=conversation,
            user=self.u1,
            role=ConversationParticipant.Role.OWNER,
            status=ConversationParticipant.Status.ACTIVE,
        )

        with (
            transaction.atomic(),
            patch(
                "messaging.services.group_invitations.ensure_user_interaction_allowed"
            ) as ensure_allowed,
            patch(
                "messaging.services.group_invitations.lock_users_and_ensure_interaction_allowed"
            ) as lock_pair,
            patch(
                "messaging.services.group_invitations.create_group_invitation_notification"
            ),
            patch(
                "messaging.services.group_invitations.schedule_message_push_delivery"
            ),
        ):
            invite_user_to_group(
                conversation=conversation,
                actor=self.u1,
                invited_user=self.u2,
                already_locked=True,
            )

        ensure_allowed.assert_called_once_with(
            first_user_id=self.u1.id,
            second_user_id=self.u2.id,
        )
        lock_pair.assert_not_called()

    def test_overlapping_group_creations_lock_users_without_deadlock(self):
        self._require_row_locks()
        start_barrier = Barrier(2)

        def create_group(*, actor_id: int, invited_user_ids: list[int], name: str):
            close_old_connections()
            try:
                actor = User.objects.get(pk=actor_id)
                start_barrier.wait(timeout=5)
                result = create_group_conversation(
                    actor=actor,
                    name=name,
                    invited_user_ids=invited_user_ids,
                )
                return result.conversation.id
            finally:
                close_old_connections()

        with (
            patch(
                "accounts.services.notification_core._dispatch_created_notification"
            ),
            patch(
                "messaging.services.push_enqueue.deliver_message_push_task.delay"
            ),
            ThreadPoolExecutor(max_workers=2) as executor,
        ):
            first = executor.submit(
                create_group,
                actor_id=self.u1.id,
                invited_user_ids=[self.u2.id, self.u3.id],
                name="Concurrent group one",
            )
            second = executor.submit(
                create_group,
                actor_id=self.u3.id,
                invited_user_ids=[self.u2.id, self.u1.id],
                name="Concurrent group two",
            )
            conversation_ids = {
                first.result(timeout=15),
                second.result(timeout=15),
            }

        assert len(conversation_ids) == 2
        for conversation_id in conversation_ids:
            participant_ids = set(
                ConversationParticipant.objects.filter(
                    conversation_id=conversation_id,
                ).values_list("user_id", flat=True)
            )
            assert participant_ids == {self.u1.id, self.u2.id, self.u3.id}
