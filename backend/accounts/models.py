from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models import Q
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
import uuid
import unicodedata
import re
from swaply.validators import validate_image_file
from .name_normalization import get_canonical_display_name

# --- MFA secret encryption at rest (Fernet) ---
from cryptography.fernet import Fernet
from django.conf import settings as _settings


def _get_fernet():
    key = getattr(_settings, "MFA_ENCRYPTION_KEY", "")
    if not key:
        return None
    try:
        return Fernet(key.encode() if isinstance(key, str) else key)
    except Exception:
        return None


def encrypt_mfa_secret(value: str) -> str:
    if not value:
        return value
    f = _get_fernet()
    if f is None:
        return value  # fallback ak kľúč nie je nastavený
    return f.encrypt(value.encode()).decode()


def decrypt_mfa_secret(value: str) -> str:
    if not value:
        return value
    f = _get_fernet()
    if f is None:
        return value
    try:
        return f.decrypt(value.encode()).decode()
    except Exception:
        return value  # ak nie je zašifrované (staré záznamy), vráť as-is


class UserType(models.TextChoices):
    INDIVIDUAL = "individual", _("Osoba")
    COMPANY = "company", _("Firma")


class SubscriptionTier(models.TextChoices):
    FREE = "free", _("Free")
    PREMIUM = "premium", _("Premium")


class MobileOnboardingStatus(models.TextChoices):
    IN_PROGRESS = "in_progress", _("In progress")
    COMPLETED = "completed", _("Completed")
    SKIPPED = "skipped", _("Skipped")


class MobileOnboardingStep(models.TextChoices):
    HOME = "home", _("Home")
    PROFILE_ICON = "profile_icon", _("Profile icon")
    PROFILE_EDIT = "profile_edit", _("Profile edit")
    EDIT_FORM = "edit_form", _("Edit form")
    SEARCH = "search", _("Search")
    HELP_REQUEST = "help_request", _("Help request")
    REQUESTS = "requests", _("Requests")
    MESSAGES = "messages", _("Messages")
    DASHBOARD_FINISH = "dashboard_finish", _("Dashboard finish")


class DesktopOnboardingStep(models.TextChoices):
    NAVIGATION = "navigation", _("Navigation")
    PROFILE_ICON = "profile_icon", _("Profile icon")
    PROFILE_EDIT = "profile_edit", _("Profile edit")
    EDIT_FORM = "edit_form", _("Edit form")
    SEARCH = "search", _("Search")
    HELP_REQUEST = "help_request", _("Help request")
    REQUESTS = "requests", _("Requests")
    MESSAGES = "messages", _("Messages")
    DASHBOARD_FINISH = "dashboard_finish", _("Dashboard finish")


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
    email_notifications = models.BooleanField(_("Email notifikácie"), default=True)
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


class EmailVerification(models.Model):
    """Model pre email verifikáciu"""

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="email_verifications"
    )
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    is_used = models.BooleanField(default=False)

    class Meta:
        verbose_name = _("Email verifikácia")
        verbose_name_plural = _("Email verifikácie")
        ordering = ["-created_at"]

    def __str__(self):
        # Never include user email (PII) in string representation.
        return f"Verifikácia pre user_id={self.user_id}"

    def is_expired(self):
        """Kontrola, či token neexpiroval (48 hodín)"""
        return timezone.now() > self.created_at + timezone.timedelta(hours=48)

    def send_verification_email(self, request=None):
        """Odoslanie verifikačného emailu"""
        import logging

        logger = logging.getLogger(__name__)

        verification_url = self.get_verification_url(request)

        subject = "Potvrdenie registrácie - Swaply"
        message = f"""
Ahoj {self.user.display_name},

Ďakujeme za registráciu na Swaply!

Pre dokončenie registrácie kliknite na nasledujúci odkaz:
{verification_url}

Ak ste si nevytvorili účet na Swaply, môžete tento email ignorovať.

S pozdravom,
Tím Swaply
        """

        try:
            import time

            _start = time.time()
            logger.info(
                "EMAIL_SEND_START",
                extra={
                    "host": getattr(settings, "EMAIL_HOST", None),
                    "port": getattr(settings, "EMAIL_PORT", None),
                    "use_tls": getattr(settings, "EMAIL_USE_TLS", None),
                    "timeout": getattr(settings, "EMAIL_TIMEOUT", None),
                    "backend": getattr(settings, "EMAIL_BACKEND", None),
                },
            )
            if getattr(settings, "DEBUG", False):
                logger.info(
                    "📧 DEBUG EMAIL: Sending verification email",
                    extra={
                        "to_email": self.user.email,
                        "email_backend": getattr(settings, "EMAIL_BACKEND", None),
                        "email_host": getattr(settings, "EMAIL_HOST", None),
                        "email_port": getattr(settings, "EMAIL_PORT", None),
                        "email_use_tls": getattr(settings, "EMAIL_USE_TLS", None),
                        "email_host_user": getattr(settings, "EMAIL_HOST_USER", None),
                        "verification_url": verification_url,
                        "subject": subject,
                    },
                )
            result = send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[self.user.email],
                fail_silently=False,
            )
            logger.info(
                "EMAIL_SEND_DONE",
                extra={"duration_ms": int((time.time() - _start) * 1000)},
            )
            if getattr(settings, "DEBUG", False):
                logger.info(f"📧 DEBUG EMAIL: send_mail() returned: {result}")
            logger.info("Verification email sent")
            return True
        except Exception as e:
            if getattr(settings, "DEBUG", False):
                import traceback

                logger.error(f"📧 DEBUG EMAIL: Exception during send_mail(): {e}")
                logger.error(f"📧 DEBUG EMAIL: Traceback: {traceback.format_exc()}")
            logger.error(
                "EMAIL_SEND_FAILED",
                extra={
                    "duration_ms": int((time.time() - _start) * 1000),
                    "error": str(e),
                },
            )
            logger.error("Verification email failed")
            return False

    def get_verification_url(self, request=None):
        """Generovanie verifikačného URL"""
        base_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
        return f"{base_url}/verify-email?token={self.token}"

    def verify(self):
        """Označenie tokenu ako použitý a overenie používateľa"""
        if self.is_used or self.is_expired():
            return False

        self.is_used = True
        self.verified_at = timezone.now()
        self.save()

        # Označenie používateľa ako overeného
        self.user.is_verified = True
        self.user.save()

        return True


class AccountDeletionRequest(models.Model):
    """
    Jednorazový token na potvrdenie NEZVRATNÉHO zmazania účtu cez email.

    Používa sa pre účty bez hesla (OAuth/Google), ktoré nevedia potvrdiť zmazanie
    zadaním hesla. Vzor (token/expirácia 48h) je zhodný s EmailVerification.
    """

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="deletion_requests"
    )
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(null=True, blank=True)
    is_used = models.BooleanField(default=False)

    class Meta:
        verbose_name = _("Žiadosť o zmazanie účtu")
        verbose_name_plural = _("Žiadosti o zmazanie účtu")
        ordering = ["-created_at"]

    def __str__(self):
        # Nikdy neuvádzaj email (PII) v reprezentácii.
        return f"Žiadosť o zmazanie pre user_id={self.user_id}"

    def is_expired(self):
        """Token platí 48 hodín (rovnako ako email verifikácia)."""
        return timezone.now() > self.created_at + timezone.timedelta(hours=48)

    def get_confirm_url(self):
        base_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
        return f"{base_url}/delete-account/confirm?token={self.token}"

    def send_deletion_email(self):
        """Pošle email s jednorazovým odkazom na potvrdenie zmazania účtu."""
        import logging

        logger = logging.getLogger(__name__)
        confirm_url = self.get_confirm_url()
        subject = "Potvrdenie zmazania účtu - Swaply"
        message = f"""
Ahoj {self.user.display_name},

Dostali sme požiadavku na ZMAZANIE tvojho účtu na Swaply.

POZOR: Toto je NEZVRATNÁ operácia. Po potvrdení budú tvoje osobné údaje
anonymizované a tvoje ponuky, portfólio a hodnotenia odstránené.

Ak chceš účet naozaj zmazať, klikni na nasledujúci odkaz (platí 48 hodín):
{confirm_url}

Ak si o zmazanie nepožiadal ty, tento email ignoruj – s účtom sa nič nestane.

S pozdravom,
Tím Swaply
        """
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[self.user.email],
                fail_silently=False,
            )
            logger.info("Account deletion email sent")
            return True
        except Exception:
            logger.error("Account deletion email failed")
            return False


class OfferedSkill(models.Model):
    """Model pre zručnosti, ktoré používateľ ponúka"""

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="offered_skills"
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
        OfferedSkill,
        on_delete=models.CASCADE,
        related_name="dashboard_search_projection",
        verbose_name=_("ZruÄnosÅ¥"),
    )
    user = models.ForeignKey(
        User,
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


class SkillRequestStatus(models.TextChoices):
    PENDING = "pending", _("Čaká na odpoveď")
    ACCEPTED = "accepted", _("Prijaté")
    REJECTED = "rejected", _("Zamietnuté")
    CANCELLED = "cancelled", _("Zrušené")
    COMPLETION_REQUESTED = "completion_requested", _("Completion requested")
    COMPLETED = "completed", _("Completed")
    TERMINATED = "terminated", _("Predčasne ukončené")


REVIEWABLE_SKILL_REQUEST_STATUSES = (
    SkillRequestStatus.COMPLETED,
    SkillRequestStatus.TERMINATED,
)


class SkillRequestTerminationReason(models.TextChoices):
    NO_RESPONSE = "no_response", _("Druhá strana nereaguje")
    NO_TIME = "no_time", _("Nemám čas pokračovať")
    CHANGED_CIRCUMSTANCES = "changed_circumstances", _("Zmena okolností")
    COULD_NOT_AGREE = "could_not_agree", _("Nepodarilo sa dohodnúť")
    COMMUNICATION_ISSUE = (
        "communication_issue",
        _("Nie som spokojný s komunikáciou"),
    )
    MEETING_NOT_HAPPENED = (
        "meeting_not_happened",
        _("Stretnutie / realizácia neprebehla"),
    )
    TRUST_CONCERNS = "trust_concerns", _("Mám obavy z dôveryhodnosti")
    OTHER = "other", _("Iné")


class SkillRequest(models.Model):
    """
    Žiadosť o kartu (ponúkam / hľadám).

    - requester: kto žiadosť posiela
    - recipient: komu žiadosť príde (vlastník karty)
    - offer: karta, ktorej sa žiadosť týka
    """

    requester = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="sent_skill_requests",
        verbose_name=_("Odosielateľ"),
    )
    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="received_skill_requests",
        verbose_name=_("Príjemca"),
    )
    offer = models.ForeignKey(
        OfferedSkill,
        on_delete=models.CASCADE,
        related_name="skill_requests",
        verbose_name=_("Karta"),
    )
    proposed_offer = models.ForeignKey(
        OfferedSkill,
        on_delete=models.SET_NULL,
        related_name="proposed_skill_requests",
        null=True,
        blank=True,
        verbose_name=_("Navrhovaná karta"),
    )
    proposal_description = models.TextField(
        _("Opis pomoci"), max_length=200, blank=True, default=""
    )
    proposal_price_from = models.DecimalField(
        _("Navrhovaná cena od"),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    proposal_price_currency = models.CharField(
        _("Navrhovaná mena"), max_length=8, blank=True, default=""
    )
    proposal_price_negotiable = models.BooleanField(
        _("Navrhovaná cena dohodou"), default=False
    )
    proposal_experience_value = models.FloatField(
        _("Navrhovaná dĺžka praxe"), null=True, blank=True
    )
    proposal_experience_unit = models.CharField(
        _("Jednotka navrhovanej praxe"),
        max_length=10,
        choices=[
            ("years", _("Roky")),
            ("months", _("Mesiace")),
        ],
        blank=True,
        default="",
    )
    status = models.CharField(
        _("Stav"),
        max_length=25,
        choices=SkillRequestStatus.choices,
        default=SkillRequestStatus.PENDING,
    )
    hidden_by_requester = models.BooleanField(
        _("Skryté pre odosielateľa"), default=False
    )
    hidden_by_recipient = models.BooleanField(_("Skryté pre príjemcu"), default=False)
    created_at = models.DateTimeField(_("Vytvorené"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Aktualizované"), auto_now=True)

    class Meta:
        verbose_name = _("Žiadosť o kartu")
        verbose_name_plural = _("Žiadosti o kartu")
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["requester", "offer"],
                condition=Q(
                    status__in=(
                        SkillRequestStatus.PENDING,
                        SkillRequestStatus.ACCEPTED,
                        SkillRequestStatus.COMPLETION_REQUESTED,
                    )
                ),
                name="unique_skill_request_per_requester_offer",
            )
        ]
        indexes = [
            models.Index(fields=["recipient", "status", "created_at"]),
            models.Index(fields=["requester", "status", "created_at"]),
            models.Index(fields=["offer", "created_at"]),
        ]

    def __str__(self):
        return f"Request #{self.id}: {self.requester_id} -> {self.recipient_id} (offer {self.offer_id}) [{self.status}]"


class SkillRequestTermination(models.Model):
    """Auditný záznam predčasného skončenia aktívnej výmeny."""

    skill_request = models.OneToOneField(
        SkillRequest,
        on_delete=models.CASCADE,
        related_name="termination",
        verbose_name=_("Výmena"),
    )
    terminated_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="skill_request_terminations",
        verbose_name=_("Ukončil"),
    )
    reason = models.CharField(
        _("Dôvod"),
        max_length=40,
        choices=SkillRequestTerminationReason.choices,
    )
    description = models.TextField(_("Popis"), blank=True, max_length=1000)
    created_at = models.DateTimeField(_("Vytvorené"), auto_now_add=True)

    class Meta:
        verbose_name = _("Ukončenie výmeny")
        verbose_name_plural = _("Ukončenia výmen")
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["reason", "created_at"], name="acc_req_term_reason_cr_idx"),
            models.Index(fields=["terminated_by", "created_at"], name="acc_req_term_by_cr_idx"),
        ]

    def __str__(self):
        return f"Termination #{self.id}: request {self.skill_request_id} by {self.terminated_by_id}"


class NotificationType(models.TextChoices):
    OFFER_LIKED = "offer_liked", _("Páči sa mi ponuka")
    SKILL_REQUEST = "skill_request", _("Nová žiadosť")
    SKILL_REQUEST_ACCEPTED = "skill_request_accepted", _("Žiadosť prijatá")
    SKILL_REQUEST_COMPLETION_REQUESTED = (
        "skill_request_completion_requested",
        _("Výmena označená ako dokončená"),
    )
    SKILL_REQUEST_COMPLETED = (
        "skill_request_completed",
        _("Dokončenie výmeny potvrdené"),
    )
    REVIEW_CREATED = "review_created", _("Nová recenzia")
    REVIEW_REPLY_CREATED = "review_reply_created", _("Odpoveď na recenziu")
    REVIEW_LIKED = "review_liked", _("Páči sa mi recenzia")
    SKILL_REQUEST_REJECTED = "skill_request_rejected", _("Žiadosť zamietnutá")
    SKILL_REQUEST_CANCELLED = "skill_request_cancelled", _("Žiadosť zrušená")
    SKILL_REQUEST_TERMINATED = (
        "skill_request_terminated",
        _("Výmena skončila"),
    )
    GROUP_INVITATION = "group_invitation", _("Pozvánka do skupiny")


class Notification(models.Model):
    """Jednoduché notifikácie (pre badge + realtime)."""

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notifications",
        verbose_name=_("Používateľ"),
    )
    type = models.CharField(
        _("Typ"),
        max_length=50,
        choices=NotificationType.choices,
    )
    title = models.CharField(_("Názov"), max_length=120, blank=True, default="")
    body = models.TextField(_("Text"), blank=True, default="")
    data = models.JSONField(_("Dáta"), default=dict, blank=True)
    skill_request = models.ForeignKey(
        SkillRequest,
        on_delete=models.SET_NULL,
        related_name="notifications",
        null=True,
        blank=True,
        verbose_name=_("Žiadosť"),
    )
    actor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name="+",
        null=True,
        blank=True,
        verbose_name=_("Aktér"),
    )
    conversation = models.ForeignKey(
        "messaging.Conversation",
        on_delete=models.SET_NULL,
        related_name="notifications",
        null=True,
        blank=True,
        verbose_name=_("Konverzácia"),
    )
    group_invitation = models.ForeignKey(
        "messaging.GroupInvitation",
        on_delete=models.SET_NULL,
        related_name="notifications",
        null=True,
        blank=True,
        verbose_name=_("Skupinová pozvánka"),
    )
    is_read = models.BooleanField(_("Prečítané"), default=False)
    created_at = models.DateTimeField(_("Vytvorené"), auto_now_add=True)
    read_at = models.DateTimeField(_("Prečítané o"), null=True, blank=True)

    class Meta:
        verbose_name = _("Notifikácia")
        verbose_name_plural = _("Notifikácie")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "is_read", "created_at"]),
            models.Index(fields=["user", "type", "is_read"]),
            models.Index(fields=["user", "created_at"]),
        ]

    def mark_read(self):
        if not self.is_read:
            self.is_read = True
            try:
                self.read_at = timezone.now()
            except Exception:
                self.read_at = None
            self.save(update_fields=["is_read", "read_at"])


class Review(models.Model):
    """
    Recenzia ponuky (OfferedSkill).

    Bezpečnostné pravidlá:
    - Jeden používateľ môže recenzovať jednu ponuku len raz (unique constraint)
    - Používateľ nemôže recenzovať vlastnú ponuku (validácia v view)
    - Rating: 0.0 až 5.0 v krokoch 0.5
    """

    reviewer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="reviews_written",
        verbose_name=_("Recenzent"),
    )
    offer = models.ForeignKey(
        OfferedSkill,
        on_delete=models.CASCADE,
        related_name="reviews",
        verbose_name=_("Ponuka"),
    )
    rating = models.DecimalField(
        _("Hodnotenie"),
        max_digits=3,
        decimal_places=1,
        help_text=_("Hodnotenie od 0.0 do 5.0 v krokoch 0.5"),
    )
    text = models.TextField(
        _("Text recenzie"),
        max_length=300,
        blank=True,
        default="",
    )
    pros = models.JSONField(
        _("Plusy"),
        default=list,
        blank=True,
        help_text=_("Zoznam plusov (max 10 položiek)"),
    )
    cons = models.JSONField(
        _("Minusy"),
        default=list,
        blank=True,
        help_text=_("Zoznam minusov (max 10 položiek)"),
    )
    owner_response = models.TextField(
        _("Odpoveď vlastníka ponuky"),
        max_length=700,
        null=True,
        blank=True,
    )
    owner_responded_at = models.DateTimeField(
        _("Odpoveď vlastníka dňa"),
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(_("Vytvorené"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Aktualizované"), auto_now=True)

    class Meta:
        verbose_name = _("Recenzia")
        verbose_name_plural = _("Recenzie")
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["reviewer", "offer"],
                name="unique_review_per_reviewer_offer",
            )
        ]
        indexes = [
            models.Index(fields=["offer", "created_at"]),
            models.Index(fields=["reviewer", "created_at"]),
            models.Index(fields=["rating", "created_at"]),
        ]

    def __str__(self):
        return f"Recenzia #{self.id}: {self.reviewer.display_name} -> {self.offer} ({self.rating}/5)"

    def clean(self):
        """Validácia dát pred uložením"""
        from django.core.exceptions import ValidationError

        # Rating musí byť medzi 0.0 a 5.0
        if self.rating < 0 or self.rating > 5:
            raise ValidationError({"rating": "Hodnotenie musí byť medzi 0.0 a 5.0."})

        # Rating musí byť v krokoch 0.5
        if float(self.rating) % 0.5 != 0:
            raise ValidationError(
                {"rating": "Hodnotenie musí byť v krokoch 0.5 (napr. 3.5, 4.0)."}
            )

        # Pros a cons musia byť zoznamy
        if not isinstance(self.pros, list):
            raise ValidationError({"pros": "Plusy musia byť zoznam."})
        if not isinstance(self.cons, list):
            raise ValidationError({"cons": "Minusy musia byť zoznam."})

        # Max 10 položiek v pros a cons
        if len(self.pros) > 10:
            raise ValidationError({"pros": "Môžeš pridať maximálne 10 plusov."})
        if len(self.cons) > 10:
            raise ValidationError({"cons": "Môžeš pridať maximálne 10 minusov."})

        # Každá položka v pros/cons musí byť string s max 120 znakmi
        for i, pro in enumerate(self.pros):
            if not isinstance(pro, str):
                raise ValidationError({"pros": f"Plus #{i+1} musí byť text."})
            if len(pro) > 120:
                raise ValidationError(
                    {"pros": f"Plus #{i+1} môže mať maximálne 120 znakov."}
                )

        for i, con in enumerate(self.cons):
            if not isinstance(con, str):
                raise ValidationError({"cons": f"Mínus #{i+1} musí byť text."})
            if len(con) > 120:
                raise ValidationError(
                    {"cons": f"Mínus #{i+1} môže mať maximálne 120 znakov."}
                )

        # Text má max 300 znakov
        if len(self.text) > 300:
            raise ValidationError(
                {"text": "Text recenzie môže mať maximálne 300 znakov."}
            )


class ReviewLike(models.Model):
    """Vzťah používateľa k recenzii, ktorá sa mu páči."""

    review = models.ForeignKey(
        Review,
        on_delete=models.CASCADE,
        related_name="likes",
        verbose_name=_("Recenzia"),
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="review_likes",
        verbose_name=_("Používateľ"),
    )
    created_at = models.DateTimeField(_("Vytvorené"), auto_now_add=True)

    class Meta:
        verbose_name = _("Páči sa mi recenzia")
        verbose_name_plural = _("Páči sa mi recenzie")
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["review", "user"],
                name="unique_review_like_per_user",
            )
        ]
        indexes = [
            models.Index(
                fields=["review", "created_at"],
                name="acc_revlike_review_created_idx",
            ),
            models.Index(
                fields=["user", "created_at"],
                name="acc_revlike_user_created_idx",
            ),
        ]

    def __str__(self):
        return f"Like recenzie #{self.review_id} od používateľa {self.user_id}"


class OfferedSkillLike(models.Model):
    """Vzťah používateľa k ponuke, ktorá sa mu páči."""

    offer = models.ForeignKey(
        OfferedSkill,
        on_delete=models.CASCADE,
        related_name="offer_likes",
        verbose_name=_("Ponuka"),
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="offered_skill_likes",
        verbose_name=_("Používateľ"),
    )
    created_at = models.DateTimeField(_("Vytvorené"), auto_now_add=True)

    class Meta:
        verbose_name = _("Páči sa mi ponuka")
        verbose_name_plural = _("Páči sa mi ponuky")
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["offer", "user"],
                name="unique_offer_like_per_user",
            )
        ]
        indexes = [
            models.Index(
                fields=["offer", "created_at"],
                name="acc_offlike_offer_cr_idx",
            ),
            models.Index(
                fields=["user", "created_at"],
                name="acc_offlike_user_cr_idx",
            ),
        ]

    def __str__(self):
        return f"Like ponuky #{self.offer_id} od používateľa {self.user_id}"


class PhotoReport(models.Model):
    """
    Nahlasenie fotky pouzivatelom.

    Report cieli bud na konkretnu fotku ponuky, alebo na aktualny avatar
    pouzivatela. Pri avatari ukladame nazov suboru v case nahlasenia, aby bolo
    jasne, ktoru fotku pouzivatel nahlasil aj po neskorsej zmene avatara.
    """

    offer_image = models.ForeignKey(
        OfferedSkillImage,
        on_delete=models.CASCADE,
        related_name="reports",
        verbose_name=_("Nahlasena fotka ponuky"),
        blank=True,
        null=True,
    )
    reported_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="avatar_reports_received",
        verbose_name=_("Nahlaseny pouzivatel avatara"),
        blank=True,
        null=True,
    )
    reported_avatar_name = models.CharField(
        _("Nazov nahlaseneho avataru"),
        max_length=255,
        blank=True,
        default="",
    )
    reported_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="photo_reports_sent",
        verbose_name=_("Nahlasil"),
    )
    reason = models.CharField(
        _("Dovod"),
        max_length=100,
    )
    description = models.TextField(
        _("Popis"),
        blank=True,
    )
    created_at = models.DateTimeField(_("Vytvorene"), auto_now_add=True)
    is_resolved = models.BooleanField(_("Vyriesene"), default=False)

    class Meta:
        verbose_name = _("Nahlasenie fotky")
        verbose_name_plural = _("Nahlasenia fotiek")
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                check=(
                    Q(offer_image__isnull=False, reported_user__isnull=True)
                    | Q(
                        offer_image__isnull=True,
                        reported_user__isnull=False,
                        reported_avatar_name__gt="",
                    )
                ),
                name="photo_report_has_exactly_one_target",
            ),
            models.CheckConstraint(
                check=Q(reported_user__isnull=True)
                | ~Q(reported_user=models.F("reported_by")),
                name="photo_report_cannot_report_own_avatar",
            ),
            models.UniqueConstraint(
                fields=["offer_image", "reported_by"],
                condition=Q(offer_image__isnull=False),
                name="unique_photo_report_per_offer_image",
            ),
            models.UniqueConstraint(
                fields=["reported_user", "reported_avatar_name", "reported_by"],
                condition=Q(reported_user__isnull=False),
                name="unique_photo_report_per_avatar",
            ),
        ]
        indexes = [
            models.Index(
                fields=["offer_image", "created_at"],
                name="acc_photo_rep_offer_cr_idx",
            ),
            models.Index(
                fields=["reported_user", "created_at"],
                name="acc_photo_rep_user_cr_idx",
            ),
            models.Index(
                fields=["reported_by", "created_at"],
                name="acc_photo_rep_by_cr_idx",
            ),
            models.Index(
                fields=["is_resolved", "created_at"],
                name="acc_photo_rep_res_cr_idx",
            ),
        ]

    def __str__(self):
        if self.offer_image_id:
            target = f"fotka ponuky {self.offer_image_id}"
        else:
            target = f"avatar pouzivatela {self.reported_user_id}"
        return f"Nahlasenie #{self.id}: {target} od {self.reported_by_id}"


class ReviewReport(models.Model):
    """
    Nahlásenie recenzie používateľom.
    Jeden používateľ môže nahlásiť konkrétnu recenziu iba raz.
    """

    review = models.ForeignKey(
        Review,
        on_delete=models.CASCADE,
        related_name="reports",
        verbose_name=_("Recenzia"),
    )
    reported_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        verbose_name=_("Nahlásil"),
    )
    reason = models.CharField(
        _("Dôvod"),
        max_length=100,
    )
    description = models.TextField(
        _("Popis"),
        blank=True,
    )
    created_at = models.DateTimeField(_("Vytvorené"), auto_now_add=True)
    is_resolved = models.BooleanField(_("Vyriešené"), default=False)

    class Meta:
        verbose_name = _("Nahlásenie recenzie")
        verbose_name_plural = _("Nahlásenia recenzií")
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["review", "reported_by"],
                name="unique_review_report_per_user",
            )
        ]

    def __str__(self):
        return f"Nahlásenie #{self.id}: recenzia {self.review_id} od {self.reported_by}"


class FavoriteUser(models.Model):
    """
    SÃºkromnÃ½ vzÅ¥ah obÄ¾ÃºbenÃ©ho pouÅ¾Ã­vateÄ¾a.

    KaÅ¾dÃ½ pouÅ¾Ã­vateÄ¾ si spravuje svoj vlastnÃ½ zoznam obÄ¾ÃºbenÃ½ch
    profilov. RovnakÃ½ vzÅ¥ah nemÃ´Å¾e vzniknÃºÅ¥ viackrÃ¡t a pouÅ¾Ã­vateÄ¾ si
    nemÃ´Å¾e pridaÅ¥ sÃ¡m seba.
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="favorite_users",
        verbose_name=_("PouÅ¾Ã­vateÄ¾"),
    )
    favorite_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="favorited_by_users",
        verbose_name=_("ObÄ¾ÃºbenÃ½ pouÅ¾Ã­vateÄ¾"),
    )
    created_at = models.DateTimeField(_("VytvorenÃ©"), auto_now_add=True)

    class Meta:
        verbose_name = _("ObÄ¾ÃºbenÃ½ pouÅ¾Ã­vateÄ¾")
        verbose_name_plural = _("ObÄ¾ÃºbenÃ­ pouÅ¾Ã­vatelia")
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "favorite_user"],
                name="unique_favorite_user_per_owner",
            ),
            models.CheckConstraint(
                check=~models.Q(user=models.F("favorite_user")),
                name="favorite_user_cannot_point_to_self",
            ),
        ]
        indexes = [
            models.Index(
                fields=["user", "created_at"],
                name="acc_fav_user_owner_created_idx",
            ),
        ]

    def __str__(self):
        return f"ObÄ¾ÃºbenÃ½ #{self.id}: user {self.user_id} -> {self.favorite_user_id}"


class UserReport(models.Model):
    """
    Nahlásenie používateľa iným používateľom.
    Používateľ nemôže nahlásiť sám seba.
    Jeden používateľ môže nahlásiť konkrétneho používateľa iba raz.
    """

    reported_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="reports_received",
        verbose_name=_("Nahlásený používateľ"),
    )
    reported_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="reports_sent",
        verbose_name=_("Nahlásil"),
    )
    reason = models.CharField(
        _("Dôvod"),
        max_length=100,
    )
    description = models.TextField(
        _("Popis"),
        blank=True,
    )
    created_at = models.DateTimeField(_("Vytvorené"), auto_now_add=True)
    is_resolved = models.BooleanField(_("Vyriešené"), default=False)

    class Meta:
        verbose_name = _("Nahlásenie používateľa")
        verbose_name_plural = _("Nahlásenia používateľov")
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["reported_user", "reported_by"],
                name="unique_user_report_per_reporter",
            ),
            models.CheckConstraint(
                check=~models.Q(reported_user=models.F("reported_by")),
                name="user_report_cannot_report_self",
            ),
        ]

    def __str__(self):
        return f"Nahlásenie #{self.id}: používateľ {self.reported_user_id} od {self.reported_by_id}"

from .webpush_models import WebPushSubscription  # noqa: E402,F401
