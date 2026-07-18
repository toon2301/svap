from urllib.parse import urlsplit
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import UserBlock
from accounts.services.user_blocks import user_block_exists_between

User = get_user_model()


class UserBlocksApiTests(APITestCase):
    def setUp(self):
        self.owner = self.create_user("block-owner")
        self.target = self.create_user("block-target")
        self.other = self.create_user("block-other")

    @staticmethod
    def create_user(username, **overrides):
        defaults = {
            "email": f"{username}@example.com",
            "password": "testpass123",
            "first_name": username,
            "user_type": "individual",
            "is_public": True,
        }
        defaults.update(overrides)
        return User.objects.create_user(username=username, **defaults)

    def detail_url(self, user):
        return reverse("accounts:user_block_detail", args=[user.id])

    def test_endpoints_require_authentication(self):
        list_response = self.client.get(reverse("accounts:blocked_users"))
        create_response = self.client.post(self.detail_url(self.target))
        delete_response = self.client.delete(self.detail_url(self.target))

        self.assertEqual(list_response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(create_response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(delete_response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_is_idempotent(self):
        self.client.force_authenticate(user=self.owner)

        first = self.client.post(self.detail_url(self.target))
        second = self.client.post(self.detail_url(self.target))

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertTrue(first.data["created"])
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertFalse(second.data["created"])
        self.assertEqual(
            UserBlock.objects.filter(
                blocker=self.owner,
                blocked_user=self.target,
            ).count(),
            1,
        )

    def test_private_active_user_can_be_blocked(self):
        self.target.is_public = False
        self.target.save(update_fields=["is_public"])
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(self.detail_url(self.target))

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            UserBlock.objects.filter(
                blocker=self.owner,
                blocked_user=self.target,
            ).exists()
        )

    def test_self_inactive_missing_and_staff_targets_are_rejected(self):
        inactive = self.create_user("block-inactive", is_active=False)
        staff = self.create_user("block-staff", is_staff=True)
        self.client.force_authenticate(user=self.owner)

        self_response = self.client.post(self.detail_url(self.owner))
        inactive_response = self.client.post(self.detail_url(inactive))
        staff_response = self.client.post(self.detail_url(staff))
        missing_response = self.client.post(
            reverse("accounts:user_block_detail", args=[999999])
        )

        self.assertEqual(self_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self_response.data["error"], "cannot_block_self")
        for response in (inactive_response, staff_response, missing_response):
            self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
            self.assertEqual(response.data["error"], "user_not_found")
        self.assertFalse(UserBlock.objects.exists())

    def test_existing_block_remains_idempotent_if_target_becomes_inactive(self):
        UserBlock.objects.create(blocker=self.owner, blocked_user=self.target)
        self.target.is_active = False
        self.target.save(update_fields=["is_active"])
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(self.detail_url(self.target))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["created"])

    def test_delete_is_idempotent_and_does_not_delete_reverse_block(self):
        UserBlock.objects.create(blocker=self.owner, blocked_user=self.target)
        reverse_block = UserBlock.objects.create(
            blocker=self.target,
            blocked_user=self.owner,
        )
        self.client.force_authenticate(user=self.owner)

        first = self.client.delete(self.detail_url(self.target))
        second = self.client.delete(self.detail_url(self.target))

        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertTrue(first.data["deleted"])
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertFalse(second.data["deleted"])
        self.assertTrue(UserBlock.objects.filter(pk=reverse_block.pk).exists())

    def test_delete_locks_the_user_pair_before_unblocking(self):
        UserBlock.objects.create(blocker=self.owner, blocked_user=self.target)
        self.client.force_authenticate(user=self.owner)

        with patch(
            "accounts.services.user_blocks.lock_user_pair_for_update"
        ) as lock_pair:
            response = self.client.delete(self.detail_url(self.target))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        lock_pair.assert_called_once_with(
            first_user_id=self.owner.id,
            second_user_id=self.target.id,
        )
        self.assertFalse(UserBlock.objects.exists())

    def test_list_contains_only_callers_outgoing_blocks(self):
        UserBlock.objects.create(blocker=self.owner, blocked_user=self.target)
        UserBlock.objects.create(blocker=self.other, blocked_user=self.owner)
        UserBlock.objects.create(blocker=self.other, blocked_user=self.target)
        self.client.force_authenticate(user=self.owner)

        response = self.client.get(reverse("accounts:blocked_users"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["id"], self.target.id)
        self.assertNotIn(self.other.id, [item["id"] for item in response.data["results"]])

    def test_list_redacts_unavailable_target_but_allows_unblock(self):
        UserBlock.objects.create(blocker=self.owner, blocked_user=self.target)
        self.target.is_active = False
        self.target.save(update_fields=["is_active"])
        self.client.force_authenticate(user=self.owner)

        response = self.client.get(reverse("accounts:blocked_users"))
        item = response.data["results"][0]

        self.assertEqual(item["id"], self.target.id)
        self.assertFalse(item["is_available"])
        self.assertIsNone(item["username"])
        self.assertIsNone(item["display_name"])
        self.assertIsNone(item["avatar_url"])

        delete_response = self.client.delete(self.detail_url(self.target))
        self.assertEqual(delete_response.status_code, status.HTTP_200_OK)
        self.assertFalse(UserBlock.objects.exists())

    def test_list_uses_cursor_pagination(self):
        targets = [self.create_user(f"blocked-{index}") for index in range(22)]
        UserBlock.objects.bulk_create(
            [UserBlock(blocker=self.owner, blocked_user=user) for user in targets]
        )
        self.client.force_authenticate(user=self.owner)

        first_page = self.client.get(reverse("accounts:blocked_users"))

        self.assertEqual(first_page.status_code, status.HTTP_200_OK)
        self.assertEqual(len(first_page.data["results"]), 20)
        self.assertIsNotNone(first_page.data["next"])
        self.assertIsNone(first_page.data["previous"])

        next_url = urlsplit(first_page.data["next"])
        second_page = self.client.get(f"{next_url.path}?{next_url.query}")
        self.assertEqual(second_page.status_code, status.HTTP_200_OK)
        self.assertEqual(len(second_page.data["results"]), 2)
        self.assertIsNone(second_page.data["next"])
        self.assertIsNotNone(second_page.data["previous"])

        all_ids = {
            item["id"]
            for item in first_page.data["results"] + second_page.data["results"]
        }
        self.assertEqual(all_ids, {user.id for user in targets})

    def test_database_constraints_reject_duplicate_and_self_block(self):
        UserBlock.objects.create(blocker=self.owner, blocked_user=self.target)

        with self.assertRaises(IntegrityError), transaction.atomic():
            UserBlock.objects.create(blocker=self.owner, blocked_user=self.target)

        with self.assertRaises(IntegrityError), transaction.atomic():
            UserBlock.objects.create(blocker=self.owner, blocked_user=self.owner)

    def test_service_checks_blocks_in_both_directions(self):
        self.assertFalse(
            user_block_exists_between(
                first_user_id=self.owner.id,
                second_user_id=self.target.id,
            )
        )
        UserBlock.objects.create(blocker=self.target, blocked_user=self.owner)

        self.assertTrue(
            user_block_exists_between(
                first_user_id=self.owner.id,
                second_user_id=self.target.id,
            )
        )
        self.assertFalse(
            user_block_exists_between(
                first_user_id=self.owner.id,
                second_user_id=self.owner.id,
            )
        )
