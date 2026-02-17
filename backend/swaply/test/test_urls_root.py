from django.test import TestCase
from django.urls import reverse


class TestApiRoot(TestCase):
    def test_api_root(self):
        response = self.client.get(reverse("api_root"))
        assert response.status_code == 200
        data = response.json()
        assert "endpoints" in data
