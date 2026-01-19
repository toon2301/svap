import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from factory import Faker
from factory.django import DjangoModelFactory

from accounts.models import UserType, OfferedSkill

User = get_user_model()


class UserFactory(DjangoModelFactory):
    class Meta:
        model = User

    username = Faker('user_name')
    email = Faker('email')
    first_name = Faker('first_name')
    last_name = Faker('last_name')
    user_type = UserType.INDIVIDUAL
    is_active = True


@pytest.mark.django_db
class TestSkillRequestsAndNotifications(APITestCase):
    def setUp(self):
        self.base = '/api/auth'

        self.owner = UserFactory()
        self.owner.set_password('StrongPass123')
        self.owner.is_verified = True
        self.owner.save()

        self.requester = UserFactory()
        self.requester.set_password('StrongPass123')
        self.requester.is_verified = True
        self.requester.save()

        self.offer = OfferedSkill.objects.create(
            user=self.owner,
            category='Šport',
            subcategory='Futbal tréner',
            description='Trénovanie futbalu',
            detailed_description='',
            is_seeking=False,
        )

    def test_create_request_creates_notification_and_unread_count(self):
        self.client.force_authenticate(user=self.requester)
        r = self.client.post(f'{self.base}/skill-requests/', {'offer_id': self.offer.id}, format='json')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data['offer'], self.offer.id)
        self.assertEqual(r.data['recipient'], self.owner.id)
        self.assertEqual(r.data['requester'], self.requester.id)

        # owner sees unread count 1
        self.client.force_authenticate(user=self.owner)
        c = self.client.get(f'{self.base}/notifications/unread-count/', {'type': 'skill_request'})
        self.assertEqual(c.status_code, status.HTTP_200_OK)
        self.assertEqual(c.data.get('count'), 1)

    def test_list_requests_received_and_sent(self):
        self.client.force_authenticate(user=self.requester)
        self.client.post(f'{self.base}/skill-requests/', {'offer_id': self.offer.id}, format='json')

        self.client.force_authenticate(user=self.owner)
        r_owner = self.client.get(f'{self.base}/skill-requests/')
        self.assertEqual(r_owner.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r_owner.data.get('received', [])), 1)

        self.client.force_authenticate(user=self.requester)
        r_req = self.client.get(f'{self.base}/skill-requests/')
        self.assertEqual(r_req.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r_req.data.get('sent', [])), 1)

    def test_accept_request_changes_status(self):
        self.client.force_authenticate(user=self.requester)
        created = self.client.post(f'{self.base}/skill-requests/', {'offer_id': self.offer.id}, format='json')
        req_id = created.data['id']

        self.client.force_authenticate(user=self.owner)
        upd = self.client.patch(f'{self.base}/skill-requests/{req_id}/', {'action': 'accept'}, format='json')
        self.assertEqual(upd.status_code, status.HTTP_200_OK)
        self.assertEqual(upd.data['status'], 'accepted')

    def test_mark_all_read_resets_unread_count(self):
        self.client.force_authenticate(user=self.requester)
        self.client.post(f'{self.base}/skill-requests/', {'offer_id': self.offer.id}, format='json')

        self.client.force_authenticate(user=self.owner)
        self.client.post(f'{self.base}/notifications/mark-all-read/', {'type': 'skill_request'}, format='json')
        c = self.client.get(f'{self.base}/notifications/unread-count/', {'type': 'skill_request'})
        self.assertEqual(c.data.get('count'), 0)


