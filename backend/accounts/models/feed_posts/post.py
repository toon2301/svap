"""FeedPost – hlavný model príspevku na nástenke.

Zdieľanie s prežitím zmazania: ``FK(SET_NULL)`` + denormalizovaný snapshot,
presne vzor ``Review.offer`` + ``reviewed_user``. Zdieľať možno aj CUDZÍ obsah,
ak je verejne viditeľný – overuje sa viditeľnosť, nie vlastníctvo
(``accounts.services.feed_share_visibility``).

author: ``on_delete=CASCADE`` podľa ``Review.reviewer``. Pozor: pri GDPR zmazaní
účtu sa User riadok NEmaže (anonymizuje sa), takže CASCADE nikdy nevystrelí –
autorský obsah sa hard-deletuje explicitne v
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

from .sharing import SHARED_SNAPSHOT_FIELDS, FeedPostSharingMixin
from .text_limits import MAX_TEXT_LENGTH, ensure_text_within_limit


class FeedPost(FeedPostSharingMixin, models.Model):
    """Príspevok na nástenke: voľný (fotka+text) alebo zdieľanie ĽUBOVOĽNEJ
    verejne viditeľnej ponuky/portfólio položky (aj cudzej – viď save())."""

    class PostType(models.TextChoices):
        FREE_POST = "free_post", _("Voľný príspevok")
        SHARED_OFFER = "shared_offer", _("Zdieľaná ponuka")
        SHARED_PORTFOLIO_ITEM = "shared_portfolio_item", _("Zdieľané portfólio")
        SHARED_FEED_POST = "shared_feed_post", _("Zdieľaný príspevok")

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

    # Fotky žijú v samostatnej tabuľke ``FeedPostImage`` (Fáza 4.4, limit 5).
    # Do Fázy 4.3 boli polia ``image_*`` priamo tu – pri jednej fotke to stačilo.

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
    # Zdieľaný VOĽNÝ príspevok. Ukazuje VŽDY na koreňový free_post, nikdy na iné
    # zdieľanie – ``_flatten_reshare`` reťazec pri vzniku sploští na jeden krok,
    # takže tu nemôže vzniknúť rekurzia ani neobmedzené vnorenie.
    shared_feed_post = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        related_name="reshares",
        null=True,
        blank=True,
        verbose_name=_("Zdieľaný príspevok"),
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
    # Snapshot textu zdieľaného voľného príspevku. Vlastné pole (nie
    # ``shared_title``): caption má 500 znakov, title 200 – zdieľanie by tak
    # obsah orezalo. Ponuka/portfólio ho nechávajú prázdny.
    # POZOR (GDPR): je to zmrazená kópia textu INÉHO používateľa, takže ju
    # anonymizácia účtu musí prepísať – rovnako ako ``shared_owner_display_name``
    # (viď ``account_deletion._scrub_shared_owner_snapshots``).
    shared_post_caption = models.CharField(
        _("Snapshot: text príspevku"), max_length=500, blank=True, default=""
    )

    created_at = models.DateTimeField(_("Vytvorené"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Upravené"), auto_now=True)

    class Meta:
        verbose_name = _("Príspevok na nástenke")
        verbose_name_plural = _("Príspevky na nástenke")
        ordering = ["-created_at", "-id"]
        constraints = [
            # FREE_POST: caption povinný, žiadne zdieľanie, fotky voliteľné.
            # SHARED_*: snapshot title povinný (FK je nullable kvôli SET_NULL
            # survival vzoru – NEsmie byť v constraints!), druhé zdieľanie NULL.
            #
            # „Zdieľanie nesmie mať fotku" tu od Fázy 4.4 NIE JE: fotky sú riadky
            # v ``FeedPostImage``, a počet riadkov v child tabuľke CheckConstraint
            # vyjadriť nevie. Vynucuje sa pri upload-init (``_get_own_free_post``
            # prepustí len FREE_POST) – rovnako ako limit MAX_FEED_POST_IMAGES.
            models.CheckConstraint(
                check=(
                    models.Q(
                        post_type="free_post",
                        shared_offer__isnull=True,
                        shared_portfolio_item__isnull=True,
                        shared_feed_post__isnull=True,
                    )
                    & ~models.Q(caption="")
                )
                | (
                    models.Q(
                        post_type="shared_offer",
                        shared_portfolio_item__isnull=True,
                        shared_feed_post__isnull=True,
                    )
                    & ~models.Q(shared_title="")
                )
                | (
                    models.Q(
                        post_type="shared_portfolio_item",
                        shared_offer__isnull=True,
                        shared_feed_post__isnull=True,
                    )
                    & ~models.Q(shared_title="")
                )
                | (
                    # SHARED_FEED_POST: ostatné zdroje NULL.
                    # Na rozdiel od ponuky/portfólia tu ZÁMERNE NIE JE podmienka
                    # „snapshot musí byť neprázdny": shared_post_caption je text
                    # iného používateľa, ktorý GDPR anonymizácia legitímne maže
                    # na prázdny (viď account_deletion._scrub_shared_owner_snapshots).
                    # shared_title pri ponuke je názov kategórie, nie osobný
                    # obsah, preto tam podmienka konfliktu nerobí. Prítomnosť
                    # zdroja pri VZNIKU vynucuje model (shared_source_required) –
                    # DB constraint ju vyjadriť nevie tak či tak (FK musí ostať
                    # nullable kvôli SET_NULL survival vzoru).
                    models.Q(
                        post_type="shared_feed_post",
                        shared_offer__isnull=True,
                        shared_portfolio_item__isnull=True,
                    )
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
        ensure_text_within_limit(self.caption, field_label="Text príspevku")
        if self._state.adding:
            self._apply_shared_source()
        else:
            refreshed = self._revalidate_changed_shared_source(
                kwargs.get("update_fields")
            )
            # Bez tohto zlúčenia by prevalidovaný snapshot (nový vlastník, názov,
            # kategória, náhľad) ostal len v pamäti a do DB by sa nezapísal –
            # v riadku by ostal starý vlastník pri novom zdroji.
            if refreshed and kwargs.get("update_fields") is not None:
                kwargs["update_fields"] = list(
                    dict.fromkeys([*kwargs["update_fields"], *refreshed])
                )
        super().save(*args, **kwargs)

