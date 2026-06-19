"""Detekcia reálneho formátu obrázka z "magic bytes".

Slúži na overenie, že nahraný súbor je naozaj obrázok podporovaného formátu –
nezávisle od prípony alebo deklarovaného Content-Type (ktoré sa dajú sfalšovať).
Detekcia funguje aj pre HEIC/HEIF bez nutnosti dekódovať obrázok (bez Pillow),
takže neblokuje legitímne iPhone fotky ani v prostredí bez pillow-heif.
"""

from __future__ import annotations

from typing import Optional

# Stačí pár prvých bajtov; HEIC `ftyp` box je do ~12 B od začiatku súboru.
HEADER_READ_BYTES = 32

# HEIF/HEIC major brandy (bajty 8–12, hneď za 'ftyp' na offsete 4).
_HEIF_BRANDS = frozenset(
    {
        b"heic",
        b"heix",
        b"hevc",
        b"hevx",
        b"heim",
        b"heis",
        b"hevm",
        b"hevs",
        b"mif1",
        b"msf1",
        b"heif",
    }
)


def sniff_image_format(header: bytes) -> Optional[str]:
    """Vráti názov detegovaného formátu obrázka alebo None, ak nie je rozpoznaný.

    Rozpoznáva bežné webové formáty: jpeg, png, gif, webp, bmp, tiff, heif.
    """
    if not header or len(header) < 3:
        return None

    if header[:3] == b"\xff\xd8\xff":
        return "jpeg"
    if header[:8] == b"\x89PNG\r\n\x1a\n":
        return "png"
    if header[:6] in (b"GIF87a", b"GIF89a"):
        return "gif"
    if len(header) >= 12 and header[:4] == b"RIFF" and header[8:12] == b"WEBP":
        return "webp"
    if header[:2] == b"BM":
        return "bmp"
    if header[:4] in (b"II*\x00", b"MM\x00*"):
        return "tiff"
    if len(header) >= 12 and header[4:8] == b"ftyp" and header[8:12] in _HEIF_BRANDS:
        return "heif"
    return None


def read_file_header(value, num_bytes: int = HEADER_READ_BYTES) -> Optional[bytes]:
    """Best-effort prečíta hlavičku z file-like objektu bez zmeny pozície kurzora.

    Vráti None, ak objekt nepodporuje čítanie (napr. interné/testovacie
    pseudo-objekty) – vtedy sa kontrola obsahu jednoducho preskočí.
    """
    fobj = getattr(value, "file", None) or value
    reader = getattr(fobj, "read", None)
    if not callable(reader):
        return None

    seeker = getattr(fobj, "seek", None)
    teller = getattr(fobj, "tell", None)

    pos = 0
    if callable(teller):
        try:
            pos = fobj.tell()
        except Exception:
            pos = 0

    try:
        if callable(seeker):
            fobj.seek(0)
        header = reader(num_bytes) or b""
    except Exception:
        return None
    finally:
        if callable(seeker):
            try:
                fobj.seek(pos)
            except Exception:
                pass

    if isinstance(header, str):
        header = header.encode("latin-1", "ignore")
    return header
