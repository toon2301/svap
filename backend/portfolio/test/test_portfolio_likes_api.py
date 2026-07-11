from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Notification, NotificationType
from accounts.notification_serializers import NotificationSerializer
from portfolio.models import PortfolioImage, PortfolioItem, PortfolioItemLike

User = get_user_model()


class PortfolioLikeApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="portfolio-like-owner",
            email="portfolio-like-owner@example.com",
            password="testpass123",
            first_name="Portfolio",
            last_name="Owner",
            user_type="individual",
            is_public=True,
            slug="portfolio-like-owner",
        )
        self.visitor = User.objects.create_user(
            username="portfolio-like-visitor",
            email="portfolio-like-visitor@example.com",
            password="testpass123",
            first_name="Portfolio",
            last_name="Visitor",
            user_type="individual",
        )

    def _item(self, **overrides):
        data = {
            "owner": self.owner,
            "title": "Portfolio with likes",
            "category": "Craft",
            "description": "Clean work.",
            "sort_order": 0,
        }
        data.update(overrides)
        return PortfolioItem.objects.create(**data)

    def _approved_cover(self, item, **overrides):
        data = {
            "item": item,
            "order": 0,
            "status": PortfolioImage.Status.APPROVED,
            "approved_key": f"portfolio/{item.id}/cover.webp",
            "thumbnail_key": f"portfolio/{item.id}/cover-thumb.webp",
            "width": 1200,
            "height": 800,
        }
        data.update(overrides)
        image = PortfolioImage.objects.create(**data)
        item.cover_image = image
        item.save(update_fields=["cover_image", "updated_at"])
        return image

    def test_like_toggle_updates_counts_and_notifies_owner_once(self):
        item = self._item()
        self._approved_cover(item)
        self.client.force_authenticate(user=self.visitor)
        url = reverse("accounts:portfolio_like", args=[item.id])

        with self.captureOnCommitCallbacks(execute=True):
            first_like = self.client.post(url)

        self.assertEqual(first_like.status_code, status.HTTP_201_CREATED)
        self.assertEqual(first_like.data["portfolio_item_id"], item.id)
        self.assertTrue(first_like.data["is_liked_by_me"])
        self.assertEqual(first_like.data["likes_count"], 1)
        self.assertTrue(
            PortfolioItemLike.objects.filter(item=item, user=self.visitor).exists()
        )

        notification = Notification.objects.get(
            user=self.owner,
            type=NotificationType.PORTFOLIO_LIKED,
        )
        self.assertEqual(notification.actor_id, self.visitor.id)
        self.assertEqual(notification.data, {"portfolio_item_id": item.id})
        self.assertNotIn("title", notification.data)
        serialized = NotificationSerializer(notification).data
        self.assertEqual(
            serialized["target_url"],
            f"/dashboard/users/{self.owner.id}/portfolio/{item.id}",
        )

        with self.captureOnCommitCallbacks(execute=True):
            second_like = self.client.post(url)

        self.assertEqual(second_like.status_code, status.HTTP_200_OK)
        self.assertTrue(second_like.data["is_liked_by_me"])
        self.assertEqual(second_like.data["likes_count"], 1)
        self.assertEqual(
            Notification.objects.filter(type=NotificationType.PORTFOLIO_LIKED).count(),
            1,
        )

        list_response = self.client.get(
            reverse("accounts:dashboard_user_portfolio", args=[self.owner.id])
        )
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.data[0]["likes_count"], 1)
        self.assertTrue(list_response.data[0]["is_liked_by_me"])

        unlike = self.client.delete(url)

        self.assertEqual(unlike.status_code, status.HTTP_200_OK)
        self.assertFalse(unlike.data["is_liked_by_me"])
        self.assertEqual(unlike.data["likes_count"], 0)
        self.assertFalse(PortfolioItemLike.objects.exists())

    def test_owner_can_like_own_portfolio_without_self_notification(self):
        item = self._item()
        self.client.force_authenticate(user=self.owner)

        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(reverse("accounts:portfolio_like", args=[item.id]))

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["is_liked_by_me"])
        self.assertEqual(response.data["likes_count"], 1)
        self.assertTrue(PortfolioItemLike.objects.filter(item=item, user=self.owner).exists())
        self.assertFalse(
            Notification.objects.filter(type=NotificationType.PORTFOLIO_LIKED).exists()
        )

    def test_hidden_portfolio_cannot_be_liked_by_visitor(self):
        item = self._item()
        self._approved_cover(
            item,
            status=PortfolioImage.Status.PENDING,
            approved_key="",
            thumbnail_key="",
            pending_key=f"uploads/portfolio/{item.id}/cover.jpg",
        )
        self.client.force_authenticate(user=self.visitor)

        response = self.client.post(reverse("accounts:portfolio_like", args=[item.id]))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(PortfolioItemLike.objects.exists())

    def test_private_owner_portfolio_cannot_be_liked_by_visitor(self):
        self.owner.is_public = False
        self.owner.save(update_fields=["is_public"])
        item = self._item()
        self._approved_cover(item)
        self.client.force_authenticate(user=self.visitor)

        response = self.client.post(reverse("accounts:portfolio_like", args=[item.id]))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(PortfolioItemLike.objects.exists())
