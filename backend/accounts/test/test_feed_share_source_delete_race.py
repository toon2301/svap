"""Súbeh zdieľania a zmazania ponuky alebo položky portfólia (nález 246).

Zdieľanie ukazuje na ponuku (`FeedPost.shared_offer`) alebo položku portfólia (`FeedPost.shared_portfolio_item`)
cudzím kľúčom, ktorý PostgreSQL kontroluje až pri COMMIT. Zdieľanie a zmazanie zdroja sa preto dali prekryť a jeden z
requestov skončil chybou 500, rovnako ako pri zdieľaní príspevku (nález 232):

- zmazanie ponuky zbiera súvisiace zdieľania skôr, než sa nové zdieľanie potvrdí, a pri vlastnom COMMIT narazí na riadok,
  ktorý ešte referencuje zmazanú ponuku (zmazanie 500, zdieľanie 201),
- zdieľanie vloží riadok, zdroj sa medzitým zmaže a jeho COMMIT zlyhá (zdieľanie 500). Zmazanie položky portfólia
  už zamykala sama view, preto tam 500 dostane vždy zdieľanie, v oboch poradiach.

Oprava zamyká riadok zdroja pri vzniku zdieľania (`FeedPost._lock_shared_source`) aj pri zmazaní (`delete()` modelov),
takže sa oba requesty zoradia. Súbeh na zámku riadku sa dá overiť len na PostgreSQL (SQLite riadky nezamyká), preto sa
testy dvoch vlákien tam spúšťajú a inde sa preskočia; beh `backend-postgres` v CI ich vykoná. Poradie sa vynucuje
udalosťami, nie spánkom, rovnako ako v `test_feed_share_delete_race.py`, z ktorého sa preberajú pomocné funkcie. Testy
poradia zámkov a chýbajúceho zdroja bežia na každej databáze.
"""

import threading
import unittest
from unittest import mock

from django.db import connection
from django.db.models.signals import pre_save
from django.db.models.sql.subqueries import DeleteQuery
from django.test import TestCase, TransactionTestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import FeedPost, OfferedSkill
from accounts.test.test_feed_share_delete_race import (
    HANDOVER_TIMEOUT_SECONDS,
    START_TIMEOUT_SECONDS,
    _call,
    _user,
    _wait_for_any,
)
from portfolio.models import PortfolioItem


class _SignalWhenCalled:
    """Nastaví udalosť, keď vlákno s daným menom zavolá metódu manažéra (tesne pred jej vykonaním).

    Tak sa pozná, že druhé vlákno už ide k zámku (alebo k vloženiu zdieľania), ešte predtým, než prvé vlákno pokračuje.
    """

    def __init__(self, manager, method_name, thread_name, event):
        """Zapamätá si sledovaný manažér, metódu, vlákno a udalosť."""
        self.manager = manager
        self.method_name = method_name
        self.thread_name = thread_name
        self.event = event
        self._patcher = None

    def __enter__(self):
        """Nahradí metódu manažéra funkciou, ktorá vo sledovanom vlákne nastaví udalosť a zavolá pôvodnú metódu."""
        original = getattr(self.manager, self.method_name)

        def signalling(*args, **kwargs):
            """Vo sledovanom vlákne nastav udalosť a zavolaj pôvodnú metódu."""
            if threading.current_thread().name == self.thread_name:
                self.event.set()
            return original(*args, **kwargs)

        self._patcher = mock.patch.object(self.manager, self.method_name, signalling)
        self._patcher.start()
        return self

    def __exit__(self, *exc_info):
        """Vráti pôvodnú metódu manažéra."""
        self._patcher.stop()


class _SourceKind:
    """Druh zdroja zdieľania: ponuka alebo položka portfólia (a čo k nemu patrí v API aj v modeli)."""

    post_type = None
    payload_key = None
    fk_attr = None
    delete_url_name = None
    source_model = None

    def make_source(self, owner):
        """Vytvorí zdroj, ktorého vlastníkom je `owner`."""
        raise NotImplementedError


class _OfferKind(_SourceKind):
    """Zdieľanie ponuky."""

    post_type = FeedPost.PostType.SHARED_OFFER
    payload_key = "shared_offer_id"
    fk_attr = "shared_offer_id"
    delete_url_name = "accounts:skills_detail"
    source_model = OfferedSkill

    def make_source(self, owner):
        """Ponuka vlastníka."""
        return OfferedSkill.objects.create(
            user=owner, category="Test", subcategory="Sub"
        )


class _PortfolioKind(_SourceKind):
    """Zdieľanie položky portfólia."""

    post_type = FeedPost.PostType.SHARED_PORTFOLIO_ITEM
    payload_key = "shared_portfolio_item_id"
    fk_attr = "shared_portfolio_item_id"
    delete_url_name = "accounts:portfolio_detail"
    source_model = PortfolioItem

    def make_source(self, owner):
        """Položka portfólia vlastníka."""
        return PortfolioItem.objects.create(
            owner=owner, title="Rekonštrukcia", category="remeslo"
        )


class _ShareFixtureMixin:
    """Príslušenstvo testov: vlastník so zdrojom a používateľ, ktorý ho zdieľa (druh zdroja určuje `kind`)."""

    kind = None

    def setUp(self):
        """Vlastník so zdrojom a druhý používateľ, ktorý ho bude zdieľať."""
        self.owner = _user("race-owner")
        self.sharer = _user("race-sharer")
        self.source = self.kind.make_source(self.owner)

    def _client(self, user):
        """Klient prihlásený ako daný používateľ."""
        client = APIClient()
        client.force_authenticate(user=user)
        return client

    def _delete_source(self):
        """Vlastník zmaže zdroj cez API."""
        url = reverse(self.kind.delete_url_name, args=[self.source.id])
        return self._client(self.owner).delete(url)

    def _share_payload(self, source_id):
        """Telo requestu, ktorým sa zdieľa zdroj s daným ID."""
        return {"post_type": self.kind.post_type, self.kind.payload_key: source_id}

    def _share_source(self):
        """Druhý používateľ zdieľa zdroj."""
        return self._client(self.sharer).post(
            reverse("accounts:feed_posts"),
            self._share_payload(self.source.id),
            format="json",
        )

    def _shares(self):
        """Zdieľania tohto druhu, ktoré v databáze existujú."""
        return FeedPost.objects.filter(post_type=self.kind.post_type)

    def _source_exists(self):
        """Existuje zdroj ešte v databáze?"""
        return self.kind.source_model.objects.filter(pk=self.source.pk).exists()


class _RaceHarness:
    """Vlákna súbehu zdieľania a zmazania zdroja (druh zdroja určuje `kind`)."""

    def _run_delete_during_share(self, share):
        """Vlákno `sharer` vloží zdieľanie a pred potvrdením čaká, kým zmazanie zdroja nedôjde k zámku alebo neskončí.

        S opravou zmazanie zastaví zámok zdroja, ktorý drží zdieľanie, takže čakanie vypršia a zdieľanie sa potvrdí
        ako prvé; bez opravy sa zmazanie dokončí hneď (a zdieľanie sa potom potvrdí na zmazaný zdroj).
        """
        inserted = threading.Event()
        delete_reached_lock = threading.Event()
        delete_finished = threading.Event()
        results = {}
        from accounts.views import feed_posts as feed_posts_view_module

        original_tags = feed_posts_view_module.apply_feed_post_tags

        def tags_after_insert(post, tagged_user_ids):
            """Pozastav vlákno `sharer` po vložení zdieľania, kým zmazanie nedôjde k zámku a neskončí (alebo čakanie vyprší)."""
            # Pauza až PO vložení zdieľania, ešte pred jeho potvrdením.
            if threading.current_thread().name == "sharer":
                inserted.set()
                _wait_for_any(
                    [delete_reached_lock, delete_finished], START_TIMEOUT_SECONDS
                )
                delete_finished.wait(HANDOVER_TIMEOUT_SECONDS)
            return original_tags(post, tagged_user_ids)

        def delete():
            """Vlákno zmazania: počká na vloženie zdieľania a potom zmaže zdroj."""
            try:
                inserted.wait(START_TIMEOUT_SECONDS)
                _call(results, "delete", self._delete_source)
            finally:
                delete_finished.set()

        with (
            mock.patch.object(
                feed_posts_view_module, "apply_feed_post_tags", tags_after_insert
            ),
            _SignalWhenCalled(
                self.kind.source_model.objects,
                "select_for_update",
                "deleter",
                delete_reached_lock,
            ),
        ):
            sharer = threading.Thread(
                name="sharer", target=_call, args=(results, "share", share)
            )
            deleter = threading.Thread(name="deleter", target=delete)
            sharer.start()
            deleter.start()
            sharer.join()
            deleter.join()
        return results


class _RaceTests(_RaceHarness):
    """Dve poradia súbehu, spoločné pre ponuku aj portfólio (druh zdroja určuje `kind`)."""

    def test_share_created_while_the_source_is_being_deleted(self):
        """Zdieľanie sa potvrdí po odpojení existujúcich zdieľaní, ale pred zmazaním zdroja.

        Zmazanie odpojí existujúce zdieľania tesne pred zmazaním zdroja; zdieľanie potvrdené v tomto okne už
        odpojené nie je. Bez opravy zlyhá (500) zmazanie ponuky alebo zdieľanie položky portfólia. S opravou zámok
        zdroja zastaví zdieľanie, kým zmazanie neskončí, takže zdieľanie dostane jasnú chybu a zdroj zmizne.
        """
        updates_done = threading.Event()
        share_reached_insert = threading.Event()
        share_finished = threading.Event()
        results = {}
        original_delete_batch = DeleteQuery.delete_batch
        source_model = self.kind.source_model

        def delete_batch_after_updates(query, pk_list, using):
            """Pozastav zmazanie zdroja vo vlákne `deleter`, kým zdieľanie nedôjde k vloženiu a neskončí (alebo čakanie vyprší)."""
            # Pauza tesne pred zmazaním riadku zdroja, po odpojení existujúcich zdieľaní.
            if (
                threading.current_thread().name == "deleter"
                and query.model is source_model
            ):
                updates_done.set()
                _wait_for_any(
                    [share_reached_insert, share_finished], START_TIMEOUT_SECONDS
                )
                share_finished.wait(HANDOVER_TIMEOUT_SECONDS)
            return original_delete_batch(query, pk_list, using)

        def share():
            """Vlákno zdieľania: počká na pauzu zmazania a potom zdieľa."""
            try:
                updates_done.wait(START_TIMEOUT_SECONDS)
                _call(results, "share", self._share_source)
            finally:
                share_finished.set()

        with (
            mock.patch.object(DeleteQuery, "delete_batch", delete_batch_after_updates),
            _SignalWhenCalled(
                FeedPost.objects, "create", "sharer", share_reached_insert
            ),
        ):
            deleter = threading.Thread(
                name="deleter",
                target=_call,
                args=(results, "delete", self._delete_source),
            )
            sharer = threading.Thread(name="sharer", target=share)
            deleter.start()
            sharer.start()
            deleter.join()
            sharer.join()

        self.assertEqual(results["delete"], (status.HTTP_204_NO_CONTENT, None))
        self.assertEqual(
            results["share"], (status.HTTP_400_BAD_REQUEST, "shared_source_missing")
        )
        self.assertFalse(self._source_exists())
        self.assertFalse(self._shares().exists())

    def test_source_deleted_while_the_share_is_being_created(self):
        """Zdroj sa zmaže, kým je zdieľanie už vložené, ale ešte nepotvrdené.

        Bez opravy zdieľanie zlyhá pri COMMIT (500). S opravou zámok zdroja zastaví zmazanie, kým sa zdieľanie
        nepotvrdí; zmazanie ho potom zbadá a odpojí od zdroja (zdieľanie prežije ako osirelé).
        """
        results = self._run_delete_during_share(self._share_source)

        self.assertEqual(results["share"], (status.HTTP_201_CREATED, None))
        self.assertEqual(results["delete"], (status.HTTP_204_NO_CONTENT, None))
        self.assertFalse(self._source_exists())
        share = self._shares().get()
        self.assertIsNone(getattr(share, self.kind.fk_attr))


@unittest.skipUnless(
    connection.vendor == "postgresql",
    "Súbeh na zámku riadku sa dá overiť len na PostgreSQL (SQLite riadky nezamyká).",
)
class OfferShareDeleteRaceTests(_ShareFixtureMixin, _RaceTests, TransactionTestCase):
    """Súbeh zdieľania a zmazania ponuky. TransactionTestCase: vlákna musia vidieť naozaj potvrdené dáta."""

    kind = _OfferKind()


@unittest.skipUnless(
    connection.vendor == "postgresql",
    "Súbeh na zámku riadku sa dá overiť len na PostgreSQL (SQLite riadky nezamyká).",
)
class PortfolioShareDeleteRaceTests(
    _ShareFixtureMixin, _RaceTests, TransactionTestCase
):
    """Súbeh zdieľania a zmazania položky portfólia (view ju už zamykala, zdieľanie nie)."""

    kind = _PortfolioKind()


@unittest.skipUnless(
    connection.vendor == "postgresql",
    "Súbeh na zámku riadku sa dá overiť len na PostgreSQL (SQLite riadky nezamyká).",
)
class OfferReshareDeleteRaceTests(
    _ShareFixtureMixin, _RaceHarness, TransactionTestCase
):
    """Zdieľanie cudzieho zdieľania ponuky: koreň sa po sploštení zamyká rovnako ako pri priamom zdieľaní."""

    kind = _OfferKind()

    def test_reshare_of_a_shared_offer_while_the_offer_is_being_deleted(self):
        """Nový príspevok zdieľa zdieľanie ponuky; ponuka sa zmaže, kým je vložený a nepotvrdený.

        Sploštenie prevezme od medzičlánku ponuku, takže nový príspevok na ňu ukazuje priamo. S opravou ju zamkne
        a zmazanie počká; bez opravy zdieľanie zlyhá pri COMMIT (500). Po zmazaní ostanú oba príspevky osirelé.
        """
        first_sharer = _user("race-first-sharer")
        intermediate = FeedPost.objects.create(
            author=first_sharer,
            post_type=FeedPost.PostType.SHARED_OFFER,
            shared_offer=self.source,
        )

        def reshare():
            """Druhý používateľ zdieľa príspevok, ktorý zdieľa ponuku."""
            return self._client(self.sharer).post(
                reverse("accounts:feed_posts"),
                {
                    "post_type": FeedPost.PostType.SHARED_FEED_POST,
                    "shared_feed_post_id": intermediate.id,
                },
                format="json",
            )

        results = self._run_delete_during_share(reshare)

        self.assertEqual(results["share"], (status.HTTP_201_CREATED, None))
        self.assertEqual(results["delete"], (status.HTTP_204_NO_CONTENT, None))
        self.assertFalse(self._source_exists())
        shares = self._shares()
        self.assertEqual(shares.count(), 2)
        self.assertEqual([share.shared_offer_id for share in shares], [None, None])


class _ShareSourceOrderTests(_ShareFixtureMixin):
    """Poradie zámkov voči zápisu: platí na každej databáze (zámok sa tu len vyžiada, nie je čo zoradiť)."""

    def test_the_source_is_locked_before_the_share_is_inserted(self):
        """Zdroj sa zamkne ešte pred INSERTom zdieľania; opačné poradie by zámok nič nechránilo."""
        calls = []
        original = self.kind.source_model.objects.select_for_update

        def recording_lock(*args, **kwargs):
            """Zapíš, že sa zamyká zdroj, a zamkni ho."""
            calls.append("lock")
            return original(*args, **kwargs)

        def recording_insert(sender, **kwargs):
            """Zapíš, že sa vkladá príspevok."""
            calls.append("insert")

        pre_save.connect(recording_insert, sender=FeedPost)
        try:
            with mock.patch.object(
                self.kind.source_model.objects, "select_for_update", recording_lock
            ):
                response = self._share_source()
        finally:
            pre_save.disconnect(recording_insert, sender=FeedPost)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(calls, ["lock", "insert"])

    def test_a_free_post_takes_no_source_lock(self):
        """Voľný príspevok nemá čo zamykať, takže nevznikne žiadny dotaz navyše."""
        with mock.patch.object(
            self.kind.source_model.objects, "select_for_update"
        ) as lock:
            FeedPost.objects.create(
                author=self.sharer,
                post_type=FeedPost.PostType.FREE_POST,
                caption="Voľný príspevok",
            )

        lock.assert_not_called()

    def test_share_of_a_source_deleted_after_it_was_read_is_a_clear_4xx(self):
        """Zdroj zmizne po načítaní, ale pred vložením zdieľania: tá istá 400 ako pri neexistujúcom zdroji."""
        original_apply = FeedPost._apply_shared_source
        source_id = self.source.id
        source_model = self.kind.source_model

        def apply_then_lose_the_source(post):
            """Zdroj sa zmaže po načítaní a sploštení, ale ešte pred vložením zdieľania."""
            original_apply(post)
            source_model.objects.filter(pk=source_id).delete()

        with mock.patch.object(
            FeedPost, "_apply_shared_source", apply_then_lose_the_source
        ):
            response = self._share_source()

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "shared_source_missing")
        self.assertFalse(self._shares().exists())
        # Rovnaká odpoveď ako pri zdroji, ktorý nikdy neexistoval (inak by sa dali vyčítať existujúce ID).
        never_existed = self._client(self.sharer).post(
            reverse("accounts:feed_posts"),
            self._share_payload(source_id + 1000),
            format="json",
        )
        self.assertEqual(response.status_code, never_existed.status_code)
        self.assertEqual(response.data, never_existed.data)


class OfferShareSourceOrderTests(_ShareSourceOrderTests, TestCase):
    """Poradie zámkov a chýbajúci zdroj pri zdieľaní ponuky."""

    kind = _OfferKind()


class PortfolioShareSourceOrderTests(_ShareSourceOrderTests, TestCase):
    """Poradie zámkov a chýbajúci zdroj pri zdieľaní položky portfólia."""

    kind = _PortfolioKind()


class _DeleteLockTests(_ShareFixtureMixin):
    """Zmazanie zdroja najprv zamkne jeho riadok, a to v transakcii, ktorá zámok drží až do zmazania."""

    def test_delete_locks_the_row_inside_a_transaction_before_deleting_it(self):
        """`delete()` modelu si vyžiada zámok riadku v transakcii a až potom zmaže riadok."""
        calls = []
        original_lock = self.kind.source_model.objects.select_for_update
        original_delete_batch = DeleteQuery.delete_batch
        source_model = self.kind.source_model

        def recording_lock(*args, **kwargs):
            """Zapíš, že sa zamyká riadok, a či to beží v transakcii."""
            calls.append(("lock", connection.in_atomic_block))
            return original_lock(*args, **kwargs)

        def recording_delete_batch(query, pk_list, using):
            """Zapíš zmazanie riadku zdroja, a či to beží v transakcii."""
            if query.model is source_model:
                calls.append(("delete", connection.in_atomic_block))
            return original_delete_batch(query, pk_list, using)

        with (
            mock.patch.object(
                source_model.objects, "select_for_update", recording_lock
            ),
            mock.patch.object(DeleteQuery, "delete_batch", recording_delete_batch),
        ):
            self.source.delete()

        self.assertEqual(calls, [("lock", True), ("delete", True)])
        self.assertFalse(self._source_exists())

    def test_the_share_is_detached_when_the_source_is_deleted(self):
        """Zdieľanie zmazaného zdroja prežije ako osirelé (kľúč `NULL`), nezmizne a zmazanie nezlyhá."""
        share = FeedPost.objects.create(
            author=self.sharer,
            post_type=self.kind.post_type,
            **{self.kind.fk_attr.removesuffix("_id"): self.source},
        )

        self.source.delete()

        share.refresh_from_db()
        self.assertIsNone(getattr(share, self.kind.fk_attr))


class OfferDeleteLockTests(_DeleteLockTests, TransactionTestCase):
    """Zámok pri zmazaní ponuky. TransactionTestCase: `in_atomic_block` je mimo transakcie testu nepravdivé."""

    kind = _OfferKind()


class PortfolioDeleteLockTests(_DeleteLockTests, TransactionTestCase):
    """Zámok pri zmazaní položky portfólia (view zamyká aj sama, model musí zamknúť pri každom volaní)."""

    kind = _PortfolioKind()
