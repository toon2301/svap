import pytest
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status


User = get_user_model()


@pytest.mark.django_db
class TestProfileDrafts(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='jane', email='jane@example.com', password='StrongPass123', is_verified=True
        )
        self.client.force_authenticate(user=self.user)

    def test_save_get_clear_draft(self):
        # save
        url_save = reverse('accounts:save_draft')
        payload = {'draft_type': 'profile', 'bio': 'Hello world'}
        r = self.client.post(url_save, payload, format='json')
        assert r.status_code == status.HTTP_200_OK

        # get
        url_get = reverse('accounts:get_draft', kwargs={'draft_type': 'profile'})
        r = self.client.get(url_get)
        assert r.status_code == status.HTTP_200_OK
        assert r.data['status'] == 'draft_found'

        # clear
        url_clear = reverse('accounts:clear_draft', kwargs={'draft_type': 'profile'})
        r = self.client.delete(url_clear)
        assert r.status_code == status.HTTP_200_OK

        # get after clear
        r = self.client.get(url_get)
        assert r.status_code == status.HTTP_404_NOT_FOUND

