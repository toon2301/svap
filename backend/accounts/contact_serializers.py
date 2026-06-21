"""
Serializers pre kontaktný formulár.
"""

from django.conf import settings
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from swaply.validators import CAPTCHAValidator, EmailValidator
import bleach


class ContactFormSerializer(serializers.Serializer):
    email = serializers.CharField(max_length=254)
    message = serializers.CharField(max_length=2000)
    captcha_token = serializers.CharField(
        required=False, allow_blank=True, write_only=True
    )
    # Honeypot – musí zostať prázdne
    website = serializers.CharField(
        required=False, allow_blank=True, write_only=True
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        required = (
            False
            if getattr(settings, "DEBUG", False)
            else bool(getattr(settings, "CAPTCHA_ENABLED", True))
        )
        if "captcha_token" in self.fields:
            self.fields["captcha_token"].required = required

    def validate_email(self, value):
        return EmailValidator.validate_email(value.strip())

    def validate_message(self, value):
        value = value.strip() if isinstance(value, str) else ""
        if not value:
            raise serializers.ValidationError(_("Správa je povinná."))
        if len(value) > 2000:
            raise serializers.ValidationError(
                _("Správa môže mať maximálne 2000 znakov.")
            )
        # Sanitizácia HTML/XSS cez bleach (tags=[] odstráni všetky tagy vrátane
        # <script>). Neblokujeme legitímny text s bežnými slovami ako
        # "update"/"select" – SQL injekcia nehrozí, ORM používa parametrizované
        # dotazy.
        cleaned = bleach.clean(value, tags=[], strip=True).strip()
        # Po sanitizácii nesmie ostať prázdny text – vstup zložený len z tagov
        # (napr. "<script></script>" alebo "<div></div>") sa odstráni celý a
        # nepredstavuje platnú správu.
        if not cleaned:
            raise serializers.ValidationError(_("Správa je povinná."))
        return cleaned

    def validate(self, attrs):
        website = (attrs.get("website") or "").strip()
        if website:
            attrs["_honeypot"] = True
            return attrs

        captcha_token = attrs.get("captcha_token")
        if captcha_token:
            CAPTCHAValidator.validate_captcha(captcha_token)
        elif self.fields["captcha_token"].required:
            raise serializers.ValidationError(
                {"captcha_token": [_("CAPTCHA je povinná.")]}
            )

        return attrs
