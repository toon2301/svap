"""Ukladanie a normalizácia profilových avatarov."""

from __future__ import annotations

import uuid
from pathlib import Path

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
    """Odstráň metadáta a zmenši bezpečne dekódovateľný avatar pred uložením."""
    if not image:
        return image

    processed = strip_image_metadata(image, max_side=AVATAR_MAX_SIDE)
    # GIF sa zámerne ponechá bez re-enkódovania, aby sa nestratila animácia.
    # Rovnaký fallback zachová doterajšie prijímanie formátu, ktorý Pillow
    # v konkrétnom prostredí nevie bezpečne spracovať (napríklad HEIC bez codec-u).
    return processed if processed is not None else image
