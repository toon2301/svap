from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import (
    FavoriteUser,
    Notification,
    OfferedSkill,
    OfferedSkillLike,
    ProfileLike,
    UserBlock,
)
from portfolio.models import PortfolioItem, PortfolioItemLike

User = get_user_model()


class UserBlockEnforcementTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.viewer = self.create_user("block-viewer", "Block Viewer")
        self.target = self.create_user("needleblock-target", "NeedleBlock Target")
        self.target_offer = OfferedSkill.objects.create(
            user=self.target,
            category="NeedleBlock service",
            subcategory="NeedleBlock detail",
            description="NeedleBlock searchable offer",
            detailed_description="NeedleBlock details",
            is_hidden=False,
        )
        self.client.force_authenticate(user=self.viewer)

    def tearDown(self):
        cache.clear()

    @staticmethod
    def create_user(username: str, first_name: str):
        return User.objects.create_user(
            username=username,
            email=f"{username}@example.com",
            password="testpass123",
            first_name=first_name,
            user_type="individual",
            is_public=True,
            slug=username,
        )

    def profile_content_urls(self):
        return [
            reverse("accounts:dashboard_user_profile_detail", args=[self.target.id]),
            reverse(
                "accounts:dashboard_user_profile_detail_by_slug",
                args=[self.target.slug],
            ),
            reverse("accounts:dashboard_user_skills", args=[self.target.id]),
            reverse(
                "accounts:dashboard_user_skills_by_slug",
                args=[self.target.slug],
            ),
            reverse("accounts:dashboard_user_portfolio", args=[self.target.id]),
            reverse(
                "accounts:dashboard_user_portfolio_by_slug",
                args=[self.target.slug],
            ),
        ]

    def test_profile_content_is_hidden_for_both_block_directions(self):
        directions = (
            (self.viewer, self.target),
            (self.target, self.viewer),
        )

        for blocker, blocked_user in directions:
            with self.subTest(blocker=blocker.id):
                UserBlock.objects.all().delete()
                UserBlock.objects.create(blocker=blocker, blocked_user=blocked_user)

                for url in self.profile_content_urls():
                    response = self.client.get(url)
                    self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_search_and_recommendations_hide_blocked_user_and_offer(self):
        UserBlock.objects.create(blocker=self.target, blocked_user=self.viewer)

        dashboard = self.client.get(
            reverse("accounts:dashboard_search"),
            {"q": "NeedleBlock"},
        )
        self.assertEqual(dashboard.status_code, status.HTTP_200_OK)
        self.assertNotIn(self.target.id, [item["id"] for item in dashboard.data["users"]])
        self.assertNotIn(
            self.target_offer.id,
            [item["id"] for item in dashboard.data["skills"]],
        )

        global_search = self.client.get(
            reverse("accounts:search_global"),
            {"q": "NeedleBlock"},
        )
        self.assertEqual(global_search.status_code, status.HTTP_200_OK)
        self.assertNotIn(
            self.target.id,
            [item["id"] for item in global_search.data["users"]],
        )
        self.assertNotIn(
            self.target_offer.id,
            [item["id"] for item in global_search.data["offers"]],
        )

        offer_search = self.client.get(
            reverse("accounts:search"),
            {"q": "NeedleBlock"},
        )
        self.assertEqual(offer_search.status_code, status.HTTP_200_OK)
        self.assertNotIn(
            self.target_offer.id,
            [item["id"] for item in offer_search.data["results"]],
        )

        recommendations = self.client.get(
            reverse("accounts:dashboard_search_recommendations"),
            {"limit": "5"},
        )
        self.assertEqual(recommendations.status_code, status.HTTP_200_OK)
        self.assertNotIn(
            self.target_offer.id,
            [item["id"] for item in recommendations.data["skills"]],
        )

    def test_cached_recommendation_ids_are_filtered_after_block(self):
        recommendations_url = reverse("accounts:dashboard_search_recommendations")
        before_block = self.client.get(recommendations_url, {"limit": "5"})
        self.assertEqual(before_block.status_code, status.HTTP_200_OK)
        self.assertIn(
            self.target_offer.id,
            [item["id"] for item in before_block.data["skills"]],
        )

        UserBlock.objects.create(blocker=self.viewer, blocked_user=self.target)
        after_block = self.client.get(recommendations_url, {"limit": "5"})

        self.assertEqual(after_block.status_code, status.HTTP_200_OK)
        self.assertNotIn(
            self.target_offer.id,
            [item["id"] for item in after_block.data["skills"]],
        )

    def test_block_api_removes_only_mutual_profile_social_relations(self):
        FavoriteUser.objects.bulk_create(
            [
                FavoriteUser(user=self.viewer, favorite_user=self.target),
                FavoriteUser(user=self.target, favorite_user=self.viewer),
            ]
        )
        ProfileLike.objects.bulk_create(
            [
                ProfileLike(user=self.viewer, profile_user=self.target),
                ProfileLike(user=self.target, profile_user=self.viewer),
            ]
        )
        portfolio_item = PortfolioItem.objects.create(
            owner=self.target,
            title="Blocked owner portfolio",
            category="Services",
        )
        offer_like = OfferedSkillLike.objects.create(
            offer=self.target_offer,
            user=self.viewer,
        )
        portfolio_like = PortfolioItemLike.objects.create(
            item=portfolio_item,
            user=self.viewer,
        )

        block_url = reverse("accounts:user_block_detail", args=[self.target.id])
        response = self.client.post(block_url)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(FavoriteUser.objects.exists())
        self.assertFalse(ProfileLike.objects.exists())
        self.assertTrue(OfferedSkillLike.objects.filter(pk=offer_like.pk).exists())
        self.assertTrue(PortfolioItemLike.objects.filter(pk=portfolio_like.pk).exists())
        self.assertFalse(Notification.objects.exists())

        FavoriteUser.objects.create(user=self.viewer, favorite_user=self.target)
        ProfileLike.objects.create(user=self.viewer, profile_user=self.target)
        repeated = self.client.post(block_url)

        self.assertEqual(repeated.status_code, status.HTTP_200_OK)
        self.assertFalse(FavoriteUser.objects.exists())
        self.assertFalse(ProfileLike.objects.exists())
        self.assertEqual(UserBlock.objects.count(), 1)

    def test_blocked_pair_cannot_create_profile_favorite_or_like(self):
        UserBlock.objects.create(blocker=self.target, blocked_user=self.viewer)

        favorite_response = self.client.post(
            reverse("accounts:dashboard_favorites"),
            {"type": "user", "id": self.target.id},
        )
        profile_like_response = self.client.post(
            reverse("accounts:dashboard_user_profile_like", args=[self.target.id])
        )

        self.assertEqual(favorite_response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(profile_like_response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(FavoriteUser.objects.exists())
        self.assertFalse(ProfileLike.objects.exists())
        self.assertFalse(Notification.objects.exists())

    def test_stale_favorite_is_hidden_and_not_counted(self):
        UserBlock.objects.create(blocker=self.target, blocked_user=self.viewer)
        FavoriteUser.objects.create(user=self.viewer, favorite_user=self.target)

        favorites = self.client.get(reverse("accounts:dashboard_favorites"))
        home = self.client.get(reverse("accounts:dashboard_home"))

        self.assertEqual(favorites.status_code, status.HTTP_200_OK)
        self.assertEqual(favorites.data["users"], [])
        self.assertEqual(home.status_code, status.HTTP_200_OK)
        self.assertEqual(home.data["stats"]["favorites_count"], 0)
