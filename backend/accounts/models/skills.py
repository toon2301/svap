"""Ponuky zručností a ich obrázky + dashboard search projekcia – z models.py."""

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from swaply.validators import validate_image_file


class OfferedSkill(models.Model):
    """Model pre zručnosti, ktoré používateľ ponúka"""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="offered_skills"
    )
    category = models.CharField(_("Kategória"), max_length=100)
    subcategory = models.CharField(_("Podkategória"), max_length=100)
    description = models.TextField(_("Popis"), max_length=100, blank=True)
    detailed_description = models.TextField(
        _("Podrobný popis"), max_length=1000, blank=True
    )
    experience_value = models.FloatField(
        _("Hodnota dĺžky praxe"), null=True, blank=True
    )
    experience_unit = models.CharField(
        _("Jednotka dĺžky praxe"),
        max_length=10,
        choices=[
            ("years", _("Roky")),
            ("months", _("Mesiace")),
        ],
        blank=True,
    )
    tags = models.JSONField(_("Tagy"), default=list, blank=True)
    price_from = models.DecimalField(
        _("Cena od"), max_digits=10, decimal_places=2, null=True, blank=True
    )
    price_currency = models.CharField(_("Mena"), max_length=8, blank=True, default="€")
    price_negotiable = models.BooleanField(_("Cena dohodou"), default=False)
    country_code = models.CharField(_("Krajina"), max_length=2, blank=True, default="")
    district_code = models.CharField(_("Kód okresu"), max_length=80, blank=True, default="")
    district = models.CharField(_("Okres"), max_length=100, blank=True)
    location = models.CharField(_("Miesto"), max_length=35, blank=True)
    opening_hours = models.JSONField(
        _("Otváracia doba"), default=dict, blank=True, null=True
    )
    is_seeking = models.BooleanField(
        _("Hľadám"),
        default=False,
        help_text=_("True ak používateľ hľadá službu, False ak ponúka"),
    )
    URGENCY_CHOICES = (
        ("low", _("Nízka")),
        ("medium", _("Stredná")),
        ("high", _("Vysoká")),
    )
    urgency = models.CharField(
        _("Urgentnosť"),
        max_length=10,
        choices=URGENCY_CHOICES,
        default="low",
        help_text=_("Miera urgentnosti dopytu alebo ponuky"),
    )
    DURATION_CHOICES = (
        ("one_time", _("Jednorazovo")),
        ("long_term", _("Dlhodobo")),
        ("project", _("Zákazka")),
    )
    duration_type = models.CharField(
        _("Trvanie"),
        max_length=20,
        choices=DURATION_CHOICES,
        blank=True,
        null=True,
        help_text=_("Typ trvania služby"),
    )
    is_hidden = models.BooleanField(
        _("Skrytá"),
        default=False,
        help_text=_(
            "Ak je True, karta sa nezobrazí vo vyhľadávaní ani na cudzích profiloch"
        ),
    )

    created_at = models.DateTimeField(_("Vytvorené"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Aktualizované"), auto_now=True)

    class Meta:
        verbose_name = _("Ponúkaná zručnosť")
        verbose_name_plural = _("Ponúkané zručnosti")
        ordering = ["-created_at"]
        # Jeden používateľ môže mať maximálne 3 zručnosti
        constraints = [
            models.UniqueConstraint(
                fields=["user", "category", "subcategory"],
                name="unique_user_skill_category",
            )
        ]
        indexes = [
            # Search endpoint filters/sorts (ORM only). Avoid indexes on icontains fields.
            models.Index(fields=["created_at"], name="acc_off_skill_created_idx"),
            models.Index(fields=["country_code"], name="acc_off_skill_country_idx"),
            models.Index(fields=["district"], name="acc_off_skill_district_idx"),
            models.Index(fields=["price_from"], name="acc_off_skill_price_idx"),
            # Composite indexes for frequent patterns:
            # - base filter is_hidden=False + default sort -created_at
            models.Index(fields=["is_hidden", "-created_at"], name="acc_off_skill_hidden_new_idx"),
            # - type filter (is_seeking) + newest
            models.Index(fields=["is_hidden", "is_seeking", "-created_at"], name="acc_off_skill_type_new_idx"),
        ]

    def __str__(self):
        return f"{self.user.display_name} - {self.category} → {self.subcategory}"


class DashboardSkillSearchProjection(models.Model):
    """
    Flattened dashboard skills search projection.

    The dashboard search endpoint uses this table only to fetch ordered skill
    ids. The final response is still serialized from real OfferedSkill rows.
    """

    skill = models.OneToOneField(
        "accounts.OfferedSkill",
        on_delete=models.CASCADE,
        related_name="dashboard_search_projection",
        verbose_name=_("ZruÄnosÅ¥"),
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="dashboard_skill_search_projections",
        verbose_name=_("PouÅ¾Ã­vateÄ¾"),
    )
    category = models.CharField(_("KategÃ³ria"), max_length=100)
    subcategory = models.CharField(_("PodkategÃ³ria"), max_length=100)
    tags_text = models.TextField(_("Tagy pre vyhÄ¾adÃ¡vanie"), blank=True, default="")
    skill_location = models.CharField(_("Miesto zruÄnosti"), max_length=35, blank=True)
    skill_district = models.CharField(_("Okres zruÄnosti"), max_length=100, blank=True)
    user_location = models.CharField(_("Lokalita pouÅ¾Ã­vateÄ¾a"), max_length=25, blank=True)
    user_district = models.CharField(_("Okres pouÅ¾Ã­vateÄ¾a"), max_length=100, blank=True)
    user_is_public = models.BooleanField(_("VerejnÃ½ profil"), default=True)
    user_is_verified = models.BooleanField(_("OverenÃ½ profil"), default=False)
    user_is_active = models.BooleanField(_("Aktívny používateľ"), default=True)
    user_is_staff = models.BooleanField(_("Staff používateľ"), default=False)
    user_is_superuser = models.BooleanField(_("Superuser"), default=False)
    is_hidden = models.BooleanField(_("SkrytÃ¡ zruÄnosÅ¥"), default=False)
    is_seeking = models.BooleanField(_("HÄ¾adÃ¡m"), default=False)
    price_from = models.DecimalField(
        _("Cena od"), max_digits=10, decimal_places=2, null=True, blank=True
    )
    created_at = models.DateTimeField(_("VytvorenÃ©"))
    updated_at = models.DateTimeField(_("AktualizovanÃ©"), auto_now=True)

    class Meta:
        verbose_name = _("Dashboard search projekcia zruÄnosti")
        verbose_name_plural = _("Dashboard search projekcie zruÄnostÃ­")
        indexes = [
            models.Index(
                fields=["is_hidden", "user_is_public", "-user_is_verified", "-created_at"],
                name="acc_dash_skill_proj_sort_idx",
            ),
            models.Index(
                fields=[
                    "is_hidden",
                    "user_is_public",
                    "is_seeking",
                    "-user_is_verified",
                    "-created_at",
                ],
                name="acc_dsh_skl_prj_type_idx",
            ),
            models.Index(fields=["user", "-created_at"], name="acc_dash_skill_proj_user_idx"),
        ]

    def __str__(self):
        return f"Search projection pre skill_id={self.skill_id}"


class OfferedSkillImage(models.Model):
    """Obrázok priradený k ponúkanej zručnosti (ponuke)."""

    class Status(models.TextChoices):
        PENDING = "pending", _("Čaká na spracovanie")
        APPROVED = "approved", _("Schválené")
        REJECTED = "rejected", _("Zamietnuté")

    skill = models.ForeignKey(
        OfferedSkill, on_delete=models.CASCADE, related_name="images"
    )
    image = models.ImageField(
        _("Obrázok"),
        upload_to="offers/",
        validators=[validate_image_file],
        blank=True,
        null=True,
    )
    order = models.PositiveIntegerField(_("Poradie"), default=0)
    status = models.CharField(
        _("Stav"),
        max_length=20,
        choices=Status.choices,
        default=Status.APPROVED,
        help_text=_("PENDING/REJECTED sa používajú pri asynchrónnom spracovaní obrázkov."),
    )
    # S3 keys (prefixes are part of key): uploads/.. for pending, media/.. for approved.
    pending_key = models.CharField(_("S3 kľúč (pending)"), max_length=1024, blank=True, default="")
    approved_key = models.CharField(_("S3 kľúč (approved)"), max_length=1024, blank=True, default="")
    original_filename = models.CharField(_("Pôvodný názov súboru"), max_length=255, blank=True, default="")
    content_type = models.CharField(_("Content-Type"), max_length=100, blank=True, default="")
    size_bytes = models.BigIntegerField(_("Veľkosť (bytes)"), null=True, blank=True)
    width = models.IntegerField(_("Šírka"), null=True, blank=True)
    height = models.IntegerField(_("Výška"), null=True, blank=True)
    rejected_reason = models.CharField(_("Dôvod zamietnutia"), max_length=255, blank=True, default="")
    processed_at = models.DateTimeField(_("Spracované o"), null=True, blank=True)
    created_at = models.DateTimeField(_("Vytvorené"), auto_now_add=True)

    class Meta:
        verbose_name = _("Obrázok ponuky")
        verbose_name_plural = _("Obrázky ponúk")
        ordering = ["order", "id"]
        indexes = [
            models.Index(fields=["skill", "status", "order", "id"], name="acc_offer_img_skill_status_idx"),
        ]

    def __str__(self):
        return f"Obrázok #{self.id} pre {self.skill}"


