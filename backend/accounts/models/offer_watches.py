"""Uložené filtre sledovania ponúk a dopytov."""

from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models.functions import Coalesce
from django.utils.translation import gettext_lazy as _

from ..district_registry import (
    SUPPORTED_OFFER_COUNTRIES,
    get_offer_district_label,
    normalize_offer_country_code,
    resolve_offer_district_code,
)


MAX_OFFER_WATCHES_PER_USER = 5


class OfferWatch(models.Model):
    """Používateľom uložené kritériá na sledovanie nových kariet."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="offer_watches",
        verbose_name=_("Používateľ"),
    )
    slot = models.PositiveSmallIntegerField(
        _("Pozícia"),
        help_text=_("Interná pozícia od 1 do 5, ktorá vynucuje limit sledovaní."),
    )
    category = models.CharField(_("Kategória"), max_length=100)
    subcategory = models.CharField(_("Podkategória"), max_length=100)
    is_seeking = models.BooleanField(
        _("Dopyt"),
        default=False,
        help_text=_("True sleduje dopyty, False sleduje ponuky."),
    )
    country_code = models.CharField(_("Krajina"), max_length=2)
    district_code = models.CharField(
        _("Kód okresu"), max_length=80, blank=True, default=""
    )
    price_min = models.DecimalField(
        _("Cena od"), max_digits=10, decimal_places=2, null=True, blank=True
    )
    price_max = models.DecimalField(
        _("Cena do"), max_digits=10, decimal_places=2, null=True, blank=True
    )
    created_at = models.DateTimeField(_("Vytvorené"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Aktualizované"), auto_now=True)

    class Meta:
        verbose_name = _("Sledovanie")
        verbose_name_plural = _("Sledovania")
        ordering = ["-created_at", "-id"]
        constraints = [
            models.CheckConstraint(
                check=models.Q(slot__gte=1, slot__lte=MAX_OFFER_WATCHES_PER_USER),
                name="acc_watch_slot_range",
            ),
            models.UniqueConstraint(
                fields=["user", "slot"],
                name="acc_watch_unique_user_slot",
            ),
            models.CheckConstraint(
                check=models.Q(country_code__in=SUPPORTED_OFFER_COUNTRIES),
                name="acc_watch_supported_country",
            ),
            models.CheckConstraint(
                check=~models.Q(category=""),
                name="acc_watch_category_required",
            ),
            models.CheckConstraint(
                check=~models.Q(subcategory=""),
                name="acc_watch_subcategory_required",
            ),
            models.CheckConstraint(
                check=models.Q(price_min__isnull=True) | models.Q(price_min__gte=0),
                name="acc_watch_price_min_nonneg",
            ),
            models.CheckConstraint(
                check=models.Q(price_max__isnull=True) | models.Q(price_max__gte=0),
                name="acc_watch_price_max_nonneg",
            ),
            models.CheckConstraint(
                check=(
                    models.Q(price_min__isnull=True)
                    | models.Q(price_max__isnull=True)
                    | models.Q(price_min__lte=models.F("price_max"))
                ),
                name="acc_watch_price_order",
            ),
            models.UniqueConstraint(
                models.F("user"),
                models.F("category"),
                models.F("subcategory"),
                models.F("is_seeking"),
                models.F("country_code"),
                models.F("district_code"),
                Coalesce("price_min", models.Value(Decimal("-1.00"))),
                Coalesce("price_max", models.Value(Decimal("-1.00"))),
                name="acc_watch_unique_filters",
            ),
        ]
        indexes = [
            models.Index(
                fields=["user", "-created_at"], name="acc_watch_user_new_idx"
            ),
            models.Index(
                fields=[
                    "category",
                    "subcategory",
                    "is_seeking",
                    "country_code",
                    "district_code",
                ],
                name="acc_watch_match_idx",
            ),
        ]

    def __str__(self):
        watch_type = _("Dopyt") if self.is_seeking else _("Ponuka")
        return f"{self.user} – {watch_type}: {self.subcategory}"

    def clean_fields(self, exclude=None):
        """Normalizuj hodnoty ešte pred kontrolou dĺžky databázových polí."""
        self.category = (self.category or "").strip()
        self.subcategory = (self.subcategory or "").strip()
        self.country_code = normalize_offer_country_code(self.country_code)
        self.district_code = (self.district_code or "").strip().lower()
        super().clean_fields(exclude=exclude)

    def clean(self):
        super().clean()
        errors = {}
        if not self.category:
            errors["category"] = _("Kategória je povinná.")
        if not self.subcategory:
            errors["subcategory"] = _("Podkategória je povinná.")
        if not self.country_code:
            errors["country_code"] = _("Vyber podporovanú krajinu.")
        if (
            self.district_code
            and self.country_code
        ):
            district_label = get_offer_district_label(
                self.country_code, self.district_code
            )
            if not district_label:
                errors["district_code"] = _("Okres nepatrí do zvolenej krajiny.")
            else:
                canonical_code, canonical_label = resolve_offer_district_code(
                    self.country_code, district_label
                )
                if canonical_label:
                    self.district_code = canonical_code

        if self.price_min is not None and self.price_min < 0:
            errors["price_min"] = _("Minimálna cena nemôže byť záporná.")
        if self.price_max is not None and self.price_max < 0:
            errors["price_max"] = _("Maximálna cena nemôže byť záporná.")
        if (
            self.price_min is not None
            and self.price_max is not None
            and self.price_min > self.price_max
        ):
            errors["price_max"] = _(
                "Maximálna cena musí byť aspoň minimálna cena."
            )

        if errors:
            raise ValidationError(errors)


class OfferWatchNotification(models.Model):
    """
    Idempotentný kandidát na jednu notifikáciu používateľa o karte.

    Doručovacia fáza musí pred odoslaním znovu overiť, že karta stále
    zodpovedá aspoň jednému existujúcemu sledovaniu používateľa.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="offer_watch_notifications",
        verbose_name=_("Používateľ"),
    )
    watch = models.ForeignKey(
        OfferWatch,
        on_delete=models.SET_NULL,
        related_name="notification_candidates",
        null=True,
        blank=True,
        verbose_name=_("Sledovanie"),
    )
    offer = models.ForeignKey(
        "accounts.OfferedSkill",
        on_delete=models.CASCADE,
        related_name="watch_notifications",
        verbose_name=_("Ponuka alebo dopyt"),
    )
    matched_at = models.DateTimeField(_("Zhoda nájdená"), auto_now_add=True)
    notified_at = models.DateTimeField(
        _("Notifikácia odoslaná"), null=True, blank=True
    )

    class Meta:
        verbose_name = _("Kandidát notifikácie sledovania")
        verbose_name_plural = _("Kandidáti notifikácií sledovania")
        ordering = ["-matched_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "offer"],
                name="acc_watch_notif_unique_offer",
            )
        ]
        indexes = [
            models.Index(
                fields=["user", "-matched_at"], name="acc_watch_notif_user_idx"
            ),
            models.Index(
                fields=["notified_at", "matched_at"], name="acc_watch_notif_pending_idx"
            ),
        ]

    def __str__(self):
        return f"{self.user} – offer #{self.offer_id}"

    def clean(self):
        super().clean()
        if self.watch_id and self.user_id and self.watch.user_id != self.user_id:
            raise ValidationError(
                {"watch": _("Sledovanie musí patriť zvolenému používateľovi.")}
            )
        if self.offer_id and self.user_id and self.offer.user_id == self.user_id:
            raise ValidationError(
                {"offer": _("Vlastná karta nemôže vytvoriť notifikáciu sledovania.")}
            )
