"""Súbeh zmazania účtu a zdieľania jeho obsahu (nález 296).

`anonymize_user` mazal ponuky, položky portfólia a príspevky autora hromadným `QuerySet.delete()`, ktoré zámky z nálezov
232 a 246 nevolá (tie sú v `delete()` modelov, resp. vo view zmazania príspevku). Ak sa obsah mazaného účtu v tej istej
chvíli zdieľal, súbeh skončil chybou 500: zdieľanie pri COMMIT (cudzí kľúč na zmazaný zdroj) alebo zmazanie účtu.

Oprava má dve časti:

- ponuky a položky portfólia sa mažú po jednom cez `delete()` modelu, príspevky autora sa pred hromadným zmazaním zamknú,
- riadok používateľa sa zamyká `FOR NO KEY UPDATE`. Zdieľanie drží zámok zdroja a pri COMMIT potrebuje `KEY SHARE`
  na riadku vlastníka (`FeedPost.shared_owner`); `FOR UPDATE` z pôvodného zámku ho blokoval, kým zmazanie účtu čakalo
  na zámok zdroja, a PostgreSQL to ukončil deadlockom. Poradie zámkov používateľ a potom obsah ostáva (spolieha na
  ňu `feed_tagging`), `lock_users_for_update` (`FOR UPDATE`) sa s novým zámkom stále vylučuje.

Súbeh na zámku riadku sa dá overiť len na PostgreSQL (SQLite riadky nezamyká), preto sa testy dvoch vlákien tam
spúšťajú a inde sa preskočia; beh `backend-postgres` v CI ich vykoná. Harness (udalosti namiesto spánku) je z
`test_feed_share_source_delete_race.py`. Testy druhu a poradia zámkov bežia na každej databáze.
"""

import types
import unittest
from unittest import mock

from django.contrib.auth import get_user_model
from django.db import connection
from django.db.models.signals import post_delete
from django.test import TestCase, TransactionTestCase
from django.test.utils import CaptureQueriesContext
from rest_framework import status

from accounts.account_deletion import anonymize_user
from accounts.models import FeedPost, OfferedSkill
from accounts.test.test_feed_share_delete_race import _user
from accounts.test.test_feed_share_source_delete_race import (
    _OfferKind,
    _PortfolioKind,
    _RaceTests,
    _ShareFixtureMixin,
    _SourceKind,
)
from portfolio.models import PortfolioItem

User = get_user_model()

POSTGRES_ONLY = unittest.skipUnless(
    connection.vendor == "postgresql",
    "Súbeh na zámku riadku sa dá overiť len na PostgreSQL (SQLite riadky nezamyká).",
)


class _FeedPostKind(_SourceKind):
    """Zdieľanie príspevku autora (zdroj, ktorý `anonymize_user` maže hromadne)."""

    post_type = FeedPost.PostType.SHARED_FEED_POST
    payload_key = "shared_feed_post_id"
    fk_attr = "shared_feed_post_id"
    source_model = FeedPost

    def make_source(self, owner):
        """Voľný príspevok vlastníka."""
        return FeedPost.objects.create(
            author=owner, post_type=FeedPost.PostType.FREE_POST, caption="zdroj"
        )


class _AccountDeletionAsDelete:
    """Namiesto zmazania zdroja cez API zmaže vlastníkovi celý účet (`anonymize_user`), ako pri „Zmazať účet“."""

    def _delete_source(self):
        """Vlastník zmaže účet; návratová hodnota má tvar odpovede, aký očakávajú testy súbehu."""
        anonymize_user(User.objects.get(pk=self.owner.pk))
        return types.SimpleNamespace(status_code=status.HTTP_204_NO_CONTENT, data=None)


@POSTGRES_ONLY
class OfferAccountDeletionRaceTests(
    _AccountDeletionAsDelete, _ShareFixtureMixin, _RaceTests, TransactionTestCase
):
    """Zmazanie účtu a zdieľanie jeho ponuky. TransactionTestCase: vlákna musia vidieť naozaj potvrdené dáta."""

    kind = _OfferKind()


@POSTGRES_ONLY
class PortfolioAccountDeletionRaceTests(
    _AccountDeletionAsDelete, _ShareFixtureMixin, _RaceTests, TransactionTestCase
):
    """Zmazanie účtu a zdieľanie jeho položky portfólia."""

    kind = _PortfolioKind()


@POSTGRES_ONLY
class FeedPostAccountDeletionRaceTests(
    _AccountDeletionAsDelete, _ShareFixtureMixin, _RaceTests, TransactionTestCase
):
    """Zmazanie účtu a ďalšie zdieľanie jeho príspevku."""

    kind = _FeedPostKind()


class AccountDeletionLockOrderTests(TestCase):
    """Druh a poradie zámkov v `anonymize_user`; platí na každej databáze, súbeh overujú testy vyššie len na PostgreSQL."""

    def setUp(self):
        """Vlastník s dvoma ponukami, dvoma položkami portfólia a príspevkom."""
        self.owner = _user("lock-owner")
        OfferedSkill.objects.create(user=self.owner, category="Test", subcategory="B")
        OfferedSkill.objects.create(user=self.owner, category="Test", subcategory="A")
        PortfolioItem.objects.create(
            owner=self.owner, title="Rekonštrukcia", category="remeslo"
        )
        PortfolioItem.objects.create(
            owner=self.owner, title="Záhrada", category="remeslo"
        )
        FeedPost.objects.create(
            author=self.owner, post_type=FeedPost.PostType.FREE_POST, caption="text"
        )

    def _anonymize_recording_locks(self):
        """Zmaže účet vlastníka a vráti zoznam udalostí v poradí, v akom sa diali: zámky a mazania po jednom."""
        events = []
        original_user_lock = User.objects.select_for_update
        original_post_lock = FeedPost.objects.select_for_update
        original_offer_delete = OfferedSkill.delete
        original_item_delete = PortfolioItem.delete

        def post_deleted(sender, instance, **kwargs):
            """Zaznamená, že sa príspevok naozaj zmazal (hromadné mazanie posiela signál za každý riadok)."""
            events.append(("post-deleted", instance.pk))

        def user_lock(*args, **kwargs):
            """Zaznamená zámok používateľa aj s jeho argumentmi."""
            events.append(("user", kwargs))
            return original_user_lock(*args, **kwargs)

        def post_lock(*args, **kwargs):
            """Zaznamená zámok príspevkov."""
            events.append(("posts", kwargs))
            return original_post_lock(*args, **kwargs)

        def offer_delete(instance, *args, **kwargs):
            """Zaznamená zmazanie jednej ponuky (meno podkategórie určuje poradie)."""
            events.append(("offer", instance.subcategory))
            return original_offer_delete(instance, *args, **kwargs)

        def item_delete(instance, *args, **kwargs):
            """Zaznamená zmazanie jednej položky portfólia."""
            events.append(("portfolio", instance.title))
            return original_item_delete(instance, *args, **kwargs)

        post_delete.connect(post_deleted, sender=FeedPost, weak=False)
        self.addCleanup(post_delete.disconnect, post_deleted, sender=FeedPost)
        with (
            mock.patch.object(User.objects, "select_for_update", user_lock),
            mock.patch.object(FeedPost.objects, "select_for_update", post_lock),
            mock.patch.object(OfferedSkill, "delete", offer_delete),
            mock.patch.object(PortfolioItem, "delete", item_delete),
        ):
            anonymize_user(User.objects.get(pk=self.owner.pk))
        return events

    def test_the_user_row_is_locked_as_no_key_update_and_first(self):
        """Prvý zámok je riadok používateľa ako `FOR NO KEY UPDATE`, a až po ňom obsah (poradie používateľ, obsah)."""
        events = self._anonymize_recording_locks()

        self.assertEqual(events[0], ("user", {"no_key": True}))
        kinds = [event[0] for event in events]
        self.assertEqual(kinds.count("user"), 1)
        self.assertLess(kinds.index("user"), kinds.index("offer"))
        self.assertLess(kinds.index("user"), kinds.index("portfolio"))
        self.assertLess(kinds.index("user"), kinds.index("posts"))

    def test_offers_and_portfolio_items_are_deleted_one_by_one_in_primary_key_order(
        self,
    ):
        """Ponuky a položky sa mažú cez `delete()` modelu (ten berie zámok z nálezu 246), podľa primárneho kľúča."""
        events = self._anonymize_recording_locks()

        self.assertEqual(
            [event for event in events if event[0] in ("offer", "portfolio")],
            [
                ("offer", "B"),
                ("offer", "A"),
                ("portfolio", "Rekonštrukcia"),
                ("portfolio", "Záhrada"),
            ],
        )
        self.assertFalse(OfferedSkill.objects.filter(user=self.owner).exists())
        self.assertFalse(PortfolioItem.objects.filter(owner=self.owner).exists())

    def test_the_authors_posts_are_locked_before_they_are_deleted(self):
        """Príspevky autora sa pred hromadným zmazaním zamknú (zámok z nálezu 232 je inak len vo view)."""
        events = self._anonymize_recording_locks()

        kinds = [event[0] for event in events]
        self.assertEqual(kinds.count("posts"), 1)
        self.assertLess(kinds.index("posts"), kinds.index("post-deleted"))
        self.assertFalse(FeedPost.objects.filter(author=self.owner).exists())

    def test_only_the_posts_of_the_deleted_author_are_locked(self):
        """Zámok príspevkov sa týka len príspevkov mazaného autora; cudzie sa nezamykajú ani nemažú."""
        stranger = _user("lock-stranger")
        FeedPost.objects.create(
            author=stranger, post_type=FeedPost.PostType.FREE_POST, caption="cudzí"
        )

        with CaptureQueriesContext(connection) as captured:
            anonymize_user(User.objects.get(pk=self.owner.pk))

        lock_queries = [
            query["sql"]
            for query in captured.captured_queries
            if query["sql"].startswith(
                'SELECT "accounts_feedpost"."id" AS "pk" FROM "accounts_feedpost"'
            )
            and "ORDER BY" in query["sql"]
        ]
        self.assertEqual(len(lock_queries), 1)
        self.assertIn(f'"author_id" = {self.owner.pk}', lock_queries[0])
        if connection.vendor == "postgresql":
            self.assertTrue(lock_queries[0].endswith("FOR UPDATE"), lock_queries[0])
        self.assertTrue(FeedPost.objects.filter(author=stranger).exists())
