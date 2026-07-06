"""BOD 3 – vynucovanie in_app_notifications preferencie pri vytváraní notifikácií."""

import pytest
from django.contrib.auth import get_user_model

from accounts.models import Notification, NotificationType, OfferedSkill, SkillRequest, UserProfile
from accounts.services.notifications import (
    create_notification,
    create_skill_request_notification,
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

    def test_skill_request_notification_ignores_in_app_toggle(self):
        # BOD 2: skill_request je transakčná notifikácia (niekto čaká na odpoveď),
        # preto badge chodí VŽDY – aj keď má príjemca in_app_notifications=False.
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
        assert (
            Notification.objects.filter(
                user=recipient, type=NotificationType.SKILL_REQUEST
            ).count()
            == 1
        )

    def test_push_preference_independent_of_in_app(self):
        # Push toggle je nezávislý – in_app=False neovplyvní push_notifications hodnotu.
        recipient = _user("r4", "r4@example.com")
        _set_in_app(recipient, False)
        profile = UserProfile.objects.get(user=recipient)
        assert profile.push_notifications is True
        assert profile.in_app_notifications is False
