"""Živý náhľad zdieľaného obsahu (nálezy 371, 91 a 378).

Názov, kategória, cena a vlastník zdieľaného obsahu sa čítajú zo živého zdroja a od opravy sa tak číta aj náhľad. Fotka, ktorú
vlastník zdroja doplní, zmaže, vymení alebo ktorá sa zamietne PO zdieľaní, sa preto prejaví aj v už existujúcom zdieľaní
(predtým sa kľúč súboru skopíroval do príspevku len pri vzniku zdieľania). Testy idú cez skutočné API (zdieľanie ako z dialógu,
čítanie ako anonym, iný používateľ aj vlastník); súbory fotiek sú len niekoľko bajtov v dočasnom úložisku a každý nesie svoj
kľúč ako obsah, takže sa dá overiť, ktorú fotku endpoint náhľadu naozaj pošle.
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
    """Vytvorí verejného používateľa s vymysleným menom a e-mailom."""
    return User.objects.create_user(
        username=name,
        email=f"{name}@example.com",
        password="StrongPass123",
        is_public=True,
    )


class ZivyNahladZakladTests(APITestCase):
    """Spoločný základ: dočasné úložisko, používatelia a pomocníci na zdieľanie a čítanie cez API."""

    @classmethod
    def setUpClass(cls):
        """Presmeruje `MEDIA_ROOT` do dočasného priečinka, aby testy nezapisovali do projektu."""
        super().setUpClass()
        cls._media = tempfile.mkdtemp(prefix="nahlad_media_")
        cls.addClassCleanup(shutil.rmtree, cls._media, ignore_errors=True)
        presmerovanie = override_settings(MEDIA_ROOT=cls._media)
        presmerovanie.enable()
        cls.addClassCleanup(presmerovanie.disable)

    def setUp(self):
        """Vytvorí vlastníka zdroja, zdieľajúceho a cudzieho diváka."""
        self.vlastnik = _user("nahlad-vlastnik")
        self.zdielajuci = _user("nahlad-zdielajuci")
        self.divak = _user("nahlad-divak")

    def divaci(self):
        """Trojica, ktorej sa náhľad musí správať rovnako: anonym, cudzí používateľ a vlastník zdroja."""
        return (
            ("anonym", None),
            ("cudzí používateľ", self.divak),
            ("vlastník zdroja", self.vlastnik),
        )

    def subor(self, kluc):
        """Uloží do úložiska súbor, ktorého obsah je jeho kľúč; vráti skutočný kľúč (úložisko ho môže upraviť)."""
        return default_storage.save(kluc, ContentFile(kluc.encode("utf-8")))

    def ponuka(self, podkategoria="Programovanie"):
        """Ponuka vlastníka bez fotiek."""
        return OfferedSkill.objects.create(
            user=self.vlastnik, category="it-a-technologie", subcategory=podkategoria
        )

    def foto_ponuky(self, ponuka, kluc, *, stav="approved", poradie=0):
        """Fotka ponuky so súborom v úložisku (kľúč `approved_key` je plná fotka, ako po spracovaní)."""
        return OfferedSkillImage.objects.create(
            skill=ponuka, status=stav, approved_key=self.subor(kluc), order=poradie
        )

    def polozka(self):
        """Položka portfólia vlastníka bez fotiek."""
        return PortfolioItem.objects.create(
            owner=self.vlastnik, title="Dielo", category="it-a-technologie"
        )

    def foto_portfolia(
        self, polozka, kluc, *, stav="approved", poradie=0, titulna=False
    ):
        """Fotka portfólia so súborom v úložisku; `titulna` ju nastaví ako titulnú fotku položky."""
        foto = PortfolioImage.objects.create(
            item=polozka, status=stav, thumbnail_key=self.subor(kluc), order=poradie
        )
        if titulna:
            polozka.cover_image = foto
            polozka.save(update_fields=["cover_image"])
        return foto

    def povodny_prispevok(self):
        """Voľný príspevok vlastníka bez fotiek (zdroj pre repost)."""
        return FeedPost.objects.create(
            author=self.vlastnik, post_type="free_post", caption="Pôvodný text"
        )

    def foto_prispevku(self, prispevok, kluc, *, stav="approved", poradie=0):
        """Fotka voľného príspevku so súborom v úložisku (náhľad reposta berie `thumbnail_key`)."""
        return FeedPostImage.objects.create(
            post=prispevok,
            status=stav,
            thumbnail_key=self.subor(f"{kluc}-t.webp"),
            approved_key=self.subor(f"{kluc}.webp"),
            order=poradie,
        )

    def zdielaj(self, **telo):
        """Zdieľanie ako z dialógu: `POST /feed/posts/` od zdieľajúceho; vráti odpoveď API."""
        self.client.force_authenticate(user=self.zdielajuci)
        odpoved = self.client.post(
            reverse("accounts:feed_posts"),
            data={"tagged_user_ids": [], **telo},
            format="json",
        )
        self.client.force_authenticate(user=None)
        self.assertEqual(odpoved.status_code, status.HTTP_201_CREATED)
        return odpoved.data

    def nahlad_url(self, post_id, kto=None):
        """`thumbnail_url` zdieľaného obsahu z detailu príspevku, čítaného daným divákom."""
        self.client.force_authenticate(user=kto)
        odpoved = self.client.get(reverse("accounts:feed_post_detail", args=[post_id]))
        self.client.force_authenticate(user=None)
        self.assertEqual(odpoved.status_code, status.HTTP_200_OK)
        return odpoved.data["shared_content"]["thumbnail_url"]

    def nahlad_stav(self, post_id, kto=None):
        """Stavový kód endpointu náhľadu pre daného diváka."""
        self.client.force_authenticate(user=kto)
        odpoved = self.client.get(
            reverse("accounts:feed_post_shared_thumbnail", args=[post_id])
        )
        self.client.force_authenticate(user=None)
        return odpoved.status_code

    def obsah_nahladu(self, post_id, kto=None):
        """Obsah súboru, ktorý endpoint náhľadu pošle (súbor nesie vlastný kľúč ako text)."""
        self.client.force_authenticate(user=kto)
        odpoved = self.client.get(
            reverse("accounts:feed_post_shared_thumbnail", args=[post_id])
        )
        self.client.force_authenticate(user=None)
        self.assertEqual(odpoved.status_code, status.HTTP_200_OK)
        return b"".join(odpoved.streaming_content).decode("utf-8")

    def over_ziadny_nahlad(self, post_id):
        """Pre všetkých divákov: `thumbnail_url` je `null` a endpoint náhľadu vráti 404."""
        for nazov, kto in self.divaci():
            with self.subTest(divak=nazov):
                self.assertIsNone(self.nahlad_url(post_id, kto))
                self.assertEqual(
                    self.nahlad_stav(post_id, kto), status.HTTP_404_NOT_FOUND
                )


class ZivyNahladPoZmeneFotkyTests(ZivyNahladZakladTests):
    """Fotka zdroja sa zmení PO zdieľaní: náhľad ju musí nasledovať (nálezy 371, 91 a 378)."""

    def test_ponuka_foto_doplnena_po_zdielani_sa_prejavi_v_starom_zdielani(self):
        """371: ponuka bez fotky dostane po zdieľaní fotku, ktorú vidí anonym, cudzí používateľ aj vlastník."""
        ponuka = self.ponuka()
        zdielanie = self.zdielaj(post_type="shared_offer", shared_offer_id=ponuka.id)
        self.assertIsNone(zdielanie["shared_content"]["thumbnail_url"])

        self.foto_ponuky(ponuka, "media/offers/po-zdielani.webp")

        for nazov, kto in self.divaci():
            with self.subTest(divak=nazov):
                self.assertIsNotNone(self.nahlad_url(zdielanie["id"], kto))
                self.assertEqual(
                    self.obsah_nahladu(zdielanie["id"], kto),
                    "media/offers/po-zdielani.webp",
                )

    def test_portfolio_titulna_foto_doplnena_po_zdielani_sa_prejavi(self):
        """371: položka portfólia bez fotky dostane po zdieľaní titulnú fotku, ktorá sa ukáže."""
        polozka = self.polozka()
        zdielanie = self.zdielaj(
            post_type="shared_portfolio_item", shared_portfolio_item_id=polozka.id
        )
        self.assertIsNone(zdielanie["shared_content"]["thumbnail_url"])

        self.foto_portfolia(polozka, "media/portfolio/titulna.webp", titulna=True)

        self.assertIsNotNone(self.nahlad_url(zdielanie["id"]))
        self.assertEqual(
            self.obsah_nahladu(zdielanie["id"]), "media/portfolio/titulna.webp"
        )

    def test_portfolio_bez_titulnej_fotky_vezme_prvu_schvalenu(self):
        """371: položka bez titulnej fotky ukáže prvú schválenú fotku podľa poradia, nie čakajúcu."""
        polozka = self.polozka()
        zdielanie = self.zdielaj(
            post_type="shared_portfolio_item", shared_portfolio_item_id=polozka.id
        )

        self.foto_portfolia(polozka, "media/portfolio/druha.webp", poradie=2)
        self.foto_portfolia(
            polozka, "media/portfolio/cakajuca.webp", poradie=0, stav="pending"
        )
        self.foto_portfolia(polozka, "media/portfolio/prva.webp", poradie=1)

        self.assertEqual(
            self.obsah_nahladu(zdielanie["id"]), "media/portfolio/prva.webp"
        )

    def test_repost_foto_doplnena_po_zdielani_sa_prejavi(self):
        """371: pôvodný príspevok dostane fotku po reposte, ktorá sa ukáže v starom reposte."""
        povodny = self.povodny_prispevok()
        zdielanie = self.zdielaj(
            post_type="shared_feed_post", shared_feed_post_id=povodny.id
        )
        self.assertIsNone(zdielanie["shared_content"]["thumbnail_url"])

        self.foto_prispevku(povodny, "media/feed/po-reposte")

        self.assertIsNotNone(self.nahlad_url(zdielanie["id"]))
        self.assertEqual(
            self.obsah_nahladu(zdielanie["id"]), "media/feed/po-reposte-t.webp"
        )

    def test_zmazana_foto_zdroja_da_null_namiesto_zastaranej_adresy(self):
        """91: po zmazaní jedinej fotky zdroja nezostane zastaraná adresa; JSON má `null` a endpoint 404."""
        ponuka = self.ponuka()
        foto = self.foto_ponuky(ponuka, "media/offers/zmazana.webp")
        zdielanie = self.zdielaj(post_type="shared_offer", shared_offer_id=ponuka.id)
        self.assertIsNotNone(zdielanie["shared_content"]["thumbnail_url"])

        with self.captureOnCommitCallbacks(execute=True):
            foto.delete()

        self.over_ziadny_nahlad(zdielanie["id"])

    def test_po_zmazani_prvej_fotky_sa_ukaze_dalsia_schvalena(self):
        """91: po zmazaní prvej fotky sa náhľad prepne na ďalšiu schválenú a adresa sa zmení."""
        ponuka = self.ponuka()
        prva = self.foto_ponuky(ponuka, "media/offers/prva.webp", poradie=0)
        self.foto_ponuky(ponuka, "media/offers/dalsia.webp", poradie=1)
        zdielanie = self.zdielaj(post_type="shared_offer", shared_offer_id=ponuka.id)
        stara_adresa = self.nahlad_url(zdielanie["id"])

        with self.captureOnCommitCallbacks(execute=True):
            prva.delete()

        nova_adresa = self.nahlad_url(zdielanie["id"])
        self.assertIsNotNone(nova_adresa)
        self.assertNotEqual(nova_adresa, stara_adresa)
        self.assertEqual(
            self.obsah_nahladu(zdielanie["id"]), "media/offers/dalsia.webp"
        )

    def test_zamietnuta_foto_sa_neposiela_ani_v_json_ani_cez_endpoint(self):
        """378: schválená fotka prepnutá na zamietnutú sa už nikomu neposiela, ani anonymovi a ani vlastníkovi."""
        ponuka = self.ponuka()
        foto = self.foto_ponuky(ponuka, "media/offers/zamietnuta.webp")
        zdielanie = self.zdielaj(post_type="shared_offer", shared_offer_id=ponuka.id)
        self.assertEqual(self.nahlad_stav(zdielanie["id"]), status.HTTP_200_OK)

        foto.status = OfferedSkillImage.Status.REJECTED
        foto.save(update_fields=["status"])

        self.over_ziadny_nahlad(zdielanie["id"])

    def test_portfolio_zamietnuta_titulna_foto_ustupi_prvej_schvalenej(self):
        """378: zamietnutá titulná fotka portfólia sa neposiela, náhľad vezme prvú schválenú fotku položky."""
        polozka = self.polozka()
        titulna = self.foto_portfolia(
            polozka, "media/portfolio/titulna-zamietnuta.webp", poradie=0, titulna=True
        )
        self.foto_portfolia(polozka, "media/portfolio/zalozna.webp", poradie=1)
        zdielanie = self.zdielaj(
            post_type="shared_portfolio_item", shared_portfolio_item_id=polozka.id
        )
        self.assertEqual(
            self.obsah_nahladu(zdielanie["id"]),
            "media/portfolio/titulna-zamietnuta.webp",
        )

        titulna.status = PortfolioImage.Status.REJECTED
        titulna.save(update_fields=["status"])

        self.assertEqual(
            self.obsah_nahladu(zdielanie["id"]), "media/portfolio/zalozna.webp"
        )

    def test_repost_zamietnuta_foto_povodneho_prispevku_sa_neposiela(self):
        """378: fotka pôvodného príspevku prepnutá na zamietnutú zmizne aj z náhľadu reposta."""
        povodny = self.povodny_prispevok()
        foto = self.foto_prispevku(povodny, "media/feed/zamietnuta")
        zdielanie = self.zdielaj(
            post_type="shared_feed_post", shared_feed_post_id=povodny.id
        )
        self.assertEqual(self.nahlad_stav(zdielanie["id"]), status.HTTP_200_OK)

        foto.status = FeedPostImage.Status.REJECTED
        foto.save(update_fields=["status"])

        self.over_ziadny_nahlad(zdielanie["id"])

    def test_adresa_nahladu_nesie_odtlacok_ktory_sa_meni_len_s_fotkou(self):
        """Odtlačok `?v=` je pre všetkých divákov rovnaký a po výmene fotky sa zmení (prehliadač cachuje odpoveď hodinu)."""
        ponuka = self.ponuka()
        stara = self.foto_ponuky(ponuka, "media/offers/odtlacok-stara.webp")
        zdielanie = self.zdielaj(post_type="shared_offer", shared_offer_id=ponuka.id)
        prva_adresa = self.nahlad_url(zdielanie["id"])
        self.assertIn("?v=", prva_adresa)
        self.assertEqual(self.nahlad_url(zdielanie["id"], self.divak), prva_adresa)
        self.assertEqual(self.nahlad_url(zdielanie["id"]), prva_adresa)

        with self.captureOnCommitCallbacks(execute=True):
            stara.delete()
        self.foto_ponuky(ponuka, "media/offers/odtlacok-nova.webp")

        druha_adresa = self.nahlad_url(zdielanie["id"])
        self.assertIn("?v=", druha_adresa)
        self.assertNotEqual(druha_adresa, prva_adresa)
        self.assertEqual(druha_adresa.split("?")[0], prva_adresa.split("?")[0])


class ZivyNahladPravidlaTests(ZivyNahladZakladTests):
    """Pravidlá výberu a viditeľnosti náhľadu, ktoré musia platiť pred opravou aj po nej."""

    def test_nahlad_je_prva_schvalena_fotka_podla_poradia(self):
        """Náhľad ponuky je prvá schválená fotka podľa `order`, nie čakajúca ani posledná."""
        ponuka = self.ponuka()
        self.foto_ponuky(ponuka, "media/offers/poradie-druha.webp", poradie=1)
        self.foto_ponuky(
            ponuka, "media/offers/poradie-cakajuca.webp", poradie=0, stav="pending"
        )
        self.foto_ponuky(ponuka, "media/offers/poradie-prva.webp", poradie=0)
        zdielanie = self.zdielaj(post_type="shared_offer", shared_offer_id=ponuka.id)

        self.assertEqual(
            self.obsah_nahladu(zdielanie["id"]), "media/offers/poradie-prva.webp"
        )

    def test_cakajuca_foto_sa_neposiela(self):
        """Fotka, ktorá čaká na spracovanie, sa nikomu neposiela."""
        ponuka = self.ponuka()
        self.foto_ponuky(ponuka, "media/offers/cakajuca.webp", stav="pending")
        zdielanie = self.zdielaj(post_type="shared_offer", shared_offer_id=ponuka.id)

        self.over_ziadny_nahlad(zdielanie["id"])

    def test_ponuka_riadok_bez_approved_key_sa_preskoci(self):
        """Riadok fotky zo starého nahrávania (schválený, bez `approved_key`) sa preskočí a náhľad vezme ďalšiu fotku."""
        ponuka = self.ponuka()
        OfferedSkillImage.objects.create(skill=ponuka, order=0)
        self.foto_ponuky(ponuka, "media/offers/za-starym-riadkom.webp", poradie=1)
        zdielanie = self.zdielaj(post_type="shared_offer", shared_offer_id=ponuka.id)

        self.assertEqual(
            self.obsah_nahladu(zdielanie["id"]), "media/offers/za-starym-riadkom.webp"
        )

    def test_ponuka_len_so_starym_riadkom_bez_approved_key_ostava_bez_nahladu(self):
        """Nález 379: ponuka len s riadkom zo starého nahrávania ostáva bez náhľadu; táto oprava ho nelieči."""
        ponuka = self.ponuka()
        OfferedSkillImage.objects.create(skill=ponuka, order=0)
        zdielanie = self.zdielaj(post_type="shared_offer", shared_offer_id=ponuka.id)

        self.over_ziadny_nahlad(zdielanie["id"])

    def test_skryta_ponuka_nema_nahlad_ani_endpoint(self):
        """Skrytá ponuka nemá náhľad v JSON ani v endpointe, hoci jej súbor v úložisku je."""
        ponuka = self.ponuka()
        self.foto_ponuky(ponuka, "media/offers/skryta.webp")
        zdielanie = self.zdielaj(post_type="shared_offer", shared_offer_id=ponuka.id)
        self.assertEqual(self.nahlad_stav(zdielanie["id"]), status.HTTP_200_OK)

        ponuka.is_hidden = True
        ponuka.save(update_fields=["is_hidden"])

        self.over_ziadny_nahlad(zdielanie["id"])

    def test_sukromny_vlastnik_nema_nahlad_ani_endpoint(self):
        """Vlastník, ktorý prešiel na súkromný profil, nemá náhľad v JSON ani v endpointe, hoci súbor v úložisku je."""
        ponuka = self.ponuka()
        self.foto_ponuky(ponuka, "media/offers/sukromny.webp")
        zdielanie = self.zdielaj(post_type="shared_offer", shared_offer_id=ponuka.id)
        self.assertEqual(self.nahlad_stav(zdielanie["id"]), status.HTTP_200_OK)

        self.vlastnik.is_public = False
        self.vlastnik.save(update_fields=["is_public"])

        for nazov, kto in (("anonym", None), ("cudzí používateľ", self.divak)):
            with self.subTest(divak=nazov):
                self.assertEqual(
                    self.nahlad_stav(zdielanie["id"], kto), status.HTTP_404_NOT_FOUND
                )

    def test_zmazany_zdroj_nema_nahlad_ani_endpoint(self):
        """Po zmazaní ponuky zdieľanie ostane len so snímkom textu: bez náhľadu a s odpoveďou 404."""
        ponuka = self.ponuka()
        self.foto_ponuky(ponuka, "media/offers/zmazany-zdroj.webp")
        zdielanie = self.zdielaj(post_type="shared_offer", shared_offer_id=ponuka.id)

        with self.captureOnCommitCallbacks(execute=True):
            ponuka.delete()

        self.over_ziadny_nahlad(zdielanie["id"])


class ZivyNahladPocetDopytovTests(ZivyNahladZakladTests):
    """Zoznam feedu číta fotky zdrojov z prefetchu: počet dopytov nesmie rásť s počtom zdieľaní."""

    def _vytvor_zdielania(self, kolo):
        """Pre jedno kolo vytvorí ponuku, položku portfólia a príspevok, každé s fotkou, a všetky tri zdieľa."""
        ponuka = self.ponuka(f"Podkategória {kolo}")
        self.foto_ponuky(ponuka, f"media/offers/pocet-{kolo}-{ponuka.id}.webp")
        polozka = self.polozka()
        self.foto_portfolia(
            polozka, f"media/portfolio/pocet-{kolo}-{polozka.id}.webp", titulna=True
        )
        povodny = self.povodny_prispevok()
        self.foto_prispevku(povodny, f"media/feed/pocet-{kolo}-{povodny.id}")
        self.zdielaj(post_type="shared_offer", shared_offer_id=ponuka.id)
        self.zdielaj(
            post_type="shared_portfolio_item", shared_portfolio_item_id=polozka.id
        )
        self.zdielaj(post_type="shared_feed_post", shared_feed_post_id=povodny.id)

    def _pocet_dopytov_zoznamu(self):
        """Počet dopytov a počet príspevkov jednej stránky feedu; každé zdieľanie musí mať náhľad."""
        self.client.force_authenticate(user=self.divak)
        with CaptureQueriesContext(connection) as zachyt:
            odpoved = self.client.get(reverse("accounts:feed_posts"))
        self.client.force_authenticate(user=None)
        self.assertEqual(odpoved.status_code, status.HTTP_200_OK)
        prispevky = odpoved.data["results"]
        zdielania = [p for p in prispevky if p["shared_content"]]
        self.assertTrue(zdielania)
        self.assertTrue(all(p["shared_content"]["thumbnail_url"] for p in zdielania))
        return len(zachyt), len(prispevky)

    def test_pocet_dopytov_zoznamu_nezavisi_od_poctu_zdielani(self):
        """Stránka s 8 aj s 20 príspevkami potrebuje rovnaký počet dopytov (žiadne N+1 pri fotkách zdrojov)."""
        for kolo in range(2):
            self._vytvor_zdielania(kolo)
        dopyty_malo, prispevkov_malo = self._pocet_dopytov_zoznamu()
        for kolo in range(2, 5):
            self._vytvor_zdielania(kolo)
        dopyty_vela, prispevkov_vela = self._pocet_dopytov_zoznamu()

        self.assertGreater(prispevkov_vela, prispevkov_malo)
        self.assertEqual(dopyty_vela, dopyty_malo)
