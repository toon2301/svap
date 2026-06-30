"""
Konzistencia viditeľnosti používateľov vo vyhľadávaní (BOD 4 auditu).

Overuje, že naprieč VŠETKÝMI vyhľadávacími vetvami (verejný search, global
search – users aj offers, dashboard search – skills aj users, recommendations)
platí ten istý filter:
  - neaktívni (zabanovaní/anonymizovaní) používatelia sú vylúčení,
  - staff/superuser účty sú vylúčené,
  - verejní aktívni bežní používatelia sú zahrnutí,
  - vlastný (aj neverejný) profil ostáva pre prihláseného viditeľný v dashboarde.
"""

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from accounts.models import DashboardSkillSearchProjection, OfferedSkill

User = get_user_model()

TOKEN = "Findme"


class SearchVisibilityTestCase(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

        # Prihlásený "hľadač" – bežný aktívny verejný používateľ bez zhody na TOKEN.
        self.viewer = User.objects.create_user(
            username="viewer",
            email="viewer@example.com",
            password="x",
            first_name="Viewer",
            is_public=True,
        )

        self.normal = self._make_user_with_offer("normal")
        self.staff = self._make_user_with_offer("staff", is_staff=True)
        self.superuser = self._make_user_with_offer("super", is_superuser=True)
        # "Zabanovaný" po vytvorení ponuky: ponuka aj projekcia vzniknú ako aktívne,
        # potom účet deaktivujeme (User.save() re-synchronizuje projekciu).
        self.banned = self._make_user_with_offer("banned")
        self.banned.is_active = False
        self.banned.save()

    def _make_user_with_offer(self, key, *, is_staff=False, is_superuser=False):
        user = User.objects.create_user(
            username=f"user_{key}",
            email=f"{key}@example.com",
            password="x",
            first_name=TOKEN,
            is_public=True,
        )
        if is_staff or is_superuser:
            user.is_staff = is_staff
            user.is_superuser = is_superuser
            user.save()
        OfferedSkill.objects.create(
            user=user,
            category=TOKEN,
            subcategory="x",
            description="popis",
        )
        return user

    # ---- helpers ----------------------------------------------------------

    def _auth(self):
        self.client.force_authenticate(user=self.viewer)

    def _owner_ids_from_offers(self, offers):
        return {o.get("user_id") for o in offers}

    # ---- projekcia ---------------------------------------------------------

    def test_projection_flags_are_denormalized(self):
        staff_proj = DashboardSkillSearchProjection.objects.get(user=self.staff)
        self.assertTrue(staff_proj.user_is_staff)
        banned_proj = DashboardSkillSearchProjection.objects.get(user=self.banned)
        self.assertFalse(banned_proj.user_is_active)
        normal_proj = DashboardSkillSearchProjection.objects.get(user=self.normal)
        self.assertTrue(normal_proj.user_is_active)
        self.assertFalse(normal_proj.user_is_staff)

    # ---- verejný search (offers) ------------------------------------------

    def test_public_search_excludes_staff_super_inactive(self):
        url = reverse("accounts:search")
        resp = self.client.get(url, {"q": TOKEN})
        self.assertEqual(resp.status_code, 200)
        owner_ids = self._owner_ids_from_offers(resp.data["results"])
        self.assertIn(self.normal.id, owner_ids)
        self.assertNotIn(self.staff.id, owner_ids)
        self.assertNotIn(self.superuser.id, owner_ids)
        self.assertNotIn(self.banned.id, owner_ids)

    # ---- global search (users + offers) -----------------------------------

    def test_global_search_users_and_offers_filtered(self):
        url = reverse("accounts:search_global")
        resp = self.client.get(url, {"q": TOKEN})
        self.assertEqual(resp.status_code, 200)

        user_ids = {u["id"] for u in resp.data["users"]}
        self.assertIn(self.normal.id, user_ids)
        self.assertNotIn(self.staff.id, user_ids)
        self.assertNotIn(self.superuser.id, user_ids)
        self.assertNotIn(self.banned.id, user_ids)

        owner_ids = self._owner_ids_from_offers(resp.data["offers"])
        self.assertIn(self.normal.id, owner_ids)
        self.assertNotIn(self.staff.id, owner_ids)
        self.assertNotIn(self.superuser.id, owner_ids)
        self.assertNotIn(self.banned.id, owner_ids)

    # ---- dashboard search (skills + users) --------------------------------

    def test_dashboard_search_skills_filtered(self):
        self._auth()
        url = reverse("accounts:dashboard_search")
        resp = self.client.get(url, {"q": TOKEN})
        self.assertEqual(resp.status_code, 200)
        owner_ids = self._owner_ids_from_offers(resp.data["skills"])
        self.assertIn(self.normal.id, owner_ids)
        self.assertNotIn(self.staff.id, owner_ids)
        self.assertNotIn(self.superuser.id, owner_ids)
        self.assertNotIn(self.banned.id, owner_ids)

    def test_dashboard_search_users_filtered(self):
        self._auth()
        url = reverse("accounts:dashboard_search")
        resp = self.client.get(url, {"q": TOKEN})
        self.assertEqual(resp.status_code, 200)
        user_ids = {u["id"] for u in resp.data["users"]}
        self.assertIn(self.normal.id, user_ids)
        self.assertNotIn(self.staff.id, user_ids)
        self.assertNotIn(self.superuser.id, user_ids)
        self.assertNotIn(self.banned.id, user_ids)

    def test_dashboard_search_shows_own_private_profile(self):
        """Vlastný neverejný profil musí ostať viditeľný (regresný strážca)."""
        self.viewer.first_name = TOKEN
        self.viewer.is_public = False
        self.viewer.save()
        self._auth()
        url = reverse("accounts:dashboard_search")
        resp = self.client.get(url, {"q": TOKEN})
        self.assertEqual(resp.status_code, 200)
        user_ids = {u["id"] for u in resp.data["users"]}
        self.assertIn(self.viewer.id, user_ids)

    # ---- recommendations ---------------------------------------------------

    def test_recommendations_exclude_staff_super_inactive(self):
        self._auth()
        url = reverse("accounts:dashboard_search_recommendations")
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        owner_ids = self._owner_ids_from_offers(resp.data["skills"])
        self.assertIn(self.normal.id, owner_ids)
        self.assertNotIn(self.staff.id, owner_ids)
        self.assertNotIn(self.superuser.id, owner_ids)
        self.assertNotIn(self.banned.id, owner_ids)
