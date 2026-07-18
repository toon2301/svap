import io
from unittest.mock import patch

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
    Review,
    ReviewLike,
    SkillRequest,
    UserBlock,
)
from portfolio.models import PortfolioImage, PortfolioItem, PortfolioItemLike

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

    def test_blocked_pair_cannot_use_direct_offer_flows(self):
        review = Review.objects.create(
            reviewer=self.viewer,
            offer=self.target_offer,
            rating="5.0",
            text="Existing review remains stored.",
        )
        UserBlock.objects.create(blocker=self.target, blocked_user=self.viewer)

        responses = [
            self.client.get(
                reverse("accounts:skills_detail", args=[self.target_offer.id])
            ),
            self.client.post(
                reverse("accounts:offer_like", args=[self.target_offer.id])
            ),
            self.client.get(
                reverse("accounts:reviews_list", args=[self.target_offer.id])
            ),
            self.client.post(
                reverse("accounts:reviews_list", args=[self.target_offer.id]),
                {"rating": "5.0", "text": "Blocked review"},
            ),
            self.client.get(reverse("accounts:review_detail", args=[review.id])),
            self.client.post(reverse("accounts:review_like", args=[review.id])),
        ]
        request_response = self.client.post(
            reverse("accounts:skill_requests"),
            {"offer_id": self.target_offer.id},
        )

        for response in responses:
            self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(request_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("offer_id", request_response.data)
        self.assertFalse(OfferedSkillLike.objects.exists())
        self.assertFalse(ReviewLike.objects.exists())
        self.assertFalse(SkillRequest.objects.exists())
        self.assertTrue(Review.objects.filter(pk=review.pk).exists())
        self.assertFalse(Notification.objects.exists())

    def test_blocked_pair_cannot_like_or_fetch_cached_portfolio_image(self):
        item = PortfolioItem.objects.create(
            owner=self.target,
            title="Protected portfolio",
            category="Services",
        )
        image = PortfolioImage.objects.create(
            item=item,
            status=PortfolioImage.Status.APPROVED,
            order=0,
            approved_key=f"media/portfolio/{item.id}/image-large.webp",
            large_key=f"media/portfolio/{item.id}/image-large.webp",
        )
        item.cover_image = image
        item.save(update_fields=["cover_image", "updated_at"])
        image_url = reverse(
            "accounts:portfolio_image_file",
            args=[item.id, image.id],
        )

        with patch(
            "portfolio.image_file_views.default_storage.open",
            return_value=io.BytesIO(b"webp-bytes"),
        ):
            warm_response = self.client.get(image_url)
        self.assertEqual(warm_response.status_code, status.HTTP_200_OK)

        UserBlock.objects.create(blocker=self.target, blocked_user=self.viewer)
        like_response = self.client.post(
            reverse("accounts:portfolio_like", args=[item.id])
        )
        with patch("portfolio.image_file_views.default_storage.open") as open_mock:
            blocked_image_response = self.client.get(image_url)

        self.assertEqual(like_response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            blocked_image_response.status_code,
            status.HTTP_404_NOT_FOUND,
        )
        open_mock.assert_not_called()
        self.assertFalse(PortfolioItemLike.objects.exists())
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

    def test_portfolio_like_rechecks_block_state_after_pair_lock(self):
        item = PortfolioItem.objects.create(
            owner=self.target,
            title="Concurrent block portfolio",
            category="Services",
        )
        image = PortfolioImage.objects.create(
            item=item,
            status=PortfolioImage.Status.APPROVED,
            order=0,
            approved_key=f"media/portfolio/{item.id}/cover.webp",
        )
        item.cover_image = image
        item.save(update_fields=["cover_image", "updated_at"])

        def create_block_after_lock(**_kwargs):
            UserBlock.objects.create(blocker=self.target, blocked_user=self.viewer)

        with patch(
            "portfolio.views.lock_user_pair_for_update",
            side_effect=create_block_after_lock,
        ):
            response = self.client.post(
                reverse("accounts:portfolio_like", args=[item.id])
            )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(PortfolioItemLike.objects.exists())
        self.assertFalse(Notification.objects.exists())

    def test_review_like_rechecks_block_with_review_author(self):
        reviewer = self.create_user("review-like-author", "Review Author")
        review = Review.objects.create(
            reviewer=reviewer,
            offer=self.target_offer,
            rating="5.0",
            text="Public review on another user's offer.",
        )

        def create_block_after_lock(**_kwargs):
            UserBlock.objects.create(blocker=reviewer, blocked_user=self.viewer)

        with patch(
            "accounts.views.reviews.lock_users_for_update",
            side_effect=create_block_after_lock,
        ):
            response = self.client.post(
                reverse("accounts:review_like", args=[review.id])
            )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(ReviewLike.objects.exists())
        self.assertFalse(Notification.objects.exists())

    def test_review_unlike_rejects_blocked_review_author(self):
        reviewer = self.create_user("review-unlike-author", "Review Unlike Author")
        review = Review.objects.create(
            reviewer=reviewer,
            offer=self.target_offer,
            rating="5.0",
            text="Review with an existing like.",
        )
        review_like = ReviewLike.objects.create(review=review, user=self.viewer)
        UserBlock.objects.create(blocker=reviewer, blocked_user=self.viewer)

        response = self.client.delete(reverse("accounts:review_like", args=[review.id]))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(ReviewLike.objects.filter(pk=review_like.pk).exists())

    def test_review_reply_rechecks_block_with_reviewer(self):
        review = Review.objects.create(
            reviewer=self.viewer,
            offer=self.target_offer,
            rating="5.0",
            text="Review awaiting an owner response.",
        )
        self.client.force_authenticate(user=self.target)

        def create_block_after_lock(**_kwargs):
            UserBlock.objects.create(blocker=self.viewer, blocked_user=self.target)

        with patch(
            "accounts.views.reviews.lock_user_pair_for_update",
            side_effect=create_block_after_lock,
        ):
            response = self.client.post(
                reverse("accounts:review_respond", args=[review.id]),
                {"owner_response": "Must not be stored."},
            )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        review.refresh_from_db()
        self.assertFalse(review.owner_response)
        self.assertFalse(Notification.objects.exists())
