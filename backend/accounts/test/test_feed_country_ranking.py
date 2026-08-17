"""Trojvrstvové radenie feedu: okres > krajina > zvyšok sveta.

Krajinu ``User`` neukladá – odvodzuje sa z názvu okresu cez register, preto
sa tu používajú SKUTOČNÉ labely z ``district_registry.json``.
"""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import FeedPost

User = get_user_model()


def _user(name, district=""):
    return User.objects.create_user(
        username=name,
        email=f"{name}@example.com",
        password="StrongPass123",
        is_public=True,
        district=district,
    )


class FeedCountryRankingTests(APITestCase):
    def setUp(self):
        # Divák z Nitry (SK).
        self.viewer = _user("rank-viewer", district="Nitra")
        # Rovnaký okres, rovnaká krajina, iná krajina.
        self.same_district = _user("rank-district", district="Nitra")
        self.same_country = _user("rank-country", district="Košice I")
        self.abroad = _user("rank-abroad", district="Praha 1")

        base = timezone.now() - timedelta(days=10)
        # ZÁMERNE naopak, než má vyjsť poradie: keby boost nefungoval,
        # najnovší (zahraničný) by skončil navrchu.
        self.district_post = self._post(self.same_district, base)
        self.country_post = self._post(self.same_country, base + timedelta(days=1))
        self.world_post = self._post(self.abroad, base + timedelta(days=2))

        self.url = reverse("accounts:feed_posts")

    def _post(self, author, created_at):
        post = FeedPost.objects.create(
            author=author,
            post_type=FeedPost.PostType.FREE_POST,
            caption=f"Od {author.username}",
        )
        FeedPost.objects.filter(pk=post.pk).update(created_at=created_at)
        return post

    def _ids(self, response):
        return [item["id"] for item in response.data["results"]]

    def test_three_tiers_in_order(self):
        self.client.force_authenticate(user=self.viewer)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            self._ids(response),
            [self.district_post.id, self.country_post.id, self.world_post.id],
        )

    def test_chronology_holds_inside_each_tier(self):
        older_country = _user("rank-country-2", district="Prešov")
        newer = self._post(older_country, timezone.now())
        self.client.force_authenticate(user=self.viewer)

        response = self.client.get(self.url)
        ids = self._ids(response)

        # Obe sú „krajina", takže medzi sebou rozhoduje čas – novší prvý.
        self.assertLess(ids.index(newer.id), ids.index(self.country_post.id))
        # A obe stále pod okresom a nad svetom.
        self.assertLess(ids.index(self.district_post.id), ids.index(newer.id))
        self.assertLess(ids.index(self.country_post.id), ids.index(self.world_post.id))

    def test_anonymous_keeps_plain_chronology(self):
        response = self.client.get(self.url)

        self.assertEqual(
            self._ids(response),
            [self.world_post.id, self.country_post.id, self.district_post.id],
        )

    def test_viewer_without_district_keeps_plain_chronology(self):
        self.client.force_authenticate(user=_user("rank-nowhere"))

        response = self.client.get(self.url)

        self.assertEqual(
            self._ids(response),
            [self.world_post.id, self.country_post.id, self.district_post.id],
        )

    def test_unresolvable_district_still_gets_the_district_tier(self):
        """Neznámy okres = žiadna krajina, ale zhoda okresu musí fungovať."""
        viewer = _user("rank-unknown", district="Vymyslený okres")
        author = _user("rank-unknown-peer", district="Vymyslený okres")
        local = self._post(author, timezone.now() - timedelta(days=5))
        self.client.force_authenticate(user=viewer)

        ids = self._ids(self.client.get(self.url))

        self.assertEqual(ids[0], local.id)

    def test_cursor_pagination_stays_stable_across_tiers(self):
        self.client.force_authenticate(user=self.viewer)

        first = self.client.get(self.url, {"page_size": 2})
        first_ids = self._ids(first)
        self.assertEqual(len(first_ids), 2)
        self.assertIsNotNone(first.data["next"])

        second = self.client.get("/api" + first.data["next"].split("/api", 1)[1])
        second_ids = self._ids(second)

        # Žiadny príspevok sa nezopakoval ani nevypadol a poradie sedí s
        # jednostránkovým načítaním.
        self.assertEqual(
            first_ids + second_ids,
            [self.district_post.id, self.country_post.id, self.world_post.id],
        )
