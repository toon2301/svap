"""Serializácia stručného profilu používateľa (zdieľané naprieč messaging serializermi)."""
from __future__ import annotations

from django.core.files.storage import default_storage
from rest_framework import serializers


class UserBriefSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    display_name = serializers.CharField(allow_blank=True)
    slug = serializers.CharField(allow_null=True, required=False)
    user_type = serializers.CharField(allow_null=True, required=False)
    avatar_url = serializers.CharField(allow_null=True, required=False)
    is_deleted = serializers.BooleanField(required=False)


def serialize_user_brief(user, request=None):
    # Anonymizovaný/zmazaný účet (is_active=False): nevracaj meno/slug/avatar
    # (sú anonymizované). Frontend zobrazí preložené "Zmazaný používateľ".
    is_deleted = not getattr(user, "is_active", True)
    return {
        "id": user.id,
        "display_name": "" if is_deleted else (getattr(user, "display_name", "") or ""),
        "slug": None if is_deleted else getattr(user, "slug", None),
        "user_type": getattr(user, "user_type", None),
        "avatar_url": None if is_deleted else _avatar_url(request, user),
        "is_deleted": is_deleted,
    }


def _avatar_url(request, user) -> str | None:
    try:
        avatar = getattr(user, "avatar", None)
        if avatar and hasattr(avatar, "url"):
            url = avatar.url
            return request.build_absolute_uri(url) if request else url
    except Exception:
        return None
    return None


def _avatar_name_url(request, avatar_name: str | None) -> str | None:
    if not avatar_name:
        return None
    try:
        url = default_storage.url(avatar_name)
        return request.build_absolute_uri(url) if request else url
    except Exception:
        return None
