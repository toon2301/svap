import pytest
from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status
from factory import Faker
from factory.django import DjangoModelFactory

from accounts.models import (
    UserType,
    OfferedSkill,
    OfferedSkillLike,
    Notification,
    NotificationType,
    Review,
    ReviewLike,
    SkillRequest,
    SkillRequestStatus,
)
from messaging.models import Conversation

User = get_user_model()


class UserFactory(DjangoModelFactory):
    class Meta:
        model = User

    username = Faker("user_name")
    email = Faker("email")
    first_name = Faker("first_name")
    last_name = Faker("last_name")
    user_type = UserType.INDIVIDUAL
    is_active = True


@pytest.mark.django_db
class TestSkillRequestsAndNotifications(APITestCase):
    def setUp(self):
        self.base = "/api/auth"

        self.owner = UserFactory()
        self.owner.set_password("StrongPass123")
        self.owner.is_verified = True
        self.owner.save()

        self.requester = UserFactory()
        self.requester.set_password("StrongPass123")
        self.requester.is_verified = True
        self.requester.save()

        self.offer = OfferedSkill.objects.create(
            user=self.owner,
            category="Šport",
            subcategory="Futbal tréner",
            description="Trénovanie futbalu",
            detailed_description="",
            is_seeking=False,
        )

    def test_create_request_creates_notification_and_unread_count(self):
        self.client.force_authenticate(user=self.requester)
        r = self.client.post(
            f"{self.base}/skill-requests/", {"offer_id": self.offer.id}, format="json"
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data["offer"], self.offer.id)
        self.assertEqual(r.data["recipient"], self.owner.id)
        self.assertEqual(r.data["requester"], self.requester.id)
        notification = Notification.objects.get(
            user=self.owner,
            type=NotificationType.SKILL_REQUEST,
        )
        self.assertEqual(notification.actor_id, self.requester.id)

        # owner sees unread count 1
        self.client.force_authenticate(user=self.owner)
        c = self.client.get(
            f"{self.base}/notifications/unread-count/", {"type": "skill_request"}
        )
        self.assertEqual(c.status_code, status.HTTP_200_OK)
        self.assertEqual(c.data.get("count"), 1)

    def test_general_notifications_exclude_new_skill_request(self):
        self.client.force_authenticate(user=self.requester)
        created = self.client.post(
            f"{self.base}/skill-requests/", {"offer_id": self.offer.id}, format="json"
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)

        self.client.force_authenticate(user=self.owner)
        feed = self.client.get(f"{self.base}/notifications/", {"type": "all"})
        self.assertEqual(feed.status_code, status.HTTP_200_OK)
        self.assertFalse(
            any(item["type"] == NotificationType.SKILL_REQUEST for item in feed.data)
        )

        general_count = self.client.get(
            f"{self.base}/notifications/unread-count/", {"type": "all"}
        )
        self.assertEqual(general_count.status_code, status.HTTP_200_OK)
        self.assertEqual(general_count.data.get("count"), 0)

        requests_count = self.client.get(
            f"{self.base}/notifications/unread-count/", {"type": "skill_request"}
        )
        self.assertEqual(requests_count.status_code, status.HTTP_200_OK)
        self.assertEqual(requests_count.data.get("count"), 1)

    def test_general_mark_all_read_does_not_clear_request_badge(self):
        self.client.force_authenticate(user=self.requester)
        created = self.client.post(
            f"{self.base}/skill-requests/", {"offer_id": self.offer.id}, format="json"
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)

        self.client.force_authenticate(user=self.owner)
        marked = self.client.post(
            f"{self.base}/notifications/mark-all-read/",
            {"type": "all"},
            format="json",
        )
        self.assertEqual(marked.status_code, status.HTTP_200_OK)

        requests_count = self.client.get(
            f"{self.base}/notifications/unread-count/", {"type": "skill_request"}
        )
        self.assertEqual(requests_count.status_code, status.HTTP_200_OK)
        self.assertEqual(requests_count.data.get("count"), 1)
        self.assertTrue(
            Notification.objects.filter(
                user=self.owner,
                type=NotificationType.SKILL_REQUEST,
                is_read=False,
            ).exists()
        )

    def test_create_review_notifies_offer_owner_and_counts_in_general_badge(self):
        SkillRequest.objects.create(
            requester=self.requester,
            recipient=self.owner,
            offer=self.offer,
            status=SkillRequestStatus.COMPLETED,
        )

        self.client.force_authenticate(user=self.requester)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                f"{self.base}/skills/{self.offer.id}/reviews/",
                {
                    "rating": 5,
                    "text": "Výborná spolupráca.",
                    "pros": ["Rýchla komunikácia"],
                    "cons": [],
                },
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        notification = Notification.objects.get(
            user=self.owner,
            type=NotificationType.REVIEW_CREATED,
        )
        self.assertEqual(notification.actor_id, self.requester.id)
        self.assertEqual(notification.data.get("review_id"), response.data["id"])
        self.assertEqual(notification.data.get("offer_id"), self.offer.id)
        self.assertEqual(notification.data.get("from_user_id"), self.requester.id)
        self.assertNotIn("text", notification.data)

        self.client.force_authenticate(user=self.owner)
        count = self.client.get(
            f"{self.base}/notifications/unread-count/", {"type": "all"}
        )
        self.assertEqual(count.status_code, status.HTTP_200_OK)
        self.assertEqual(count.data.get("count"), 1)

        feed = self.client.get(f"{self.base}/notifications/", {"type": "all"})
        self.assertEqual(feed.status_code, status.HTTP_200_OK)
        payload = next(
            item for item in feed.data if item["type"] == NotificationType.REVIEW_CREATED
        )
        self.assertEqual(
            payload["target_url"],
            f"/dashboard/offers/{self.offer.id}/reviews?review_id={response.data['id']}",
        )

    def test_owner_reply_to_review_notifies_reviewer_once(self):
        SkillRequest.objects.create(
            requester=self.requester,
            recipient=self.owner,
            offer=self.offer,
            status=SkillRequestStatus.COMPLETED,
        )

        self.client.force_authenticate(user=self.requester)
        with self.captureOnCommitCallbacks(execute=True):
            review_response = self.client.post(
                f"{self.base}/skills/{self.offer.id}/reviews/",
                {
                    "rating": 5,
                    "text": "Výborná spolupráca.",
                    "pros": ["Rýchla komunikácia"],
                    "cons": [],
                },
                format="json",
            )
        self.assertEqual(review_response.status_code, status.HTTP_201_CREATED)

        self.client.force_authenticate(user=self.owner)
        with self.captureOnCommitCallbacks(execute=True):
            reply_response = self.client.post(
                f"{self.base}/reviews/{review_response.data['id']}/respond/",
                {"owner_response": "Ďakujem za recenziu."},
                format="json",
            )

        self.assertEqual(reply_response.status_code, status.HTTP_200_OK)
        notification = Notification.objects.get(
            user=self.requester,
            type=NotificationType.REVIEW_REPLY_CREATED,
        )
        self.assertEqual(notification.actor_id, self.owner.id)
        self.assertEqual(notification.data.get("review_id"), review_response.data["id"])
        self.assertEqual(notification.data.get("offer_id"), self.offer.id)
        self.assertEqual(notification.data.get("from_user_id"), self.owner.id)
        self.assertNotIn("text", notification.data)
        self.assertNotIn("owner_response", notification.data)

        self.client.force_authenticate(user=self.requester)
        count = self.client.get(
            f"{self.base}/notifications/unread-count/", {"type": "all"}
        )
        self.assertEqual(count.status_code, status.HTTP_200_OK)
        self.assertEqual(count.data.get("count"), 1)

        feed = self.client.get(f"{self.base}/notifications/", {"type": "all"})
        self.assertEqual(feed.status_code, status.HTTP_200_OK)
        payload = next(
            item
            for item in feed.data
            if item["type"] == NotificationType.REVIEW_REPLY_CREATED
        )
        self.assertEqual(
            payload["target_url"],
            f"/dashboard/offers/{self.offer.id}/reviews?review_id={review_response.data['id']}&modal=owner_response",
        )

        self.client.force_authenticate(user=self.owner)
        with self.captureOnCommitCallbacks(execute=True):
            second_reply_response = self.client.post(
                f"{self.base}/reviews/{review_response.data['id']}/respond/",
                {"owner_response": "Aktualizovaná odpoveď."},
                format="json",
            )
        self.assertEqual(second_reply_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            Notification.objects.filter(
                user=self.requester,
                type=NotificationType.REVIEW_REPLY_CREATED,
            ).count(),
            1,
        )

    def test_review_like_toggle_updates_counts_and_notifies_reviewer_once(self):
        review = Review.objects.create(
            reviewer=self.requester,
            offer=self.offer,
            rating=5,
            text="Výborná spolupráca.",
            pros=["Rýchla komunikácia"],
            cons=[],
        )

        self.client.force_authenticate(user=self.owner)
        with self.captureOnCommitCallbacks(execute=True):
            first_like = self.client.post(f"{self.base}/reviews/{review.id}/like/")

        self.assertEqual(first_like.status_code, status.HTTP_201_CREATED)
        self.assertEqual(first_like.data["review_id"], review.id)
        self.assertTrue(first_like.data["is_liked_by_me"])
        self.assertEqual(first_like.data["likes_count"], 1)
        self.assertTrue(
            ReviewLike.objects.filter(review=review, user=self.owner).exists()
        )

        notification = Notification.objects.get(
            user=self.requester,
            type=NotificationType.REVIEW_LIKED,
        )
        self.assertEqual(notification.actor_id, self.owner.id)
        self.assertEqual(notification.data.get("review_id"), review.id)
        self.assertEqual(notification.data.get("offer_id"), self.offer.id)
        self.assertEqual(notification.data.get("from_user_id"), self.owner.id)
        self.assertNotIn("text", notification.data)

        self.client.force_authenticate(user=self.requester)
        count = self.client.get(
            f"{self.base}/notifications/unread-count/", {"type": "all"}
        )
        self.assertEqual(count.status_code, status.HTTP_200_OK)
        self.assertEqual(count.data.get("count"), 1)

        feed = self.client.get(f"{self.base}/notifications/", {"type": "all"})
        self.assertEqual(feed.status_code, status.HTTP_200_OK)
        payload = next(
            item for item in feed.data if item["type"] == NotificationType.REVIEW_LIKED
        )
        self.assertEqual(
            payload["target_url"],
            f"/dashboard/offers/{self.offer.id}/reviews?review_id={review.id}",
        )

        self.client.force_authenticate(user=self.owner)
        with self.captureOnCommitCallbacks(execute=True):
            second_like = self.client.post(f"{self.base}/reviews/{review.id}/like/")
        self.assertEqual(second_like.status_code, status.HTTP_200_OK)
        self.assertTrue(second_like.data["is_liked_by_me"])
        self.assertEqual(second_like.data["likes_count"], 1)
        self.assertEqual(
            Notification.objects.filter(
                user=self.requester,
                type=NotificationType.REVIEW_LIKED,
            ).count(),
            1,
        )

        list_response = self.client.get(f"{self.base}/skills/{self.offer.id}/reviews/")
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        listed_review = next(item for item in list_response.data if item["id"] == review.id)
        self.assertEqual(listed_review["likes_count"], 1)
        self.assertTrue(listed_review["is_liked_by_me"])

        unlike = self.client.delete(f"{self.base}/reviews/{review.id}/like/")
        self.assertEqual(unlike.status_code, status.HTTP_200_OK)
        self.assertFalse(unlike.data["is_liked_by_me"])
        self.assertEqual(unlike.data["likes_count"], 0)
        self.assertFalse(
            ReviewLike.objects.filter(review=review, user=self.owner).exists()
        )

    def test_offer_like_toggle_updates_counts_and_notifies_owner_once(self):
        self.client.force_authenticate(user=self.requester)
        with self.captureOnCommitCallbacks(execute=True):
            first_like = self.client.post(f"{self.base}/skills/{self.offer.id}/like/")

        self.assertEqual(first_like.status_code, status.HTTP_201_CREATED)
        self.assertEqual(first_like.data["offer_id"], self.offer.id)
        self.assertTrue(first_like.data["is_liked_by_me"])
        self.assertEqual(first_like.data["likes_count"], 1)
        self.assertTrue(
            OfferedSkillLike.objects.filter(
                offer=self.offer,
                user=self.requester,
            ).exists()
        )

        notification = Notification.objects.get(
            user=self.owner,
            type=NotificationType.OFFER_LIKED,
        )
        self.assertEqual(notification.actor_id, self.requester.id)
        self.assertEqual(notification.data.get("offer_id"), self.offer.id)
        self.assertNotIn("text", notification.data)
        self.assertNotIn("description", notification.data)
        self.assertNotIn("from_user_id", notification.data)

        self.client.force_authenticate(user=self.owner)
        count = self.client.get(
            f"{self.base}/notifications/unread-count/", {"type": "all"}
        )
        self.assertEqual(count.status_code, status.HTTP_200_OK)
        self.assertEqual(count.data.get("count"), 1)

        feed = self.client.get(f"{self.base}/notifications/", {"type": "all"})
        self.assertEqual(feed.status_code, status.HTTP_200_OK)
        payload = next(
            item for item in feed.data if item["type"] == NotificationType.OFFER_LIKED
        )
        self.assertEqual(
            payload["target_url"],
            f"/dashboard/profile?highlight={self.offer.id}&side=back",
        )

        self.client.force_authenticate(user=self.requester)
        with self.captureOnCommitCallbacks(execute=True):
            second_like = self.client.post(f"{self.base}/skills/{self.offer.id}/like/")
        self.assertEqual(second_like.status_code, status.HTTP_200_OK)
        self.assertTrue(second_like.data["is_liked_by_me"])
        self.assertEqual(second_like.data["likes_count"], 1)
        self.assertEqual(
            Notification.objects.filter(
                user=self.owner,
                type=NotificationType.OFFER_LIKED,
            ).count(),
            1,
        )

        list_response = self.client.get(
            f"{self.base}/dashboard/users/{self.owner.id}/skills/"
        )
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        listed_offer = next(item for item in list_response.data if item["id"] == self.offer.id)
        self.assertEqual(listed_offer["likes_count"], 1)
        self.assertTrue(listed_offer["is_liked_by_me"])

        unlike = self.client.delete(f"{self.base}/skills/{self.offer.id}/like/")
        self.assertEqual(unlike.status_code, status.HTTP_200_OK)
        self.assertFalse(unlike.data["is_liked_by_me"])
        self.assertEqual(unlike.data["likes_count"], 0)
        self.assertFalse(
            OfferedSkillLike.objects.filter(
                offer=self.offer,
                user=self.requester,
            ).exists()
        )

    def test_offer_like_hidden_offer_is_not_available_to_other_users(self):
        self.offer.is_hidden = True
        self.offer.save(update_fields=["is_hidden"])

        self.client.force_authenticate(user=self.requester)
        response = self.client.post(f"{self.base}/skills/{self.offer.id}/like/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(OfferedSkillLike.objects.exists())

    def test_create_request_hidden_offer_is_not_available_to_other_users(self):
        self.offer.is_hidden = True
        self.offer.save(update_fields=["is_hidden"])

        self.client.force_authenticate(user=self.requester)
        response = self.client.post(
            f"{self.base}/skill-requests/", {"offer_id": self.offer.id}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(SkillRequest.objects.exists())

    def test_create_request_private_owner_offer_is_not_available_to_other_users(self):
        self.owner.is_public = False
        self.owner.save(update_fields=["is_public"])

        self.client.force_authenticate(user=self.requester)
        response = self.client.post(
            f"{self.base}/skill-requests/", {"offer_id": self.offer.id}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(SkillRequest.objects.exists())

    def test_list_requests_received_and_sent(self):
        self.client.force_authenticate(user=self.requester)
        self.client.post(
            f"{self.base}/skill-requests/", {"offer_id": self.offer.id}, format="json"
        )

        self.client.force_authenticate(user=self.owner)
        r_owner = self.client.get(f"{self.base}/skill-requests/")
        self.assertEqual(r_owner.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r_owner.data.get("received", [])), 1)

        self.client.force_authenticate(user=self.requester)
        r_req = self.client.get(f"{self.base}/skill-requests/")
        self.assertEqual(r_req.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r_req.data.get("sent", [])), 1)

    def test_offer_summary_omits_currency_for_negotiable_offer(self):
        self.offer.price_negotiable = True
        self.offer.price_currency = "€"
        self.offer.save(update_fields=["price_negotiable", "price_currency"])

        self.client.force_authenticate(user=self.requester)
        self.client.post(
            f"{self.base}/skill-requests/", {"offer_id": self.offer.id}, format="json"
        )

        response = self.client.get(f"{self.base}/skill-requests/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        offer_summary = response.data["sent"][0]["offer_summary"]
        self.assertTrue(offer_summary["price_negotiable"])
        self.assertEqual(offer_summary["price_currency"], "")

    def test_accept_request_changes_status(self):
        self.client.force_authenticate(user=self.requester)
        created = self.client.post(
            f"{self.base}/skill-requests/", {"offer_id": self.offer.id}, format="json"
        )
        req_id = created.data["id"]

        self.client.force_authenticate(user=self.owner)
        upd = self.client.patch(
            f"{self.base}/skill-requests/{req_id}/", {"action": "accept"}, format="json"
        )
        self.assertEqual(upd.status_code, status.HTTP_200_OK)
        self.assertEqual(upd.data["status"], "accepted")

    def test_accept_request_returns_direct_conversation_id(self):
        self.client.force_authenticate(user=self.requester)
        created = self.client.post(
            f"{self.base}/skill-requests/", {"offer_id": self.offer.id}, format="json"
        )
        req_id = created.data["id"]

        self.client.force_authenticate(user=self.owner)
        upd = self.client.patch(
            f"{self.base}/skill-requests/{req_id}/", {"action": "accept"}, format="json"
        )

        self.assertEqual(upd.status_code, status.HTTP_200_OK)
        conversation_id = upd.data.get("conversation_id")
        self.assertIsInstance(conversation_id, int)
        self.assertTrue(upd.data.get("conversation_created"))

        conversation = Conversation.objects.get(id=conversation_id)
        self.assertFalse(conversation.is_group)
        self.assertEqual(conversation.request_status, Conversation.RequestStatus.ACCEPTED)
        self.assertEqual(
            set(conversation.participants.values_list("user_id", flat=True)),
            {self.owner.id, self.requester.id},
        )

    def test_mark_all_read_resets_unread_count(self):
        self.client.force_authenticate(user=self.requester)
        self.client.post(
            f"{self.base}/skill-requests/", {"offer_id": self.offer.id}, format="json"
        )

        self.client.force_authenticate(user=self.owner)
        self.client.post(
            f"{self.base}/notifications/mark-all-read/",
            {"type": "skill_request"},
            format="json",
        )
        c = self.client.get(
            f"{self.base}/notifications/unread-count/", {"type": "skill_request"}
        )
        self.assertEqual(c.data.get("count"), 0)

    def test_mark_single_notification_read_updates_only_that_notification(self):
        first = Notification.objects.create(
            user=self.owner,
            type=NotificationType.REVIEW_CREATED,
            actor=self.requester,
            is_read=False,
        )
        second = Notification.objects.create(
            user=self.owner,
            type=NotificationType.REVIEW_CREATED,
            actor=self.requester,
            is_read=False,
        )

        self.client.force_authenticate(user=self.owner)
        url = f"{self.base}/notifications/{first.id}/mark-read/"
        response = self.client.post(url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("id"), first.id)
        self.assertEqual(response.data.get("unread_count"), 1)
        first.refresh_from_db()
        second.refresh_from_db()
        self.assertTrue(first.is_read)
        self.assertIsNotNone(first.read_at)
        self.assertFalse(second.is_read)

    def test_mark_single_notification_read_cannot_update_foreign_notification(self):
        notification = Notification.objects.create(
            user=self.requester,
            type=NotificationType.REVIEW_CREATED,
            actor=self.owner,
            is_read=False,
        )

        self.client.force_authenticate(user=self.owner)
        url = f"{self.base}/notifications/{notification.id}/mark-read/"
        response = self.client.post(url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        notification.refresh_from_db()
        self.assertFalse(notification.is_read)

    def test_mark_single_notification_read_can_be_called_repeatedly(self):
        read_at = timezone.now()
        notification = Notification.objects.create(
            user=self.owner,
            type=NotificationType.REVIEW_CREATED,
            actor=self.requester,
            is_read=True,
            read_at=read_at,
        )

        self.client.force_authenticate(user=self.owner)
        url = f"{self.base}/notifications/{notification.id}/mark-read/"
        response = self.client.post(url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("unread_count"), 0)
        notification.refresh_from_db()
        self.assertTrue(notification.is_read)
        self.assertEqual(notification.read_at, read_at)

    def test_accept_request_creates_accepted_notification_for_requester(self):
        self.client.force_authenticate(user=self.requester)
        created = self.client.post(
            f"{self.base}/skill-requests/", {"offer_id": self.offer.id}, format="json"
        )
        req_id = created.data["id"]

        self.assertEqual(Notification.objects.filter(skill_request_id=req_id).count(), 1)
        self.assertTrue(Notification.objects.filter(type=NotificationType.SKILL_REQUEST).exists())

        self.client.force_authenticate(user=self.owner)
        with self.captureOnCommitCallbacks(execute=True):
            upd = self.client.patch(
                f"{self.base}/skill-requests/{req_id}/", {"action": "accept"}, format="json"
            )

        self.assertEqual(upd.status_code, status.HTTP_200_OK)
        self.assertEqual(Notification.objects.filter(skill_request_id=req_id).count(), 2)
        accepted = Notification.objects.get(
            skill_request_id=req_id,
            type=NotificationType.SKILL_REQUEST_ACCEPTED,
        )
        self.assertEqual(accepted.user_id, self.requester.id)
        self.assertEqual(accepted.actor_id, self.owner.id)
        self.assertEqual(accepted.data.get("skill_request_id"), req_id)
        self.assertEqual(accepted.data.get("offer_id"), self.offer.id)
        self.assertEqual(accepted.data.get("accepted_by_user_id"), self.owner.id)
        self.assertFalse(Notification.objects.filter(type=NotificationType.SKILL_REQUEST_REJECTED).exists())
        self.assertFalse(Notification.objects.filter(type=NotificationType.SKILL_REQUEST_CANCELLED).exists())

        self.client.force_authenticate(user=self.requester)
        feed = self.client.get(f"{self.base}/notifications/", {"type": "all"})
        self.assertEqual(feed.status_code, status.HTTP_200_OK)
        accepted_payload = next(
            item for item in feed.data if item["type"] == NotificationType.SKILL_REQUEST_ACCEPTED
        )
        self.assertEqual(accepted_payload["target_url"], "/dashboard/requests?status=active&tab=sent")

        unread = self.client.get(
            f"{self.base}/notifications/unread-count/", {"type": "all"}
        )
        self.assertEqual(unread.status_code, status.HTTP_200_OK)
        self.assertEqual(unread.data.get("count"), 1)

    def test_request_completion_creates_notification_for_requester(self):
        self.client.force_authenticate(user=self.requester)
        created = self.client.post(
            f"{self.base}/skill-requests/", {"offer_id": self.offer.id}, format="json"
        )
        req_id = created.data["id"]

        self.client.force_authenticate(user=self.owner)
        accepted = self.client.patch(
            f"{self.base}/skill-requests/{req_id}/",
            {"action": "accept"},
            format="json",
        )
        self.assertEqual(accepted.status_code, status.HTTP_200_OK)
        self.assertEqual(accepted.data["status"], "accepted")

        with self.captureOnCommitCallbacks(execute=True):
            completion = self.client.post(
                f"{self.base}/skill-requests/{req_id}/request-completion/",
                {},
                format="json",
            )

        self.assertEqual(completion.status_code, status.HTTP_200_OK)
        self.assertEqual(completion.data["status"], "completion_requested")

        notification = Notification.objects.get(
            skill_request_id=req_id,
            type=NotificationType.SKILL_REQUEST_COMPLETION_REQUESTED,
        )
        self.assertEqual(notification.user_id, self.requester.id)
        self.assertEqual(notification.actor_id, self.owner.id)
        self.assertEqual(notification.data.get("skill_request_id"), req_id)
        self.assertEqual(notification.data.get("offer_id"), self.offer.id)
        self.assertEqual(notification.data.get("completed_by_user_id"), self.owner.id)

        self.client.force_authenticate(user=self.requester)
        feed = self.client.get(f"{self.base}/notifications/", {"type": "all"})
        self.assertEqual(feed.status_code, status.HTTP_200_OK)
        payload = next(
            item
            for item in feed.data
            if item["type"] == NotificationType.SKILL_REQUEST_COMPLETION_REQUESTED
        )
        self.assertEqual(payload["target_url"], "/dashboard/requests?status=active&tab=sent")

    def test_request_completion_repairs_missing_notification_without_duplicate(self):
        skill_request = SkillRequest.objects.create(
            requester=self.requester,
            recipient=self.owner,
            offer=self.offer,
            status="completion_requested",
        )

        self.client.force_authenticate(user=self.owner)
        with self.captureOnCommitCallbacks(execute=True):
            repaired = self.client.post(
                f"{self.base}/skill-requests/{skill_request.id}/request-completion/",
                {},
                format="json",
            )

        self.assertEqual(repaired.status_code, status.HTTP_200_OK)
        self.assertEqual(repaired.data["status"], "completion_requested")
        self.assertEqual(
            Notification.objects.filter(
                skill_request=skill_request,
                type=NotificationType.SKILL_REQUEST_COMPLETION_REQUESTED,
                user=self.requester,
            ).count(),
            1,
        )

        with self.captureOnCommitCallbacks(execute=True):
            repeated = self.client.post(
                f"{self.base}/skill-requests/{skill_request.id}/request-completion/",
                {},
                format="json",
            )

        self.assertEqual(repeated.status_code, status.HTTP_200_OK)
        self.assertEqual(
            Notification.objects.filter(
                skill_request=skill_request,
                type=NotificationType.SKILL_REQUEST_COMPLETION_REQUESTED,
                user=self.requester,
            ).count(),
            1,
        )

    def test_confirm_completion_creates_completed_notification_for_waiting_user(self):
        self.client.force_authenticate(user=self.requester)
        created = self.client.post(
            f"{self.base}/skill-requests/", {"offer_id": self.offer.id}, format="json"
        )
        req_id = created.data["id"]

        self.client.force_authenticate(user=self.owner)
        accepted = self.client.patch(
            f"{self.base}/skill-requests/{req_id}/",
            {"action": "accept"},
            format="json",
        )
        self.assertEqual(accepted.status_code, status.HTTP_200_OK)

        with self.captureOnCommitCallbacks(execute=True):
            requested_completion = self.client.post(
                f"{self.base}/skill-requests/{req_id}/request-completion/",
                {},
                format="json",
            )
        self.assertEqual(requested_completion.status_code, status.HTTP_200_OK)
        self.assertEqual(requested_completion.data["status"], "completion_requested")

        self.client.force_authenticate(user=self.requester)
        with self.captureOnCommitCallbacks(execute=True):
            confirmed = self.client.post(
                f"{self.base}/skill-requests/{req_id}/confirm-completion/",
                {},
                format="json",
            )

        self.assertEqual(confirmed.status_code, status.HTTP_200_OK)
        self.assertEqual(confirmed.data["status"], "completed")

        notification = Notification.objects.get(
            skill_request_id=req_id,
            type=NotificationType.SKILL_REQUEST_COMPLETED,
        )
        self.assertEqual(notification.user_id, self.owner.id)
        self.assertEqual(notification.actor_id, self.requester.id)
        self.assertEqual(notification.data.get("skill_request_id"), req_id)
        self.assertEqual(notification.data.get("offer_id"), self.offer.id)
        self.assertEqual(notification.data.get("confirmed_by_user_id"), self.requester.id)

        self.client.force_authenticate(user=self.owner)
        feed = self.client.get(f"{self.base}/notifications/", {"type": "all"})
        self.assertEqual(feed.status_code, status.HTTP_200_OK)
        payload = next(
            item
            for item in feed.data
            if item["type"] == NotificationType.SKILL_REQUEST_COMPLETED
        )
        self.assertEqual(
            payload["target_url"],
            "/dashboard/requests?status=completed&tab=received",
        )

    def test_create_request_logs_notification_failure_but_preserves_request(self):
        self.client.force_authenticate(user=self.requester)

        with patch("accounts.views.skill_requests.Notification.objects.create", side_effect=RuntimeError("boom")), patch(
            "accounts.views.skill_requests.logger.exception"
        ) as mocked_log:
            response = self.client.post(
                f"{self.base}/skill-requests/", {"offer_id": self.offer.id}, format="json"
            )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(SkillRequest.objects.count(), 1)
        self.assertEqual(Notification.objects.count(), 0)
        mocked_log.assert_called_once()
