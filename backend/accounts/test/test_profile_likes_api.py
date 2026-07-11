from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Notification, NotificationType, ProfileLike
from accounts.notification_serializers import NotificationSerializer

User = get_user_model()


class ProfileLikeApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="profile-like-owner",
            email="profile-like-owner@example.com",
            password="testpass123",
            first_name="Profile",
            last_name="Owner",
            user_type="individual",
            is_public=True,
            slug="profile-like-owner",
        )
        self.visitor = User.objects.create_user(
            username="profile-like-visitor",
            email="profile-like-visitor@example.com",
            password="testpass123",
            first_name="Profile",
            last_name="Visitor",
            user_type="individual",
            is_public=True,
            slug="profile-like-visitor",
        )

    def test_like_toggle_updates_counts_and_notifies_profile_owner_once(self):
        self.client.force_authenticate(user=self.visitor)
        url = reverse("accounts:dashboard_user_profile_like", args=[self.owner.id])

        with self.captureOnCommitCallbacks(execute=True):
            first_like = self.client.post(url)

        self.assertEqual(first_like.status_code, status.HTTP_201_CREATED)
        self.assertEqual(first_like.data["profile_user_id"], self.owner.id)
        self.assertTrue(first_like.data["is_profile_liked_by_me"])
        self.assertEqual(first_like.data["profile_likes_count"], 1)
        self.assertTrue(
            ProfileLike.objects.filter(
                profile_user=self.owner,
                user=self.visitor,
            ).exists()
        )

        notification = Notification.objects.get(
            user=self.owner,
            type=NotificationType.PROFILE_LIKED,
        )
        self.assertEqual(notification.actor_id, self.visitor.id)
        self.assertEqual(
            notification.data,
            {
                "profile_user_id": self.owner.id,
                "from_user_id": self.visitor.id,
            },
        )
        serialized = NotificationSerializer(notification).data
        self.assertEqual(
            serialized["target_url"],
            f"/dashboard/users/{self.visitor.slug}",
        )

        with self.captureOnCommitCallbacks(execute=True):
            second_like = self.client.post(url)

        self.assertEqual(second_like.status_code, status.HTTP_200_OK)
        self.assertTrue(second_like.data["is_profile_liked_by_me"])
        self.assertEqual(second_like.data["profile_likes_count"], 1)
        self.assertEqual(
            Notification.objects.filter(type=NotificationType.PROFILE_LIKED).count(),
            1,
        )

        profile_response = self.client.get(
            reverse("accounts:dashboard_user_profile_detail", args=[self.owner.id])
        )
        self.assertEqual(profile_response.status_code, status.HTTP_200_OK)
        self.assertEqual(profile_response.data["profile_likes_count"], 1)
        self.assertTrue(profile_response.data["is_profile_liked_by_me"])

        unlike = self.client.delete(url)

        self.assertEqual(unlike.status_code, status.HTTP_200_OK)
        self.assertFalse(unlike.data["is_profile_liked_by_me"])
        self.assertEqual(unlike.data["profile_likes_count"], 0)
        self.assertFalse(ProfileLike.objects.exists())

    def test_user_cannot_like_own_profile(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            reverse("accounts:dashboard_user_profile_like", args=[self.owner.id])
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(ProfileLike.objects.exists())

    def test_private_profile_cannot_be_liked_by_visitor(self):
        self.owner.is_public = False
        self.owner.save(update_fields=["is_public"])
        self.client.force_authenticate(user=self.visitor)

        response = self.client.post(
            reverse("accounts:dashboard_user_profile_like", args=[self.owner.id])
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(ProfileLike.objects.exists())

    def test_own_profile_payload_exposes_count_but_not_self_like(self):
        ProfileLike.objects.create(profile_user=self.owner, user=self.visitor)
        self.client.force_authenticate(user=self.owner)

        response = self.client.get(reverse("accounts:me"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["profile_likes_count"], 1)
        self.assertFalse(response.data["is_profile_liked_by_me"])
