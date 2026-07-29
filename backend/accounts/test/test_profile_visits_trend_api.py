"""Fáza 4.2 – testy trend endpointu návštev vlastného profilu.

Endpoint: GET accounts:dashboard_profile_visits_trend – vždy len request.user.
"""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from freezegun import freeze_time
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import ProfileVisit
from accounts.views.dashboard_views.profile_visits import PROFILE_VISITS_TREND_DAYS

User = get_user_model()

# Počet položiek v `daily`: presne PROFILE_VISITS_TREND_DAYS kalendárnych dní
# (dnes + predchádzajúcich 89), zarovnané s 90-dňovou retenciou.
EXPECTED_DAILY_LEN = PROFILE_VISITS_TREND_DAYS


class ProfileVisitsTrendApiTests(APITestCase):
    def setUp(self):
        # Zmraz čas na fixný okamih pre CELÝ životný cyklus testu (setUp,
        # vytváranie návštev, request aj asserty). Bez toho by self.today
        # (setUp) a timezone.localdate() vo view mohli spadnúť na dva rôzne dni
        # pri prechode cez lokálnu polnoc → flaky boundary asserty. Poludnie
        # volíme zámerne, aby lokálny deň (Europe/Bratislava) == deň fixného UTC.
        self._freezer = freeze_time("2026-06-15 12:00:00")
        self._freezer.start()
        self.addCleanup(self._freezer.stop)

        self.owner = User.objects.create_user(
            username="pvt-owner",
            email="pvt-owner@example.com",
            password="testpass123",
            first_name="Trend",
            last_name="Owner",
            user_type="individual",
            is_public=True,
            slug="pvt-owner",
        )
        self.url = reverse("accounts:dashboard_profile_visits_trend")
        self.today = timezone.localdate()

    def _visitor(self, n):
        return User.objects.create_user(
            username=f"pvt-visitor-{n}",
            email=f"pvt-visitor-{n}@example.com",
            password="testpass123",
            first_name="Vis",
            last_name=f"Itor{n}",
            user_type="individual",
            is_public=True,
            slug=f"pvt-visitor-{n}",
        )

    def _visit(self, profile, viewer, days_ago):
        return ProfileVisit.objects.create(
            profile_user=profile,
            viewer=viewer,
            visit_date=self.today - timedelta(days=days_ago),
        )

    def _daily_map(self, data):
        return {row["date"]: row["count"] for row in data["daily"]}

    def test_requires_authentication(self):
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_various_days_correct_total_and_daily(self):
        v1, v2, v3 = self._visitor(1), self._visitor(2), self._visitor(3)
        self._visit(self.owner, v1, days_ago=0)  # dnes
        self._visit(self.owner, v2, days_ago=0)  # dnes (iný návštevník)
        self._visit(self.owner, v1, days_ago=5)  # pred 5 dňami
        # najstarší deň v okne (today − 89) -> ešte vnútri
        self._visit(self.owner, v3, days_ago=PROFILE_VISITS_TREND_DAYS - 1)

        self.client.force_authenticate(user=self.owner)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        data = resp.json()
        self.assertEqual(data["total_visits_90d"], 4)
        self.assertEqual(len(data["daily"]), EXPECTED_DAILY_LEN)
        # total zodpovedá súčtu denných countov (konzistencia).
        self.assertEqual(
            data["total_visits_90d"], sum(r["count"] for r in data["daily"])
        )

        by_date = self._daily_map(data)
        self.assertEqual(by_date[self.today.isoformat()], 2)  # 2 unikátni dnes
        self.assertEqual(
            by_date[(self.today - timedelta(days=5)).isoformat()], 1
        )
        self.assertEqual(
            by_date[
                (
                    self.today - timedelta(days=PROFILE_VISITS_TREND_DAYS - 1)
                ).isoformat()
            ],
            1,
        )

    def test_days_without_visits_present_as_zero(self):
        v1 = self._visitor(1)
        self._visit(self.owner, v1, days_ago=3)

        self.client.force_authenticate(user=self.owner)
        data = self.client.get(self.url).json()

        by_date = self._daily_map(data)
        # Deň bez návštevy (napr. včera) je prítomný s count=0, nie preskočený.
        self.assertIn((self.today - timedelta(days=1)).isoformat(), by_date)
        self.assertEqual(by_date[(self.today - timedelta(days=1)).isoformat()], 0)
        # Súvislý rad: prvý deň = today − 89 (najstarší v 90-dňovom okne), posledný = dnes.
        self.assertEqual(
            data["daily"][0]["date"],
            (self.today - timedelta(days=PROFILE_VISITS_TREND_DAYS - 1)).isoformat(),
        )
        self.assertEqual(data["daily"][-1]["date"], self.today.isoformat())

    def test_visits_older_than_window_excluded(self):
        v1 = self._visitor(1)
        # today − 90 je práve MIMO 90-dňového okna (najstarší v okne je today − 89).
        self._visit(self.owner, v1, days_ago=PROFILE_VISITS_TREND_DAYS)

        self.client.force_authenticate(user=self.owner)
        data = self.client.get(self.url).json()

        self.assertEqual(data["total_visits_90d"], 0)
        # Deň mimo okna sa v rade vôbec nenachádza.
        old_day = (
            self.today - timedelta(days=PROFILE_VISITS_TREND_DAYS)
        ).isoformat()
        self.assertNotIn(old_day, self._daily_map(data))

    def test_recent_and_previous_45d_halves(self):
        # 90-dňové okno = predošlá polovica (days_ago 45..89) + posledná polovica
        # (days_ago 0..44). Hranica: days_ago=44 patrí do "recent", days_ago=45
        # do "previous".
        v1, v2, v3, v4 = (
            self._visitor(1),
            self._visitor(2),
            self._visitor(3),
            self._visitor(4),
        )
        self._visit(self.owner, v1, days_ago=0)  # recent
        self._visit(self.owner, v2, days_ago=44)  # recent (hranica)
        self._visit(self.owner, v3, days_ago=45)  # previous (hranica)
        self._visit(self.owner, v4, days_ago=89)  # previous (najstarší v okne)

        self.client.force_authenticate(user=self.owner)
        data = self.client.get(self.url).json()

        self.assertEqual(data["total_visits_recent_45d"], 2)
        self.assertEqual(data["total_visits_previous_45d"], 2)
        # Polovice delia okno → ich súčet == total_90d.
        self.assertEqual(
            data["total_visits_90d"],
            data["total_visits_recent_45d"] + data["total_visits_previous_45d"],
        )
        self.assertEqual(data["total_visits_90d"], 4)

    def test_user_without_visits_gets_full_zero_series(self):
        self.client.force_authenticate(user=self.owner)
        data = self.client.get(self.url).json()

        self.assertEqual(data["total_visits_90d"], 0)
        self.assertEqual(data["total_visits_recent_45d"], 0)
        self.assertEqual(data["total_visits_previous_45d"], 0)
        self.assertEqual(len(data["daily"]), EXPECTED_DAILY_LEN)  # nie prázdny zoznam
        self.assertTrue(all(r["count"] == 0 for r in data["daily"]))

    def test_endpoint_returns_only_own_received_visits(self):
        # Návštevy PRIJATÉ ownerom nesmú vidno inému používateľovi (žiadny user_id
        # param – vždy len request.user).
        v1 = self._visitor(1)
        self._visit(self.owner, v1, days_ago=0)

        other = self._visitor(99)
        self.client.force_authenticate(user=other)
        data = self.client.get(self.url).json()

        self.assertEqual(data["total_visits_90d"], 0)
        self.assertTrue(all(r["count"] == 0 for r in data["daily"]))
