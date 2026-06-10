"""
Serializers pre kontaktný formulár.
"""

from django.conf import settings
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from swaply.validators import CAPTCHAValidator, EmailValidator, SecurityValidator
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
        SecurityValidator.validate_input_safety(value)
        return bleach.clean(value, tags=[], strip=True)

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
