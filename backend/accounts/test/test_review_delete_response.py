"""Testy: odpoveď na zmazanie recenzie je 204 bez tela (nález 325).

Odpoveď 204 No Content nesmie niesť telo. Telo s 204 pokazí spojenie, ktoré cez proxy ostáva
otvorené: ďalšia požiadavka na tom istom spojení (zoznam recenzií po zmazaní) zlyhá na chybe
parsera (HPE_INVALID_CONSTANT) a frontend ukáže chybový toast, hoci recenzia je už zmazaná.

Django testovací klient (aj APIClient) telá odpovedí 204 odstraňuje, lebo napodobňuje webový
server, a preto by túto chybu neodhalil. Pohľad sa tu preto volá priamo cez APIRequestFactory a
odpoveď sa vykreslí tak, ako ju dostane server.
"""

from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIRequestFactory, force_authenticate

from accounts.models import OfferedSkill, Review
from accounts.views.reviews import review_detail_view

User = get_user_model()


def _user(username, **kwargs):
    """Vytvorí používateľa s heslom a e-mailom odvodeným od mena."""
    return User.objects.create_user(
        username=username,
        email=f"{username}@e.com",
        password="StrongPass123",
        **kwargs,
    )


@pytest.mark.django_db
class TestReviewDeleteResponse:
    """DELETE na detail recenzie: vlastník dostane 204 bez tela, cudzí používateľ 403."""

    def setup_method(self):
        """Pripraví ponuku s recenziou, jej autora a cudzieho používateľa."""
        self.factory = APIRequestFactory()
        self.owner = _user("own-d", is_verified=True)
        self.reviewer = _user("rev-d", is_verified=True)
        self.stranger = _user("str-d", is_verified=True)
        self.offer = OfferedSkill.objects.create(
            user=self.owner, category="IT", subcategory="Web"
        )
        self.review = Review.objects.create(
            reviewer=self.reviewer,
            offer=self.offer,
            rating=Decimal("4.0"),
            text="ok",
        )

    def _delete(self, user):
        """Zavolá pohľad priamo (bez testovacieho klienta, ktorý telo 204 odstráni) a vykreslí odpoveď."""
        request = self.factory.delete(
            reverse("accounts:review_detail", kwargs={"review_id": self.review.id})
        )
        force_authenticate(request, user=user)
        response = review_detail_view(request, review_id=self.review.id)
        response.render()
        return response

    def test_owner_delete_returns_204_with_empty_body(self):
        """Vlastník recenzie dostane 204 a odpoveď nenesie žiadne dáta ani telo."""
        response = self._delete(self.reviewer)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert response.data is None
        assert response.content == b""

    def test_owner_delete_removes_review(self):
        """Po zmazaní vlastníkom recenzia v databáze už nie je."""
        self._delete(self.reviewer)

        assert not Review.objects.filter(id=self.review.id).exists()

    def test_foreign_user_gets_403_and_review_stays(self):
        """Cudzí používateľ dostane 403 s pôvodnou správou a recenzia ostane."""
        response = self._delete(self.stranger)

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.data == {"error": "Nemáš oprávnenie upravovať túto recenziu."}
        assert Review.objects.filter(id=self.review.id).exists()
