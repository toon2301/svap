"""
Zdieľaný util na odstránenie EXIF/metadát z nahraných obrázkov.

GDPR: obrázky nahraté používateľom (správy, avatary) môžu obsahovať EXIF s GPS
lokáciou. Metadáta odstránime re-enkódovaním cez Pillow (orientáciu „zapečieme"
cez `exif_transpose` ešte pred stripom), takže uložený súbor už GPS neobsahuje.

Ponuky/portfólio EXIF neriešia tu – ich pipeline ukladá WebP cez `save()` bez
`exif=`, čím sa metadáta zahodia automaticky.
"""

from __future__ import annotations

import io
import logging
from pathlib import Path

from django.core.files.base import ContentFile

logger = logging.getLogger(__name__)

_JPEG_SOURCE_FORMATS = {"JPEG", "MPO"}
_HEIF_SOURCE_FORMATS = {"HEIF", "HEIC"}


def _register_heif_support() -> None:
    """Povoľ dekódovanie HEIC/HEIF ak je dostupný pillow-heif."""
    try:
        from pillow_heif import register_heif_opener

        register_heif_opener()
    except Exception:
        return


def _normalize_for_jpeg(image):
    """JPEG nepodporuje alfa kanál – preveď na RGB."""
    if image.mode in ("RGB", "L"):
        return image
    return image.convert("RGB")


def strip_image_metadata(image, *, filename: str | None = None):
    """
    Re-enkóduj nahraný obrázok bez EXIF/metadát, so zachovaním orientácie.

    Vracia `ContentFile` pripravený na priradenie do `ImageField`, alebo `None`
    ak strip nie je možný/potrebný – vtedy volajúci ponechá originál (fail-open,
    aby sa upload nerozbil). GIF sa preskakuje (nepodporuje EXIF, re-enkódovanie
    by zničilo animáciu).

    `filename` (voliteľné) určuje stem výsledného názvu; default sa odvodí z
    `image.name`. Prípona sa odvíja od výstupného formátu.
    """
    if not image:
        return None

    _register_heif_support()
    try:
        from PIL import Image, ImageOps

        if hasattr(image, "seek"):
            image.seek(0)

        with Image.open(image) as source:
            source_format = (source.format or "").upper()
            if source_format == "GIF":
                return None

            # Zapeč orientáciu z EXIF do pixelov, potom EXIF zahodíme.
            oriented = ImageOps.exif_transpose(source)

            output = io.BytesIO()
            if source_format in _JPEG_SOURCE_FORMATS or source_format in _HEIF_SOURCE_FORMATS:
                _normalize_for_jpeg(oriented).save(
                    output, format="JPEG", quality=90, optimize=True
                )
                suffix = ".jpg"
            elif source_format == "PNG":
                oriented.save(output, format="PNG", optimize=True)
                suffix = ".png"
            elif source_format == "WEBP":
                oriented.save(output, format="WEBP", quality=90, method=6)
                suffix = ".webp"
            else:
                # Neznámy/nepodporovaný formát – radšej ponechaj originál.
                return None

            output.seek(0)
            base = filename or getattr(image, "name", None) or "image"
            stem = Path(base).stem or "image"
            return ContentFile(output.read(), name=f"{stem}{suffix}")
    except Exception:
        logger.warning(
            "Image metadata strip failed; falling back to original.",
            exc_info=True,
        )
        return None
    finally:
        try:
            if hasattr(image, "seek"):
                image.seek(0)
        except Exception:
            pass
