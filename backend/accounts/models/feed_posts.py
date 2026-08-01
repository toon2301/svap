"""Nástenka/Feed – dátový model (Fáza 1: len modely + upload fotky).

Znovupoužité vzory:
- FeedPostLike: dedikovaná tabuľka podľa ``PortfolioItemLike`` (unique + 2 indexy).
  Self-like je povolený – rovnaké rozhodnutie ako pri portfóliu (obsah, nie
  identita; self-like guard má len ProfileLike).
- Zdieľanie s prežitím zmazania: ``FK(SET_NULL)`` + denormalizovaný snapshot,
  presne vzor ``Review.offer`` + ``reviewed_user``. Zdieľať možno aj CUDZÍ
  obsah, ak je verejne viditeľný – overuje sa viditeľnosť, nie vlastníctvo
  (``accounts.services.feed_share_visibility``).
- FeedPostReport: podľa ``ReviewReport`` (reason = voľný text max 100, žiadny
  choices enum – konzistentné s Photo/Review/UserReport).
- author: ``on_delete=CASCADE`` podľa ``Review.reviewer``. Pozor: pri GDPR
  zmazaní účtu sa User riadok NEmaže (anonymizuje sa), takže CASCADE nikdy
  nevystrelí – autorský obsah sa hard-deletuje explicitne v
  ``accounts.account_deletion.purge_user_content`` (rovnako ako recenzie/ponuky).

Viditeľnosť (TODO Fáza 2 – čítací endpoint): príspevky autora s
``is_public=False`` sa NEZOBRAZUJÚ vo verejnom/všeobecnom feede (ani prihláseným
iným, ani anonymom) – viditeľné sú len autorovi. Filter bude triviálny:
``FeedPost.objects.filter(author__is_public=True)`` (+ vetva pre vlastné posty),
FK štruktúra to ničím nesťažuje.
"""

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _

from accounts.services.feed_share_visibility import (
    SHARE_REASON_MESSAGES,
    shared_content_is_publicly_visible,
    shared_content_share_block_reason,
)


MAX_TEXT_LENGTH = 500


def _ensure_text_within_limit(value: str, *, field_label: str) -> None:
    """Vynúť dĺžku textu nezávisle od DB backendu.

    Samotné ``CharField(max_length=500)`` stačiť nemôže: Postgres varchar(500)
    limit vynúti, ale SQLite (testy) ho ignoruje – kontrola len na úrovni DB by
    teda platila v produkcii a v testoch nie. ``full_clean()`` zámerne
    nevoláme – validoval by aj zvyšok modelu a zmenil by existujúce správanie
    (prázdny caption dnes padá na DB CheckConstraint, nie na ValidationError).
    """
    if value and len(value) > MAX_TEXT_LENGTH:
        raise ValidationError(
            f"{field_label} môže mať najviac {MAX_TEXT_LENGTH} znakov.",
            code="max_length",
        )


class FeedPost(models.Model):
    """Príspevok na nástenke: voľný (fotka+text) alebo zdieľanie ĽUBOVOĽNEJ
    verejne viditeľnej ponuky/portfólio položky (aj cudzej – viď save())."""

    class PostType(models.TextChoices):
        FREE_POST = "free_post", _("Voľný príspevok")
        SHARED_OFFER = "shared_offer", _("Zdieľaná ponuka")
        SHARED_PORTFOLIO_ITEM = "shared_portfolio_item", _("Zdieľané portfólio")

    class ImageStatus(models.TextChoices):
        PENDING = "pending", _("Čaká na spracovanie")
        APPROVED = "approved", _("Schválené")
        REJECTED = "rejected", _("Zamietnuté")

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="feed_posts",
        verbose_name=_("Autor"),
    )
    post_type = models.CharField(
        _("Typ príspevku"),
        max_length=30,
        choices=PostType.choices,
    )
    # Max 500 znakov – konzistentné s PortfolioItem.description. Povinný pre
    # FREE_POST (DB CheckConstraint), voliteľný pre zdieľania.
    # CharField (nie TextField): na TextField je max_length len form-level nápoveda,
    # takže ORM/DB by dlhší text ticho prijali. CharField = varchar(500) v Postgres,
    # čiže limit vynúti aj priamy ORM zápis (backend = zdroj pravdy).
    caption = models.CharField(_("Text"), max_length=500, blank=True, default="")

    # --- Fotka (len FREE_POST, max 1) – rovnaká štruktúra ako PortfolioImage,
    # ale priamo na tomto modeli (1 fotka → netreba child tabuľku).
    # image_status = "" (blank) znamená "príspevok bez fotky".
    image_status = models.CharField(
        _("Stav fotky"),
        max_length=20,
        choices=ImageStatus.choices,
        blank=True,
        default="",
    )
    image_pending_key = models.CharField(
        _("S3 kľúč (pending)"), max_length=1024, blank=True, default=""
    )
    image_approved_key = models.CharField(
        _("S3 kľúč (approved)"), max_length=1024, blank=True, default=""
    )
    image_thumbnail_key = models.CharField(
        _("S3 kľúč (thumbnail)"), max_length=1024, blank=True, default=""
    )
    image_original_filename = models.CharField(
        _("Pôvodný názov súboru"), max_length=255, blank=True, default=""
    )
    image_content_type = models.CharField(
        _("Content-Type"), max_length=100, blank=True, default=""
    )
    image_size_bytes = models.BigIntegerField(
        _("Veľkosť (bytes)"), null=True, blank=True
    )
    image_width = models.IntegerField(_("Šírka"), null=True, blank=True)
    image_height = models.IntegerField(_("Výška"), null=True, blank=True)
    image_rejected_reason = models.CharField(
        _("Dôvod zamietnutia"), max_length=255, blank=True, default=""
    )
    image_processed_at = models.DateTimeField(
        _("Spracované o"), null=True, blank=True
    )

    # --- Zdieľanie (SET_NULL → príspevok prežije zmazanie originálu; obsah
    # zostáva v snapshot poliach nižšie – vzor Review.offer + reviewed_user).
    shared_offer = models.ForeignKey(
        "accounts.OfferedSkill",
        on_delete=models.SET_NULL,
        related_name="feed_shares",
        null=True,
        blank=True,
        verbose_name=_("Zdieľaná ponuka"),
    )
    shared_portfolio_item = models.ForeignKey(
        "portfolio.PortfolioItem",
        on_delete=models.SET_NULL,
        related_name="feed_shares",
        null=True,
        blank=True,
        verbose_name=_("Zdieľaná položka portfólia"),
    )
    # Pôvodný vlastník zdieľaného obsahu. Od chvíle, keď možno zdieľať aj CUDZÍ
    # obsah, sa NEROVNÁ ``author``. SET_NULL len formálne – User riadok sa pri GDPR
    # zmazaní nemaže (len anonymizuje), takže FK v praxi prežije vždy.
    # Nutný pre ZMENA 3: keď je ``shared_offer``/``shared_portfolio_item`` už NULL
    # (originál zmazaný), je to JEDINÝ spôsob, ako na osirelom príspevku ďalej
    # vynútiť blokovanie a súkromný profil – rovnaký dôvod, prečo má Review
    # denormalizovaný ``reviewed_user`` (viď ``offer_visibility.review_hidden_from_user``).
    shared_owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="feed_shares_received",
        null=True,
        blank=True,
        verbose_name=_("Pôvodný vlastník zdieľaného obsahu"),
    )
    # Denormalizovaný snapshot – naplnený v save() pri vzniku zdieľania,
    # nezávislý od SET_NULL (nikdy sa nenuluje).
    # POZOR (GDPR): ``shared_owner_display_name`` je zmrazená kópia mena INÉHO
    # používateľa, preto ju anonymizácia účtu musí prepísať – rieši to
    # ``account_deletion._scrub_shared_owner_snapshots`` (rovnaký dôvod a vzor ako
    # ``_scrub_actor_notifications``). Pre živé zobrazenie preferuj ``shared_owner``.
    shared_owner_display_name = models.CharField(
        _("Snapshot: meno vlastníka"), max_length=200, blank=True, default=""
    )
    shared_title = models.CharField(
        _("Snapshot: názov"), max_length=200, blank=True, default=""
    )
    shared_category = models.CharField(
        _("Snapshot: kategória"), max_length=100, blank=True, default=""
    )
    # POZOR: na rozdiel od shared_title/shared_category to NIE JE sebestačný
    # snapshot – je to kľúč na obrázok ORIGINÁLU, ktorý vlastní pôvodný obsah.
    # Po zmazaní ponuky/položky/účtu ho post_delete signály reálne zmažú zo
    # storage, takže kľúč môže ukazovať na neexistujúci objekt.
    # Fáza 2 preto: obrázok ber zo ŽIVÉHO zdroja, kým existuje, a tento kľúč
    # použi len ako fallback s ošetrením 404 (placeholder). Nikdy ho nerenderuj,
    # keď ``is_shared_content_currently_visible`` je False.
    shared_thumbnail_key = models.CharField(
        _("Snapshot: S3 kľúč náhľadu"), max_length=1024, blank=True, default=""
    )

    created_at = models.DateTimeField(_("Vytvorené"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Upravené"), auto_now=True)

    class Meta:
        verbose_name = _("Príspevok na nástenke")
        verbose_name_plural = _("Príspevky na nástenke")
        ordering = ["-created_at", "-id"]
        constraints = [
            # FREE_POST: caption povinný, žiadne zdieľanie, fotka voliteľná.
            # SHARED_*: snapshot title povinný (FK je nullable kvôli SET_NULL
            # survival vzoru – NEsmie byť v constraints!), druhé zdieľanie NULL
            # a fotka zakázaná (image_status = "").
            models.CheckConstraint(
                check=(
                    models.Q(
                        post_type="free_post",
                        shared_offer__isnull=True,
                        shared_portfolio_item__isnull=True,
                    )
                    & ~models.Q(caption="")
                )
                | (
                    models.Q(
                        post_type="shared_offer",
                        shared_portfolio_item__isnull=True,
                        image_status="",
                    )
                    & ~models.Q(shared_title="")
                )
                | (
                    models.Q(
                        post_type="shared_portfolio_item",
                        shared_offer__isnull=True,
                        image_status="",
                    )
                    & ~models.Q(shared_title="")
                ),
                name="feed_post_type_consistency",
            ),
        ]
        indexes = [
            # "Moje príspevky" na profile autora.
            models.Index(
                fields=["author", "created_at"],
                name="acc_fpost_author_cr_idx",
            ),
            # Chronologický feed.
            models.Index(fields=["created_at"], name="acc_fpost_created_idx"),
        ]

    def __str__(self):
        return f"FeedPost #{self.id} ({self.post_type}) od {self.author_id}"

    def save(self, *args, **kwargs):
        """Pri vzniku/zmene zdieľania over viditeľnosť cieľa a denormalizuj snapshot.

        Zdieľať možno KTORÝKOĽVEK verejne viditeľný obsah (nie len vlastný) –
        overuje sa teda viditeľnosť, nie vlastníctvo: skrytá ponuka, neverejný
        vlastník a blokovanie sú odmietnuté. Vynucuje sa to tu, na modeli, lebo
        je to cross-table pravidlo, ktoré DB CheckConstraint nevyjadrí. Vzor
        plnenia snapshotu = Review.save (denormalizácia reviewed_user pri vzniku).

        Používame ``_state.adding`` (nie ``pk is None``) – pri ``force_insert``
        s vopred prideleným id by sa validácia inak preskočila.
        """
        _ensure_text_within_limit(self.caption, field_label="Text príspevku")
        if self._state.adding:
            self._apply_shared_source()
        else:
            self._revalidate_changed_shared_source(kwargs.get("update_fields"))
        super().save(*args, **kwargs)

    def _apply_shared_source(self) -> None:
        """Vyžaduj zdrojový FK pre SHARED_* typy, over viditeľnosť a naplň snapshot.

        Zdrojový FK je pri vzniku POVINNÝ: DB CheckConstraint ho vyžadovať nemôže
        (musí ostať nullable kvôli SET_NULL survival vzoru), takže bez tejto
        kontroly by sa dal vytvoriť SHARED_* príspevok len s ``shared_title`` a
        celá kontrola viditeľnosti/blokovania by sa obišla – a výsledok by bol
        nerozoznateľný od legitímneho osireného zdieľania.
        """
        if self.post_type == self.PostType.SHARED_OFFER:
            if self.shared_offer_id is None:
                raise ValidationError(
                    "Zdieľanie ponuky vyžaduje existujúcu ponuku.",
                    code="shared_source_required",
                )
            offer = self.shared_offer
            self._apply_shared_owner(offer.user, is_hidden=offer.is_hidden)
            if not self.shared_title:
                self.shared_title = offer.subcategory or offer.category
            if not self.shared_category:
                self.shared_category = offer.category
            if not self.shared_thumbnail_key:
                first_image = (
                    offer.images.filter(status="approved")
                    .exclude(approved_key="")
                    .order_by("order", "id")
                    .first()
                )
                if first_image is not None:
                    self.shared_thumbnail_key = first_image.approved_key
        elif self.post_type == self.PostType.SHARED_PORTFOLIO_ITEM:
            if self.shared_portfolio_item_id is None:
                raise ValidationError(
                    "Zdieľanie portfólia vyžaduje existujúcu položku.",
                    code="shared_source_required",
                )
            item = self.shared_portfolio_item
            # PortfolioItem nemá is_hidden – viditeľnosť určuje len vlastník.
            self._apply_shared_owner(item.owner, is_hidden=False)
            if not self.shared_title:
                self.shared_title = item.title
            if not self.shared_category:
                self.shared_category = item.category
            if not self.shared_thumbnail_key:
                cover = item.cover_image
                if cover is not None and cover.thumbnail_key:
                    self.shared_thumbnail_key = cover.thumbnail_key
                else:
                    first_image = (
                        item.images.exclude(thumbnail_key="")
                        .order_by("order", "id")
                        .first()
                    )
                    if first_image is not None:
                        self.shared_thumbnail_key = first_image.thumbnail_key

    def _revalidate_changed_shared_source(self, update_fields) -> None:
        """Pri UPDATE prehoď validáciu znova, ak sa zmenil zdroj zdieľania.

        Bez toho by sa dal blok/viditeľnosť obísť tak, že sa príspevok najprv
        vytvorí nad povoleným zdrojom a potom sa FK prepíše na zakázaný.
        Prestavenie zdroja na NULL sa NEvaliduje – to je legitímne osirenie
        (SET_NULL po zmazaní originálu).
        """
        source_fields = ("shared_offer", "shared_portfolio_item")
        if update_fields is not None and not any(
            field in update_fields for field in source_fields
        ):
            return  # hot path (napr. update stavu fotky) – žiadny extra dotaz

        previous = (
            FeedPost.objects.filter(pk=self.pk)
            .values("shared_offer_id", "shared_portfolio_item_id")
            .first()
        )
        if previous is None:
            return

        if (
            self.shared_offer_id is not None
            and self.shared_offer_id != previous["shared_offer_id"]
        ):
            offer = self.shared_offer
            self._reset_shared_owner()
            self._apply_shared_owner(offer.user, is_hidden=offer.is_hidden)
        if (
            self.shared_portfolio_item_id is not None
            and self.shared_portfolio_item_id != previous["shared_portfolio_item_id"]
        ):
            item = self.shared_portfolio_item
            self._reset_shared_owner()
            self._apply_shared_owner(item.owner, is_hidden=False)

    def _reset_shared_owner(self) -> None:
        """Zahoď starého vlastníka, aby sa pri zmene zdroja prepísal na nového."""
        self.shared_owner_id = None
        self.shared_owner_display_name = ""

    def _apply_shared_owner(self, owner, *, is_hidden: bool) -> None:
        """Over zdieľateľnosť cieľa a zapíš vlastníka + jeho snapshot."""
        reason = shared_content_share_block_reason(
            owner=owner,
            author_id=self.author_id,
            is_hidden=is_hidden,
        )
        if reason is not None:
            raise ValidationError(SHARE_REASON_MESSAGES[reason], code=reason)

        self.shared_owner_id = owner.pk
        if not self.shared_owner_display_name:
            # max_length=200 – display_name skladá first+last name (2×150), preto orež.
            self.shared_owner_display_name = (owner.display_name or "")[:200]

    @property
    def shared_source(self):
        """Živý zdroj zdieľania (ponuka alebo portfólio položka), alebo None."""
        if self.post_type == self.PostType.SHARED_OFFER:
            return self.shared_offer
        if self.post_type == self.PostType.SHARED_PORTFOLIO_ITEM:
            return self.shared_portfolio_item
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

    def image_storage_keys(self) -> list[str]:
        """Všetky S3/storage kľúče fotky – pre cleanup po zmazaní príspevku."""
        return [
            self.image_pending_key,
            self.image_approved_key,
            self.image_thumbnail_key,
        ]


class FeedPostLike(models.Model):
    """Like príspevku – presne podľa vzoru PortfolioItemLike."""

    post = models.ForeignKey(
        FeedPost,
        on_delete=models.CASCADE,
        related_name="likes",
        verbose_name=_("Príspevok"),
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="feed_post_likes",
        verbose_name=_("Používateľ"),
    )
    created_at = models.DateTimeField(_("Vytvorené"), auto_now_add=True)

    class Meta:
        verbose_name = _("Páči sa mi príspevok")
        verbose_name_plural = _("Páči sa mi príspevky")
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["post", "user"],
                name="unique_feed_post_like_per_user",
            )
        ]
        indexes = [
            models.Index(
                fields=["post", "created_at"],
                name="acc_fplike_post_cr_idx",
            ),
            models.Index(
                fields=["user", "created_at"],
                name="acc_fplike_user_cr_idx",
            ),
        ]

    def __str__(self):
        return f"Like príspevku #{self.post_id} od používateľa {self.user_id}"


class FeedPostComment(models.Model):
    """Komentár k príspevku (prvý komentárový model v appke).

    author = CASCADE rovnako ako FeedPost.author/Review.reviewer – autorov
    obsah sa pri GDPR zmazaní účtu hard-deletuje cez purge_user_content
    (User riadok sa nemaže, len anonymizuje, takže CASCADE sám nevystrelí).
    """

    post = models.ForeignKey(
        FeedPost,
        on_delete=models.CASCADE,
        related_name="comments",
        verbose_name=_("Príspevok"),
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="feed_post_comments",
        verbose_name=_("Autor"),
    )
    # CharField z rovnakého dôvodu ako FeedPost.caption – TextField by limit nevynútil.
    text = models.CharField(_("Text"), max_length=500)
    created_at = models.DateTimeField(_("Vytvorené"), auto_now_add=True)

    class Meta:
        verbose_name = _("Komentár k príspevku")
        verbose_name_plural = _("Komentáre k príspevkom")
        ordering = ["created_at", "id"]
        indexes = [
            models.Index(
                fields=["post", "created_at"],
                name="acc_fpcomm_post_cr_idx",
            ),
        ]

    def __str__(self):
        return f"Komentár #{self.id} k príspevku #{self.post_id}"

    def save(self, *args, **kwargs):
        _ensure_text_within_limit(self.text, field_label="Komentár")
        super().save(*args, **kwargs)


class FeedPostReport(models.Model):
    """Nahlásenie príspevku – presne podľa vzoru ReviewReport.

    Jeden používateľ môže nahlásiť konkrétny príspevok iba raz. reason je voľný
    text (max 100) – rovnaká konvencia ako Photo/Review/UserReport (žiadny
    choices enum v appke neexistuje).
    """

    post = models.ForeignKey(
        FeedPost,
        on_delete=models.CASCADE,
        related_name="reports",
        verbose_name=_("Príspevok"),
    )
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="feed_post_reports",
        verbose_name=_("Nahlásil"),
    )
    reason = models.CharField(_("Dôvod"), max_length=100)
    description = models.TextField(_("Popis"), blank=True)
    created_at = models.DateTimeField(_("Vytvorené"), auto_now_add=True)
    is_resolved = models.BooleanField(_("Vyriešené"), default=False)

    class Meta:
        verbose_name = _("Nahlásenie príspevku")
        verbose_name_plural = _("Nahlásenia príspevkov")
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["post", "reported_by"],
                name="unique_feed_post_report_per_user",
            )
        ]

    def __str__(self):
        return f"Nahlásenie príspevku #{self.post_id} od {self.reported_by_id}"
