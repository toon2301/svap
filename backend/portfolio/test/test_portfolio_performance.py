"""Výkonové regresné testy portfólio systému (audit pre 100k+ používateľov).

Cieľ: zamknúť konštantný počet DB dotazov pri raste počtu položiek (žiadne N+1)
a potvrdiť, že reorder používa bulk_update (nie N samostatných UPDATE-ov).
"""

from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from rest_framework.test import APITestCase

from portfolio.models import PortfolioImage, PortfolioItem, PortfolioItemLike

User = get_user_model()


class PortfolioListQueryCountTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="perf-owner",
            email="perf-owner@example.com",
            password="testpass123",
            is_public=True,
            slug="perf-owner",
        )
        self.visitor = User.objects.create_user(
            username="perf-visitor",
            email="perf-visitor@example.com",
            password="testpass123",
        )
        # Niekoľko lajkujúcich používateľov (aby likes_count nebol triviálny).
        self.likers = [
            User.objects.create_user(
                username=f"perf-liker-{i}",
                email=f"perf-liker-{i}@example.com",
                password="testpass123",
            )
            for i in range(3)
        ]

    def _make_item_with_images(self, index: int) -> PortfolioItem:
        item = PortfolioItem.objects.create(
            owner=self.owner,
            title=f"Item {index}",
            category="Craft",
            description="Work.",
            sort_order=index,
        )
        cover = None
        for order in range(2):
            image = PortfolioImage.objects.create(
                item=item,
                order=order,
                status=PortfolioImage.Status.APPROVED,
                thumbnail_key=f"media/portfolio/{item.id}/{order}-thumb.webp",
                medium_key=f"media/portfolio/{item.id}/{order}-medium.webp",
                large_key=f"media/portfolio/{item.id}/{order}-large.webp",
                approved_key=f"media/portfolio/{item.id}/{order}-large.webp",
                width=1200,
                height=800,
            )
            if order == 0:
                cover = image
        item.cover_image = cover
        item.save(update_fields=["cover_image", "updated_at"])
        for liker in self.likers:
            PortfolioItemLike.objects.create(item=item, user=liker)
        return item

    def _list_query_count(self, *, url: str, user, expected_items: int) -> int:
        self.client.force_authenticate(user=user)
        with CaptureQueriesContext(connection) as ctx:
            response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), expected_items)
        return len(ctx.captured_queries)

    def test_owner_list_query_count_is_constant_regardless_of_item_count(self):
        url = reverse("accounts:portfolio_list")
        for i in range(2):
            self._make_item_with_images(i)
        base = self._list_query_count(url=url, user=self.owner, expected_items=2)

        for i in range(2, 6):
            self._make_item_with_images(i)
        grown = self._list_query_count(url=url, user=self.owner, expected_items=6)

        self.assertEqual(
            base,
            grown,
            msg=f"N+1 detegované: 2 položky={base}, 6 položiek={grown} dotazov.",
        )

    def test_visitor_list_query_count_is_constant_regardless_of_item_count(self):
        url = reverse("accounts:dashboard_user_portfolio", args=[self.owner.id])
        for i in range(2):
            self._make_item_with_images(i)
        base = self._list_query_count(url=url, user=self.visitor, expected_items=2)

        for i in range(2, 6):
            self._make_item_with_images(i)
        grown = self._list_query_count(url=url, user=self.visitor, expected_items=6)

        self.assertEqual(
            base,
            grown,
            msg=f"N+1 (visitor) detegované: 2={base} vs 6={grown} dotazov.",
        )


class PortfolioReorderQueryCountTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="perf-reorder-owner",
            email="perf-reorder-owner@example.com",
            password="testpass123",
            is_public=True,
        )

    def _make_items(self, count: int) -> list[int]:
        ids = []
        for index in range(count):
            item = PortfolioItem.objects.create(
                owner=self.owner,
                title=f"Item {index}",
                category="Craft",
                sort_order=index,
            )
            ids.append(item.id)
        return ids

    def _reorder_query_count(self, item_ids: list[int]) -> int:
        self.client.force_authenticate(user=self.owner)
        url = reverse("accounts:portfolio_reorder")
        with CaptureQueriesContext(connection) as ctx:
            response = self.client.patch(url, {"item_ids": item_ids}, format="json")
        self.assertEqual(response.status_code, 200)
        return len(ctx.captured_queries)

    def test_reorder_uses_bulk_update_not_per_item_updates(self):
        ids_small = self._make_items(5)
        count_small = self._reorder_query_count(list(reversed(ids_small)))

        # Zmaž a vytvor 15 položiek – ak by reorder robil UPDATE per položku,
        # počet dotazov by výrazne narástol. Pri bulk_update ostáva konštantný.
        PortfolioItem.objects.filter(owner=self.owner).delete()
        ids_big = self._make_items(15)
        count_big = self._reorder_query_count(list(reversed(ids_big)))

        self.assertEqual(
            count_small,
            count_big,
            msg=(
                "Reorder škáluje s počtom položiek (per-item UPDATE?): "
                f"5={count_small} vs 15={count_big} dotazov."
            ),
        )
