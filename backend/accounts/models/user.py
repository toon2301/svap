"""User a UserProfile – vyčlenené z models.py."""

import re
import unicodedata
import uuid

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from swaply.validators import validate_image_file
from ..name_normalization import get_canonical_display_name
from .enums import (
    DesktopOnboardingStep,
    MobileOnboardingStatus,
    MobileOnboardingStep,
    SubscriptionTier,
    UserType,
)
from .mfa import decrypt_mfa_secret, encrypt_mfa_secret


class User(AbstractUser):
    """Rozšírený User model pre Swaply"""

    email = models.EmailField(_("Email"), unique=True)
    user_type = models.CharField(
        _("Typ používateľa"),
        max_length=20,
        choices=UserType.choices,
        default=UserType.INDIVIDUAL,
    )
    subscription_tier = models.CharField(
        _("Subscription tier"),
        max_length=20,
        choices=SubscriptionTier.choices,
        default=SubscriptionTier.FREE,
        db_index=True,
    )
    phone = models.CharField(_("Telefón"), max_length=15, blank=True)
    phone_visible = models.BooleanField(_("Zobraziť telefón verejne"), default=True)
    contact_email = models.EmailField(_("Kontaktný email"), blank=True)
    contact_email_visible = models.BooleanField(
        _("Zobraziť kontaktný email verejne"), default=True
    )
    bio = models.TextField(_("O mne"), blank=True)
    avatar = models.ImageField(
        _("Profilová fotka"),
        upload_to="avatars/",
        blank=True,
        null=True,
        validators=[validate_image_file],
    )
    location = models.CharField(_("Lokalita"), max_length=25, blank=True)
    district = models.CharField(_("Okres"), max_length=100, blank=True)
    ico = models.CharField(_("IČO"), max_length=14, blank=True)
    ico_visible = models.BooleanField(_("Zobraziť IČO verejne"), default=True)
    job_title = models.CharField(_("Profesia"), max_length=100, blank=True)
    job_title_visible = models.BooleanField(
        _("Zobraziť profesiu verejne"), default=True
    )

    # Pre firmy
    company_name = models.CharField(_("Názov firmy"), max_length=100, blank=True)
    website = models.URLField(_("Webstránka"), blank=True)
    additional_websites = models.JSONField(
        _("Dodatočné webstránky"), default=list, blank=True
    )

    # Sociálne siete
    linkedin = models.URLField(_("LinkedIn"), blank=True)
    facebook = models.URLField(_("Facebook"), blank=True)
    instagram = models.URLField(_("Instagram"), blank=True)
    youtube = models.URLField(_("YouTube"), blank=True)
    whatsapp = models.CharField(_("WhatsApp"), max_length=64, blank=True)

    # Nastavenia
    is_verified = models.BooleanField(_("Overený"), default=False)
    is_public = models.BooleanField(_("Verejný profil"), default=True)
    mobile_onboarding_status = models.CharField(
        _("Mobile onboarding status"),
        max_length=20,
        choices=MobileOnboardingStatus.choices,
        default=MobileOnboardingStatus.IN_PROGRESS,
    )
    mobile_onboarding_step = models.CharField(
        _("Mobile onboarding step"),
        max_length=20,
        choices=MobileOnboardingStep.choices,
        default=MobileOnboardingStep.HOME,
    )
    desktop_onboarding_status = models.CharField(
        _("Desktop onboarding status"),
        max_length=20,
        choices=MobileOnboardingStatus.choices,
        default=MobileOnboardingStatus.IN_PROGRESS,
    )
    desktop_onboarding_step = models.CharField(
        _("Desktop onboarding step"),
        max_length=20,
        choices=DesktopOnboardingStep.choices,
        default=DesktopOnboardingStep.NAVIGATION,
    )
    mobile_card_flip_hint_own_completed = models.BooleanField(
        _("Mobile card flip hint own completed"),
        default=False,
    )
    mobile_card_flip_hint_foreign_completed = models.BooleanField(
        _("Mobile card flip hint foreign completed"),
        default=False,
    )
    desktop_card_flip_hint_own_completed = models.BooleanField(
        _("Desktop card flip hint own completed"),
        default=False,
    )
    desktop_card_flip_hint_foreign_completed = models.BooleanField(
        _("Desktop card flip hint foreign completed"),
        default=False,
    )
    # Flag označujúci, že používateľ manuálne upravil meno/priezvisko cez profil
    # Ak je True, OAuth prihlásenie neprepíše meno z Google účtu
    name_modified_by_user = models.BooleanField(
        _("Meno upravené používateľom"), default=False
    )
    # URL slug pre verejný profil (napr. meno.priezvisko-1)
    # null=True kvôli existujúcim záznamom – unikátnosť platí len pre neprázdne slugy
    slug = models.SlugField(
        _("URL slug"), max_length=150, unique=True, blank=True, null=True
    )

    # Kategória odstránená

    # Timestamps
    created_at = models.DateTimeField(_("Vytvorené"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Aktualizované"), auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    class Meta:
        verbose_name = _("Používateľ")
        verbose_name_plural = _("Používatelia")

    def __str__(self):
        if self.user_type == UserType.INDIVIDUAL:
            name = f"{self.first_name} {self.last_name}".strip()
            return name if name else self.username
        return self.company_name or self.username

    @property
    def display_name(self):
        return get_canonical_display_name(
            user_type=self.user_type,
            first_name=self.first_name,
            last_name=self.last_name,
            company_name=self.company_name,
            username=self.username,
        )
        """Vráti zobrazovací názov používateľa"""
        if self.user_type == UserType.INDIVIDUAL:
            name = f"{self.first_name} {self.last_name}".strip()
            return name if name else self.username
        # Pre firemný účet: ak je company_name, použij ho, inak použij first_name + last_name
        if self.company_name:
            return self.company_name
        name = f"{self.first_name} {self.last_name}".strip()
        return name if name else self.username

    @property
    def profile_completeness(self):
        """Vypočíta kompletnosť profilu v percentách"""
        fields = ["email", "bio", "avatar", "location"]

        if self.user_type == UserType.COMPANY:
            fields.extend(["company_name", "website"])

        completed_fields = sum(1 for field in fields if getattr(self, field))
        total_fields = len(fields)

        return int((completed_fields / total_fields) * 100)

    def _generate_base_slug(self) -> str:
        """
        Vygeneruje základný slug z display_name alebo username.
        - malé písmená
        - odstránená diakritika
        - povolené znaky: a-z, 0-9, bodka, pomlčka
        """
        name = self.display_name or self.username or ""
        if not name:
            name = str(self.pk or uuid.uuid4())

        # Odstrániť diakritiku
        normalized = unicodedata.normalize("NFKD", name)
        ascii_str = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
        value = ascii_str.lower()

        # Medzery -> bodky
        value = re.sub(r"\s+", ".", value)
        # Povolené len a-z, 0-9, bodka, pomlčka
        value = re.sub(r"[^a-z0-9\.-]+", "", value)
        # Zhluk bodiek/pomlčiek zjednotiť
        value = re.sub(r"\.{2,}", ".", value)
        value = re.sub(r"-{2,}", "-", value)
        # Odstrániť bodky/pomlčky na kraji
        value = value.strip(".-")

        return value or "user"

    def ensure_slug(self, *, commit: bool = False, force_update: bool = False) -> None:
        """
        Zabezpečí, že používateľ má jedinečný slug.
        - Slug sa generuje len ak ešte neexistuje (stabilita URL).
        - Pri kolízii pridáva -1, -2, -3, ...
        - Ak force_update=True, slug sa aktualizuje aj keď už existuje.
        """
        if self.slug and not force_update:
            return

        base = self._generate_base_slug()
        slug = base
        idx = 1
        UserModel = type(self)

        while UserModel.objects.filter(slug=slug).exclude(pk=self.pk).exists():
            slug = f"{base}-{idx}"
            idx += 1
            if idx > 50:
                # Fallback v extrémnom prípade kolízií
                slug = f"user-{self.pk or uuid.uuid4().hex[:8]}"
                break

        self.slug = slug
        if commit and self.pk:
            UserModel.objects.filter(pk=self.pk).update(slug=slug)

    def save(self, *args, **kwargs):
        """
        Pri prvom uložení používateľa vygeneruje slug, ak chýba.
        Ak sa zmení meno (first_name, last_name alebo company_name), slug sa automaticky aktualizuje.
        """
        update_fields = kwargs.get("update_fields")
        update_fields_set = set(update_fields) if update_fields is not None else None
        slug_source_fields = {
            "first_name",
            "last_name",
            "company_name",
            "user_type",
            "username",
        }

        # Ak už existuje v DB a menia sa slug-sensitive polia, načítame starý objekt.
        old_instance = None
        should_compare_display_name = bool(
            self.pk
            and self.slug
            and (
                update_fields_set is None
                or bool(update_fields_set & slug_source_fields)
            )
        )
        if should_compare_display_name:
            try:
                old_instance = type(self).objects.get(pk=self.pk)
            except type(self).DoesNotExist:
                pass

        # Ak nemáme slug, vygenerujeme ho
        slug_changed = False
        if not self.slug:
            self.ensure_slug(commit=False)
            slug_changed = True
        # Ak sa zmenilo meno (používame display_name, ktorý pokrýva oba typy účtov), aktualizujeme slug
        elif old_instance:
            old_display_name = old_instance.display_name
            new_display_name = self.display_name
            if old_display_name != new_display_name:
                # Meno sa zmenilo - aktualizujeme slug
                self.ensure_slug(commit=False, force_update=True)
                slug_changed = True

        # Ak update_fields je nastavené a slug sa zmenil, pridaj slug do update_fields
        # aby sa predišlo INSERT namiesto UPDATE na deferred objektoch
        if update_fields_set is not None and slug_changed:
            kwargs["update_fields"] = list(update_fields_set | {"slug"})

        super().save(*args, **kwargs)


class UserProfile(models.Model):
    """Rozšírené informácie o používateľovi"""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")

    # Preferencie
    preferred_communication = models.CharField(
        _("Preferovaná komunikácia"),
        max_length=20,
        choices=[
            ("online", _("Online")),
            ("offline", _("Osobne")),
            ("both", _("Oboje")),
        ],
        default="both",
    )

    # Notifikácie
    # in_app_notifications riadi vytváranie in-app notifikácií (badge/feed/WS).
    # Push notifikácie riadi samostatný push_notifications toggle.
    in_app_notifications = models.BooleanField(_("In-app notifikácie"), default=True)
    push_notifications = models.BooleanField(_("Push notifikácie"), default=True)

    # Súkromie
    show_email = models.BooleanField(_("Zobraziť email"), default=False)
    show_phone = models.BooleanField(_("Zobraziť telefón"), default=False)

    # 2FA (mfa_secret môže byť zašifrovaný Fernetom – potrebuje väčší max_length)
    mfa_enabled = models.BooleanField(_("Zapnuté 2FA"), default=False)
    mfa_secret = models.CharField(
        _("2FA TOTP secret"), max_length=255, blank=True, default=""
    )

    created_at = models.DateTimeField(_("Vytvorené"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Aktualizované"), auto_now=True)

    class Meta:
        verbose_name = _("Profil používateľa")
        verbose_name_plural = _("Profily používateľov")

    def __str__(self):
        return f"Profil {self.user.display_name}"

    def save(self, *args, **kwargs):
        # Pri zápise uložíme mfa_secret zašifrovaný (ak je kľúč nastavený)
        if self.mfa_secret:
            self.mfa_secret = encrypt_mfa_secret(decrypt_mfa_secret(self.mfa_secret))
        super().save(*args, **kwargs)


