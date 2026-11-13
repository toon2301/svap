"""BOD 3 – vynucovanie in_app_notifications preferencie pri vytváraní notifikácií."""

import pytest
from django.contrib.auth import get_user_model

from accounts.models import Notification, NotificationType, OfferedSkill, SkillRequest, UserProfile
from accounts.services.notifications import (
    create_notification,
    create_skill_request_notification,
    get_unread_count,
)

User = get_user_model()


def _user(username, email):
    return User.objects.create_user(
        username=username, email=email, password="StrongPass123", is_verified=True
    )


def _set_in_app(user, enabled):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.in_app_notifications = enabled
    profile.save(update_fields=["in_app_notifications", "updated_at"])


@pytest.mark.django_db
class TestInAppNotificationsToggle:
    def test_create_notification_suppressed_when_disabled(self):
        recipient = _user("r1", "r1@example.com")
        actor = _user("a1", "a1@example.com")
        _set_in_app(recipient, False)

        result = create_notification(
            user=recipient,
            notif_type=NotificationType.REVIEW_CREATED,
            title="Nová recenzia",
            body="niečo",
            actor=actor,
        )

        # Minimalizácia dát: notifikácia sa VÔBEC neuloží.
        assert result is None
        assert Notification.objects.filter(user=recipient).count() == 0

    def test_create_notification_created_when_enabled(self):
        recipient = _user("r2", "r2@example.com")
        actor = _user("a2", "a2@example.com")
        _set_in_app(recipient, True)

        result = create_notification(
            user=recipient,
            notif_type=NotificationType.REVIEW_CREATED,
            title="Nová recenzia",
            body="niečo",
            actor=actor,
        )

        assert result is not None
        assert Notification.objects.filter(user=recipient).count() == 1

    def test_default_profile_allows_notifications(self):
        # Default (get_or_create -> in_app_notifications=True) povolí notifikáciu.
        recipient = _user("r3", "r3@example.com")
        actor = _user("a3", "a3@example.com")

        result = create_notification(
            user=recipient,
            notif_type=NotificationType.OFFER_LIKED,
            actor=actor,
        )

        assert result is not None
        assert Notification.objects.filter(user=recipient).count() == 1

    def test_skill_request_notification_is_created_read_when_in_app_disabled(self):
        """Pri vypnutom hlavnom vypínači sa upozornenie na novú žiadosť vytvorí, ale ako prečítané (R39 (b), nález 330).

        Žiadosť sa tým doručí (upozornenie existuje), no nepočíta sa do neprečítaných, takže odznak pri Žiadostiach
        sa nerozsvieti; čas prečítania je vyplnený rovnako ako pri `Notification.mark_read`.
        """
        recipient = _user("owner", "owner@example.com")
        requester = _user("req", "req@example.com")
        _set_in_app(recipient, False)

        offer = OfferedSkill.objects.create(
            user=recipient, category="IT", subcategory="Web"
        )
        skill_request = SkillRequest.objects.create(
            requester=requester, recipient=recipient, offer=offer
        )

        result = create_skill_request_notification(
            skill_request=skill_request, actor=requester
        )

        assert result is not None
        notification = Notification.objects.get(
            user=recipient, type=NotificationType.SKILL_REQUEST
        )
        assert notification.is_read is True
        assert notification.read_at is not None
        assert (
            get_unread_count(
                user_id=recipient.id, notif_type=NotificationType.SKILL_REQUEST
            )
            == 0
        )

    def test_push_preference_independent_of_in_app(self):
        # Push toggle je nezávislý – in_app=False neovplyvní push_notifications hodnotu.
        recipient = _user("r4", "r4@example.com")
        _set_in_app(recipient, False)
        profile = UserProfile.objects.get(user=recipient)
        assert profile.push_notifications is True
        assert profile.in_app_notifications is False
