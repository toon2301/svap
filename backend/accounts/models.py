from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
import uuid
from swaply.validators import validate_image_file


class UserType(models.TextChoices):
    INDIVIDUAL = 'individual', _('Osoba')
    COMPANY = 'company', _('Firma')


class User(AbstractUser):
    """Rozšírený User model pre Swaply"""
    
    email = models.EmailField(_('Email'), unique=True)
    user_type = models.CharField(
        _('Typ používateľa'),
        max_length=20,
        choices=UserType.choices,
        default=UserType.INDIVIDUAL
    )
    phone = models.CharField(_('Telefón'), max_length=15, blank=True)
    phone_visible = models.BooleanField(_('Zobraziť telefón verejne'), default=False)
    contact_email = models.EmailField(_('Kontaktný email'), blank=True)
    bio = models.TextField(_('O mne'), blank=True)
    avatar = models.ImageField(
        _('Profilová fotka'), 
        upload_to='avatars/', 
        blank=True, 
        null=True,
        validators=[validate_image_file]
    )
    location = models.CharField(_('Lokalita'), max_length=25, blank=True)
    ico = models.CharField(_('IČO'), max_length=14, blank=True)
    ico_visible = models.BooleanField(_('Zobraziť IČO verejne'), default=False)
    job_title = models.CharField(_('Profesia'), max_length=100, blank=True)
    job_title_visible = models.BooleanField(_('Zobraziť profesiu verejne'), default=False)
    
    # Dátum narodenia a pohlavie
    birth_date = models.DateField(_('Dátum narodenia'), blank=True, null=True)
    gender = models.CharField(
        _('Pohlavie'),
        max_length=20,
        choices=[
            ('male', _('Muž')),
            ('female', _('Žena')),
            ('other', _('Iné')),
        ],
        blank=True
    )
    
    # Pre firmy
    company_name = models.CharField(_('Názov firmy'), max_length=100, blank=True)
    website = models.URLField(_('Webstránka'), blank=True)
    additional_websites = models.JSONField(_('Dodatočné webstránky'), default=list, blank=True)
    
    # Sociálne siete
    linkedin = models.URLField(_('LinkedIn'), blank=True)
    facebook = models.URLField(_('Facebook'), blank=True)
    instagram = models.URLField(_('Instagram'), blank=True)
    
    # Nastavenia
    is_verified = models.BooleanField(_('Overený'), default=False)
    is_public = models.BooleanField(_('Verejný profil'), default=True)
    
    # Kategória odstránená
    
    # Timestamps
    created_at = models.DateTimeField(_('Vytvorené'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Aktualizované'), auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        verbose_name = _('Používateľ')
        verbose_name_plural = _('Používatelia')

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
        return self.company_name or self.username

    @property
    def profile_completeness(self):
        """Vypočíta kompletnosť profilu v percentách"""
        fields = [
            'email', 'bio', 'avatar', 'location'
        ]
        
        if self.user_type == UserType.COMPANY:
            fields.extend(['company_name', 'website'])
        
        completed_fields = sum(1 for field in fields if getattr(self, field))
        total_fields = len(fields)
        
        return int((completed_fields / total_fields) * 100)


class UserProfile(models.Model):
    """Rozšírené informácie o používateľovi"""
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    
    # Preferencie
    preferred_communication = models.CharField(
        _('Preferovaná komunikácia'),
        max_length=20,
        choices=[
            ('online', _('Online')),
            ('offline', _('Osobne')),
            ('both', _('Oboje')),
        ],
        default='both'
    )
    
    # Notifikácie
    email_notifications = models.BooleanField(_('Email notifikácie'), default=True)
    push_notifications = models.BooleanField(_('Push notifikácie'), default=True)
    
    # Súkromie
    show_email = models.BooleanField(_('Zobraziť email'), default=False)
    show_phone = models.BooleanField(_('Zobraziť telefón'), default=False)

    # 2FA
    mfa_enabled = models.BooleanField(_('Zapnuté 2FA'), default=False)
    mfa_secret = models.CharField(_('2FA TOTP secret'), max_length=64, blank=True, default='')
    
    created_at = models.DateTimeField(_('Vytvorené'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Aktualizované'), auto_now=True)

    class Meta:
        verbose_name = _('Profil používateľa')
        verbose_name_plural = _('Profily používateľov')

    def __str__(self):
        return f"Profil {self.user.display_name}"


class EmailVerification(models.Model):
    """Model pre email verifikáciu"""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='email_verifications')
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    is_used = models.BooleanField(default=False)
    
    class Meta:
        verbose_name = _('Email verifikácia')
        verbose_name_plural = _('Email verifikácie')
        ordering = ['-created_at']
    
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
        
        subject = 'Potvrdenie registrácie - Swaply'
        message = f'''
Ahoj {self.user.display_name},

Ďakujeme za registráciu na Swaply!

Pre dokončenie registrácie kliknite na nasledujúci odkaz:
{verification_url}

Ak ste si nevytvorili účet na Swaply, môžete tento email ignorovať.

S pozdravom,
Tím Swaply
        '''
        
        logger.info(f"📧 DEBUG EMAIL: Email subject: {subject}")
        logger.info(f"📧 DEBUG EMAIL: From email: {settings.DEFAULT_FROM_EMAIL}")
        logger.info(f"📧 DEBUG EMAIL: To email: {self.user.email}")
        
        logger.info(f"📧 DEBUG EMAIL: EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
        if hasattr(settings, 'EMAIL_HOST'):
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
        base_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
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
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='offered_skills')
    category = models.CharField(_('Kategória'), max_length=100)
    subcategory = models.CharField(_('Podkategória'), max_length=100)
    description = models.TextField(_('Popis'), max_length=100, blank=True)
    detailed_description = models.TextField(_('Podrobný popis'), max_length=1000, blank=True)
    experience_value = models.FloatField(_('Hodnota dĺžky praxe'), null=True, blank=True)
    experience_unit = models.CharField(
        _('Jednotka dĺžky praxe'),
        max_length=10,
        choices=[
            ('years', _('Roky')),
            ('months', _('Mesiace')),
        ],
        blank=True
    )
    tags = models.JSONField(_('Tagy'), default=list, blank=True)
    price_from = models.DecimalField(_('Cena od'), max_digits=10, decimal_places=2, null=True, blank=True)
    price_currency = models.CharField(_('Mena'), max_length=8, blank=True, default='€')
    district = models.CharField(_('Okres'), max_length=100, blank=True)
    location = models.CharField(_('Miesto'), max_length=35, blank=True)
    opening_hours = models.JSONField(_('Otváracia doba'), default=dict, blank=True, null=True)
    
    created_at = models.DateTimeField(_('Vytvorené'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Aktualizované'), auto_now=True)
    
    class Meta:
        verbose_name = _('Ponúkaná zručnosť')
        verbose_name_plural = _('Ponúkané zručnosti')
        ordering = ['-created_at']
        # Jeden používateľ môže mať maximálne 3 zručnosti
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'category', 'subcategory'],
                name='unique_user_skill_category'
            )
        ]
    
    def __str__(self):
        return f"{self.user.display_name} - {self.category} → {self.subcategory}"


class OfferedSkillImage(models.Model):
    """Obrázok priradený k ponúkanej zručnosti (ponuke)."""
    skill = models.ForeignKey(OfferedSkill, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(_('Obrázok'), upload_to='offers/', validators=[validate_image_file])
    order = models.PositiveIntegerField(_('Poradie'), default=0)
    created_at = models.DateTimeField(_('Vytvorené'), auto_now_add=True)

    class Meta:
        verbose_name = _('Obrázok ponuky')
        verbose_name_plural = _('Obrázky ponúk')
        ordering = ['order', 'id']

    def __str__(self):
        return f"Obrázok #{self.id} pre {self.skill}"