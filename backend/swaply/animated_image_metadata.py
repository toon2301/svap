"""Odstránenie metadát z animovaných obrázkov (animovaný PNG a WebP) bez straty snímok.

`strip_image_metadata` obrázok dekóduje a uloží znova ako jedinú snímku, čo je pri animácii strata obsahu. Tu sa
animácia nedekóduje ani neprekóduje: prejde sa kontajner súboru (chunky PNG, chunky RIFF vo WebP) a skopíruje sa len to,
čo obrázok potrebuje na zobrazenie (pixelové dáta, animácia, farby, priehľadnosť). Snímky a ich časovanie preto ostanú
bajt po bajte rovnaké. Zahodí sa všetko ostatné: EXIF vrátane polohy GPS, XMP, textové chunky, časová značka, neznáme
chunky aj údaje za koncom obrázka.

GIF sa tu nerieši: nemá EXIF a volajúci ho ponecháva nezmenený (pozri `strip_image_metadata`).
"""

from __future__ import annotations

import io
import logging
from pathlib import Path

from django.core.files.base import ContentFile

from .image_signature import open_allowed_image, read_file_header, sniff_image_format

logger = logging.getLogger(__name__)

_PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"

# Chunky PNG, ktoré sa skopírujú: povinné (IHDR, PLTE, IDAT, IEND), farby a priehľadnosť, rozmer pixelu a animácia
# (acTL, fcTL, fdAT). Iný chunk (eXIf, tEXt, zTXt, iTXt, tIME, neznáme) sa zahodí.
_PNG_KEPT_CHUNKS = frozenset(
    {
        b"IHDR",
        b"PLTE",
        b"IDAT",
        b"IEND",
        b"tRNS",
        b"gAMA",
        b"cHRM",
        b"sRGB",
        b"iCCP",
        b"cICP",
        b"sBIT",
        b"bKGD",
        b"pHYs",
        b"acTL",
        b"fcTL",
        b"fdAT",
    }
)

# Chunky WebP (RIFF), ktoré sa skopírujú: hlavička, farebný profil, animácia a snímky. EXIF a XMP sa zahodia.
_WEBP_KEPT_CHUNKS = frozenset(
    {b"VP8X", b"ICCP", b"ANIM", b"ANMF", b"ALPH", b"VP8 ", b"VP8L"}
)

# Príznaky v prvom bajte chunku VP8X: súbor obsahuje chunk EXIF / XMP. Po ich odstránení sa príznaky vynulujú.
_WEBP_METADATA_FLAGS = 0x08 | 0x04

_PNG_CHUNK_OVERHEAD = 12  # dĺžka (4) + typ (4) + CRC (4)
_WEBP_CHUNK_HEADER = 8  # typ (4) + veľkosť (4)
_WEBP_VP8X_SIZE = 10


def _png_without_metadata(data: bytes) -> bytes | None:
    """Skopíruje PNG bez metadátových chunkov; `None`, keď je súbor skrátený, bez konca alebo má neznámy povinný chunk."""
    if not data.startswith(_PNG_SIGNATURE):
        return None
    kept = [_PNG_SIGNATURE]
    position = len(_PNG_SIGNATURE)
    while position + _PNG_CHUNK_OVERHEAD <= len(data):
        length = int.from_bytes(data[position : position + 4], "big")
        kind = data[position + 4 : position + 8]
        end = position + _PNG_CHUNK_OVERHEAD + length
        if end > len(data) or (position == len(_PNG_SIGNATURE) and kind != b"IHDR"):
            return None
        if kind in _PNG_KEPT_CHUNKS:
            kept.append(data[position:end])
        elif not kind[0] & 0x20:
            # Neznámy povinný chunk sa nedá bezpečne zahodiť (bez neho by sa obrázok nezobrazil správne).
            return None
        if kind == b"IEND":
            return b"".join(kept)  # všetko za IEND sa zahodí
        position = end
    return None


def _webp_without_metadata(data: bytes) -> bytes | None:
    """Skopíruje WebP bez chunkov EXIF a XMP (a bez neznámych); `None`, keď je súbor skrátený alebo poškodený."""
    if len(data) < 12 or data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        return None
    riff_end = 8 + int.from_bytes(data[4:8], "little")
    if riff_end > len(data):
        return None  # skrátený súbor; údaje za koncom RIFF sa zahodia
    chunks = []
    position = 12
    while position + _WEBP_CHUNK_HEADER <= riff_end:
        kind = data[position : position + 4]
        size = int.from_bytes(data[position + 4 : position + 8], "little")
        payload_end = position + _WEBP_CHUNK_HEADER + size
        if payload_end > riff_end:
            return None
        payload = data[position + _WEBP_CHUNK_HEADER : payload_end]
        if kind == b"VP8X":
            if size < _WEBP_VP8X_SIZE:
                return None
            payload = bytes([payload[0] & ~_WEBP_METADATA_FLAGS & 0xFF]) + payload[1:]
        if kind in _WEBP_KEPT_CHUNKS:
            padding = b"\x00" * (size % 2)
            chunks.append(kind + size.to_bytes(4, "little") + payload + padding)
        # Chunky s nepárnou veľkosťou majú za sebou výplňový bajt.
        position = payload_end + size % 2
    body = b"WEBP" + b"".join(chunks)
    return b"RIFF" + len(body).to_bytes(4, "little") + body


def _keeps_animation(cleaned: bytes, kind: str, frames: int, size: tuple) -> bool:
    """Overí, že očistený súbor sa dá otvoriť a dekódovať a že má rovnaký formát, počet snímok a rozmer ako pôvodný."""
    with open_allowed_image(io.BytesIO(cleaned)) as result:
        result.load()  # dekóduje prvú snímku, takže poškodený súbor nepreide
        return (
            (result.format or "").upper() == kind
            and getattr(result, "n_frames", 1) == frames
            and result.size == size
        )


def strip_animated_image_metadata(image, *, filename: str | None = None):
    """Odstráň metadáta z animovaného PNG alebo WebP so všetkými snímkami a ich časovaním.

    Vracia `ContentFile` pripravený na priradenie do `ImageField`, alebo `None`: súbor nie je PNG/WebP, má najviac
    jednu snímku (taký sa dá bez straty prekódovať cez `strip_image_metadata`), alebo ho nemožno spoľahlivo očistiť
    (poškodený kontajner, výsledok sa nedá dekódovať alebo nezachoval animáciu). Volajúci potom použije bežné
    prekódovanie. Orientácia z EXIF sa tu nezapeká do snímok. `filename` určuje stem výsledného názvu (default sa
    odvodí z `image.name`), prípona podľa formátu.
    """
    if not image:
        return None

    try:
        header = read_file_header(image) or b""
        if sniff_image_format(header) not in ("png", "webp"):
            return None

        image.seek(0)
        data = image.read()
        with open_allowed_image(io.BytesIO(data)) as source:
            kind = (source.format or "").upper()
            frames = getattr(source, "n_frames", 1)
            size = source.size
        if kind not in ("PNG", "WEBP") or frames <= 1:
            return None

        cleaned = (
            _png_without_metadata(data)
            if kind == "PNG"
            else _webp_without_metadata(data)
        )
        if cleaned is None or not _keeps_animation(cleaned, kind, frames, size):
            logger.warning(
                "Animated image metadata stripping produced no usable result."
            )
            return None

        stem = Path(filename or getattr(image, "name", None) or "image").stem or "image"
        return ContentFile(cleaned, name=f"{stem}.{kind.lower()}")
    except Exception:
        logger.warning(
            "Animated image metadata stripping failed; no processed image was produced.",
            exc_info=True,
        )
        return None
    finally:
        try:
            if hasattr(image, "seek"):
                image.seek(0)
        except Exception:
            pass
