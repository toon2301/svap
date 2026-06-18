from datetime import date

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from swaply.validators import CAPTCHAValidator, EmailValidator, SecurityValidator, URLValidator

from .models import (
    EmailVerification,
    User,
    UserProfile,
    UserType,
    decrypt_mfa_secret,
)
from .name_normalization import normalize_profile_name_fields


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializátor pre registráciu používateľa"""

    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    birth_day = serializers.CharField(write_only=True, required=False)
    birth_month = serializers.CharField(write_only=True, required=False)
    birth_year = serializers.CharField(write_only=True, required=False)
    captcha_token = serializers.CharField(write_only=True, required=True)
    website = serializers.CharField(required=False, allow_blank=True, max_length=200)

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "password",
            "password_confirm",
            "first_name",
            "last_name",
            "user_type",
            "phone",
            "company_name",
            "website",
            "birth_day",
            "birth_month",
            "birth_year",
            "gender",
            "captcha_token",
        ]
        extra_kwargs = {
            "username": {"required": True},
            "email": {"required": True},
            "first_name": {"required": False},
            "last_name": {"required": False},
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # V DEBUG režime sprav captcha nepovinnú; inak podľa nastavenia
        required = (
            False
            if getattr(settings, "DEBUG", False)
            else bool(getattr(settings, "CAPTCHA_ENABLED", True))
        )
        if "captcha_token" in self.fields:
            self.fields["captcha_token"].required = required

        # Odstrániť Django validátor z username field, lebo povolujeme medzery
        # Django UnicodeUsernameValidator neumožňuje medzery
        if "username" in self.fields:
            # Odstrániť všetky validátory z username field (vrátane Django UnicodeUsernameValidator)
            self.fields["username"].validators = []

    def validate(self, attrs):
        """Validácia hesiel a business logiky"""
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError("Heslá sa nezhodujú.")

        # Validácia CAPTCHA
        captcha_token = attrs.get("captcha_token")
        if captcha_token:
            CAPTCHAValidator.validate_captcha(captcha_token)

        # Username (display name) – povolíme medzery a validujeme dĺžku v validate_username()

        # Validácia pre firmy
        if attrs.get("user_type") == UserType.COMPANY:
            if not attrs.get("company_name"):
                raise serializers.ValidationError("Názov firmy je povinný.")

        # Validácia dátumu narodenia
        birth_day = attrs.get("birth_day")
        birth_month = attrs.get("birth_month")
        birth_year = attrs.get("birth_year")

        if birth_day and birth_month and birth_year:
            try:
                birth_date = date(int(birth_year), int(birth_month), int(birth_day))
                # Kontrola veku (aspoň 13 rokov)
                today = date.today()
                age = (
                    today.year
                    - birth_date.year
                    - ((today.month, today.day) < (birth_date.month, birth_date.day))
                )
                if age < 13:
                    raise serializers.ValidationError("Musíte mať aspoň 13 rokov.")
                attrs["birth_date"] = birth_date
            except ValueError:
                raise serializers.ValidationError("Neplatný dátum narodenia.")

        normalized_names = normalize_profile_name_fields(
            user_type=attrs.get("user_type", UserType.INDIVIDUAL),
            first_name=attrs.get("first_name", ""),
            last_name=attrs.get("last_name", ""),
            company_name=attrs.get("company_name", ""),
        )
        attrs.update(normalized_names)

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
        """Validácia username - povolené medzery, limit 35 znakov"""
        # Bezpečnostná validácia
        value = SecurityValidator.validate_input_safety(value)

        # Limit 35 znakov (vrátane medzier)
        if len(value) > 35:
            raise serializers.ValidationError(
                "Používateľské meno môže mať maximálne 35 znakov vrátane medzier."
            )

        # Unikátnosť (model má unikátny username)
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Používateľské meno je už obsadené.")

        return value

    def validate_website(self, value):
        """Normalizácia webu pri registrácii (doplní https:// ak chýba schéma)"""
        if value:
            value = SecurityValidator.validate_input_safety(value)
            return URLValidator.normalize_url(value, "Webová stránka")
        return value

    def create(self, validated_data):
        """Vytvorenie nového používateľa"""
        validated_data.pop("password_confirm", None)
        validated_data.pop("captcha_token", None)  # Odstráň CAPTCHA token ak existuje
        # Odstránenie polí pre dátum narodenia (už sú konvertované na birth_date)
        validated_data.pop("birth_day", None)
        validated_data.pop("birth_month", None)
        validated_data.pop("birth_year", None)

        password = validated_data.pop("password")
        email_verification_required = getattr(
            settings,
            "EMAIL_VERIFICATION_REQUIRED",
            False,
        )
        validated_data["is_verified"] = not email_verification_required

        # Vytvorenie používateľa s configurable email verification.
        # Vytvoriť User objekt bez volania full_clean() (ktorý validuje username)
        user = User(**validated_data)
        user.is_verified = not email_verification_required
        # Nastaviť heslo pomocou set_password (hashuje heslo)
        user.set_password(password)
        user.save()

        # Vytvorenie profilu
        UserProfile.objects.create(user=user)

        if email_verification_required:
            EmailVerification.objects.create(user=user)

        # Vymazanie hesla z validated_data pre bezpečnosť
        validated_data.pop("password", None)

        return user


class UserLoginSerializer(serializers.Serializer):
    """Serializátor pre prihlásenie"""

    email = serializers.EmailField()
    password = serializers.CharField()
    totp = serializers.CharField(write_only=True, required=False, allow_blank=True)

    def validate(self, attrs):
        """Validácia prihlasovacích údajov"""
        email = attrs.get("email")
        password = attrs.get("password")

        if email and password:
            user = authenticate(username=email, password=password)
            if not user:
                raise serializers.ValidationError("Neplatné prihlasovacie údaje.")
            if not user.is_active:
                raise serializers.ValidationError("Účet je deaktivovaný.")
            # Overenie emailu sa dá dočasne vypnúť počas testovania aplikácie.
            email_verification_required = getattr(
                settings,
                "EMAIL_VERIFICATION_REQUIRED",
                not getattr(settings, "ALLOW_UNVERIFIED_LOGIN", False),
            )
            if email_verification_required and not getattr(
                settings,
                "ALLOW_UNVERIFIED_LOGIN",
                False,
            ):
                if not getattr(user, "is_verified", False):
                    raise serializers.ValidationError(
                        "Účet nie je overený. Skontrolujte si email a kliknite na verifikačný odkaz."
                    )
            # 2FA: ak má používateľ zapnuté 2FA, vyžaduj TOTP
            if getattr(getattr(user, "profile", None), "mfa_enabled", False):
                totp_code = (self.initial_data.get("totp") or "").strip()
                if not totp_code:
                    raise serializers.ValidationError("Vyžaduje sa 2FA kód.")
                # Over TOTP cez jednoduchý storage secretu v profile (predpoklad: user.profile.mfa_secret)
                try:
                    import pyotp

                    raw = getattr(
                        getattr(user, "profile", None), "mfa_secret", None
                    )
                    mfa_secret = decrypt_mfa_secret(raw) if raw else None
                    if not mfa_secret:
                        raise serializers.ValidationError(
                            "2FA nie je správne nastavené."
                        )
                    totp = pyotp.TOTP(mfa_secret)
                    if not totp.verify(totp_code):
                        raise serializers.ValidationError("Neplatný 2FA kód.")
                except Exception:
                    raise serializers.ValidationError("Chyba pri overovaní 2FA.")
            attrs["user"] = user
        else:
            raise serializers.ValidationError("Musí byť zadaný email a heslo.")

        return attrs


class EmailVerificationSerializer(serializers.Serializer):
    """Serializátor pre email verifikáciu"""

    token = serializers.UUIDField()
    captcha_token = serializers.CharField(
        write_only=True, required=False, allow_blank=True
    )

    def validate_token(self, value):
        """Validácia tokenu"""
        try:
            verification = EmailVerification.objects.get(token=value)
            if verification.is_used:
                raise serializers.ValidationError("Token už bol použitý.")
            if verification.is_expired():
                raise serializers.ValidationError("Token expiroval.")
            return value
        except EmailVerification.DoesNotExist:
            raise serializers.ValidationError("Neplatný token.")

    def verify(self):
        """Overenie tokenu"""
        # Voliteľná CAPTCHA validácia (zapínateľná v settings), nesmie rozbiť existujúce testy
        captcha = self.initial_data.get("captcha_token")
        try:
            if captcha is not None:
                CAPTCHAValidator.validate_captcha(captcha)
        except Exception:
            # Ak CAPTCHA zlyhá a bola poslaná, nechaj to prepadnúť ako validačná chyba vyššie v view
            raise
        verification = EmailVerification.objects.get(token=self.validated_data["token"])
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
