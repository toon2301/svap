from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Notification, NotificationType, ProfileLike, UserProfile
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

    def _profile_like_events(self, notify_mock):
        """Vráť len profile_like_changed count-update eventy z mocku notify_user."""
        return [
            call.args
            for call in notify_mock.call_args_list
            if len(call.args) >= 2
            and isinstance(call.args[1], dict)
            and call.args[1].get("type") == "profile_like_changed"
        ]

    def _assert_count_event(self, notify_mock, expected_user_id, expected_count):
        events = self._profile_like_events(notify_mock)
        self.assertTrue(events, "profile_like_changed event nebol odoslaný")
        user_id_arg, event = events[-1]
        self.assertEqual(user_id_arg, expected_user_id)
        self.assertEqual(event["profile_user_id"], expected_user_id)
        self.assertEqual(event["profile_likes_count"], expected_count)

    def test_count_update_dispatched_when_in_app_notifications_disabled(self):
        # Vlastník má vypnuté in-app notifikácie → notification_created nepríde,
        # ale count-update event musí prísť aj tak.
        profile, _ = UserProfile.objects.get_or_create(user=self.owner)
        profile.in_app_notifications = False
        profile.save(update_fields=["in_app_notifications"])

        self.client.force_authenticate(user=self.visitor)
        url = reverse("accounts:dashboard_user_profile_like", args=[self.owner.id])

        with patch("accounts.views.profile_likes.notify_user") as notify_mock:
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            Notification.objects.filter(type=NotificationType.PROFILE_LIKED).count(),
            0,
        )
        self._assert_count_event(notify_mock, self.owner.id, 1)

    def test_count_update_dispatched_on_unlike(self):
        self.client.force_authenticate(user=self.visitor)
        url = reverse("accounts:dashboard_user_profile_like", args=[self.owner.id])

        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(url)

        with patch("accounts.views.profile_likes.notify_user") as notify_mock:
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(ProfileLike.objects.exists())
        # Unlike nevytvára notifikáciu, ale count-update (0) musí prísť.
        self._assert_count_event(notify_mock, self.owner.id, 0)

    def test_count_update_dispatched_on_repeated_like(self):
        self.client.force_authenticate(user=self.visitor)
        url = reverse("accounts:dashboard_user_profile_like", args=[self.owner.id])

        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(url)

        with patch("accounts.views.profile_likes.notify_user") as notify_mock:
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Opakovaný lajk nevytvorí druhú notifikáciu (dedup), ale count-update príde.
        self.assertEqual(
            Notification.objects.filter(type=NotificationType.PROFILE_LIKED).count(),
            1,
        )
        self._assert_count_event(notify_mock, self.owner.id, 1)

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
