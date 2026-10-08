"""Upozornenie „páči sa mi ponuka“ po zmazaní ponuky.

Ponuka sa maže natvrdo a upozornenia na ňu ostávajú (``data.offer_id`` je len
číslo). Kým cieľ upozornenia nekontroloval existenciu ponuky, klik na staré
upozornenie otvoril profil bez jedinej zvýraznenej karty a bez akejkoľvek
správy. Zoznam preto dostane množinu reálne existujúcich ponúk a pre zmazanú
vráti ``target_url = None`` (appka vtedy ukáže hlášku „obsah už nie je
dostupný“, rovnako ako pri upozornení na sledovanie ponuky). Čerstvé upozornenie
serializované bez zoznamového contextu (realtime) ostáva nezmenené.
"""

import pytest
from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import Notification, NotificationType, OfferedSkill
from accounts.notification_serializers import (
    NotificationSerializer,
    existing_liked_offer_ids,
)

User = get_user_model()


def _user(username):
    """Vytvorí overeného používateľa s daným používateľským menom."""
    return User.objects.create_user(
        username=username,
        email=f"{username}@e.com",
        password="StrongPass123",
        is_verified=True,
    )


def _offer(owner, subcategory):
    """Vytvorí ponuku daného vlastníka (kategória IT, daná podkategória)."""
    return OfferedSkill.objects.create(
        user=owner, category="IT", subcategory=subcategory
    )


def _like_notification(*, recipient, actor, data):
    """Vytvorí upozornenie „páči sa mi ponuka“ pre príjemcu s danými dátami."""
    return Notification.objects.create(
        user=recipient,
        actor=actor,
        type=NotificationType.OFFER_LIKED,
        title="Páči sa mi tvoja ponuka",
        data=data,
    )


@pytest.mark.django_db
class TestExistingLikedOfferIds:
    """Pomocná ``existing_liked_offer_ids``: ktoré ponuky z upozornení existujú."""
    def setup_method(self):
        """Pripraví vlastníka ponúk a používateľa, ktorý ich lajkuje."""
        self.owner = _user("liked-owner")
        self.fan = _user("liked-fan")

    def test_returns_only_offers_that_still_exist(self):
        """Vráti len tie ponuky, ktoré sa medzitým nezmazali."""
        alive = _offer(self.owner, "Zostane")
        gone = _offer(self.owner, "Zanikne")
        notifications = [
            _like_notification(
                recipient=self.owner, actor=self.fan, data={"offer_id": alive.id}
            ),
            _like_notification(
                recipient=self.owner, actor=self.fan, data={"offer_id": gone.id}
            ),
        ]
        gone.delete()

        assert existing_liked_offer_ids(notifications) == {alive.id}

    def test_ignores_other_notification_types(self):
        """Upozornenia iného typu (aj s ``offer_id``) sa nepočítajú."""
        offer = _offer(self.owner, "Iný typ")
        other = Notification.objects.create(
            user=self.owner,
            actor=self.fan,
            type=NotificationType.REVIEW_LIKED,
            title="Recenzia",
            data={"offer_id": offer.id},
        )

        assert existing_liked_offer_ids([other]) == set()

    @pytest.mark.parametrize(
        "data",
        [
            {},
            {"offer_id": None},
            {"offer_id": 0},
            {"offer_id": -4},
            {"offer_id": "abc"},
            {"offer_id": [1]},
        ],
    )
    def test_ignores_missing_or_invalid_offer_ids(self, data):
        """Chýbajúce alebo neplatné ``offer_id`` sa preskočia bez dotazu do DB."""
        notification = _like_notification(
            recipient=self.owner, actor=self.fan, data=data
        )

        with CaptureQueriesContext(connection) as queries:
            assert existing_liked_offer_ids([notification]) == set()

        assert len(queries) == 0

    def test_non_dict_data_is_ignored(self):
        """Pole ``data``, ktoré nie je slovník, sa ticho preskočí."""
        notification = _like_notification(
            recipient=self.owner, actor=self.fan, data={"offer_id": 1}
        )
        notification.data = ["offer_id", 1]

        assert existing_liked_offer_ids([notification]) == set()

    def test_empty_input_needs_no_query(self):
        """Prázdny vstup vráti prázdnu množinu bez dotazu do DB."""
        with CaptureQueriesContext(connection) as queries:
            assert existing_liked_offer_ids([]) == set()

        assert len(queries) == 0

    def test_whole_page_needs_one_query(self):
        """Celá stránka upozornení potrebuje jediný dotaz (žiadne N+1)."""
        notifications = []
        for index in range(5):
            offer = _offer(self.owner, f"Ponuka {index}")
            notifications.append(
                _like_notification(
                    recipient=self.owner, actor=self.fan, data={"offer_id": offer.id}
                )
            )

        with CaptureQueriesContext(connection) as queries:
            result = existing_liked_offer_ids(notifications)

        assert len(result) == 5
        assert len(queries) == 1


@pytest.mark.django_db
class TestOfferLikedTargetUrl:
    """Cieľ upozornenia (``target_url``) podľa toho, či ponuka ešte existuje."""
    def setup_method(self):
        """Pripraví ponuku a upozornenie na jej lajk."""
        self.owner = _user("target-owner")
        self.fan = _user("target-fan")
        self.offer = _offer(self.owner, "Cieľ")
        self.notification = _like_notification(
            recipient=self.owner, actor=self.fan, data={"offer_id": self.offer.id}
        )

    def _target(self, *, context=None):
        """Vráti ``target_url`` upozornenia serializovaného s daným contextom."""
        return NotificationSerializer(self.notification, context=context or {}).data[
            "target_url"
        ]

    def _page_context(self):
        """Context, aký skladá zoznam upozornení (existujúce ponuky)."""
        existing = existing_liked_offer_ids([self.notification])
        return {"existing_liked_offer_ids": existing}

    def test_existing_offer_leads_to_the_highlighted_card(self):
        """Existujúca ponuka vedie na profil so zvýraznenou kartou."""
        assert self._target(context=self._page_context()) == (
            f"/dashboard/profile?highlight={self.offer.id}"
        )

    def test_deleted_offer_has_no_target(self):
        """Zmazaná ponuka cieľ nemá."""
        offer_id = self.offer.id
        self.offer.delete()

        assert self._target(context=self._page_context()) is None
        assert not OfferedSkill.objects.filter(id=offer_id).exists()

    def test_hidden_offer_of_the_owner_is_still_a_target(self):
        """Skrytá ponuka vlastníka ostáva platným cieľom (stačí, že existuje)."""
        self.offer.is_hidden = True
        self.offer.save(update_fields=["is_hidden"])

        assert self._target(context=self._page_context()) == (
            f"/dashboard/profile?highlight={self.offer.id}"
        )

    def test_without_page_context_the_original_target_stays(self):
        """Bez contextu zoznamu (realtime) ostáva pôvodná adresa."""
        # Realtime push čerstvej notifikácie: ponuka je aktuálna a context chýba.
        self.offer.delete()
        stale_id = self.notification.data["offer_id"]

        assert self._target() == f"/dashboard/profile?highlight={stale_id}"

    def test_empty_page_context_marks_every_offer_as_gone(self):
        """Prázdna množina existujúcich ponúk znamená, že žiadna neexistuje."""
        assert self._target(context={"existing_liked_offer_ids": set()}) is None

    @pytest.mark.parametrize("data", [{}, {"offer_id": 0}, {"offer_id": "abc"}])
    def test_missing_offer_id_still_has_no_target(self, data):
        """Upozornenie bez platného ``offer_id`` cieľ nemá (s contextom ani bez)."""
        self.notification.data = data

        assert self._target(context=self._page_context()) is None
        assert self._target() is None


@pytest.mark.django_db
class TestNotificationListWithDeletedOffer:
    """Zoznam upozornení cez API: zmazaná ponuka dostane ``target_url = None``."""
    def setup_method(self):
        """Dve upozornenia, druhá ponuka sa zmaže; prihlásený je vlastník."""
        self.owner = _user("list-owner")
        self.fan = _user("list-fan")
        self.alive = _offer(self.owner, "Žije")
        self.gone = _offer(self.owner, "Zmizne")
        self.alive_notification = _like_notification(
            recipient=self.owner, actor=self.fan, data={"offer_id": self.alive.id}
        )
        self.gone_notification = _like_notification(
            recipient=self.owner, actor=self.fan, data={"offer_id": self.gone.id}
        )
        self.gone_id = self.gone.id
        self.gone.delete()
        self.client = APIClient()
        self.client.force_authenticate(user=self.owner)

    def _targets(self, rows):
        """Mapa ``id`` upozornenia -> ``target_url`` z riadkov odpovede."""
        return {row["id"]: row["target_url"] for row in rows}

    def test_flat_list_marks_only_the_deleted_offer_as_unavailable(self):
        """Plochý zoznam: cieľ nemá len upozornenie na zmazanú ponuku."""
        response = self.client.get("/api/auth/notifications/", {"type": "all"})

        assert response.status_code == status.HTTP_200_OK
        targets = self._targets(response.data)
        assert targets[self.alive_notification.id] == (
            f"/dashboard/profile?highlight={self.alive.id}"
        )
        assert targets[self.gone_notification.id] is None

    def test_paginated_list_marks_only_the_deleted_offer_as_unavailable(self):
        """Stránkovaný zoznam (``?page``): cieľ nemá len zmazaná ponuka."""
        response = self.client.get(
            "/api/auth/notifications/", {"type": "all", "page": 1}
        )

        assert response.status_code == status.HTTP_200_OK
        targets = self._targets(response.data["results"])
        assert targets[self.alive_notification.id] == (
            f"/dashboard/profile?highlight={self.alive.id}"
        )
        assert targets[self.gone_notification.id] is None

    def test_type_filter_keeps_the_same_answer(self):
        """Filter podľa typu dáva rovnakú odpoveď o cieli."""
        response = self.client.get(
            "/api/auth/notifications/", {"type": NotificationType.OFFER_LIKED}
        )

        assert response.status_code == status.HTTP_200_OK
        targets = self._targets(response.data)
        assert targets[self.gone_notification.id] is None
        assert targets[self.alive_notification.id] is not None

    def test_deleted_offer_does_not_change_the_notification_itself(self):
        """Zmazanie ponuky mení len ``target_url``, nie samotné upozornenie."""
        response = self.client.get("/api/auth/notifications/", {"type": "all"})

        row = next(r for r in response.data if r["id"] == self.gone_notification.id)
        assert row["type"] == NotificationType.OFFER_LIKED
        assert row["data"] == {"offer_id": self.gone_id}
        assert row["is_read"] is False
