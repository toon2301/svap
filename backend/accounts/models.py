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
    phone = models.CharField(_('Telefón'), max_length=20, blank=True)
    bio = models.TextField(_('O mne'), blank=True)
    avatar = models.ImageField(
        _('Profilová fotka'), 
        upload_to='avatars/', 
        blank=True, 
        null=True,
        validators=[validate_image_file]
    )
    location = models.CharField(_('Lokalita'), max_length=100, blank=True)
    
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
    
    # Sociálne siete
    linkedin = models.URLField(_('LinkedIn'), blank=True)
    facebook = models.URLField(_('Facebook'), blank=True)
    instagram = models.URLField(_('Instagram'), blank=True)
    
    # Nastavenia
    is_verified = models.BooleanField(_('Overený'), default=False)
    is_public = models.BooleanField(_('Verejný profil'), default=True)
    
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
        verification_url = self.get_verification_url(request)
        
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
        
        try:
            result = send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[self.user.email],
                fail_silently=False,
            )
            return True
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Chyba pri odosielaní emailu: {e}")
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