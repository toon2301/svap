"""Logika zdieľania FeedPost-u – vyčlenená z post.py kvôli limitu 500 riadkov.

Čisto presun kódu, žiadna zmena správania. Mixin nepomenúva model priamo
(``type(self).objects``), takže ostáva nezávislý od miesta, kam sa primieša.

Kľúčové pravidlo, ktoré tu žije: reťazec zdieľaní sa NIKDY neukladá –
``_flatten_reshare`` vyrieši každé zdieľanie priamo na koreňový zdroj, a to
rovnako pri vzniku aj pri zmene zdroja.
"""

from django.core.exceptions import ValidationError

from accounts.services.feed_share_visibility import (
    SHARE_REASON_MESSAGES,
    shared_content_is_publicly_visible,
    shared_content_share_block_reason,
)

# Polia odvodené zo zdroja zdieľania – pri zmene zdroja sa prepisujú všetky
# naraz, preto ich save() takto doplní aj do update_fields.
SHARED_SNAPSHOT_FIELDS = (
    "shared_owner",
    "shared_owner_display_name",
    "shared_title",
    "shared_category",
    "shared_thumbnail_key",
    "shared_post_caption",
)


class FeedPostSharingMixin:
    """Validácia, sploštenie a denormalizácia zdieľaného obsahu."""

    def _truncate_for_field(self, value, field_name: str) -> str:
        """Orež text na ``max_length`` cieľového stĺpca.

        Limit sa číta z modelu, nie z konštanty v kóde: snapshot polia majú
        každé vlastnú dĺžku a natvrdo zapísané číslo by sa pri zmene poľa ticho
        rozišlo. Prejaviť by sa to stihlo až v produkcii – Postgres by spadol na
        DataError, kým SQLite v testoch dĺžku varchar-u nevynucuje.
        """
        max_length = self._meta.get_field(field_name).max_length
        return (value or "")[:max_length]

    def _apply_shared_source(self) -> None:
        """Vyžaduj zdrojový FK pre SHARED_* typy, over viditeľnosť a naplň snapshot.

        Zdrojový FK je pri vzniku POVINNÝ: DB CheckConstraint ho vyžadovať nemôže
        (musí ostať nullable kvôli SET_NULL survival vzoru), takže bez tejto
        kontroly by sa dal vytvoriť SHARED_* príspevok len s ``shared_title`` a
        celá kontrola viditeľnosti/blokovania by sa obišla – a výsledok by bol
        nerozoznateľný od legitímneho osireného zdieľania.
        """
        if self.post_type == self.PostType.SHARED_FEED_POST:
            if self.shared_feed_post_id is None:
                raise ValidationError(
                    "Zdieľanie príspevku vyžaduje existujúci príspevok.",
                    code="shared_source_required",
                )
            if self._flatten_reshare(self.shared_feed_post):
                # Koreň bol už zmazaný – prevzali sme snapshot medzičlánku,
                # živý zdroj neexistuje, takže nie je čo ďalej validovať.
                return

        if self.post_type == self.PostType.SHARED_OFFER:
            if self.shared_offer_id is None:
                raise ValidationError(
                    "Zdieľanie ponuky vyžaduje existujúcu ponuku.",
                    code="shared_source_required",
                )
            self._snapshot_from_offer(self.shared_offer, overwrite=False)
        elif self.post_type == self.PostType.SHARED_PORTFOLIO_ITEM:
            if self.shared_portfolio_item_id is None:
                raise ValidationError(
                    "Zdieľanie portfólia vyžaduje existujúcu položku.",
                    code="shared_source_required",
                )
            self._snapshot_from_portfolio_item(
                self.shared_portfolio_item, overwrite=False
            )
        elif self.post_type == self.PostType.SHARED_FEED_POST:
            self._snapshot_from_feed_post(self.shared_feed_post, overwrite=False)

    def _snapshot_from_current_source(self, *, overwrite: bool) -> None:
        """Naplň snapshot podľa AKTUÁLNEHO post_type a jeho FK.

        Po ``_flatten_reshare`` sa typ aj zdroj môžu zmeniť, preto sa dispatch
        robí až tu – volajúci nemusí vedieť, na čo sa zdieľanie vyriešilo.
        """
        if self.post_type == self.PostType.SHARED_OFFER:
            self._snapshot_from_offer(self.shared_offer, overwrite=overwrite)
        elif self.post_type == self.PostType.SHARED_PORTFOLIO_ITEM:
            self._snapshot_from_portfolio_item(
                self.shared_portfolio_item, overwrite=overwrite
            )
        elif self.post_type == self.PostType.SHARED_FEED_POST:
            self._snapshot_from_feed_post(self.shared_feed_post, overwrite=overwrite)

    def _flatten_reshare(self, source) -> bool:
        """Vyrieš zdieľanie priamo na KOREŇOVÝ zdroj – nikdy na medzičlánok.

        Reťazec zdieľaní sa neukladá: keď zdieľaš zdieľanie, nový príspevok
        preberie zdroj z medzičlánku, takže hĺbka je vždy najviac 1 krok, aj po
        desiatom preposlaní. Podľa typu medzičlánku:

        - free_post            -> ostáva ako je (už je koreň)
        - shared_offer         -> preberie jeho ``shared_offer``
        - shared_portfolio_item-> preberie jeho ``shared_portfolio_item``
        - shared_feed_post     -> preberie jeho ``shared_feed_post`` (pôvodný
          voľný príspevok), NIE odkaz na medzičlánok

        Viditeľnosť samotného medzičlánku sa overuje vždy – zdieľať sa dá len
        to, čo divák reálne vidí – a až potom sa validuje prevzatý koreň.

        Vracia True, keď bol koreň medzičlánku už zmazaný (jeho FK je None):
        vtedy preberáme denormalizovaný snapshot medzičlánku a živá validácia
        by nemala čo overiť.
        """
        # Medzičlánok musí byť pre zdieľajúceho viditeľný (autor verejný,
        # aktívny, bez blokovania) – rovnaké pravidlo ako pri ponuke/portfóliu.
        reason = shared_content_share_block_reason(
            owner=source.author,
            author_id=self.author_id,
            is_hidden=False,
        )
        if reason is not None:
            raise ValidationError(SHARE_REASON_MESSAGES[reason], code=reason)

        if source.post_type == self.PostType.FREE_POST:
            return False  # zdroj je už koreň

        inherited_id = {
            self.PostType.SHARED_OFFER: source.shared_offer_id,
            self.PostType.SHARED_PORTFOLIO_ITEM: source.shared_portfolio_item_id,
            self.PostType.SHARED_FEED_POST: source.shared_feed_post_id,
        }[source.post_type]

        self.post_type = source.post_type
        self.shared_feed_post = None
        if source.post_type == self.PostType.SHARED_OFFER:
            self.shared_offer_id = inherited_id
        elif source.post_type == self.PostType.SHARED_PORTFOLIO_ITEM:
            self.shared_portfolio_item_id = inherited_id
        else:
            self.shared_feed_post_id = inherited_id

        if inherited_id is not None:
            return False  # koreň žije – doValiduje ho bežná vetva

        self._inherit_orphan_snapshot(source)
        return True

    def _inherit_orphan_snapshot(self, source) -> None:
        """Prevezmi snapshot z už osirelého medzičlánku (jeho koreň je zmazaný).

        Blokovanie sa aj tu overuje voči pôvodnému vlastníkovi zo snapshotu –
        bez toho by sa dal obsah blokovaného človeka vyniesť späť do feedu cez
        zdieľanie osirelého príspevku (rovnaký dôvod ako
        ``review_hidden_from_user``).
        """
        owner = source.shared_owner
        if owner is not None:
            self._apply_shared_owner(owner, is_hidden=False, overwrite=True)
        else:
            self.shared_owner_id = None
            self.shared_owner_display_name = source.shared_owner_display_name

        self.shared_title = source.shared_title
        self.shared_category = source.shared_category
        self.shared_thumbnail_key = source.shared_thumbnail_key
        self.shared_post_caption = source.shared_post_caption

    def _snapshot_from_feed_post(self, post, *, overwrite: bool) -> None:
        """Snapshot zdieľaného VOĽNÉHO príspevku (vždy koreň, viď _flatten_reshare).

        Vlastníkom je autor pôvodného príspevku – rovnaký koncept „komu obsah
        patrí" ako ``offer.user`` / ``item.owner``.
        """
        self._apply_shared_owner(post.author, is_hidden=False, overwrite=overwrite)
        if overwrite or not self.shared_post_caption:
            self.shared_post_caption = self._truncate_for_field(
                post.caption, "shared_post_caption"
            )
        if overwrite or not self.shared_thumbnail_key:
            # Len schválená fotka – pending/rejected sa navonok nezobrazuje.
            self.shared_thumbnail_key = (
                post.image_thumbnail_key
                if post.image_status == self.ImageStatus.APPROVED
                else ""
            )

    def _snapshot_from_offer(self, offer, *, overwrite: bool) -> None:
        """Over viditeľnosť ponuky a odvoď z nej snapshot.

        ``overwrite=False`` pri vzniku (rešpektuj hodnoty zadané volajúcim),
        ``True`` pri zmene zdroja – tam MUSIA staré hodnoty zaniknúť, inak by
        príspevok ukazoval názov/náhľad pôvodnej ponuky pri novom FK.
        """
        self._apply_shared_owner(
            offer.user, is_hidden=offer.is_hidden, overwrite=overwrite
        )
        if overwrite or not self.shared_title:
            self.shared_title = offer.subcategory or offer.category
        if overwrite or not self.shared_category:
            self.shared_category = offer.category
        if overwrite or not self.shared_thumbnail_key:
            first_image = (
                offer.images.filter(status="approved")
                .exclude(approved_key="")
                .order_by("order", "id")
                .first()
            )
            self.shared_thumbnail_key = (
                first_image.approved_key if first_image is not None else ""
            )

    def _snapshot_from_portfolio_item(self, item, *, overwrite: bool) -> None:
        """Ako ``_snapshot_from_offer``; PortfolioItem nemá ``is_hidden``, takže
        jeho viditeľnosť určuje len vlastník."""
        self._apply_shared_owner(item.owner, is_hidden=False, overwrite=overwrite)
        if overwrite or not self.shared_title:
            self.shared_title = item.title
        if overwrite or not self.shared_category:
            self.shared_category = item.category
        if overwrite or not self.shared_thumbnail_key:
            cover = item.cover_image
            if cover is not None and cover.thumbnail_key:
                self.shared_thumbnail_key = cover.thumbnail_key
            else:
                first_image = (
                    item.images.exclude(thumbnail_key="")
                    .order_by("order", "id")
                    .first()
                )
                self.shared_thumbnail_key = (
                    first_image.thumbnail_key if first_image is not None else ""
                )

    def _revalidate_changed_shared_source(self, update_fields) -> list[str]:
        """Pri UPDATE prehoď validáciu znova, ak sa zmenil zdroj zdieľania.

        Bez toho by sa dal blok/viditeľnosť obísť tak, že sa príspevok najprv
        vytvorí nad povoleným zdrojom a potom sa FK prepíše na zakázaný.
        Prestavenie zdroja na NULL sa NEvaliduje – to je legitímne osirenie
        (SET_NULL po zmazaní originálu).

        Vracia mená polí, ktoré prepísal, aby ich ``save()`` vedelo doplniť do
        ``update_fields``.
        """
        source_fields = ("shared_offer", "shared_portfolio_item", "shared_feed_post")
        if update_fields is not None and not any(
            field in update_fields for field in source_fields
        ):
            return []  # hot path (napr. update stavu fotky) – žiadny extra dotaz

        previous = (
            type(self).objects.filter(pk=self.pk)
            .values(
                "shared_offer_id",
                "shared_portfolio_item_id",
                "shared_feed_post_id",
            )
            .first()
        )
        if previous is None:
            return []

        changed = False
        if (
            self.shared_offer_id is not None
            and self.shared_offer_id != previous["shared_offer_id"]
        ):
            self._snapshot_from_offer(self.shared_offer, overwrite=True)
            changed = True
        if (
            self.shared_portfolio_item_id is not None
            and self.shared_portfolio_item_id != previous["shared_portfolio_item_id"]
        ):
            self._snapshot_from_portfolio_item(
                self.shared_portfolio_item, overwrite=True
            )
            changed = True
        retyped = False
        if (
            self.shared_feed_post_id is not None
            and self.shared_feed_post_id != previous["shared_feed_post_id"]
        ):
            # Sploští reťazec rovnako ako pri vzniku. Bez toho by sa dal cez
            # UPDATE vyrobiť odkaz na medzičlánok namiesto koreňa – teda presne
            # ten reťazec, ktorý appka nikdy neukladá.
            if not self._flatten_reshare(self.shared_feed_post):
                self._snapshot_from_current_source(overwrite=True)
            changed = True
            # Sploštenie môže prepnúť post_type a presunúť zdroj na iný FK;
            # bez týchto polí v update_fields by zmena ostala len v pamäti
            # a v DB by ďalej sedel odkaz na medzičlánok.
            retyped = True

        if not changed:
            return []
        fields = list(SHARED_SNAPSHOT_FIELDS)
        if retyped:
            fields += [
                "post_type",
                "shared_offer",
                "shared_portfolio_item",
                "shared_feed_post",
            ]
        return fields

    def _apply_shared_owner(self, owner, *, is_hidden: bool, overwrite: bool) -> None:
        """Over zdieľateľnosť cieľa a zapíš vlastníka + jeho snapshot."""
        reason = shared_content_share_block_reason(
            owner=owner,
            author_id=self.author_id,
            is_hidden=is_hidden,
        )
        if reason is not None:
            raise ValidationError(SHARE_REASON_MESSAGES[reason], code=reason)

        self.shared_owner_id = owner.pk
        if overwrite or not self.shared_owner_display_name:
            # display_name skladá first+last name (2×150), takže sa do stĺpca
            # nemusí zmestiť – orež podľa jeho skutočného max_length.
            self.shared_owner_display_name = self._truncate_for_field(
                owner.display_name, "shared_owner_display_name"
            )

    @property
    def shared_source(self):
        """Živý zdroj zdieľania (ponuka, portfólio položka, príspevok) alebo None."""
        if self.post_type == self.PostType.SHARED_OFFER:
            return self.shared_offer
        if self.post_type == self.PostType.SHARED_PORTFOLIO_ITEM:
            return self.shared_portfolio_item
        if self.post_type == self.PostType.SHARED_FEED_POST:
            return self.shared_feed_post
        return None

    @property
    def is_shared_content_currently_visible(self) -> bool:
        """ZMENA 3: je zdieľaný originál *práve teraz* verejne dostupný?

        Rozlišuje tri stavy, ktoré čítací endpoint (Fáza 2) potrebuje:

        1. FK je None (originál zmazaný)      -> False; renderuj zo snapshotu.
        2. FK žije, ale je skrytý / vlastník   -> False; "obsah je momentálne
           má is_public=False                        nedostupný", bez prekliku.
        3. FK žije a je viditeľný              -> True; renderuj naživo + preklik.

        Stavy 1 a 2 rozlíši volajúci cez ``shared_offer_id``/
        ``shared_portfolio_item_id`` (None = zmazané).

        ZÁMERNE bez kontroly blokovania – tá závisí od diváka, nie od príspevku.
        Endpoint ju doloží cez ``shared_owner_id`` (funguje aj na osirelom
        príspevku, kde je FK na obsah už NULL) – rovnaký vzor ako
        ``offer_visibility.review_hidden_from_user``.
        """
        if self.post_type == self.PostType.FREE_POST:
            return True  # nemá zdieľaný obsah, nie je čo skrývať
        source = self.shared_source
        if source is None:
            return False
        return shared_content_is_publicly_visible(
            owner=self.shared_owner,
            is_hidden=getattr(source, "is_hidden", False),
        )
