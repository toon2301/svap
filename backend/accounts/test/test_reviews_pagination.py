from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import OfferedSkill, Review

User = get_user_model()


class ReviewsListPaginationTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="rev-owner", email="rev-owner@example.test", password="StrongPass123"
        )
        self.offer = OfferedSkill.objects.create(
            user=self.owner, category="IT", subcategory="Web"
        )
        self.viewer = User.objects.create_user(
            username="rev-viewer", email="rev-viewer@example.test", password="StrongPass123"
        )
        self.client.force_authenticate(user=self.viewer)
        self.url = reverse("accounts:reviews_list", kwargs={"offer_id": self.offer.id})

    def _create_reviews(self, ratings):
        created = []
        for i, rating in enumerate(ratings):
            reviewer = User.objects.create_user(
                username=f"rev-{i}",
                email=f"rev-{i}@example.test",
                password="StrongPass123",
            )
            created.append(
                Review.objects.create(
                    reviewer=reviewer,
                    offer=self.offer,
                    rating=Decimal(str(rating)),
                    text="ok",
                )
            )
        return created

    def test_empty_offer_returns_paginated_envelope(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["results"], [])
        self.assertEqual(response.data["total"], 0)
        self.assertEqual(response.data["total_pages"], 1)
        self.assertEqual(response.data["stats"]["average"], 0.0)
        self.assertEqual(
            response.data["stats"]["breakdown"],
            {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0},
        )

    def test_pagination_splits_pages_and_preserves_order(self):
        self._create_reviews([5.0] * 12)

        page1 = self.client.get(self.url, {"page_size": 5})
        self.assertEqual(page1.status_code, status.HTTP_200_OK)
        self.assertEqual(len(page1.data["results"]), 5)
        self.assertEqual(page1.data["total"], 12)
        self.assertEqual(page1.data["page"], 1)
        self.assertEqual(page1.data["total_pages"], 3)

        page3 = self.client.get(self.url, {"page_size": 5, "page": 3})
        self.assertEqual(len(page3.data["results"]), 2)  # zvyšok 12 - 2*5

        # Najnovšie prvé + žiadny prekryv medzi stranami.
        ids_p1 = [r["id"] for r in page1.data["results"]]
        page2 = self.client.get(self.url, {"page_size": 5, "page": 2})
        ids_p2 = [r["id"] for r in page2.data["results"]]
        self.assertEqual(ids_p1, sorted(ids_p1, reverse=True))
        self.assertTrue(set(ids_p1).isdisjoint(ids_p2))

    def test_exact_page_size_is_single_page(self):
        self._create_reviews([4.0] * 10)
        response = self.client.get(self.url, {"page_size": 10})
        self.assertEqual(response.data["total"], 10)
        self.assertEqual(response.data["total_pages"], 1)

    def test_stats_breakdown_buckets_match_rounding(self):
        # Hranice zaokrúhlenia na celé hviezdy (krok 0.5).
        self._create_reviews([0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0])
        response = self.client.get(self.url, {"page_size": 5})
        breakdown = response.data["stats"]["breakdown"]
        self.assertEqual(breakdown["1"], 3)  # 0.0, 0.5, 1.0
        self.assertEqual(breakdown["2"], 2)  # 1.5, 2.0
        self.assertEqual(breakdown["3"], 2)  # 2.5, 3.0
        self.assertEqual(breakdown["4"], 2)  # 3.5, 4.0
        self.assertEqual(breakdown["5"], 2)  # 4.5, 5.0
        self.assertEqual(response.data["total"], 11)

    def test_stats_are_independent_of_page(self):
        self._create_reviews([5.0, 1.0])
        page1 = self.client.get(self.url, {"page_size": 1, "page": 1})
        page2 = self.client.get(self.url, {"page_size": 1, "page": 2})
        self.assertEqual(page1.data["stats"], page2.data["stats"])
        self.assertEqual(page1.data["stats"]["average"], 3.0)

    def test_page_size_is_capped(self):
        response = self.client.get(self.url, {"page_size": 9999})
        self.assertEqual(response.data["page_size"], 50)

    def test_result_items_keep_like_state_fields(self):
        self._create_reviews([4.0])
        response = self.client.get(self.url)
        item = response.data["results"][0]
        self.assertIn("likes_count", item)
        self.assertIn("is_liked_by_me", item)
