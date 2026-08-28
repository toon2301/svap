from datetime import timedelta
from unittest.mock import call, patch

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import (
    OfferWatch,
    OfferWatchMatchOutbox,
    OfferWatchNotification,
    Notification,
    OfferedSkill,
)
from accounts.offer_watch_tasks import (
    process_offer_watch_matches_task,
    recover_pending_offer_watch_matches_task,
)
from accounts.services.offer_watches import create_offer_watch


BASE_CATEGORY = "Domácnosť a služby"
BASE_SUBCATEGORY = "Maliarske práce"


def create_user(suffix, **overrides):
    values = {
        "username": f"watch-dispatch-{suffix}",
        "email": f"watch-dispatch-{suffix}@example.com",
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
        "description": "",
        "detailed_description": "",
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


def set_watches_before_offer(*watches, offer):
    OfferWatch.objects.filter(pk__in=[watch.pk for watch in watches]).update(
        updated_at=offer.created_at - timedelta(seconds=1)
    )


class OfferWatchMatchSchedulingTests(APITestCase):
    def setUp(self):
        self.owner = create_user("api-owner")
        self.client.force_authenticate(self.owner)
        self.list_url = reverse("accounts:skills_list")

    @staticmethod
    def payload(**overrides):
        values = {
            "category": "Remeslá",
            "subcategory": "Maliar",
            "description": "Maľovanie stien",
            "country_code": "SK",
            "district_code": "nitra",
            "is_seeking": False,
        }
        values.update(overrides)
        return values

    def test_create_persists_intent_and_enqueues_only_after_commit(self):
        with patch(
            "accounts.offer_watch_tasks.process_offer_watch_matches_task.delay"
        ) as enqueue:
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.post(
                    self.list_url,
                    self.payload(),
                    format="json",
                )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        offer = OfferedSkill.objects.get(pk=response.data["id"])
        self.assertTrue(OfferWatchMatchOutbox.objects.filter(offer=offer).exists())
        enqueue.assert_called_once_with(offer_id=offer.id)

    def test_broker_failure_keeps_created_offer_and_durable_intent(self):
        with patch(
            "accounts.offer_watch_tasks.process_offer_watch_matches_task.delay",
            side_effect=RuntimeError("broker unavailable"),
        ):
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.post(
                    self.list_url,
                    self.payload(),
                    format="json",
                )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertTrue(OfferedSkill.objects.filter(pk=response.data["id"]).exists())
        self.assertTrue(
            OfferWatchMatchOutbox.objects.filter(offer_id=response.data["id"]).exists()
        )

    def test_validation_failure_does_not_create_or_schedule_an_intent(self):
        with patch("accounts.views.skills.schedule_offer_watch_matching") as schedule:
            response = self.client.post(
                self.list_url,
                self.payload(description="x" * 151),
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(OfferedSkill.objects.exists())
        self.assertFalse(OfferWatchMatchOutbox.objects.exists())
        schedule.assert_not_called()

    def test_card_update_does_not_schedule_a_new_matching_run(self):
        offer = create_offer(
            self.owner,
            category="Remeslá",
            subcategory="Maliar",
        )

        with patch("accounts.views.skills.schedule_offer_watch_matching") as schedule:
            response = self.client.patch(
                reverse("accounts:skills_detail", args=[offer.id]),
                {"description": "Aktualizovaný popis"},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertFalse(OfferWatchMatchOutbox.objects.exists())
        schedule.assert_not_called()

    def test_direct_model_create_does_not_implicitly_start_matching(self):
        offer = create_offer(self.owner)

        self.assertFalse(OfferWatchMatchOutbox.objects.filter(offer=offer).exists())


@override_settings(OFFER_WATCH_MATCH_STALE_CLAIM_SECONDS=300)
class OfferWatchMatchTaskTests(APITestCase):
    def test_task_registers_once_per_user_and_removes_intent(self):
        first_watcher = create_user("task-first-watcher")
        country_watch = create_watch(first_watcher)
        district_watch = create_watch(first_watcher, district_code="nitra")
        second_watcher = create_user("task-second-watcher")
        second_watch = create_watch(second_watcher)
        offer = create_offer(create_user("task-owner"))
        set_watches_before_offer(
            country_watch,
            district_watch,
            second_watch,
            offer=offer,
        )
        OfferWatchMatchOutbox.objects.create(offer=offer)

        created_count = process_offer_watch_matches_task.run(offer_id=offer.id)
        replay_count = process_offer_watch_matches_task.run(offer_id=offer.id)

        self.assertEqual(created_count, 2)
        self.assertEqual(replay_count, 0)
        self.assertEqual(
            OfferWatchNotification.objects.filter(offer=offer).count(),
            2,
        )
        self.assertEqual(
            OfferWatchNotification.objects.filter(
                offer=offer,
                notified_at__isnull=True,
            ).count(),
            2,
        )
        self.assertFalse(OfferWatchMatchOutbox.objects.filter(offer=offer).exists())
        self.assertFalse(Notification.objects.exists())

    def test_no_match_is_a_success_and_removes_intent(self):
        offer = create_offer(create_user("task-no-match-owner"))
        OfferWatchMatchOutbox.objects.create(offer=offer)

        created_count = process_offer_watch_matches_task.run(offer_id=offer.id)

        self.assertEqual(created_count, 0)
        self.assertFalse(OfferWatchNotification.objects.exists())
        self.assertFalse(OfferWatchMatchOutbox.objects.exists())

    def test_hidden_offer_is_rechecked_and_does_not_create_candidate(self):
        watcher = create_user("task-hidden-watcher")
        watch = create_watch(watcher)
        offer = create_offer(create_user("task-hidden-owner"))
        set_watches_before_offer(watch, offer=offer)
        OfferWatchMatchOutbox.objects.create(offer=offer)
        OfferedSkill.objects.filter(pk=offer.pk).update(is_hidden=True)

        created_count = process_offer_watch_matches_task.run(offer_id=offer.id)

        self.assertEqual(created_count, 0)
        self.assertFalse(OfferWatchNotification.objects.exists())
        self.assertFalse(OfferWatchMatchOutbox.objects.exists())

    def test_failed_matching_releases_claim_and_preserves_intent(self):
        offer = create_offer(create_user("task-failed-owner"))
        intent = OfferWatchMatchOutbox.objects.create(offer=offer)

        with (
            patch(
                "accounts.offer_watch_tasks.register_matches_for_new_offer",
                side_effect=RuntimeError("database temporarily unavailable"),
            ),
            self.assertRaises(Exception),
        ):
            process_offer_watch_matches_task.run(offer_id=offer.id)

        intent.refresh_from_db()
        self.assertEqual(intent.attempt_count, 1)
        self.assertIsNone(intent.claimed_at)
        self.assertIsNotNone(intent.last_attempt_at)

    def test_active_claim_prevents_overlapping_processing(self):
        offer = create_offer(create_user("task-active-owner"))
        claimed_at = timezone.now()
        intent = OfferWatchMatchOutbox.objects.create(
            offer=offer,
            claimed_at=claimed_at,
        )

        created_count = process_offer_watch_matches_task.run(offer_id=offer.id)

        self.assertEqual(created_count, 0)
        intent.refresh_from_db()
        self.assertEqual(intent.claimed_at, claimed_at)
        self.assertEqual(intent.attempt_count, 0)

    def test_stale_claim_is_reclaimed_without_attempt_limit(self):
        watcher = create_user("task-stale-watcher")
        watch = create_watch(watcher)
        offer = create_offer(create_user("task-stale-owner"))
        set_watches_before_offer(watch, offer=offer)
        OfferWatchMatchOutbox.objects.create(
            offer=offer,
            claimed_at=timezone.now() - timedelta(seconds=301),
            attempt_count=999,
        )

        created_count = process_offer_watch_matches_task.run(offer_id=offer.id)

        self.assertEqual(created_count, 1)
        self.assertEqual(
            OfferWatchNotification.objects.filter(
                user=watcher,
                offer=offer,
            ).count(),
            1,
        )
        self.assertFalse(OfferWatchMatchOutbox.objects.exists())

    def test_deleting_offer_cascades_intent_and_queued_task_is_noop(self):
        offer = create_offer(create_user("task-deleted-owner"))
        offer_id = offer.id
        OfferWatchMatchOutbox.objects.create(offer=offer)

        offer.delete()

        self.assertFalse(OfferWatchMatchOutbox.objects.exists())
        self.assertEqual(
            process_offer_watch_matches_task.run(offer_id=offer_id),
            0,
        )

    def test_recovery_requeues_only_unclaimed_and_stale_intents(self):
        now = timezone.now()
        pending = create_offer(create_user("recovery-pending-owner"))
        active = create_offer(create_user("recovery-active-owner"))
        stale = create_offer(create_user("recovery-stale-owner"))
        OfferWatchMatchOutbox.objects.create(offer=pending)
        OfferWatchMatchOutbox.objects.create(offer=active, claimed_at=now)
        OfferWatchMatchOutbox.objects.create(
            offer=stale,
            claimed_at=now - timedelta(seconds=301),
            attempt_count=999,
        )

        with patch(
            "accounts.offer_watch_tasks.process_offer_watch_matches_task.delay"
        ) as enqueue:
            recovered_count = recover_pending_offer_watch_matches_task.run()

        self.assertEqual(recovered_count, 2)
        self.assertEqual(
            enqueue.call_args_list,
            [call(offer_id=pending.id), call(offer_id=stale.id)],
        )
