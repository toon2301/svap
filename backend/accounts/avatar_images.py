"""Ukladanie a normalizácia profilových avatarov."""

from __future__ import annotations

import uuid
from pathlib import Path

from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

from swaply.image_signature import read_file_header, sniff_image_format
from swaply.image_metadata import strip_image_metadata


AVATAR_MAX_SIDE = 1024
_SAFE_AVATAR_SUFFIXES = {".gif", ".heic", ".heif", ".jpg", ".png", ".webp"}


def avatar_upload_to(_instance, filename: str) -> str:
    """Vytvor anonymný a nemenný storage kľúč pre každý nový avatar."""
    suffix = Path(filename or "").suffix.lower()
    if suffix == ".jpeg":
        suffix = ".jpg"
    if suffix not in _SAFE_AVATAR_SUFFIXES:
        suffix = ".jpg"
    return f"avatars/{uuid.uuid4().hex}{suffix}"


def prepare_avatar_upload(image):
    """Očisti avatar alebo odmietni formát, ktorý nemožno bezpečne spracovať."""
    if not image:
        return image

    processed = strip_image_metadata(image, max_side=AVATAR_MAX_SIDE)
    if processed is not None:
        return processed

    header = read_file_header(image)
    detected_format = sniff_image_format(header or b"")
    suffix = Path(getattr(image, "name", "") or "").suffix.lower()
    # GIF nemá EXIF/GPS a ponechávame ho bez re-enkódovania, aby sa
    # nestratila animácia. Prípona aj magic bytes musia súhlasiť.
    if suffix == ".gif" and detected_format == "gif":
        return image

    # Verejný avatar nikdy neuložíme v pôvodnej podobe, ak jeho metadáta
    # nevieme spoľahlivo odstrániť (najmä HEIC/HEIF bez dostupného kodeku).
    raise ValidationError(
        _("Súbor nie je platný obrázok (neznámy alebo poškodený formát).")
    )
