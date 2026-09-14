"""Profil recenzovaného po zmazaní ponuky – slugom, nie číselným ID.

Keď ponuka s recenziou zanikne, notifikácia aj detail recenzie vedú na profil
recenzovaného používateľa. Appka profil všade otvára slugom; číselné ID tu
spôsobovalo na FE krátke zobrazenie vlastného profilu v cudzom pohľade, kým
sa adresa nekanonizovala. ID ostáva len ako záloha (staré dáta bez slugu,
anonymizovaný účet).
"""

from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import Notification, NotificationType, OfferedSkill, Review
from accounts.notification_serializers import (
    NotificationSerializer,
    existing_review_offer_ids,
    review_profile_slugs,
)
from accounts.review_serializers import ReviewSerializer

User = get_user_model()


def _user(username, **kwargs):
    return User.objects.create_user(
        username=username,
        email=f"{username}@e.com",
        password="StrongPass123",
        is_verified=True,
        **kwargs,
    )


def _orphaned_review(owner, reviewer):
    offer = OfferedSkill.objects.create(user=owner, category="IT", subcategory="Web")
    review = Review.objects.create(
        reviewer=reviewer, offer=offer, rating=Decimal("4.0"), text="ok"
    )
    offer_id = offer.id
    offer.delete()
    review.refresh_from_db()
    assert review.offer_id is None
    return review, offer_id


def _review_notification(*, recipient, actor, review, offer_id, notif_type):
    return Notification.objects.create(
        user=recipient,
        actor=actor,
        type=notif_type,
        title="Recenzia",
        data={
            "review_id": review.id,
            "offer_id": offer_id,
            "reviewed_user_id": review.reviewed_user_id,
            "from_user_id": actor.id,
        },
    )


@pytest.mark.django_db
class TestReviewNotificationProfileTarget:
    def setup_method(self):
        self.owner = _user("slug-owner")
        self.reviewer = _user("slug-reviewer")
        self.owner.refresh_from_db()
        assert self.owner.slug
        self.review, self.offer_id = _orphaned_review(self.owner, self.reviewer)

    def _created(self, *, offer_id="snapshot"):
        # Nová recenzia ide vlastníkovi ponuky – recenzovaný je sám príjemca.
        return _review_notification(
            recipient=self.owner,
            actor=self.reviewer,
            review=self.review,
            offer_id=self.offer_id if offer_id == "snapshot" else offer_id,
            notif_type=NotificationType.REVIEW_CREATED,
        )

    def _page_context(self, notification):
        """Context, aký skladá zoznam notifikácií."""
        return {
            "existing_review_offer_ids": existing_review_offer_ids([notification]),
            "review_profile_slugs": review_profile_slugs([notification]),
        }

    def test_list_endpoint_targets_the_profile_slug(self):
        self._created()
        client = APIClient()
        client.force_authenticate(user=self.owner)

        response = client.get(reverse("accounts:notifications_list"))

        assert response.status_code == status.HTTP_200_OK
        [payload] = [
            item for item in response.data if item["type"] == NotificationType.REVIEW_CREATED
        ]
        assert payload["target_url"] == f"/dashboard/users/{self.owner.slug}"

    def test_list_endpoint_does_not_look_up_slugs_per_notification(self):
        client = APIClient()
        client.force_authenticate(user=self.owner)
        url = reverse("accounts:notifications_list")

        def list_queries():
            with CaptureQueriesContext(connection) as queries:
                response = client.get(url)
            assert response.status_code == status.HTTP_200_OK
            return len(queries)

        self._created()
        one_notification = list_queries()
        for index in (2, 3):
            reviewer = _user(f"slug-extra-reviewer-{index}")
            other_owner = _user(f"slug-extra-owner-{index}")
            review, offer_id = _orphaned_review(other_owner, reviewer)
            _review_notification(
                recipient=self.owner,
                actor=reviewer,
                review=review,
                offer_id=offer_id,
                notif_type=NotificationType.REVIEW_CREATED,
            )
        three_notifications = list_queries()

        # Slugy pre celú stránku dodá view jedným dotazom – počet nerastie.
        assert three_notifications == one_notification

    def test_reply_notification_uses_the_reviewed_user_slug_not_the_recipient(self):
        # Odpoveď ide autorovi recenzie – cieľ je aj tak profil RECENZOVANÉHO.
        notification = _review_notification(
            recipient=self.reviewer,
            actor=self.owner,
            review=self.review,
            offer_id=self.offer_id,
            notif_type=NotificationType.REVIEW_REPLY_CREATED,
        )
        payload = NotificationSerializer(
            notification, context=self._page_context(notification)
        ).data

        assert payload["target_url"] == f"/dashboard/users/{self.owner.slug}"

    def test_realtime_serialization_without_context_targets_the_slug(self):
        # Realtime push nemá context – na profil vedie notifikácia, ktorej data
        # už nenesú offer_id (ponuka zanikla pred jej vznikom).
        notification = self._created(offer_id=None)

        payload = NotificationSerializer(notification).data

        assert payload["target_url"] == f"/dashboard/users/{self.owner.slug}"

    def test_falls_back_to_the_id_when_the_slug_is_missing(self):
        listed = self._created()
        realtime = self._created(offer_id=None)
        # Staré dáta: slug nikdy nevznikol (zápis mimo `save()`).
        User.objects.filter(pk=self.owner.pk).update(slug=None)

        listed_payload = NotificationSerializer(
            listed, context=self._page_context(listed)
        ).data
        realtime_payload = NotificationSerializer(realtime).data

        assert listed_payload["target_url"] == f"/dashboard/users/{self.owner.id}"
        assert realtime_payload["target_url"] == f"/dashboard/users/{self.owner.id}"

    def test_falls_back_to_the_id_for_an_anonymized_account(self):
        listed = self._created()
        realtime = self._created(offer_id=None)
        User.objects.filter(pk=self.owner.pk).update(is_active=False)

        listed_payload = NotificationSerializer(
            listed, context=self._page_context(listed)
        ).data
        realtime_payload = NotificationSerializer(realtime).data

        assert listed_payload["target_url"] == f"/dashboard/users/{self.owner.id}"
        assert realtime_payload["target_url"] == f"/dashboard/users/{self.owner.id}"

    def test_slug_lookup_is_one_query_for_the_whole_page(self):
        other_owner = _user("slug-owner-2")
        other_review, other_offer_id = _orphaned_review(other_owner, self.reviewer)
        notifications = [
            self._created(),
            _review_notification(
                recipient=other_owner,
                actor=self.reviewer,
                review=other_review,
                offer_id=other_offer_id,
                notif_type=NotificationType.REVIEW_CREATED,
            ),
        ]

        with CaptureQueriesContext(connection) as queries:
            slugs = review_profile_slugs(notifications)

        assert len(queries) == 1
        other_owner.refresh_from_db()
        assert slugs == {self.owner.id: self.owner.slug, other_owner.id: other_owner.slug}


@pytest.mark.django_db
class TestReviewResponseReviewedUserSlug:
    def setup_method(self):
        self.client = APIClient()
        self.owner = _user("detail-owner")
        self.reviewer = _user("detail-reviewer")
        self.owner.refresh_from_db()
        self.review, _ = _orphaned_review(self.owner, self.reviewer)

    def test_detail_of_an_orphaned_review_carries_the_slug(self):
        self.client.force_authenticate(user=self.reviewer)

        response = self.client.get(
            reverse("accounts:review_detail", kwargs={"review_id": self.review.id})
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["offer"] is None
        assert response.data["reviewed_user_id"] == self.owner.id
        assert response.data["reviewed_user_slug"] == self.owner.slug

    def test_slug_is_none_without_a_usable_slug(self):
        User.objects.filter(pk=self.owner.pk).update(slug=None)
        self.review.refresh_from_db()

        assert ReviewSerializer(self.review).data["reviewed_user_slug"] is None

    def test_slug_is_none_for_an_anonymized_account(self):
        User.objects.filter(pk=self.owner.pk).update(is_active=False)
        self.review.refresh_from_db()

        assert ReviewSerializer(self.review).data["reviewed_user_slug"] is None


@pytest.mark.django_db
class TestReviewListQueries:
    def test_list_does_not_query_the_reviewed_user_per_review(self):
        owner = _user("list-owner")
        offer = OfferedSkill.objects.create(user=owner, category="IT", subcategory="Web")
        viewer = _user("list-viewer")
        client = APIClient()
        client.force_authenticate(user=viewer)
        url = reverse("accounts:reviews_list", kwargs={"offer_id": offer.id})

        def list_queries():
            with CaptureQueriesContext(connection) as queries:
                response = client.get(url)
            assert response.status_code == status.HTTP_200_OK
            return len(queries), response

        Review.objects.create(
            reviewer=_user("list-rev-1"), offer=offer, rating=Decimal("4.0"), text="a"
        )
        one_review, _ = list_queries()
        for index in (2, 3, 4):
            Review.objects.create(
                reviewer=_user(f"list-rev-{index}"),
                offer=offer,
                rating=Decimal("4.0"),
                text="b",
            )
        four_reviews, response = list_queries()

        owner.refresh_from_db()
        results = response.data["results"] if isinstance(response.data, dict) else response.data
        assert {item["reviewed_user_slug"] for item in results} == {owner.slug}
        # Počet dotazov nerastie s počtom recenzií.
        assert four_reviews == one_review
