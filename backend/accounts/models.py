from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
import uuid
import unicodedata
import re
from swaply.validators import validate_image_file


class UserType(models.TextChoices):
    INDIVIDUAL = "individual", _("Osoba")
    COMPANY = "company", _("Firma")


class User(AbstractUser):
    """Rozšírený User model pre Swaply"""

    email = models.EmailField(_("Email"), unique=True)
    user_type = models.CharField(
        _("Typ používateľa"),
        max_length=20,
        choices=UserType.choices,
        default=UserType.INDIVIDUAL,
    )
    phone = models.CharField(_("Telefón"), max_length=15, blank=True)
    phone_visible = models.BooleanField(_("Zobraziť telefón verejne"), default=False)
    contact_email = models.EmailField(_("Kontaktný email"), blank=True)
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
    ico_visible = models.BooleanField(_("Zobraziť IČO verejne"), default=False)
    job_title = models.CharField(_("Profesia"), max_length=100, blank=True)
    job_title_visible = models.BooleanField(
        _("Zobraziť profesiu verejne"), default=False
    )

    # Dátum narodenia a pohlavie
    birth_date = models.DateField(_("Dátum narodenia"), blank=True, null=True)
    gender = models.CharField(
        _("Pohlavie"),
        max_length=20,
        choices=[
            ("male", _("Muž")),
            ("female", _("Žena")),
            ("other", _("Iné")),
        ],
        blank=True,
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
        # Ak už existuje v DB, načítame starý objekt na porovnanie
        old_instance = None
        if self.pk:
            try:
                old_instance = type(self).objects.get(pk=self.pk)
            except type(self).DoesNotExist:
                pass

        # Ak nemáme slug, vygenerujeme ho
        if not self.slug:
            self.ensure_slug(commit=False)
        # Ak sa zmenilo meno (používame display_name, ktorý pokrýva oba typy účtov), aktualizujeme slug
        elif old_instance:
            old_display_name = old_instance.display_name
            new_display_name = self.display_name
            if old_display_name != new_display_name:
                # Meno sa zmenilo - aktualizujeme slug
                self.ensure_slug(commit=False, force_update=True)

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

    # 2FA
    mfa_enabled = models.BooleanField(_("Zapnuté 2FA"), default=False)
    mfa_secret = models.CharField(
        _("2FA TOTP secret"), max_length=64, blank=True, default=""
    )

    created_at = models.DateTimeField(_("Vytvorené"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Aktualizované"), auto_now=True)

    class Meta:
        verbose_name = _("Profil používateľa")
        verbose_name_plural = _("Profily používateľov")

    def __str__(self):
        return f"Profil {self.user.display_name}"


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
        return f"Verifikácia pre {self.user.email}"

    def is_expired(self):
        """Kontrola, či token neexpiroval (48 hodín)"""
        return timezone.now() > self.created_at + timezone.timedelta(hours=48)

    def send_verification_email(self, request=None):
        """Odoslanie verifikačného emailu"""
        import logging

        logger = logging.getLogger(__name__)

        logger.info(f"📧 DEBUG EMAIL: Starting email send for user {self.user.email}")

        verification_url = self.get_verification_url(request)
        logger.info(f"📧 DEBUG EMAIL: Verification URL: {verification_url}")

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

        logger.info(f"📧 DEBUG EMAIL: Email subject: {subject}")
        logger.info(f"📧 DEBUG EMAIL: From email: {settings.DEFAULT_FROM_EMAIL}")
        logger.info(f"📧 DEBUG EMAIL: To email: {self.user.email}")

        logger.info(f"📧 DEBUG EMAIL: EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
        if hasattr(settings, "EMAIL_HOST"):
            logger.info(f"📧 DEBUG EMAIL: EMAIL_HOST: {settings.EMAIL_HOST}")
            logger.info(f"📧 DEBUG EMAIL: EMAIL_PORT: {settings.EMAIL_PORT}")
            logger.info(f"📧 DEBUG EMAIL: EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}")
            logger.info(f"📧 DEBUG EMAIL: EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")

        try:
            logger.info("📧 DEBUG EMAIL: Calling send_mail()...")
            result = send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[self.user.email],
                fail_silently=False,
            )
            logger.info(f"📧 DEBUG EMAIL: send_mail() returned: {result}")
            logger.info("📧 DEBUG EMAIL: Email sent successfully! ✅")
            return True
        except Exception as e:
            logger.error(f"📧 DEBUG EMAIL: Exception during send_mail(): {e}")
            logger.error(f"Chyba pri odosielaní emailu: {e}")
            import traceback

            logger.error(f"📧 DEBUG EMAIL: Traceback: {traceback.format_exc()}")
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

    def __str__(self):
        return f"{self.user.display_name} - {self.category} → {self.subcategory}"


class OfferedSkillImage(models.Model):
    """Obrázok priradený k ponúkanej zručnosti (ponuke)."""

    skill = models.ForeignKey(
        OfferedSkill, on_delete=models.CASCADE, related_name="images"
    )
    image = models.ImageField(
        _("Obrázok"), upload_to="offers/", validators=[validate_image_file]
    )
    order = models.PositiveIntegerField(_("Poradie"), default=0)
    created_at = models.DateTimeField(_("Vytvorené"), auto_now_add=True)

    class Meta:
        verbose_name = _("Obrázok ponuky")
        verbose_name_plural = _("Obrázky ponúk")
        ordering = ["order", "id"]

    def __str__(self):
        return f"Obrázok #{self.id} pre {self.skill}"


class SkillRequestStatus(models.TextChoices):
    PENDING = "pending", _("Čaká na odpoveď")
    ACCEPTED = "accepted", _("Prijaté")
    REJECTED = "rejected", _("Zamietnuté")
    CANCELLED = "cancelled", _("Zrušené")


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
    status = models.CharField(
        _("Stav"),
        max_length=20,
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


class NotificationType(models.TextChoices):
    SKILL_REQUEST = "skill_request", _("Nová žiadosť")
    SKILL_REQUEST_ACCEPTED = "skill_request_accepted", _("Žiadosť prijatá")
    SKILL_REQUEST_REJECTED = "skill_request_rejected", _("Žiadosť zamietnutá")
    SKILL_REQUEST_CANCELLED = "skill_request_cancelled", _("Žiadosť zrušená")


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
