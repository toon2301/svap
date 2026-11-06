"""Súbeh zdieľania príspevku a zmazania jeho zdroja (nález 232).

Zdieľanie ukazuje na zdrojový príspevok cudzím kľúčom, ktorý PostgreSQL kontroluje až pri COMMIT. Zdieľanie a
zmazanie zdroja sa preto dali prekryť dvoma spôsobmi a v oboch dopadol jeden request chybou 500:

- zmazanie zbiera súvisiace zdieľania skôr, než sa nové zdieľanie potvrdí, a pri vlastnom COMMIT narazí na
  riadok, ktorý ešte referencuje zmazaný príspevok (potvrdené logom Railway, `DELETE` vrátil 500),
- zdieľanie vloží riadok, zdroj sa medzitým zmaže a jeho COMMIT zlyhá (v opačnom poradí).

Oprava zamyká riadok zdroja pri vzniku zdieľania aj pri zmazaní (`SELECT ... FOR UPDATE`), takže sa oba
requesty zoradia. Súbeh na zámku riadku sa dá overiť len na PostgreSQL (SQLite riadky nezamyká), preto sa
testy dvoch vlákien tam spúšťajú a inde sa preskočia; beh `backend-postgres` v CI ich vykoná. Poradie sa
vynucuje udalosťami, nie spánkom, a čakanie je obmedzené: bez opravy sa druhé vlákno dokončí hneď, s opravou
ho zámok zastaví a čakanie vypršia.
"""

import threading
import unittest
from unittest import mock

from django.contrib.auth import get_user_model
from django.db import connection, connections
from django.db.models.sql.subqueries import DeleteQuery
from django.test import TransactionTestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import FeedPost

User = get_user_model()

# Najdlhšie čakanie jedného vlákna na druhé. S opravou ho zámok zastaví, takže čakanie vypršia a test
# o toľko trvá; bez opravy sa druhé vlákno dokončí hneď a čakanie sa nevyužije.
HANDOVER_TIMEOUT_SECONDS = 2.0
# Čakanie na začiatok práce prvého vlákna (iba poistka pred zaseknutím testu).
START_TIMEOUT_SECONDS = 10.0


def _user(name):
    """Verejný používateľ (aby sa príspevky navzájom videli)."""
    return User.objects.create_user(
        username=name,
        email=f"{name}@example.com",
        password="StrongPass123",
        is_public=True,
    )


def _share_payload(source):
    """Telo requestu, ktorým sa zdieľa daný príspevok."""
    return {
        "post_type": FeedPost.PostType.SHARED_FEED_POST,
        "shared_feed_post_id": source.id,
    }


def _call(results, key, make_request):
    """Vykonaj request vo vlákne; výsledok je `(stav, kód chyby)` alebo názov výnimky."""
    try:
        response = make_request()
        code = (
            response.data.get("code")
            if hasattr(response, "data") and response.data
            else None
        )
        results[key] = (response.status_code, code)
    except Exception as exc:  # 500 sa v teste môže prejaviť aj ako výnimka z klienta
        results[key] = type(exc).__name__
    finally:
        # Vlákno si otvorilo vlastné spojenie – bez zatvorenia ostane visieť a zablokuje upratanie tabuliek.
        connections.close_all()


class _FeedShareFixtureMixin:
    """Spoločné príslušenstvo testov: vlastník so zdrojom a používateľ, ktorý zdroj zdieľa."""

    def setUp(self):
        """Vlastník so zdrojovým príspevkom a druhý používateľ, ktorý ho bude zdieľať."""
        self.owner = _user("race-owner")
        self.sharer = _user("race-sharer")
        self.source = FeedPost.objects.create(
            author=self.owner,
            post_type=FeedPost.PostType.FREE_POST,
            caption="Zdroj zdieľania",
        )

    def _client(self, user):
        """Klient prihlásený ako daný používateľ."""
        client = APIClient()
        client.force_authenticate(user=user)
        return client

    def _delete_source(self):
        """Vlastník zmaže zdrojový príspevok."""
        url = reverse("accounts:feed_post_detail", args=[self.source.id])
        return self._client(self.owner).delete(url)

    def _share_source(self):
        """Druhý používateľ zdieľa zdrojový príspevok."""
        return self._client(self.sharer).post(
            reverse("accounts:feed_posts"), _share_payload(self.source), format="json"
        )


@unittest.skipUnless(
    connection.vendor == "postgresql",
    "Súbeh na zámku riadku sa dá overiť len na PostgreSQL (SQLite riadky nezamyká).",
)
class FeedShareDeleteRaceTests(_FeedShareFixtureMixin, TransactionTestCase):
    """TransactionTestCase: vlákna musia vidieť naozaj potvrdené dáta, nie jednu neuzavretú testovaciu transakciu."""

    def test_share_created_while_the_source_is_being_deleted(self):
        """Zdieľanie sa potvrdí po odpojení existujúcich zdieľaní, ale pred zmazaním zdroja.

        Django odpojí existujúce zdieľania (`SET_NULL`) tesne pred zmazaním zdroja; zdieľanie potvrdené v
        tomto okne už odpojené nie je. Bez opravy zmazanie zdroja zlyhá (500, porušenie cudzieho kľúča pri
        COMMIT, presne ako v logu Railway). S opravou zámok zdroja zastaví zdieľanie, kým zmazanie neskončí,
        takže zdieľanie dostane jasnú chybu a zdroj zmizne.
        """
        updates_done = threading.Event()
        share_finished = threading.Event()
        results = {}
        original_delete_batch = DeleteQuery.delete_batch

        def delete_batch_after_updates(query, pk_list, using):
            """Pozastav zmazanie príspevku vo vlákne `deleter`, kým zdieľanie neskončí (alebo nevyprší čakanie)."""
            # Pauza tesne pred zmazaním riadku príspevku, po odpojení existujúcich zdieľaní.
            if threading.current_thread().name == "deleter" and query.model is FeedPost:
                updates_done.set()
                share_finished.wait(HANDOVER_TIMEOUT_SECONDS)
            return original_delete_batch(query, pk_list, using)

        def share():
            """Vlákno zdieľania: počká na pauzu zmazania a potom zdieľa."""
            try:
                updates_done.wait(START_TIMEOUT_SECONDS)
                _call(results, "share", self._share_source)
            finally:
                share_finished.set()

        with mock.patch.object(DeleteQuery, "delete_batch", delete_batch_after_updates):
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
        self.assertFalse(FeedPost.objects.filter(pk=self.source.pk).exists())
        self.assertFalse(
            FeedPost.objects.filter(
                post_type=FeedPost.PostType.SHARED_FEED_POST
            ).exists()
        )

    def test_source_deleted_while_the_share_is_being_created(self):
        """Zdroj sa zmaže, kým je zdieľanie už vložené, ale ešte nepotvrdené.

        Bez opravy zdieľanie zlyhá pri COMMIT (500). S opravou zámok zdroja zastaví zmazanie, kým sa
        zdieľanie nepotvrdí; zmazanie ho potom zbadá a odpojí od zdroja (zdieľanie prežije ako osirelé).
        """
        inserted = threading.Event()
        delete_finished = threading.Event()
        results = {}
        original_tags = None

        def tags_after_insert(post, tagged_user_ids):
            """Pozastav vlákno `sharer` po vložení zdieľania, kým zmazanie neskončí (alebo nevyprší čakanie)."""
            # Pauza až PO vložení zdieľania, ešte pred jeho potvrdením.
            if threading.current_thread().name == "sharer":
                inserted.set()
                delete_finished.wait(HANDOVER_TIMEOUT_SECONDS)
            return original_tags(post, tagged_user_ids)

        def delete():
            """Vlákno zmazania: počká na vloženie zdieľania a potom zmaže zdroj."""
            try:
                inserted.wait(START_TIMEOUT_SECONDS)
                _call(results, "delete", self._delete_source)
            finally:
                delete_finished.set()

        from accounts.views import feed_posts as feed_posts_view_module

        original_tags = feed_posts_view_module.apply_feed_post_tags
        with mock.patch.object(
            feed_posts_view_module, "apply_feed_post_tags", tags_after_insert
        ):
            sharer = threading.Thread(
                name="sharer",
                target=_call,
                args=(results, "share", self._share_source),
            )
            deleter = threading.Thread(name="deleter", target=delete)
            sharer.start()
            deleter.start()
            sharer.join()
            deleter.join()

        self.assertEqual(results["share"], (status.HTTP_201_CREATED, None))
        self.assertEqual(results["delete"], (status.HTTP_204_NO_CONTENT, None))
        self.assertFalse(FeedPost.objects.filter(pk=self.source.pk).exists())
        share = FeedPost.objects.get(post_type=FeedPost.PostType.SHARED_FEED_POST)
        self.assertIsNone(share.shared_feed_post_id)

    def test_concurrent_second_delete_of_the_same_post_is_a_404(self):
        """Dve súbežné zmazania: druhé počká na zámok a po prvom zmazaní dostane 404 (nie 204 ani 500).

        Druhý request príspevok pri načítaní ešte vidí; až pod zámkom zistí, že ho medzitým zmazal prvý.
        """
        first_holds_the_lock = threading.Event()
        second_finished = threading.Event()
        results = {}
        original_delete_batch = DeleteQuery.delete_batch

        def delete_batch_while_holding_the_lock(query, pk_list, using):
            """Pozastav prvé zmazanie, kým drží zámok, kým druhé neskončí (alebo nevyprší čakanie)."""
            if threading.current_thread().name == "first" and query.model is FeedPost:
                first_holds_the_lock.set()
                second_finished.wait(HANDOVER_TIMEOUT_SECONDS)
            return original_delete_batch(query, pk_list, using)

        def second():
            """Druhé zmazanie: počká, kým prvé drží zámok, a potom skúsi zmazať ten istý príspevok."""
            try:
                first_holds_the_lock.wait(START_TIMEOUT_SECONDS)
                _call(results, "second", self._delete_source)
            finally:
                second_finished.set()

        with mock.patch.object(
            DeleteQuery, "delete_batch", delete_batch_while_holding_the_lock
        ):
            first = threading.Thread(
                name="first",
                target=_call,
                args=(results, "first", self._delete_source),
            )
            other = threading.Thread(name="second", target=second)
            first.start()
            other.start()
            first.join()
            other.join()

        self.assertEqual(results["first"], (status.HTTP_204_NO_CONTENT, None))
        self.assertEqual(results["second"], (status.HTTP_404_NOT_FOUND, None))
        self.assertFalse(FeedPost.objects.filter(pk=self.source.pk).exists())


class FeedShareSourceGoneTests(_FeedShareFixtureMixin, TransactionTestCase):
    """Zdroj zmizne po načítaní, ale pred vložením zdieľania: jasná 4xx, nie 500 (platí na každej databáze)."""

    def test_share_of_a_source_deleted_after_it_was_read_is_a_clear_4xx(self):
        """Zdroj zmizne po načítaní a sploštení: zdieľanie dostane tú istú 4xx ako neexistujúci zdroj a nič nevznikne."""
        original_apply = FeedPost._apply_shared_source
        source_id = self.source.id

        def apply_then_lose_the_source(post):
            """Sploštenie zdieľania prebehne normálne, ale zdroj sa hneď potom zmaže."""
            original_apply(post)
            # Zdroj sa zmaže po načítaní a sploštení, ale ešte pred vložením zdieľania.
            FeedPost.objects.filter(pk=source_id).delete()

        with mock.patch.object(
            FeedPost, "_apply_shared_source", apply_then_lose_the_source
        ):
            response = self._share_source()

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "shared_source_missing")
        self.assertFalse(
            FeedPost.objects.filter(
                post_type=FeedPost.PostType.SHARED_FEED_POST
            ).exists()
        )
        # Rovnaká odpoveď ako pri zdroji, ktorý nikdy neexistoval (inak by sa dali vyčítať existujúce ID).
        never_existed = self._client(self.sharer).post(
            reverse("accounts:feed_posts"),
            {
                "post_type": FeedPost.PostType.SHARED_FEED_POST,
                "shared_feed_post_id": source_id + 1000,
            },
            format="json",
        )
        self.assertEqual(response.status_code, never_existed.status_code)
        self.assertEqual(response.data, never_existed.data)

    def test_deleting_a_post_that_was_deleted_meanwhile_is_a_404(self):
        """Dvojité zmazanie (dva rýchle kliky): druhý request dostane 404, nie 500 ani falošné 204."""
        url = reverse("accounts:feed_post_detail", args=[self.source.id])
        client = self._client(self.owner)

        first = client.delete(url)
        second = client.delete(url)

        self.assertEqual(first.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(second.status_code, status.HTTP_404_NOT_FOUND)
