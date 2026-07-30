"""Validation for user-submitted technical bug reports."""

from __future__ import annotations

import bleach
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from .models import BugReportCategory, BugReportDeviceType


class BugReportCreateSerializer(serializers.Serializer):
    """Strict public write contract; workflow fields are intentionally excluded."""

    ALLOWED_FIELDS = frozenset(
        {
            "category",
            "title",
            "description",
            "reproduction_steps",
            "source_screen",
            "device_type",
            "locale",
            "app_version",
            "browser",
        }
    )

    category = serializers.ChoiceField(choices=BugReportCategory.values)
    title = serializers.CharField(max_length=120, trim_whitespace=True)
    description = serializers.CharField(max_length=2000, trim_whitespace=True)
    reproduction_steps = serializers.CharField(
        max_length=2000,
        required=False,
        allow_blank=True,
        default="",
        trim_whitespace=True,
    )
    source_screen = serializers.RegexField(
        regex=r"^[A-Za-z0-9._:/-]{1,64}$",
        max_length=64,
        required=False,
        allow_blank=True,
        default="",
    )
    device_type = serializers.ChoiceField(
        choices=BugReportDeviceType.values,
        required=False,
        default=BugReportDeviceType.UNKNOWN,
    )
    locale = serializers.ChoiceField(
        choices=("", "sk", "en", "de", "cs", "hu", "pl"),
        required=False,
        allow_blank=True,
        default="",
    )
    app_version = serializers.RegexField(
        regex=r"^[A-Za-z0-9._+-]{1,64}$",
        max_length=64,
        required=False,
        allow_blank=True,
        default="",
    )
    browser = serializers.CharField(
        max_length=64,
        required=False,
        allow_blank=True,
        default="",
        trim_whitespace=True,
    )

    def to_internal_value(self, data):
        if hasattr(data, "keys"):
            unknown_fields = sorted(set(data.keys()) - self.ALLOWED_FIELDS)
            if unknown_fields:
                raise serializers.ValidationError(
                    {
                        field: [_("Toto pole nie je povolené.")]
                        for field in unknown_fields
                    }
                )
        return super().to_internal_value(data)

    @staticmethod
    def _plain_text(value: str, *, required: bool) -> str:
        cleaned = bleach.clean(
            value.strip() if isinstance(value, str) else "",
            tags=[],
            attributes={},
            strip=True,
        ).strip()
        if required and not cleaned:
            raise serializers.ValidationError(_("Toto pole je povinné."))
        return cleaned

    def validate_title(self, value):
        return self._plain_text(value, required=True)

    def validate_description(self, value):
        return self._plain_text(value, required=True)

    def validate_reproduction_steps(self, value):
        return self._plain_text(value, required=False)

    def validate_browser(self, value):
        return self._plain_text(value, required=False)
