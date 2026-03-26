import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from factory import Faker
from factory.django import DjangoModelFactory

from accounts.models import UserType, OfferedSkill, SkillRequest, SkillRequestStatus

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
class TestSkillRequestsNoDuplicateActive(APITestCase):
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

    def test_user_cannot_create_second_active_request_for_same_offer(self):
        self.client.force_authenticate(user=self.requester)

        r1 = self.client.post(
            f"{self.base}/skill-requests/", {"offer_id": self.offer.id}, format="json"
        )
        self.assertEqual(r1.status_code, status.HTTP_201_CREATED)
        first_id = r1.data["id"]

        r2 = self.client.post(
            f"{self.base}/skill-requests/", {"offer_id": self.offer.id}, format="json"
        )
        self.assertEqual(r2.status_code, status.HTTP_200_OK)
        self.assertEqual(r2.data["id"], first_id)

        self.assertEqual(
            SkillRequest.objects.filter(requester=self.requester, offer=self.offer).count(),
            1,
        )
        obj = SkillRequest.objects.get(requester=self.requester, offer=self.offer)
        self.assertIn(obj.status, {SkillRequestStatus.PENDING, SkillRequestStatus.ACCEPTED, SkillRequestStatus.COMPLETION_REQUESTED})

    def test_user_can_send_again_after_completed_by_reopening_to_pending(self):
        self.client.force_authenticate(user=self.requester)
        created = self.client.post(
            f"{self.base}/skill-requests/", {"offer_id": self.offer.id}, format="json"
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        req_id = created.data["id"]

        # Simuluj ukončenie (completed)
        SkillRequest.objects.filter(id=req_id).update(status=SkillRequestStatus.COMPLETED)

        again = self.client.post(
            f"{self.base}/skill-requests/", {"offer_id": self.offer.id}, format="json"
        )
        self.assertEqual(again.status_code, status.HTTP_200_OK)
        self.assertEqual(again.data["id"], req_id)
        self.assertEqual(again.data["status"], SkillRequestStatus.PENDING)

