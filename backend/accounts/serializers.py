from rest_framework import serializers
from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from datetime import datetime, date
from .models import User, UserProfile, UserType, EmailVerification
from swaply.validators import (
    EmailValidator, PasswordValidator, NameValidator, 
    PhoneValidator, URLValidator, BioValidator, SecurityValidator, CAPTCHAValidator
)
from swaply.validators import HtmlSanitizer


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializátor pre registráciu používateľa"""
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    birth_day = serializers.CharField(write_only=True, required=False)
    birth_month = serializers.CharField(write_only=True, required=False)
    birth_year = serializers.CharField(write_only=True, required=False)
    captcha_token = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password_confirm',
            'user_type', 'phone', 'company_name', 'website',
            'birth_day', 'birth_month', 'birth_year', 'gender', 'captcha_token'
        ]
        extra_kwargs = {
            'username': {'required': True},
            'email': {'required': True},
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # V DEBUG režime sprav captcha nepovinnú; inak podľa nastavenia
        required = False if getattr(settings, 'DEBUG', False) else bool(getattr(settings, 'CAPTCHA_ENABLED', True))
        if 'captcha_token' in self.fields:
            self.fields['captcha_token'].required = required

    def validate(self, attrs):
        """Validácia hesiel a business logiky"""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Heslá sa nezhodujú.")
        
        # Validácia CAPTCHA
        captcha_token = attrs.get('captcha_token')
        if captcha_token:
            CAPTCHAValidator.validate_captcha(captcha_token)
        
        # Validácia pre firmy
        if attrs.get('user_type') == UserType.COMPANY:
            if not attrs.get('company_name'):
                raise serializers.ValidationError("Názov firmy je povinný.")
        
        # Validácia dátumu narodenia
        birth_day = attrs.get('birth_day')
        birth_month = attrs.get('birth_month')
        birth_year = attrs.get('birth_year')
        
        if birth_day and birth_month and birth_year:
            try:
                birth_date = date(int(birth_year), int(birth_month), int(birth_day))
                # Kontrola veku (aspoň 13 rokov)
                today = date.today()
                age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
                if age < 13:
                    raise serializers.ValidationError("Musíte mať aspoň 13 rokov.")
                attrs['birth_date'] = birth_date
            except ValueError:
                raise serializers.ValidationError("Neplatný dátum narodenia.")
        
        return attrs

    def validate_email(self, value):
        """Validácia emailu"""
        # Bezpečnostná validácia
        value = SecurityValidator.validate_input_safety(value)
        
        # Formátová validácia
        value = EmailValidator.validate_email(value)
        
        # Unikátnosť
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Používateľ s týmto emailom už existuje.")
        return value

    def validate_username(self, value):
        """Validácia username"""
        # Bezpečnostná validácia
        value = SecurityValidator.validate_input_safety(value)
        
        # Unikátnosť
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Používateľ s týmto používateľským menom už existuje.")
        return value

    def create(self, validated_data):
        """Vytvorenie nového používateľa"""
        validated_data.pop('password_confirm')
        validated_data.pop('captcha_token', None)  # Odstráň CAPTCHA token ak existuje
        # Odstránenie polí pre dátum narodenia (už sú konvertované na birth_date)
        validated_data.pop('birth_day', None)
        validated_data.pop('birth_month', None)
        validated_data.pop('birth_year', None)
        
        password = validated_data.pop('password')
        
        # Vytvorenie používateľa s is_verified=False
        user = User.objects.create_user(
            password=password,
            is_verified=False,  # Používateľ nie je overený po registrácii
            **validated_data
        )
        
        # Vytvorenie profilu
        UserProfile.objects.create(user=user)
        
        # Vytvorenie verifikačného tokenu
        verification = EmailVerification.objects.create(user=user)
        
        # Odoslanie verifikačného emailu
        request = self.context.get('request')
        verification.send_verification_email(request)
        
        # Vymazanie hesla z validated_data pre bezpečnosť
        validated_data.pop('password', None)
        
        return user


class UserLoginSerializer(serializers.Serializer):
    """Serializátor pre prihlásenie"""
    email = serializers.EmailField()
    password = serializers.CharField()
    totp = serializers.CharField(write_only=True, required=False, allow_blank=True)

    def validate(self, attrs):
        """Validácia prihlasovacích údajov"""
        email = attrs.get('email')
        password = attrs.get('password')

        if email and password:
            user = authenticate(username=email, password=password)
            if not user:
                raise serializers.ValidationError('Neplatné prihlasovacie údaje.')
            if not user.is_active:
                raise serializers.ValidationError('Účet je deaktivovaný.')
            # Overenie emailu – dá sa vypnúť cez ALLOW_UNVERIFIED_LOGIN (pre test/dev)
            if not getattr(settings, 'ALLOW_UNVERIFIED_LOGIN', False):
                if not getattr(user, 'is_verified', False):
                    raise serializers.ValidationError('Účet nie je overený. Skontrolujte si email a kliknite na verifikačný odkaz.')
            # 2FA: ak má používateľ zapnuté 2FA, vyžaduj TOTP
            if getattr(getattr(user, 'profile', None), 'mfa_enabled', False):
                totp_code = (self.initial_data.get('totp') or '').strip()
                if not totp_code:
                    raise serializers.ValidationError('Vyžaduje sa 2FA kód.')
                # Over TOTP cez jednoduchý storage secretu v profile (predpoklad: user.profile.mfa_secret)
                try:
                    import pyotp
                    mfa_secret = getattr(getattr(user, 'profile', None), 'mfa_secret', None)
                    if not mfa_secret:
                        raise serializers.ValidationError('2FA nie je správne nastavené.')
                    totp = pyotp.TOTP(mfa_secret)
                    if not totp.verify(totp_code):
                        raise serializers.ValidationError('Neplatný 2FA kód.')
                except Exception:
                    raise serializers.ValidationError('Chyba pri overovaní 2FA.')
            attrs['user'] = user
        else:
            raise serializers.ValidationError('Musí byť zadaný email a heslo.')

        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializátor pre profil používateľa"""
    # avatar ostáva zapisovateľné (ImageField na modeli)
    # avatar_url poskytuje plnú URL pre klienta
    avatar_url = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'user_type', 'phone', 'phone_visible', 'bio', 'avatar', 'avatar_url', 'location',
            'job_title', 'job_title_visible', 'company_name', 'website', 'linkedin', 'facebook',
            'instagram', 'is_verified', 'is_public', 'created_at',
            'updated_at', 'profile_completeness', 'birth_date', 'gender'
        ]
        read_only_fields = ['id', 'is_verified', 'created_at', 'updated_at', 'profile_completeness']

    def get_avatar_url(self, obj):
        """Vráti plnú URL k avataru (ak existuje)."""
        try:
            if obj.avatar and hasattr(obj.avatar, 'url'):
                request = self.context.get('request')
                url = obj.avatar.url
                if request:
                    return request.build_absolute_uri(url)
                return url
        except Exception:
            return None
        return None

    def validate_first_name(self, value):
        """Validácia mena"""
        if value:
            value = SecurityValidator.validate_input_safety(value)
            return NameValidator.validate_name(value, 'Meno')
        return value

    def validate_last_name(self, value):
        """Validácia priezviska"""
        if value:
            value = SecurityValidator.validate_input_safety(value)
            return NameValidator.validate_name(value, 'Priezvisko')
        return value

    def validate_phone(self, value):
        """Validácia telefónu"""
        if value:
            value = SecurityValidator.validate_input_safety(value)
            return PhoneValidator.validate_phone(value)
        return value

    def validate_website(self, value):
        """Validácia webovej stránky"""
        if value:
            value = SecurityValidator.validate_input_safety(value)
            return URLValidator.validate_url(value, 'Webová stránka')
        return value

    def validate_linkedin(self, value):
        """Validácia LinkedIn URL"""
        if value:
            value = SecurityValidator.validate_input_safety(value)
            return URLValidator.validate_url(value, 'LinkedIn')
        return value

    def validate_facebook(self, value):
        """Validácia Facebook URL"""
        if value:
            value = SecurityValidator.validate_input_safety(value)
            return URLValidator.validate_url(value, 'Facebook')
        return value

    def validate_instagram(self, value):
        """Validácia Instagram URL"""
        if value:
            value = SecurityValidator.validate_input_safety(value)
            return URLValidator.validate_url(value, 'Instagram')
        return value

    def validate_bio(self, value):
        """Validácia bio textu"""
        if value:
            # Najprv sanitizácia HTML
            sanitized = HtmlSanitizer.sanitize_html(value)
            # Potom bezpečnostná validácia na sanitizovanom texte
            sanitized = SecurityValidator.validate_input_safety(sanitized)
            return BioValidator.validate_bio(sanitized)
        return value

    def validate_location(self, value):
        """Validácia lokácie"""
        if value:
            value = SecurityValidator.validate_input_safety(value)
            if len(value.strip()) > 100:
                raise serializers.ValidationError("Lokácia môže mať maximálne 100 znakov")
            return value.strip()
        return value




class EmailVerificationSerializer(serializers.Serializer):
    """Serializátor pre email verifikáciu"""
    token = serializers.UUIDField()
    captcha_token = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
    def validate_token(self, value):
        """Validácia tokenu"""
        try:
            verification = EmailVerification.objects.get(token=value)
            if verification.is_used:
                raise serializers.ValidationError('Token už bol použitý.')
            if verification.is_expired():
                raise serializers.ValidationError('Token expiroval.')
            return value
        except EmailVerification.DoesNotExist:
            raise serializers.ValidationError('Neplatný token.')
    
    def verify(self):
        """Overenie tokenu"""
        # Voliteľná CAPTCHA validácia (zapínateľná v settings), nesmie rozbiť existujúce testy
        captcha = self.initial_data.get('captcha_token')
        try:
            if captcha is not None:
                CAPTCHAValidator.validate_captcha(captcha)
        except Exception:
            # Ak CAPTCHA zlyhá a bola poslaná, nechaj to prepadnúť ako validačná chyba vyššie v view
            raise
        verification = EmailVerification.objects.get(token=self.validated_data['token'])
        return verification.verify()


class ResendVerificationSerializer(serializers.Serializer):
    """Serializátor pre znovu odoslanie verifikačného emailu"""
    email = serializers.EmailField()
    
    def validate_email(self, value):
        """Validácia emailu"""
        # Bezpečnostná validácia
        value = SecurityValidator.validate_input_safety(value)
        
        # Formátová validácia
        value = EmailValidator.validate_email(value)
        
        # Kontrola, či používateľ existuje
        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Používateľ s týmto emailom neexistuje.")
        
        return value