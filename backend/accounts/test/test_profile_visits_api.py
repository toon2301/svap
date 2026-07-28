"""Fáza 4.1 – testy zápisu návštev pri otvorení cudzieho profilu.

Zápisový bod: dashboard_user_profile_detail_view a jeho slug-varianta, presne
za _enforce_public_or_owner, len pre cudzí (viditeľný) profil.
"""

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import ProfileVisit

User = get_user_model()


class ProfileVisitApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="pv-owner",
            email="pv-owner@example.com",
            password="testpass123",
            first_name="Profile",
            last_name="Owner",
            user_type="individual",
            is_public=True,
            slug="pv-owner",
        )
        self.visitor = User.objects.create_user(
            username="pv-visitor",
            email="pv-visitor@example.com",
            password="testpass123",
            first_name="Profile",
            last_name="Visitor",
            user_type="individual",
            is_public=True,
            slug="pv-visitor",
        )

    def _detail_url_by_id(self, user):
        return reverse("accounts:dashboard_user_profile_detail", args=[user.id])

    def _detail_url_by_slug(self, user):
        return reverse(
            "accounts:dashboard_user_profile_detail_by_slug", args=[user.slug]
        )

    def test_visiting_foreign_profile_records_visit(self):
        self.client.force_authenticate(user=self.visitor)
        resp = self.client.get(self._detail_url_by_id(self.owner))

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(
            ProfileVisit.objects.filter(
                profile_user=self.owner, viewer=self.visitor
            ).count(),
            1,
        )

    def test_repeated_visit_same_day_does_not_duplicate(self):
        self.client.force_authenticate(user=self.visitor)
        url = self._detail_url_by_id(self.owner)

        self.client.get(url)
        self.client.get(url)
        self.client.get(url)

        self.assertEqual(
            ProfileVisit.objects.filter(
                profile_user=self.owner, viewer=self.visitor
            ).count(),
            1,
        )

    def test_visiting_own_profile_records_nothing(self):
        self.client.force_authenticate(user=self.owner)
        resp = self.client.get(self._detail_url_by_id(self.owner))

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(ProfileVisit.objects.count(), 0)

    def test_visiting_private_foreign_profile_records_nothing(self):
        private = User.objects.create_user(
            username="pv-private",
            email="pv-private@example.com",
            password="testpass123",
            first_name="Priv",
            last_name="Ate",
            user_type="individual",
            is_public=False,
            slug="pv-private",
        )
        self.client.force_authenticate(user=self.visitor)
        resp = self.client.get(self._detail_url_by_id(private))

        # Súkromný cudzí profil je pre viewera neviditeľný (404) → žiadny záznam.
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(ProfileVisit.objects.count(), 0)

    def test_slug_variant_also_records_visit(self):
        self.client.force_authenticate(user=self.visitor)
        resp = self.client.get(self._detail_url_by_slug(self.owner))

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(
            ProfileVisit.objects.filter(
                profile_user=self.owner, viewer=self.visitor
            ).count(),
            1,
        )

    def test_id_and_slug_same_day_share_single_record(self):
        # Rovnaký viewer, rovnaký profil, ten istý deň, dva rôzne endpointy →
        # stále len jeden záznam (unique per day).
        self.client.force_authenticate(user=self.visitor)
        self.client.get(self._detail_url_by_id(self.owner))
        self.client.get(self._detail_url_by_slug(self.owner))

        self.assertEqual(
            ProfileVisit.objects.filter(
                profile_user=self.owner, viewer=self.visitor
            ).count(),
            1,
        )
