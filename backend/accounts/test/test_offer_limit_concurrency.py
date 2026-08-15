"""Limit troch kariet musí platiť aj pri súbežných POST requestoch.

Duplicitu (rovnaká kategória + podkategória) kryje UniqueConstraint, takže
race na nej skončí IntegrityError-om a zachytí sa. Limit troch kariet na typ
však žiadny DB constraint nevynucuje – drží ho iba kontrola vo view, a tá bez
zámku beží nad stavom, ktorý medzitým zmenil súbežný request.
"""

import threading
from unittest import mock

from django.contrib.auth import get_user_model
from django.db import connection, connections
from django.test import TransactionTestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import OfferedSkill

User = get_user_model()


def _payload(subcategory: str, *, is_seeking: bool = False) -> dict:
    return {
        "category": "IT",
        "subcategory": subcategory,
        "description": "Popis karty",
        "is_seeking": is_seeking,
        "country_code": "SK",
        "district_code": "nitra",
        "district": "Nitra",
        "location": "Nitra",
    }


class OfferLimitConcurrencyTests(TransactionTestCase):
    """TransactionTestCase, nie TestCase.

    Vlákna potrebujú vidieť naozaj commitnuté dáta; TestCase drží všetko v
    jednej neuzavretej transakcii, takže by druhé vlákno prvú kartu nevidelo
    a test by nemeral nič.
    """

    reset_sequences = True

    def setUp(self):
        self.user = User.objects.create_user(
            username="limit-race",
            email="limit-race@example.com",
            password="StrongPass123",
            is_public=True,
        )
        self.url = reverse("accounts:skills_list")

    def _post_in_thread(self, subcategory: str, results: list):
        client = APIClient()
        client.force_authenticate(user=self.user)
        try:
            response = client.post(self.url, _payload(subcategory), format="json")
            results.append(response.status_code)
        finally:
            # Vlákno si otvorí vlastné spojenie – bez zatvorenia ostane visieť.
            connections.close_all()

    def test_two_parallel_posts_cannot_exceed_the_three_card_limit(self):
        if not connection.features.has_select_for_update:
            self.skipTest("Backend nepodporuje select_for_update.")

        # Dve karty už existujú → súbežné requesty smú dohromady pridať jednu.
        for index in range(2):
            OfferedSkill.objects.create(
                user=self.user,
                category="IT",
                subcategory=f"Existujuca {index}",
                description="Popis",
                is_seeking=False,
            )

        results: list = []
        threads = [
            threading.Thread(target=self._post_in_thread, args=(f"Nova {i}", results))
            for i in range(2)
        ]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=30)

        self.assertEqual(len(results), 2, f"Requesty nedobehli: {results}")
        self.assertEqual(
            OfferedSkill.objects.filter(user=self.user, is_seeking=False).count(),
            3,
            "Limit troch kariet sa dal prekročiť súbežnými requestmi.",
        )
        self.assertEqual(sorted(results), [status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST])

    def test_limit_is_rechecked_after_the_lock_is_taken(self):
        """Deterministická obdoba predošlého testu – beží na každom backende.

        Threadový test sa na SQLite preskočí (nemá select_for_update), takže
        sám by opravu v tomto prostredí nepokryl. Tu sa súbeh nasimuluje:
        počas zamykania „dobehne" konkurenčný request a pridá tretiu kartu.
        Kým kontrola limitu bežala PRED zámkom, počet sa načítal skôr a
        request by prešiel – vznikla by štvrtá karta.
        """
        for index in range(2):
            OfferedSkill.objects.create(
                user=self.user,
                category="IT",
                subcategory=f"Existujuca {index}",
                description="Popis",
                is_seeking=False,
            )

        def lock_and_let_a_competitor_through(**kwargs):
            OfferedSkill.objects.create(
                user=self.user,
                category="IT",
                subcategory="Od konkurencneho requestu",
                description="Popis",
                is_seeking=False,
            )

        client = APIClient()
        client.force_authenticate(user=self.user)
        with mock.patch(
            "accounts.views.skills.lock_users_for_update",
            side_effect=lock_and_let_a_competitor_through,
        ) as locked:
            response = client.post(self.url, _payload("Nova"), format="json")

        locked.assert_called_once_with(user_ids=(self.user.id,))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            OfferedSkill.objects.filter(user=self.user, is_seeking=False).count(), 3
        )

    def test_limit_is_per_type(self):
        """Zámok nesmie zamedziť legitímnej karte druhého typu."""
        for index in range(3):
            OfferedSkill.objects.create(
                user=self.user,
                category="IT",
                subcategory=f"Ponukam {index}",
                description="Popis",
                is_seeking=False,
            )

        client = APIClient()
        client.force_authenticate(user=self.user)
        response = client.post(
            self.url, _payload("Hladam nieco", is_seeking=True), format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
