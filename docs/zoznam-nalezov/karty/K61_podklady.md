# Podklady ku karte K61 (oprava B: živý náhľad zdieľaného obsahu)

Podklady agenta ku `K61.md`, 26. 11. 2026, `main` `7fd08bc8`: kód prototypu, diffy, ukážka testov a výsledky overenia. Všetko bežalo **len v kópii `backend` mimo repozitára** (virtuálne prostredie s Pythonom 3.11, SQLite, dočasné úložisko, vymyslené údaje, `python -m pytest --no-cov`); nič z toho nie je v repozitári. Kód je východisko: kolega ho overí voči kódu a napíše vlastné commity a testy (popisy po slovensky, R62); názvy funkcií a súborov sú návrh.

## 1. Nový modul `accounts/shared_thumbnail.py`

```python
"""Náhľad zdieľaného obsahu odvodený zo ŽIVÉHO zdroja (nálezy 371, 91 a 378).

Názov, kategória, cena a vlastník zdieľaného obsahu sa čítajú naživo; náhľad sa predtým kopíroval do príspevku len pri
zdieľaní, takže fotka doplnená, zmazaná, vymenená alebo zamietnutá po zdieľaní sa neprejavila. Teraz sa kľúč súboru vždy
odvodzuje zo zdroja, rovnako ako zvyšné polia. Volajúci zodpovedá za viditeľnosť zdroja (`is_shared_content_currently_visible`).
"""

import hashlib

from .models import FeedPost


def _prvy_schvaleny(obrazky, pole_kluca):
    """Kľúč prvej SCHVÁLENEJ fotky s neprázdnym kľúčom (poradie `order`, `id`; z prefetchu, ak je), inak prázdny reťazec."""
    for obrazok in obrazky:
        kluc = getattr(obrazok, pole_kluca)
        if obrazok.status == "approved" and kluc:
            return kluc
    return ""


def live_shared_thumbnail_key(post) -> str:
    """Kľúč súboru náhľadu zo živého zdroja zdieľania, alebo prázdny reťazec, keď zdroj nemá schválenú fotku.

    Ponuka: prvá schválená fotka (`approved_key`, plná fotka, ako doteraz). Portfólio: titulná fotka, ak je schválená,
    inak prvá schválená (`thumbnail_key`). Zdieľaný príspevok: prvá schválená fotka (`thumbnail_key`).
    """
    typ = post.post_type
    if typ == FeedPost.PostType.SHARED_OFFER and post.shared_offer is not None:
        return _prvy_schvaleny(post.shared_offer.images.all(), "approved_key")
    if typ == FeedPost.PostType.SHARED_PORTFOLIO_ITEM and post.shared_portfolio_item is not None:
        polozka = post.shared_portfolio_item
        titulna = polozka.cover_image
        if titulna is not None and titulna.status == "approved" and titulna.thumbnail_key:
            return titulna.thumbnail_key
        return _prvy_schvaleny(polozka.images.all(), "thumbnail_key")
    if typ == FeedPost.PostType.SHARED_FEED_POST and post.shared_feed_post is not None:
        return _prvy_schvaleny(post.shared_feed_post.images.all(), "thumbnail_key")
    return ""


def shared_thumbnail_version(kluc: str) -> str:
    """Krátky odtlačok kľúča do adresy náhľadu (`?v=`): po výmene fotky sa adresa zmení, takže prehliadač nepoužije starú z cache."""
    return hashlib.sha256(kluc.encode("utf-8")).hexdigest()[:12]
```

## 2. Úpravy produkčných súborov (diff proti `main` `7fd08bc8`)

### 2.1 `accounts/feed_serializers.py` (serializér: kľúč zo živého zdroja a odtlačok v adrese)

```diff
--- a/backend/accounts/feed_serializers.py
+++ b/backend/accounts/feed_serializers.py
@@ -13,6 +13,7 @@
 from rest_framework import serializers
 
 from accounts.models import FeedPost, FeedPostComment, FeedPostImage
+from accounts.shared_thumbnail import live_shared_thumbnail_key, shared_thumbnail_version
 
 User = get_user_model()
 
@@ -358,9 +359,12 @@
             # Náhľad patrí k živému zdroju – proxy endpoint ho pri nedostupnom
             # obsahu aj tak 404-uje, takže URL mimo tejto vetvy by len sľubovala
             # obrázok, ktorý nikdy nepríde (rozbitý <img> namiesto placeholderu).
-            if obj.shared_thumbnail_key:
+            thumbnail_key = live_shared_thumbnail_key(obj)
+            if thumbnail_key:
                 path = reverse("accounts:feed_post_shared_thumbnail", args=[obj.id])
-                payload["thumbnail_url"] = self._absolute(path)
+                payload["thumbnail_url"] = self._absolute(
+                    f"{path}?v={shared_thumbnail_version(thumbnail_key)}"
+                )
         return payload
 
     def get_shared_content_unavailable(self, obj):
```

### 2.2 `accounts/views/feed_image_files.py` (endpoint náhľadu: kľúč zo živého zdroja)

```diff
--- a/backend/accounts/views/feed_image_files.py
+++ b/backend/accounts/views/feed_image_files.py
@@ -19,6 +19,7 @@
 from swaply.rate_limiting import api_rate_limit
 
 from ..models import FeedPost, FeedPostImage
+from ..shared_thumbnail import live_shared_thumbnail_key
 from .feed_posts import visible_feed_posts
 
 logger = logging.getLogger(__name__)
@@ -108,4 +109,4 @@
         raise Http404
     if not post.is_shared_content_currently_visible:
         raise Http404
-    return _stream_key(post.shared_thumbnail_key)
+    return _stream_key(live_shared_thumbnail_key(post))
```

### 2.3 `accounts/views/feed_post_queries.py` (dopyt feedu: fotky zdrojov ako prefetch, titulná fotka portfólia cez join)

```diff
--- a/backend/accounts/views/feed_post_queries.py
+++ b/backend/accounts/views/feed_post_queries.py
@@ -180,8 +180,13 @@
             "shared_portfolio_item",
             "shared_feed_post",
             "shared_owner",
+            "shared_portfolio_item__cover_image",
         )
         .prefetch_related(
+            # Fotky zdrojov zdieľania pre živý náhľad (`accounts/shared_thumbnail.py`): tri dopyty na stránku.
+            "shared_offer__images",
+            "shared_portfolio_item__images",
+            "shared_feed_post__images",
             Prefetch(
                 "tags",
                 queryset=FeedPostTag.objects.select_related("tagged_user").order_by(
```

### 2.4 `accounts/models/feed_posts/sharing.py` (druhý commit: zápis kľúča do príspevku sa ukončí)

```diff
--- a/backend/accounts/models/feed_posts/sharing.py
+++ b/backend/accounts/models/feed_posts/sharing.py
@@ -23,7 +23,6 @@
     "shared_owner_display_name",
     "shared_title",
     "shared_category",
-    "shared_thumbnail_key",
     "shared_post_caption",
 )
 
@@ -200,7 +199,6 @@
 
         self.shared_title = source.shared_title
         self.shared_category = source.shared_category
-        self.shared_thumbnail_key = source.shared_thumbnail_key
         self.shared_post_caption = source.shared_post_caption
 
     def _snapshot_from_feed_post(self, post, *, overwrite: bool) -> None:
@@ -214,20 +212,6 @@
             self.shared_post_caption = self._truncate_for_field(
                 post.caption, "shared_post_caption"
             )
-        if overwrite or not self.shared_thumbnail_key:
-            # Náhľad = PRVÁ schválená fotka (od Fázy 4.4 ich môže byť až 5);
-            # pending/rejected sa navonok nezobrazuje. Import je lokálny –
-            # images.py importuje post.py, takže na module-level by vznikol cyklus.
-            from .images import FeedPostImage
-
-            first_approved = (
-                post.images.filter(status=FeedPostImage.Status.APPROVED)
-                .order_by("order", "id")
-                .first()
-            )
-            self.shared_thumbnail_key = (
-                first_approved.thumbnail_key if first_approved is not None else ""
-            )
 
     def _snapshot_from_offer(self, offer, *, overwrite: bool) -> None:
         """Over viditeľnosť ponuky a odvoď z nej snapshot.
@@ -243,16 +227,6 @@
             self.shared_title = offer.subcategory or offer.category
         if overwrite or not self.shared_category:
             self.shared_category = offer.category
-        if overwrite or not self.shared_thumbnail_key:
-            first_image = (
-                offer.images.filter(status="approved")
-                .exclude(approved_key="")
-                .order_by("order", "id")
-                .first()
-            )
-            self.shared_thumbnail_key = (
-                first_image.approved_key if first_image is not None else ""
-            )
 
     def _snapshot_from_portfolio_item(self, item, *, overwrite: bool) -> None:
         """Ako ``_snapshot_from_offer``; PortfolioItem nemá ``is_hidden``, takže
@@ -262,19 +236,6 @@
             self.shared_title = item.title
         if overwrite or not self.shared_category:
             self.shared_category = item.category
-        if overwrite or not self.shared_thumbnail_key:
-            cover = item.cover_image
-            if cover is not None and cover.thumbnail_key:
-                self.shared_thumbnail_key = cover.thumbnail_key
-            else:
-                first_image = (
-                    item.images.exclude(thumbnail_key="")
-                    .order_by("order", "id")
-                    .first()
-                )
-                self.shared_thumbnail_key = (
-                    first_image.thumbnail_key if first_image is not None else ""
-                )
 
     def _revalidate_changed_shared_source(self, update_fields) -> list[str]:
         """Pri UPDATE prehoď validáciu znova, ak sa zmenil zdroj zdieľania.
```

## 3. Úprava existujúceho testu (`accounts/test/test_feed_api.py`)

Test `FeedSharedContentSerializationTests.test_hiding_source_switches_every_field_to_snapshot` po oprave padá (očakáva `thumbnail_url`, no kľúč sa už nečíta); dva ďalšie miesta (`test_private_owner_switches_every_field_to_snapshot` a pomocník `_shared_post`) po oprave prechádzajú, no nastavujú kľúč zbytočne a bez fotky by prestali niečo dokazovať, preto sa upravia rovnako: kľúč sa už nenastavuje príkazom `update`, ale vytvorí sa skutočný riadok fotky ponuky pred zdieľaním.

```diff
--- a/backend/accounts/test/test_feed_api.py
+++ b/backend/accounts/test/test_feed_api.py
@@ -16,7 +16,7 @@
 from rest_framework import status
 from rest_framework.test import APITestCase
 
-from accounts.models import FeedPost, FeedPostImage, OfferedSkill, UserBlock
+from accounts.models import FeedPost, FeedPostImage, OfferedSkill, OfferedSkillImage, UserBlock
 from accounts.services.feed_tagging import REASON_TAG_BLOCKED
 from portfolio.models import PortfolioItem
 
@@ -724,16 +724,13 @@
         kategória, ani URL náhľadu (endpoint ju aj tak 404-uje).
         """
         offer = _offer(self.owner, subcategory="Programovanie")
+        # Schválená fotka ponuky: náhľad sa odvodzuje zo živého zdroja (upload flow tu netestujeme).
+        OfferedSkillImage.objects.create(skill=offer, approved_key="media/offers/1/thumb.webp")
         post = FeedPost.objects.create(
             author=self.sharer,
             post_type=FeedPost.PostType.SHARED_OFFER,
             shared_offer=offer,
         )
-        # Snapshot náhľadu z času zdieľania (upload flow tu netestujeme).
-        FeedPost.objects.filter(pk=post.pk).update(
-            shared_thumbnail_key="media/offers/1/thumb.webp"
-        )
-        post.refresh_from_db()
 
         # Kým je zdroj viditeľný: živé polia + funkčná URL náhľadu.
         live = self._shared_payload(post)["shared_content"]
@@ -761,15 +758,12 @@
 
     def test_private_owner_switches_every_field_to_snapshot(self):
         offer = _offer(self.owner, subcategory="Programovanie")
+        OfferedSkillImage.objects.create(skill=offer, approved_key="media/offers/1/thumb.webp")
         post = FeedPost.objects.create(
             author=self.sharer,
             post_type=FeedPost.PostType.SHARED_OFFER,
             shared_offer=offer,
         )
-        FeedPost.objects.filter(pk=post.pk).update(
-            shared_thumbnail_key="media/offers/1/thumb.webp"
-        )
-        post.refresh_from_db()
 
         offer.subcategory = "Tajna Grafika"
         offer.save(update_fields=["subcategory"])
@@ -830,17 +824,13 @@
         return reverse("accounts:feed_post_shared_thumbnail", args=[post.id])
 
     def _shared_post(self, offer):
-        post = FeedPost.objects.create(
+        # Schválená fotka ponuky: náhľad sa odvodzuje zo živého zdroja (upload flow tu netestujeme).
+        OfferedSkillImage.objects.create(skill=offer, approved_key="media/offers/1/thumb.webp")
+        return FeedPost.objects.create(
             author=self.author,
             post_type=FeedPost.PostType.SHARED_OFFER,
             shared_offer=offer,
         )
-        # Snapshot kľúč simulujeme priamo (upload flow tu netestujeme).
-        FeedPost.objects.filter(pk=post.pk).update(
-            shared_thumbnail_key="media/offers/1/thumb.webp"
-        )
-        post.refresh_from_db()
-        return post
 
     def test_shared_thumbnail_404_when_source_hidden(self):
         """NÁLEZ 1: keď JSON hlási nedostupné, nesmie ísť von ani obrázok."""
```

## 4. Ukážka nového súboru testov (`accounts/test/test_feed_shared_thumbnail_live.py`)

Overená v kópii (14 testov; na `main` `7fd08bc8` padá 9, na prototype prejde všetkých 14). Zdieľanie ide cez skutočné API (`POST` ako z dialógu), čítanie ako anonym, iný používateľ a vlastník; súbory fotiek sú len pár bajtov (obsah súboru nesie jeho kľúč, takže sa dá overiť, ktorú fotku endpoint pošle). Kolega píše vlastný súbor s rovnakými scenármi; táto ukážka nie je záväzná.

```python
"""Živý náhľad zdieľaného obsahu (nálezy 371, 91 a 378).

Názov, kategória, cena a vlastník zdieľaného obsahu sa čítajú zo živého zdroja; od opravy sa tak číta aj náhľad. Fotka, ktorú
vlastník zdroja doplní, zmaže, vymení alebo ktorá sa zamietne PO zdieľaní, sa preto prejaví aj v už existujúcom zdieľaní
(predtým sa kľúč súboru skopíroval do príspevku len pri vzniku zdieľania). Testy idú cez skutočné API (zdieľanie ako z dialógu,
čítanie ako anonym, iný používateľ aj vlastník); súbory fotiek sú len pár bajtov v dočasnom úložisku.
"""

import shutil
import tempfile

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import connection
from django.test import override_settings
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import FeedPost, FeedPostImage, OfferedSkill, OfferedSkillImage
from portfolio.models import PortfolioImage, PortfolioItem

User = get_user_model()


def _user(name):
    return User.objects.create_user(
        username=name, email=f"{name}@example.com", password="StrongPass123", is_public=True
    )


class ZivyNahladZakladTests(APITestCase):
    """Spoločný základ: dočasné úložisko, používatelia a pomocníci na zdieľanie a čítanie."""

    @classmethod
    def setUpClass(cls):
        cls._media = tempfile.mkdtemp(prefix="nahlad_media_")
        cls._media_override = override_settings(MEDIA_ROOT=cls._media)
        cls._media_override.enable()
        super().setUpClass()

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        cls._media_override.disable()
        shutil.rmtree(cls._media, ignore_errors=True)

    def setUp(self):
        self.vlastnik = _user("zivy-vlastnik")
        self.zdielajuci = _user("zivy-zdielajuci")
        self.divak = _user("zivy-divak")

    def subor(self, kluc):
        return default_storage.save(kluc, ContentFile(kluc.encode("utf-8")))

    def obsah_nahladu(self, post_id, kto=None):
        """Obsah súboru, ktorý endpoint náhľadu pošle (súbor nesie vlastný kľúč ako text)."""
        self.client.force_authenticate(user=kto)
        odpoved = self.client.get(reverse("accounts:feed_post_shared_thumbnail", args=[post_id]))
        self.assertEqual(odpoved.status_code, status.HTTP_200_OK)
        return b"".join(odpoved.streaming_content).decode("utf-8")

    def ponuka(self, podkategoria="Programovanie"):
        return OfferedSkill.objects.create(
            user=self.vlastnik, category="it-a-technologie", subcategory=podkategoria
        )

    def foto_ponuky(self, ponuka, kluc, *, stav="approved", poradie=0):
        return OfferedSkillImage.objects.create(
            skill=ponuka, status=stav, approved_key=self.subor(kluc), order=poradie
        )

    def polozka(self):
        return PortfolioItem.objects.create(owner=self.vlastnik, title="Dielo", category="it-a-technologie")

    def foto_portfolia(self, polozka, kluc, *, stav="approved", poradie=0, titulna=False):
        foto = PortfolioImage.objects.create(
            item=polozka, status=stav, thumbnail_key=self.subor(kluc), order=poradie
        )
        if titulna:
            polozka.cover_image = foto
            polozka.save(update_fields=["cover_image"])
        return foto

    def zdielaj(self, **telo):
        self.client.force_authenticate(user=self.zdielajuci)
        odpoved = self.client.post(
            reverse("accounts:feed_posts"), data={"tagged_user_ids": [], **telo}, format="json"
        )
        self.assertEqual(odpoved.status_code, status.HTTP_201_CREATED, getattr(odpoved, "data", None))
        return odpoved.data

    def nahlad_url(self, post_id, kto=None):
        self.client.force_authenticate(user=kto)
        odpoved = self.client.get(reverse("accounts:feed_post_detail", args=[post_id]))
        self.assertEqual(odpoved.status_code, status.HTTP_200_OK)
        return odpoved.data["shared_content"]["thumbnail_url"]

    def nahlad_stav(self, post_id, kto=None):
        self.client.force_authenticate(user=kto)
        return self.client.get(
            reverse("accounts:feed_post_shared_thumbnail", args=[post_id])
        ).status_code


class ZivyNahladPoZmeneFotkyTests(ZivyNahladZakladTests):
    def test_ponuka_foto_doplnena_po_zdielani_sa_prejavi_v_starom_zdielani(self):
        ponuka = self.ponuka()
        d = self.zdielaj(post_type="shared_offer", shared_offer_id=ponuka.id)
        self.assertIsNone(d["shared_content"]["thumbnail_url"])

        self.foto_ponuky(ponuka, "media/offers/zivy-a.webp")

        for kto in (None, self.divak, self.vlastnik):
            self.assertIsNotNone(self.nahlad_url(d["id"], kto), kto)
        self.assertEqual(self.nahlad_stav(d["id"]), status.HTTP_200_OK)

    def test_portfolio_titulna_foto_doplnena_po_zdielani_sa_prejavi(self):
        polozka = self.polozka()
        d = self.zdielaj(post_type="shared_portfolio_item", shared_portfolio_item_id=polozka.id)
        self.assertIsNone(d["shared_content"]["thumbnail_url"])

        self.foto_portfolia(polozka, "media/portfolio/zivy-b.webp", titulna=True)

        self.assertIsNotNone(self.nahlad_url(d["id"]))
        self.assertEqual(self.nahlad_stav(d["id"]), status.HTTP_200_OK)

    def test_repost_foto_doplnena_po_zdielani_sa_prejavi(self):
        povodny = FeedPost.objects.create(author=self.vlastnik, post_type="free_post", caption="Pôvodný text")
        d = self.zdielaj(post_type="shared_feed_post", shared_feed_post_id=povodny.id)
        self.assertIsNone(d["shared_content"]["thumbnail_url"])

        FeedPostImage.objects.create(
            post=povodny, status="approved", thumbnail_key=self.subor("media/feed/zivy-c-t.webp"),
            approved_key=self.subor("media/feed/zivy-c.webp"), order=0,
        )

        self.assertIsNotNone(self.nahlad_url(d["id"]))
        self.assertEqual(self.nahlad_stav(d["id"]), status.HTTP_200_OK)

    def test_nahlad_je_prva_schvalena_fotka_podla_poradia(self):
        ponuka = self.ponuka()
        self.foto_ponuky(ponuka, "media/offers/poradie-druha.webp", poradie=1)
        self.foto_ponuky(ponuka, "media/offers/poradie-prva.webp", poradie=0)
        self.foto_ponuky(ponuka, "media/offers/poradie-cakajuca.webp", poradie=0, stav="pending")
        d = self.zdielaj(post_type="shared_offer", shared_offer_id=ponuka.id)

        self.assertEqual(self.obsah_nahladu(d["id"]), "media/offers/poradie-prva.webp")

    def test_zmazana_foto_zdroja_da_null_namiesto_zastaranej_adresy(self):
        ponuka = self.ponuka()
        foto = self.foto_ponuky(ponuka, "media/offers/zivy-d.webp")
        d = self.zdielaj(post_type="shared_offer", shared_offer_id=ponuka.id)
        self.assertIsNotNone(d["shared_content"]["thumbnail_url"])

        with self.captureOnCommitCallbacks(execute=True):
            foto.delete()

        self.assertIsNone(self.nahlad_url(d["id"]))
        self.assertEqual(self.nahlad_stav(d["id"]), status.HTTP_404_NOT_FOUND)

    def test_po_zmazani_prvej_fotky_sa_ukaze_dalsia_schvalena(self):
        ponuka = self.ponuka()
        prva = self.foto_ponuky(ponuka, "media/offers/zivy-e1.webp", poradie=0)
        self.foto_ponuky(ponuka, "media/offers/zivy-e2.webp", poradie=1)
        d = self.zdielaj(post_type="shared_offer", shared_offer_id=ponuka.id)
        stara_adresa = self.nahlad_url(d["id"])

        with self.captureOnCommitCallbacks(execute=True):
            prva.delete()

        nova_adresa = self.nahlad_url(d["id"])
        self.assertIsNotNone(nova_adresa)
        self.assertNotEqual(nova_adresa, stara_adresa)
        self.assertEqual(self.obsah_nahladu(d["id"]), "media/offers/zivy-e2.webp")

    def test_zamietnuta_foto_sa_neposiela_ani_v_json_ani_cez_endpoint(self):
        ponuka = self.ponuka()
        foto = self.foto_ponuky(ponuka, "media/offers/zivy-f.webp")
        d = self.zdielaj(post_type="shared_offer", shared_offer_id=ponuka.id)
        self.assertEqual(self.nahlad_stav(d["id"], self.divak), status.HTTP_200_OK)

        foto.status = "rejected"
        foto.save(update_fields=["status"])

        for kto in (None, self.divak, self.vlastnik):
            self.assertIsNone(self.nahlad_url(d["id"], kto), kto)
            self.assertEqual(self.nahlad_stav(d["id"], kto), status.HTTP_404_NOT_FOUND, kto)

    def test_cakajuca_foto_sa_neposiela(self):
        ponuka = self.ponuka()
        self.foto_ponuky(ponuka, "media/offers/zivy-g.webp", stav="pending")
        d = self.zdielaj(post_type="shared_offer", shared_offer_id=ponuka.id)

        self.assertIsNone(d["shared_content"]["thumbnail_url"])
        self.assertEqual(self.nahlad_stav(d["id"]), status.HTTP_404_NOT_FOUND)

    def test_portfolio_zamietnuta_titulna_foto_ustupi_prvej_schvalenej(self):
        polozka = self.polozka()
        titulna = self.foto_portfolia(polozka, "media/portfolio/zivy-h1.webp", poradie=0, titulna=True)
        self.foto_portfolia(polozka, "media/portfolio/zivy-h2.webp", poradie=1)
        d = self.zdielaj(post_type="shared_portfolio_item", shared_portfolio_item_id=polozka.id)
        pred = self.nahlad_url(d["id"])
        self.assertIsNotNone(pred)

        titulna.status = "rejected"
        titulna.save(update_fields=["status"])

        po = self.nahlad_url(d["id"])
        self.assertIsNotNone(po)
        self.assertNotEqual(po, pred)
        self.assertEqual(self.nahlad_stav(d["id"]), status.HTTP_200_OK)

    def test_adresa_nahladu_nesie_odtlacok_ktory_sa_meni_len_s_fotkou(self):
        ponuka = self.ponuka()
        foto = self.foto_ponuky(ponuka, "media/offers/zivy-i1.webp")
        d = self.zdielaj(post_type="shared_offer", shared_offer_id=ponuka.id)
        prva = self.nahlad_url(d["id"])
        self.assertIn("?v=", prva)
        self.assertEqual(self.nahlad_url(d["id"], self.divak), prva)

        with self.captureOnCommitCallbacks(execute=True):
            foto.delete()
        self.foto_ponuky(ponuka, "media/offers/zivy-i2.webp")

        druha = self.nahlad_url(d["id"])
        self.assertIn("?v=", druha)
        self.assertNotEqual(druha, prva)
        self.assertEqual(druha.split("?")[0], prva.split("?")[0])

    def test_skryta_ponuka_nema_nahlad_ani_endpoint(self):
        ponuka = self.ponuka()
        self.foto_ponuky(ponuka, "media/offers/zivy-j.webp")
        d = self.zdielaj(post_type="shared_offer", shared_offer_id=ponuka.id)
        ponuka.is_hidden = True
        ponuka.save(update_fields=["is_hidden"])

        self.assertIsNone(self.nahlad_url(d["id"]))
        self.assertEqual(self.nahlad_stav(d["id"]), status.HTTP_404_NOT_FOUND)

    def test_stara_fotka_bez_approved_key_ostava_bez_nahladu(self):
        """Nález 379: riadok zo starého nahrávania (stav schválené, bez `approved_key`) sa nepoužije; oprava 371 ho nelieči."""
        ponuka = self.ponuka()
        OfferedSkillImage.objects.create(skill=ponuka, order=0)
        d = self.zdielaj(post_type="shared_offer", shared_offer_id=ponuka.id)

        self.assertIsNone(d["shared_content"]["thumbnail_url"])
        self.assertEqual(self.nahlad_stav(d["id"]), status.HTTP_404_NOT_FOUND)

    def test_nove_zdielanie_uz_nezapisuje_kluc_nahladu_do_prispevku(self):
        ponuka = self.ponuka()
        self.foto_ponuky(ponuka, "media/offers/zivy-k.webp")
        polozka = self.polozka()
        self.foto_portfolia(polozka, "media/portfolio/zivy-k.webp", titulna=True)
        povodny = FeedPost.objects.create(author=self.vlastnik, post_type="free_post", caption="Text")
        FeedPostImage.objects.create(
            post=povodny, status="approved", thumbnail_key=self.subor("media/feed/zivy-k-t.webp"),
            approved_key=self.subor("media/feed/zivy-k.webp"), order=0,
        )

        for telo in (
            {"post_type": "shared_offer", "shared_offer_id": ponuka.id},
            {"post_type": "shared_portfolio_item", "shared_portfolio_item_id": polozka.id},
            {"post_type": "shared_feed_post", "shared_feed_post_id": povodny.id},
        ):
            d = self.zdielaj(**telo)
            self.assertIsNotNone(d["shared_content"]["thumbnail_url"], telo["post_type"])
            self.assertEqual(FeedPost.objects.get(pk=d["id"]).shared_thumbnail_key, "", telo["post_type"])


class ZivyNahladPocetDopytovTests(ZivyNahladZakladTests):
    def _vytvor_zdielania(self, pocet):
        for i in range(pocet):
            ponuka = self.ponuka(f"Podkategória {pocet}-{i}")
            self.foto_ponuky(ponuka, f"media/offers/pocet-{pocet}-{i}-{ponuka.id}.webp")
            polozka = self.polozka()
            self.foto_portfolia(polozka, f"media/portfolio/pocet-{pocet}-{i}-{polozka.id}.webp", titulna=True)
            povodny = FeedPost.objects.create(author=self.vlastnik, post_type="free_post", caption="Text")
            FeedPostImage.objects.create(
                post=povodny, status="approved",
                thumbnail_key=self.subor(f"media/feed/pocet-{pocet}-{i}-{povodny.id}-t.webp"),
                approved_key=self.subor(f"media/feed/pocet-{pocet}-{i}-{povodny.id}.webp"), order=0,
            )
            self.zdielaj(post_type="shared_offer", shared_offer_id=ponuka.id)
            self.zdielaj(post_type="shared_portfolio_item", shared_portfolio_item_id=polozka.id)
            self.zdielaj(post_type="shared_feed_post", shared_feed_post_id=povodny.id)

    def _pocet_dopytov_zoznamu(self):
        self.client.force_authenticate(user=self.divak)
        with CaptureQueriesContext(connection) as zachyt:
            odpoved = self.client.get(reverse("accounts:feed_posts"))
        self.assertEqual(odpoved.status_code, status.HTTP_200_OK)
        vysledky = odpoved.data["results"] if isinstance(odpoved.data, dict) else odpoved.data
        self.assertTrue(all(p["shared_content"]["thumbnail_url"] for p in vysledky if p["shared_content"]))
        return len(zachyt), len(vysledky)

    def test_pocet_dopytov_zoznamu_nezavisi_od_poctu_zdielani(self):
        self._vytvor_zdielania(2)
        dopyty_malo, zdielani_malo = self._pocet_dopytov_zoznamu()
        self._vytvor_zdielania(5)
        dopyty_vela, zdielani_vela = self._pocet_dopytov_zoznamu()

        self.assertGreater(zdielani_vela, zdielani_malo)
        self.assertEqual(dopyty_vela, dopyty_malo)
```

## 5. Výsledky overenia

- **Nový súbor testov:** na `main` `7fd08bc8` padá 9 zo 14 (doplnená fotka sa neprejaví pri ponuke, portfóliu ani reposte; zmazaná fotka dá zastaranú adresu; po zmazaní prvej fotky sa neukáže ďalšia; zamietnutá fotka sa posiela; titulná fotka portfólia po zamietnutí neustúpi; adresa nemá odtlačok; nové zdieľanie zapíše kľúč) a 5 prechádza aj pred opravou (čakajúca fotka sa neposiela, skrytá ponuka, riadok bez `approved_key` ostáva bez náhľadu, poradie fotiek, počet dopytov); na prototype prejde všetkých 14.
- **Celá backendová sada na prototype (SQLite, `--no-cov`):** 2610 prešlo, 0 neprešlo, 35 preskočených; `python manage.py check` bez chyby. Pred úpravou testov v `test_feed_api.py` padal jediný test (`test_hiding_source_switches_every_field_to_snapshot`, očakávaný). Poznámka ku kópii: testy `tests/test_dependency_*_script.py` a `tests/test_gitignore_secrets.py` čítajú súbory v koreni repozitára (`.github`, `.gitignore`), preto sa do kópie doplnili; v repozitári sú.
- **Zásahy do kódu (mutácie), každý zachytil aspoň jeden nový test, 10 z 10:** M1 bez prefetchu fotiek zdrojov (padá test počtu dopytov), M2 adresa bez odtlačku (3), M3 bez kontroly stavu fotky (3), M4 endpoint číta uložený kľúč (7), M5 titulná fotka portfólia bez kontroly stavu (1), M6 zápis kľúča do príspevku pri zdieľaní ponuky (1), M7 posledná fotka namiesto prvej (2), M8 serializér číta uložený kľúč (9), M9 portfólio len titulná fotka (1), M10 repost bez fotiek (3). Skript mutácií je len v kópii.
- **Počet dopytov zoznamu feedu** (jedna stránka, 8 a potom 20 príspevkov, z toho zdieľania všetkých troch druhov s fotkou): `main` 4 dopyty pri 8 aj pri 20 príspevkoch; prototyp 7 dopytov pri 8 aj pri 20 (tri prefetch dopyty navyše, konštantne). Bez prefetchu by počet rástol s počtom zdieľaní (mutácia M1 to zachytí).
- **Frontend:** `sameOriginFeedImageUrl` (`feedImageUrl.ts:35-37`) testuje len cestu a vráti `pathname` aj `search`, takže adresa `…/shared-thumbnail/?v=<odtlačok>` ostane na doméne frontendu s parametrom (sonda Jest, len v kópii); frontend sa nemení.
- **E2E:** žiadny špec nečíta `shared_content.thumbnail_url`; dopad žiadny.

## 6. Čo nie je overené

PostgreSQL a S3 (prototyp bežal na SQLite a lokálnom úložisku; kód nepoužíva nič, čo by sa líšilo, a poradie fotiek je určené výslovne (`order`, `id`), no rozhodujúci je výsledok CI, ktoré beží aj na PostgreSQL); chovanie prehliadača s odtlačkom v adrese (len úvaha a sonda pre prepis adresy); produkčné dáta (počet starých zdieľaní bez kľúča alebo so zastaraným kľúčom nemá vplyv: kľúč v príspevku sa už nečíta); nález 379 (staré riadky fotiek bez `approved_key`) sa touto dávkou nelieči.
