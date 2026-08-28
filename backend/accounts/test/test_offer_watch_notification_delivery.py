from datetime import timedelta
from unittest.mock import call, patch

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import (
    Notification,
    NotificationType,
    OfferWatch,
    OfferWatchMatchOutbox,
    OfferWatchNotification,
    OfferedSkill,
    UserBlock,
    UserProfile,
)
from accounts.notification_serializers import (
    NotificationSerializer,
    existing_offer_watch_targets,
)
from accounts.offer_watch_notification_tasks import (
    deliver_offer_watch_notification_task,
    recover_pending_offer_watch_notifications_task,
)
from accounts.offer_watch_tasks import process_offer_watch_matches_task
from accounts.services.notifications import purge_old_notifications
from accounts.services.offer_watch_notification_delivery import (
    deliver_offer_watch_notification,
)
from accounts.services.offer_watch_notification_dispatch import (
    schedule_offer_watch_notification,
)
from accounts.services.offer_watches import (
    create_offer_watch,
    register_offer_watch_notification,
)

BASE_CATEGORY = "Domácnosť a služby"
BASE_SUBCATEGORY = "Maliarske práce"


def create_user(suffix, **overrides):
    values = {
        "username": f"watch-notification-{suffix}",
        "email": f"watch-notification-{suffix}@example.com",
        "password": "StrongPass123",
        "is_verified": True,
        "is_public": True,
    }
    values.update(overrides)
    return get_user_model().objects.create_user(**values)


def create_watch(user, **overrides):
    values = {
        "category": BASE_CATEGORY,
        "subcategory": BASE_SUBCATEGORY,
        "is_seeking": False,
        "country_code": "SK",
        "district_code": "",
        "price_min": None,
        "price_max": None,
        "price_currency": "",
    }
    values.update(overrides)
    return create_offer_watch(user=user, **values)


def create_offer(owner, **overrides):
    values = {
        "category": BASE_CATEGORY,
        "subcategory": BASE_SUBCATEGORY,
        "description": "Text that must not be copied to notification data",
        "detailed_description": "Private authored detail",
        "country_code": "SK",
        "district_code": "nitra",
        "district": "Nitra",
        "is_seeking": False,
        "price_from": None,
        "price_currency": "",
        "price_negotiable": False,
    }
    values.update(overrides)
    return OfferedSkill.objects.create(user=owner, **values)


def create_candidate(suffix, *, is_seeking=False):
    watcher = create_user(f"{suffix}-watcher")
    owner = create_user(f"{suffix}-owner")
    watch = create_watch(watcher, is_seeking=is_seeking)
    offer = create_offer(owner, is_seeking=is_seeking)
    OfferWatch.objects.filter(pk=watch.pk).update(
        updated_at=offer.created_at - timedelta(seconds=1)
    )
    candidate, created = register_offer_watch_notification(watch=watch, offer=offer)
    assert created is True
    return watcher, owner, watch, offer, candidate


@pytest.mark.django_db
@pytest.mark.parametrize("is_seeking", [False, True])
def test_delivery_creates_one_minimal_notification_and_marks_candidate(is_seeking):
    watcher, owner, watch, offer, candidate = create_candidate(
        f"valid-{is_seeking}",
        is_seeking=is_seeking,
    )

    assert deliver_offer_watch_notification(candidate_id=candidate.id) is True

    candidate.refresh_from_db()
    notification = Notification.objects.get(
        user=watcher,
        type=NotificationType.OFFER_WATCH_MATCH,
    )
    assert candidate.watch_id == watch.id
    assert candidate.processed_at is not None
    assert candidate.notified_at == candidate.processed_at
    assert notification.actor_id == owner.id
    assert notification.data == {
        "offer_id": offer.id,
        "offer_is_seeking": is_seeking,
    }
    assert offer.description not in notification.body
    assert offer.detailed_description not in notification.body


@pytest.mark.django_db
def test_delivery_replay_is_idempotent():
    _, _, _, _, candidate = create_candidate("replay")

    assert deliver_offer_watch_notification_task.run(candidate_id=candidate.id) is True
    assert deliver_offer_watch_notification_task.run(candidate_id=candidate.id) is False

    assert (
        Notification.objects.filter(type=NotificationType.OFFER_WATCH_MATCH).count()
        == 1
    )


@pytest.mark.django_db
def test_database_rejects_notified_candidate_without_processed_timestamp():
    *_, candidate = create_candidate("constraint")

    with pytest.raises(IntegrityError), transaction.atomic():
        OfferWatchNotification.objects.filter(pk=candidate.pk).update(
            notified_at=timezone.now()
        )


@pytest.mark.django_db
@pytest.mark.parametrize(
    "invalid_state",
    ["watch_changed", "offer_hidden", "owner_private", "watcher_blocked"],
)
def test_delivery_revalidates_current_visibility_and_matching(invalid_state):
    watcher, owner, watch, offer, candidate = create_candidate(invalid_state)
    if invalid_state == "watch_changed":
        OfferWatch.objects.filter(pk=watch.pk).update(
            subcategory="Upratovanie",
            updated_at=timezone.now(),
        )
    elif invalid_state == "offer_hidden":
        OfferedSkill.objects.filter(pk=offer.pk).update(is_hidden=True)
    elif invalid_state == "owner_private":
        get_user_model().objects.filter(pk=owner.pk).update(is_public=False)
    else:
        UserBlock.objects.create(blocker=watcher, blocked_user=owner)

    assert deliver_offer_watch_notification(candidate_id=candidate.id) is False

    candidate.refresh_from_db()
    assert candidate.processed_at is not None
    assert candidate.notified_at is None
    assert not Notification.objects.exists()


@pytest.mark.django_db
def test_delivery_uses_another_current_watch_when_original_was_deleted():
    watcher, _, original, offer, candidate = create_candidate("replacement")
    replacement = create_watch(watcher, district_code="nitra")
    OfferWatch.objects.filter(pk=replacement.pk).update(
        updated_at=offer.created_at - timedelta(seconds=1)
    )
    original.delete()

    assert deliver_offer_watch_notification(candidate_id=candidate.id) is True

    candidate.refresh_from_db()
    assert candidate.watch_id == replacement.id
    assert Notification.objects.count() == 1


@pytest.mark.django_db
def test_disabled_in_app_preference_resolves_without_storing_notification():
    watcher, _, _, _, candidate = create_candidate("preference-off")
    profile, _ = UserProfile.objects.get_or_create(user=watcher)
    profile.in_app_notifications = False
    profile.save(update_fields=["in_app_notifications", "updated_at"])

    assert deliver_offer_watch_notification(candidate_id=candidate.id) is False

    candidate.refresh_from_db()
    assert candidate.processed_at is not None
    assert candidate.notified_at is None
    assert not Notification.objects.exists()


@pytest.mark.django_db
def test_delivery_error_rolls_back_candidate_and_notification():
    _, _, _, _, candidate = create_candidate("rollback")

    with (
        patch(
            "accounts.services.offer_watch_notification_delivery."
            "create_offer_watch_match_notification",
            side_effect=RuntimeError("temporary database error"),
        ),
        pytest.raises(RuntimeError),
    ):
        deliver_offer_watch_notification(candidate_id=candidate.id)

    candidate.refresh_from_db()
    assert candidate.processed_at is None
    assert candidate.notified_at is None
    assert not Notification.objects.exists()


@pytest.mark.django_db
def test_recovery_enqueues_only_pending_candidates_in_stable_order():
    *_, first = create_candidate("recovery-first")
    *_, processed = create_candidate("recovery-processed")
    *_, second = create_candidate("recovery-second")
    OfferWatchNotification.objects.filter(pk=processed.pk).update(
        processed_at=timezone.now()
    )

    with patch(
        "accounts.offer_watch_notification_tasks."
        "deliver_offer_watch_notification_task.delay"
    ) as enqueue:
        recovered = recover_pending_offer_watch_notifications_task.run()

    assert recovered == 2
    assert enqueue.call_args_list == [
        call(candidate_id=first.id),
        call(candidate_id=second.id),
    ]


@pytest.mark.django_db
def test_broker_failure_keeps_candidate_pending_for_recovery(
    django_capture_on_commit_callbacks,
):
    *_, candidate = create_candidate("broker-failure")

    with patch(
        "accounts.offer_watch_notification_tasks."
        "deliver_offer_watch_notification_task.delay",
        side_effect=RuntimeError("broker unavailable"),
    ) as enqueue:
        # Zaradenie do fronty visí na `transaction.on_commit`, ktoré sa
        # v testovej transakcii samo nespustí – bez tohto by cesta cez
        # zlyhanie brokera vôbec nenastala a test by prešiel aj tak.
        with django_capture_on_commit_callbacks(execute=True):
            schedule_offer_watch_notification(candidate_id=candidate.id)

    enqueue.assert_called_once_with(candidate_id=candidate.id)
    candidate.refresh_from_db()
    assert candidate.processed_at is None
    assert candidate.notified_at is None
    assert not Notification.objects.exists()


@pytest.mark.django_db
def test_matching_task_schedules_persisted_pending_candidates():
    watcher = create_user("schedule-watcher")
    owner = create_user("schedule-owner")
    watch = create_watch(watcher)
    offer = create_offer(owner)
    OfferWatch.objects.filter(pk=watch.pk).update(
        updated_at=offer.created_at - timedelta(seconds=1)
    )
    OfferWatchMatchOutbox.objects.create(offer=offer)

    with patch(
        "accounts.offer_watch_tasks.schedule_offer_watch_notification"
    ) as schedule:
        created = process_offer_watch_matches_task.run(offer_id=offer.id)

    candidate = OfferWatchNotification.objects.get(user=watcher, offer=offer)
    assert created == 1
    schedule.assert_called_once_with(candidate_id=candidate.id)


@pytest.mark.django_db
def test_notifications_api_returns_safe_target_and_disables_it_after_hide():
    watcher, owner, _, offer, candidate = create_candidate("target")
    assert deliver_offer_watch_notification(candidate_id=candidate.id) is True
    notification = Notification.objects.get(user=watcher)
    targets = existing_offer_watch_targets(
        [notification],
        viewer_user_id=watcher.id,
    )
    identifier = owner.slug or str(owner.id)
    assert (
        NotificationSerializer(
            notification,
            context={"offer_watch_targets": targets},
        ).data["target_url"]
        == f"/dashboard/users/{identifier}?highlight={offer.id}"
    )

    client = APIClient()
    client.force_authenticate(watcher)
    listed = client.get(reverse("accounts:notifications_list"))
    assert listed.status_code == 200
    assert listed.data[0]["target_url"] == (
        f"/dashboard/users/{identifier}?highlight={offer.id}"
    )

    OfferedSkill.objects.filter(pk=offer.pk).update(is_hidden=True)
    hidden = client.get(reverse("accounts:notifications_list"))
    assert hidden.status_code == 200
    assert hidden.data[0]["target_url"] is None

    OfferedSkill.objects.filter(pk=offer.pk).update(is_hidden=False)
    user_block = UserBlock.objects.create(blocker=owner, blocked_user=watcher)
    blocked = client.get(reverse("accounts:notifications_list"))
    assert blocked.status_code == 200
    assert blocked.data[0]["target_url"] is None

    user_block.delete()
    offer.delete()
    deleted = client.get(reverse("accounts:notifications_list"))
    assert deleted.status_code == 200
    assert deleted.data[0]["target_url"] is None


@pytest.mark.django_db
def test_offer_watch_notifications_have_thirty_day_retention():
    watcher = create_user("retention")
    old = Notification.objects.create(
        user=watcher,
        type=NotificationType.OFFER_WATCH_MATCH,
    )
    Notification.objects.filter(pk=old.pk).update(
        created_at=timezone.now() - timedelta(days=31)
    )

    summary = purge_old_notifications(dry_run=False)

    assert summary[NotificationType.OFFER_WATCH_MATCH] == 1
    assert not Notification.objects.filter(pk=old.pk).exists()
