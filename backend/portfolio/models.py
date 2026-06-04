from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _

from accounts.models import OfferedSkill
from swaply.validators import validate_image_file


class PortfolioItem(models.Model):
    """Portfolio entry owned by either an individual or a company account."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="portfolio_items",
        verbose_name=_("Vlastnik"),
    )
    title = models.CharField(_("Nazov"), max_length=120)
    category = models.CharField(_("Kategoria"), max_length=100)
    description = models.TextField(_("Popis"), max_length=1000, blank=True, default="")
    related_offer = models.ForeignKey(
        OfferedSkill,
        on_delete=models.SET_NULL,
        related_name="portfolio_items",
        verbose_name=_("Suvisiaca ponuka"),
        null=True,
        blank=True,
    )
    cover_image = models.ForeignKey(
        "portfolio.PortfolioImage",
        on_delete=models.SET_NULL,
        related_name="+",
        verbose_name=_("Titulna fotka"),
        null=True,
        blank=True,
    )
    sort_order = models.PositiveIntegerField(_("Poradie"), default=0)
    created_at = models.DateTimeField(_("Vytvorene"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Aktualizovane"), auto_now=True)

    class Meta:
        verbose_name = _("Polozka portfolia")
        verbose_name_plural = _("Polozky portfolia")
        ordering = ["sort_order", "id"]
        indexes = [
            models.Index(
                fields=["owner", "sort_order", "id"],
                name="port_item_owner_order_idx",
            ),
        ]

    def __str__(self):
        return f"{self.title} ({self.owner_id})"

    def save(self, *args, **kwargs):
        update_fields = kwargs.get("update_fields")
        if update_fields is None:
            self.full_clean()
        else:
            update_field_names = self._model_field_names(update_fields)
            excluded = [
                field.name
                for field in self._meta.fields
                if field.name not in update_field_names
            ]
            self.clean_fields(exclude=excluded)
            if {"owner", "related_offer", "cover_image"} & update_field_names:
                self.clean()
        return super().save(*args, **kwargs)

    def clean(self):
        super().clean()
        if self.related_offer_id and self.owner_id:
            offer = self._state.fields_cache.get("related_offer")
            offer_owner_id = getattr(offer, "user_id", None)
            if offer_owner_id is None:
                offer_owner_id = (
                    OfferedSkill.objects.filter(pk=self.related_offer_id)
                    .values_list("user_id", flat=True)
                    .first()
                )
            if offer_owner_id != self.owner_id:
                raise ValidationError(
                    {
                        "related_offer": _(
                            "Suvisiaca ponuka musi patrit vlastnikovi portfolia."
                        )
                    }
                )

        if self.cover_image_id:
            cover = self._state.fields_cache.get("cover_image")
            cover_item_id = getattr(cover, "item_id", None)
            if cover_item_id is None:
                cover_item_id = (
                    PortfolioImage.objects.filter(pk=self.cover_image_id)
                    .values_list("item_id", flat=True)
                    .first()
                )
            if cover_item_id is not None and cover_item_id != self.pk:
                raise ValidationError(
                    {
                        "cover_image": _(
                            "Titulna fotka musi patrit k tejto polozke portfolia."
                        )
                    }
                )

    def _model_field_names(self, update_fields):
        field_names = set()
        for update_field in update_fields or ():
            update_field = str(update_field)
            for field in self._meta.fields:
                if update_field in (field.name, field.attname):
                    field_names.add(field.name)
                    break
        return field_names


class PortfolioImage(models.Model):
    """Image belonging to a portfolio item.

    The storage fields mirror offer images so future upload work can reuse the
    existing direct-to-storage pattern without exposing internal keys via API.
    """

    class Status(models.TextChoices):
        PENDING = "pending", _("Caka na spracovanie")
        APPROVED = "approved", _("Schvalene")
        REJECTED = "rejected", _("Zamietnute")

    item = models.ForeignKey(
        PortfolioItem,
        on_delete=models.CASCADE,
        related_name="images",
        verbose_name=_("Polozka portfolia"),
    )
    image = models.ImageField(
        _("Obrazok"),
        upload_to="portfolio/",
        validators=[validate_image_file],
        blank=True,
        null=True,
    )
    order = models.PositiveIntegerField(_("Poradie"), default=0)
    status = models.CharField(
        _("Stav"),
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        help_text=_("PENDING/REJECTED sa pouzivaju pri neskorsom spracovani obrazkov."),
    )
    pending_key = models.CharField(
        _("S3 kluc (pending)"), max_length=1024, blank=True, default=""
    )
    approved_key = models.CharField(
        _("S3 kluc (approved)"), max_length=1024, blank=True, default=""
    )
    thumbnail_key = models.CharField(
        _("S3 kluc (thumbnail)"), max_length=1024, blank=True, default=""
    )
    medium_key = models.CharField(
        _("S3 kluc (medium)"), max_length=1024, blank=True, default=""
    )
    large_key = models.CharField(
        _("S3 kluc (large)"), max_length=1024, blank=True, default=""
    )
    original_filename = models.CharField(
        _("Povodny nazov suboru"), max_length=255, blank=True, default=""
    )
    content_type = models.CharField(
        _("Content-Type"), max_length=100, blank=True, default=""
    )
    size_bytes = models.BigIntegerField(_("Velkost (bytes)"), null=True, blank=True)
    width = models.IntegerField(_("Sirka"), null=True, blank=True)
    height = models.IntegerField(_("Vyska"), null=True, blank=True)
    rejected_reason = models.CharField(
        _("Dovod zamietnutia"), max_length=255, blank=True, default=""
    )
    processed_at = models.DateTimeField(_("Spracovane o"), null=True, blank=True)
    created_at = models.DateTimeField(_("Vytvorene"), auto_now_add=True)

    class Meta:
        verbose_name = _("Obrazok portfolia")
        verbose_name_plural = _("Obrazky portfolia")
        ordering = ["order", "id"]
        indexes = [
            models.Index(
                fields=["item", "status", "order", "id"],
                name="port_img_item_status_idx",
            ),
        ]

    def __str__(self):
        return f"Obrazok #{self.id} pre portfolio item #{self.item_id}"
