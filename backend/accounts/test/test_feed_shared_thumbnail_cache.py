"""Cache náhľadu zdieľaného obsahu: odtlačok `?v=` v adrese musí sedieť so súborom, ktorý endpoint pošle.

Nález z kontroly Rabbitom k vetve K61. Prehliadač drží odpoveď endpointu náhľadu hodinu (`Cache-Control: private,
max-age=3600`) pod adresou z JSON. Adresa nesie odtlačok súboru (`?v=`), no endpoint ho nečítal a posielal vždy aktuálnu
fotku. Keď sa prvá fotka zdroja zmenila po tom, čo klient dostal adresu so starým odtlačkom, a obrázok sa načítal až
potom, prehliadač uložil NOVÚ fotku pod adresu so STARÝM odtlačkom; po návrate na pôvodnú fotku JSON priniesol tú istú
adresu a prehliadač až hodinu ukazoval uloženú, nesprávnu fotku. Do cache preto smie ísť len odpoveď, ktorej odtlačok sedí
so súborom, ktorý sa naozaj posiela; inak sa pošle aktuálna fotka s `no-store`. Súbory fotiek sú len niekoľko bajtov
v dočasnom úložisku a každý nesie svoj kľúč ako obsah (základ testov je v `test_feed_shared_thumbnail_live.py`).
"""

from types import SimpleNamespace
from urllib.parse import parse_qs, urlparse

from django.urls import reverse
from rest_framework import status

from accounts.models import OfferedSkillImage
from accounts.test.test_feed_shared_thumbnail_live import ZivyNahladZakladTests

CACHE_NA_HODINU = "private, max-age=3600"
BEZ_CACHE = "no-store"


class NahladCacheZakladTests(ZivyNahladZakladTests):
    """Základ: tri druhy zdieľania s dvoma schválenými fotkami zdroja a načítanie obrázka ako prehliadač."""

    def scenar_ponuka(self):
        """Zdieľaná ponuka s fotkami A (prvá) a B; `na_b` a `na_a` prepínajú, ktorá z nich je prvá."""
        ponuka = self.ponuka()
        a = self.foto_ponuky(ponuka, "media/offers/cache-a.webp", poradie=0)
        self.foto_ponuky(ponuka, "media/offers/cache-b.webp", poradie=1)
        zdielanie = self.zdielaj(post_type="shared_offer", shared_offer_id=ponuka.id)

        def nastav_poradie(poradie):
            """Zmení poradie fotky A: pri 2 je prvá fotka B, pri 0 znovu A."""
            a.order = poradie
            a.save(update_fields=["order"])

        return SimpleNamespace(
            post_id=zdielanie["id"],
            zdroj=ponuka,
            obsah_a="media/offers/cache-a.webp",
            obsah_b="media/offers/cache-b.webp",
            na_b=lambda: nastav_poradie(2),
            na_a=lambda: nastav_poradie(0),
        )

    def scenar_portfolio(self):
        """Zdieľané portfólio s fotkami A (titulná) a B; `na_b` a `na_a` prepínajú titulnú fotku."""
        polozka = self.polozka()
        a = self.foto_portfolia(
            polozka, "media/portfolio/cache-a.webp", poradie=0, titulna=True
        )
        b = self.foto_portfolia(polozka, "media/portfolio/cache-b.webp", poradie=1)
        zdielanie = self.zdielaj(
            post_type="shared_portfolio_item", shared_portfolio_item_id=polozka.id
        )

        def nastav_titulnu(foto):
            """Nastaví danú fotku ako titulnú fotku položky."""
            polozka.cover_image = foto
            polozka.save(update_fields=["cover_image"])

        return SimpleNamespace(
            post_id=zdielanie["id"],
            zdroj=polozka,
            obsah_a="media/portfolio/cache-a.webp",
            obsah_b="media/portfolio/cache-b.webp",
            na_b=lambda: nastav_titulnu(b),
            na_a=lambda: nastav_titulnu(a),
        )

    def scenar_repost(self):
        """Zdieľaný príspevok s fotkami A (prvá) a B; `na_b` a `na_a` prepínajú, ktorá z nich je prvá."""
        povodny = self.povodny_prispevok()
        a = self.foto_prispevku(povodny, "media/feed/cache-a", poradie=0)
        self.foto_prispevku(povodny, "media/feed/cache-b", poradie=1)
        zdielanie = self.zdielaj(
            post_type="shared_feed_post", shared_feed_post_id=povodny.id
        )

        def nastav_poradie(poradie):
            """Zmení poradie fotky A: pri 2 je prvá fotka B, pri 0 znovu A."""
            a.order = poradie
            a.save(update_fields=["order"])

        return SimpleNamespace(
            post_id=zdielanie["id"],
            zdroj=povodny,
            obsah_a="media/feed/cache-a-t.webp",
            obsah_b="media/feed/cache-b-t.webp",
            na_b=lambda: nastav_poradie(2),
            na_a=lambda: nastav_poradie(0),
        )

    def scenare(self):
        """Scenáre pre ponuku, portfólio a repost; každý sa vytvorí až vtedy, keď ho cyklus zavolá."""
        return (
            ("ponuka", self.scenar_ponuka),
            ("portfólio", self.scenar_portfolio),
            ("repost", self.scenar_repost),
        )

    @staticmethod
    def odtlacok_z_adresy(adresa):
        """Hodnota parametra `v` z `thumbnail_url`."""
        return parse_qs(urlparse(adresa).query)["v"][0]

    @staticmethod
    def telo(odpoved):
        """Obsah odpovede so súborom (súbor nesie vlastný kľúč ako text)."""
        return b"".join(odpoved.streaming_content).decode("utf-8")

    def stiahni_nahlad(self, post_id, odtlacok=None):
        """Odpoveď endpointu náhľadu pre anonyma; `odtlacok` je hodnota `?v=` (`None` = parameter sa nepošle)."""
        data = {} if odtlacok is None else {"v": odtlacok}
        return self.client.get(
            reverse("accounts:feed_post_shared_thumbnail", args=[post_id]), data
        )

    def nacitaj_ako_prehliadac(self, pamat, adresa):
        """Načíta obrázok ako prehliadač so súkromnou cache.

        Uloženú odpoveď použije bez dopytu na server, novú uloží pod adresu len vtedy, keď jej hlavička dovoľuje držať
        sa (`max-age`); `no-store` ju neuloží.
        """
        if adresa in pamat:
            return pamat[adresa]
        odpoved = self.client.get(adresa)
        self.assertEqual(odpoved.status_code, status.HTTP_200_OK)
        obsah = self.telo(odpoved)
        if "max-age" in odpoved["Cache-Control"]:
            pamat[adresa] = obsah
        return obsah


class NahladCacheOdtlacokTests(NahladCacheZakladTests):
    """Endpoint náhľadu pustí odpoveď do cache len vtedy, keď odtlačok v adrese sedí so súborom, ktorý posiela."""

    def test_zhodny_odtlacok_ide_do_cache_na_hodinu(self):
        """Adresa z JSON (odtlačok sedí) dostane súbor aj hlavičku cache na hodinu, ako doteraz."""
        for nazov, scenar in self.scenare():
            with self.subTest(zdroj=nazov):
                s = scenar()
                odtlacok = self.odtlacok_z_adresy(self.nahlad_url(s.post_id))

                odpoved = self.stiahni_nahlad(s.post_id, odtlacok)

                self.assertEqual(odpoved.status_code, status.HTTP_200_OK)
                self.assertEqual(odpoved["Cache-Control"], CACHE_NA_HODINU)
                self.assertEqual(self.telo(odpoved), s.obsah_a)

    def test_stary_odtlacok_po_zmene_fotky_sa_necachuje_a_posle_aktualnu_fotku(self):
        """Adresa vydaná pred zmenou prvej fotky dostane aktuálnu fotku, no `no-store`: pod starým odtlačkom sa nič neuloží."""
        for nazov, scenar in self.scenare():
            with self.subTest(zdroj=nazov):
                s = scenar()
                stary_odtlacok = self.odtlacok_z_adresy(self.nahlad_url(s.post_id))
                s.na_b()

                odpoved = self.stiahni_nahlad(s.post_id, stary_odtlacok)

                self.assertEqual(odpoved.status_code, status.HTTP_200_OK)
                self.assertEqual(self.telo(odpoved), s.obsah_b)
                self.assertEqual(odpoved["Cache-Control"], BEZ_CACHE)
                self.assertEqual(odpoved["X-Content-Type-Options"], "nosniff")

    def test_navrat_na_povodnu_fotku_neukaze_fotku_ulozenu_pod_starou_adresou(self):
        """Nález Rabbita (A, potom B, potom znovu A): fotka B načítaná pod adresou A sa neuloží, takže po návrate sa ukáže A."""
        for nazov, scenar in self.scenare():
            with self.subTest(zdroj=nazov):
                s = scenar()
                pamat = {}
                adresa_a = self.nahlad_url(s.post_id)
                s.na_b()

                # Obrázok sa načíta až po zmene (karta sa dostala na obrazovku neskôr, ako prišiel JSON).
                self.assertEqual(
                    self.nacitaj_ako_prehliadac(pamat, adresa_a), s.obsah_b
                )
                s.na_a()

                adresa_po_navrate = self.nahlad_url(s.post_id)
                self.assertEqual(adresa_po_navrate, adresa_a)
                self.assertEqual(
                    self.nacitaj_ako_prehliadac(pamat, adresa_po_navrate), s.obsah_a
                )

    def test_adresa_bez_odtlacku_alebo_s_nespravnym_sa_necachuje(self):
        """Adresa bez `?v=`, s prázdnym alebo neznámym odtlačkom nič nedokazuje: aktuálna fotka s `no-store`."""
        for nazov, scenar in self.scenare():
            s = scenar()
            for odtlacok in (None, "", "neznamy", "000000000000"):
                with self.subTest(zdroj=nazov, odtlacok=odtlacok):
                    odpoved = self.stiahni_nahlad(s.post_id, odtlacok)

                    self.assertEqual(odpoved.status_code, status.HTTP_200_OK)
                    self.assertEqual(self.telo(odpoved), s.obsah_a)
                    self.assertEqual(odpoved["Cache-Control"], BEZ_CACHE)


class NahladCacheViditelnostTests(NahladCacheZakladTests):
    """Kontrola odtlačku nesmie zmeniť, kto náhľad uvidí: nedostupný obsah ostáva 404 s akýmkoľvek odtlačkom."""

    def test_skryty_zdroj_vrati_404_aj_so_zhodnym_odtlackom(self):
        """Odtlačok z adresy vydanej pred skrytím ponuky ju po skrytí neotvorí: odpoveď je 404."""
        s = self.scenar_ponuka()
        odtlacok = self.odtlacok_z_adresy(self.nahlad_url(s.post_id))
        s.zdroj.is_hidden = True
        s.zdroj.save(update_fields=["is_hidden"])

        odpoved = self.stiahni_nahlad(s.post_id, odtlacok)

        self.assertEqual(odpoved.status_code, status.HTTP_404_NOT_FOUND)

    def test_zamietnuta_foto_vrati_404_aj_so_starym_odtlackom(self):
        """Jediná fotka zamietnutá po vydaní adresy: starý odtlačok nič neotvorí, odpoveď je 404, nie `no-store` s inou fotkou."""
        ponuka = self.ponuka()
        foto = self.foto_ponuky(ponuka, "media/offers/cache-zamietnuta.webp")
        zdielanie = self.zdielaj(post_type="shared_offer", shared_offer_id=ponuka.id)
        odtlacok = self.odtlacok_z_adresy(self.nahlad_url(zdielanie["id"]))
        foto.status = OfferedSkillImage.Status.REJECTED
        foto.save(update_fields=["status"])

        odpoved = self.stiahni_nahlad(zdielanie["id"], odtlacok)

        self.assertEqual(odpoved.status_code, status.HTTP_404_NOT_FOUND)


class NahladCacheOstatneObrazkyTests(NahladCacheZakladTests):
    """Obrázky voľných príspevkov používajú rovnakú pomocnú funkciu streamovania a ostávajú v cache hodinu."""

    def test_fotka_volneho_prispevku_ostava_v_cache_na_hodinu(self):
        """Adresa fotky voľného príspevku je viazaná na jej riadok, preto jej hlavička cache zostáva hodinová."""
        prispevok = self.povodny_prispevok()
        foto = self.foto_prispevku(prispevok, "media/feed/cache-volny")

        for variant, obsah in (
            ("large", "media/feed/cache-volny.webp"),
            ("thumbnail", "media/feed/cache-volny-t.webp"),
        ):
            with self.subTest(variant=variant):
                odpoved = self.client.get(
                    reverse(
                        "accounts:feed_post_image_file", args=[prispevok.id, foto.id]
                    ),
                    {"variant": variant},
                )

                self.assertEqual(odpoved.status_code, status.HTTP_200_OK)
                self.assertEqual(odpoved["Cache-Control"], CACHE_NA_HODINU)
                self.assertEqual(self.telo(odpoved), obsah)
