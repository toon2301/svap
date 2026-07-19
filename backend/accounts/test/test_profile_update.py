import pytest
from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse


User = get_user_model()


@pytest.mark.django_db
class TestProfileUpdate(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="peter",
            email="peter@example.com",
            password="StrongPass123",
            is_verified=True,
        )
        self.client.force_authenticate(user=self.user)

    def test_update_profile_patch(self):
        url = reverse("accounts:update_profile")
        payload = {"first_name": "Peter", "last_name": "Parker", "bio": "Photographer"}
        r = self.client.patch(url, payload, format="json")
        assert r.status_code == status.HTTP_200_OK
        assert r.data["user"]["first_name"] == "Peter"

    def test_bio_only_patch_keeps_name_flag_false_and_avoids_extra_reads(self):
        url = reverse("accounts:update_profile")
        with CaptureQueriesContext(connection) as ctx:
            response = self.client.patch(url, {"bio": "Updated bio"}, format="json")

        assert response.status_code == status.HTTP_200_OK
        self.user.refresh_from_db()
        assert self.user.bio == "Updated bio"
        assert self.user.name_modified_by_user is False
        # PATCH /profile/ vracia plnú "me" odpoveď: SAVEPOINT + UPDATE bio + RELEASE
        # + 3 agregačné counts (dokončené skill-requesty, neprečítané notifikácie,
        # profile likes) = 6 dotazov.
        # Rozpočet stráži, aby sa do write-cesty nepridali ďalšie reads (napr. N+1).
        assert (
            len(ctx.captured_queries) <= 6
        ), f"Expected lean bio-only patch, got {len(ctx.captured_queries)} queries"
