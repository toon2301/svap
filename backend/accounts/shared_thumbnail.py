"""Náhľad zdieľaného obsahu odvodený zo ŽIVÉHO zdroja (nálezy 371, 91 a 378).

Názov, kategória, cena a vlastník zdieľaného obsahu sa čítajú zo živého zdroja. Náhľad sa predtým kopíroval do príspevku
(`FeedPost.shared_thumbnail_key`) len pri vzniku zdieľania, takže fotka doplnená, zmazaná, vymenená alebo zamietnutá po
zdieľaní sa neprejavila. Odteraz sa kľúč súboru odvodzuje zo zdroja pri každom čítaní, rovnako ako ostatné polia, a ukazuje
sa len SCHVÁLENÁ fotka. Viditeľnosť zdroja tu nikto nekontroluje: zodpovedá za ňu volajúci
(`FeedPost.is_shared_content_currently_visible`), serializér aj endpoint náhľadu.
"""

import hashlib

from accounts.models import FeedPost


def _approved_key(image, key_field: str) -> str:
    """Kľúč súboru fotky zo zadaného poľa, ak je fotka SCHVÁLENÁ; inak prázdny reťazec.

    Všetky tri modely fotiek (ponuka, portfólio, príspevok) majú vlastný `Status` s hodnotou `approved`, preto sa stav
    porovnáva s konštantou modelu danej fotky.
    """
    if image.status != type(image).Status.APPROVED:
        return ""
    return getattr(image, key_field) or ""


def _first_approved_key(images, key_field: str) -> str:
    """Kľúč prvej SCHVÁLENEJ fotky s neprázdnym kľúčom, alebo prázdny reťazec.

    Poradie `order`, `id` určuje `Meta.ordering` modelov fotiek. `images` je `source.images.all()`: feed ich číta
    z prefetchu (`views.feed_post_queries._annotated_queryset`), bez prefetchu ide o jeden dopyt.
    """
    for image in images:
        key = _approved_key(image, key_field)
        if key:
            return key
    return ""


def live_shared_thumbnail_key(post) -> str:
    """Kľúč súboru náhľadu zo ŽIVÉHO zdroja zdieľania, alebo prázdny reťazec, keď zdroj nemá schválenú fotku.

    Ponuka: prvá schválená fotka (`approved_key`, plná fotka). Portfólio: titulná fotka, ak je schválená, inak prvá
    schválená fotka položky (`thumbnail_key`); rovnako ako v `portfolio.serializers` vidí cudzí titulnú fotku len
    schválenú. Zdieľaný príspevok: prvá schválená fotka pôvodného príspevku (`thumbnail_key`). Čakajúce a zamietnuté
    fotky sa nepoužijú. Pre zmazaný zdroj a voľný príspevok vráti prázdny reťazec.
    """
    post_type = post.post_type
    if post_type == FeedPost.PostType.SHARED_OFFER and post.shared_offer is not None:
        return _first_approved_key(post.shared_offer.images.all(), "approved_key")
    if (
        post_type == FeedPost.PostType.SHARED_PORTFOLIO_ITEM
        and post.shared_portfolio_item is not None
    ):
        item = post.shared_portfolio_item
        cover = item.cover_image
        cover_key = _approved_key(cover, "thumbnail_key") if cover is not None else ""
        return cover_key or _first_approved_key(item.images.all(), "thumbnail_key")
    if (
        post_type == FeedPost.PostType.SHARED_FEED_POST
        and post.shared_feed_post is not None
    ):
        return _first_approved_key(post.shared_feed_post.images.all(), "thumbnail_key")
    return ""


def shared_thumbnail_version(key: str) -> str:
    """Krátky odtlačok kľúča do adresy náhľadu (`?v=`).

    Prehliadač odpoveď náhľadu cachuje hodinu (`Cache-Control: private, max-age=3600`) na tej istej adrese; po výmene
    fotky sa odtlačok zmení, takže sa adresa zmení a prehliadač nepoužije starú fotku z cache.
    """
    return hashlib.sha256(key.encode("utf-8")).hexdigest()[:12]
