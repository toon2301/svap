"""Testy: recenzie prežijú zmazanie ponuky (Fáza 1 – Review.offer SET_NULL).

Overuje, že po zmazaní ponuky (OfferedSkill):
- recenzia zostáva v DB, offer sa vynuluje (SET_NULL),
- denormalizovaný reviewed_user (vlastník pôvodnej ponuky) je zachovaný,
- API operácie nad "osirotenou" recenziou (detail, like/unlike, owner-reply)
  nepadajú na offer=None.
"""

from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import OfferedSkill, Review

User = get_user_model()


def _user(username, **kwargs):
    return User.objects.create_user(
        username=username,
        email=f"{username}@e.com",
        password="StrongPass123",
        **kwargs,
    )


@pytest.mark.django_db
class TestReviewSurvivesOfferDelete:
    def test_reviewed_user_autoset_on_create(self):
        owner = _user("own-a")
        reviewer = _user("rev-a")
        offer = OfferedSkill.objects.create(
            user=owner, category="IT", subcategory="Web"
        )

        review = Review.objects.create(
            reviewer=reviewer, offer=offer, rating=Decimal("4.0"), text="ok"
        )

        # save() denormalizoval vlastníka ponuky do reviewed_user.
        assert review.reviewed_user_id == owner.id

    def test_review_survives_offer_delete(self):
        owner = _user("own-b")
        reviewer = _user("rev-b")
        offer = OfferedSkill.objects.create(
            user=owner, category="IT", subcategory="Web"
        )
        review = Review.objects.create(
            reviewer=reviewer, offer=offer, rating=Decimal("3.5"), text="fajn"
        )
        assert review.reviewed_user_id == owner.id

        offer_id = offer.id
        offer.delete()

        # Recenzia stále existuje, offer je None, reviewed_user zostal pôvodný vlastník.
        review.refresh_from_db()
        assert Review.objects.filter(id=review.id).exists()
        assert review.offer_id is None
        assert review.reviewed_user_id == owner.id
        # Ponuka je reálne preč (hard delete).
        assert not OfferedSkill.objects.filter(id=offer_id).exists()


@pytest.mark.django_db
class TestOrphanedReviewApi:
    def setup_method(self):
        self.client = APIClient()
        self.owner = _user("own-c", is_verified=True)
        self.reviewer = _user("rev-c", is_verified=True)
        self.liker = _user("lik-c", is_verified=True)
        self.offer = OfferedSkill.objects.create(
            user=self.owner, category="IT", subcategory="Web"
        )
        self.review = Review.objects.create(
            reviewer=self.reviewer, offer=self.offer, rating=Decimal("4.0"), text="ok"
        )
        # Osirotíme recenziu – zmažeme ponuku.
        self.offer.delete()
        self.review.refresh_from_db()
        assert self.review.offer_id is None

    def test_get_detail_of_orphaned_review_ok(self):
        self.client.force_authenticate(user=self.reviewer)
        r = self.client.get(
            reverse("accounts:review_detail", kwargs={"review_id": self.review.id})
        )
        assert r.status_code == status.HTTP_200_OK
        # offer sa serializuje ako null bez pádu, reviewed_user_id ostáva pôvodný
        # vlastník – FE podľa neho vie presmerovať na profil recenzovaného.
        assert r.data["offer"] is None
        assert r.data["reviewed_user_id"] == self.owner.id

    def test_like_and_unlike_orphaned_review_ok(self):
        url = reverse("accounts:review_like", kwargs={"review_id": self.review.id})
        self.client.force_authenticate(user=self.liker)

        r_like = self.client.post(url)
        assert r_like.status_code in (status.HTTP_200_OK, status.HTTP_201_CREATED)
        assert r_like.data["likes_count"] == 1
        assert r_like.data["is_liked_by_me"] is True

        r_unlike = self.client.delete(url)
        assert r_unlike.status_code == status.HTTP_200_OK
        assert r_unlike.data["likes_count"] == 0
        assert r_unlike.data["is_liked_by_me"] is False

    def test_owner_reply_on_orphaned_review_ok(self):
        # Vlastník pôvodnej ponuky (reviewed_user) môže odpovedať aj po zmazaní ponuky.
        self.client.force_authenticate(user=self.owner)
        r = self.client.post(
            reverse("accounts:review_respond", kwargs={"review_id": self.review.id}),
            {"owner_response": "Ďakujem za spätnú väzbu."},
            format="json",
        )
        assert r.status_code == status.HTTP_200_OK
        self.review.refresh_from_db()
        assert self.review.owner_response == "Ďakujem za spätnú väzbu."

    def test_non_owner_cannot_reply_on_orphaned_review(self):
        # Náhodný používateľ (nie reviewed_user) nesmie odpovedať.
        self.client.force_authenticate(user=self.liker)
        r = self.client.post(
            reverse("accounts:review_respond", kwargs={"review_id": self.review.id}),
            {"owner_response": "hej"},
            format="json",
        )
        assert r.status_code == status.HTTP_403_FORBIDDEN
