"""Detekcia reálneho formátu obrázka z "magic bytes" a zoznam formátov, ktoré sa smú dekódovať.

Slúži na overenie, že nahraný súbor je naozaj obrázok podporovaného formátu –
nezávisle od prípony alebo deklarovaného Content-Type (ktoré sa dajú sfalšovať).
Detekcia funguje aj pre HEIC/HEIF bez nutnosti dekódovať obrázok (bez Pillow),
takže neblokuje legitímne iPhone fotky ani v prostredí bez pillow-heif.

Dekódovanie (`open_allowed_image`) berie Pillow len pre povolené formáty. Bez `formats=` by Pillow skúsil každý
formát, ktorý pozná (TIFF, BMP, ICO, JPEG 2000 a ďalšie), nielen tie, ktoré aplikácia prijíma.
"""

from __future__ import annotations

from typing import Optional

# Stačí pár prvých bajtov; HEIC `ftyp` box je do ~12 B od začiatku súboru.
HEADER_READ_BYTES = 32

# Formáty, ktoré aplikácia dekóduje (názvy formátov Pillow; zodpovedajú ALLOWED_IMAGE_EXTENSIONS: JPEG, PNG, WebP,
# GIF a HEIC/HEIF). MPO (viacsnímkové JPEG z fotoaparátov a mobilov) tu NIE JE: otvára ho modul "JPEG" a samostatný
# záznam "MPO" Pillow nemá, takže by `Image.open` pri každom nezhodnom vstupe zlyhal s `KeyError` namiesto
# `UnidentifiedImageError`.
PILLOW_DECODE_FORMATS = ("JPEG", "PNG", "WEBP", "GIF", "HEIF")

# Podpisy (názvy z `sniff_image_format`), ktoré prejdú pri nahrávaní. BMP a TIFF sa rozpoznajú, no nie sú povolené:
# správa by ich uložila bez odstránenia metadát (aj polohy GPS), lebo ich `strip_image_metadata` nepozná.
ALLOWED_SNIFFED_FORMATS = frozenset({"jpeg", "png", "gif", "webp", "heif"})

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


def allowed_pillow_formats() -> tuple[str, ...]:
    """Povolené formáty (`PILLOW_DECODE_FORMATS`), ktoré má Pillow v tomto procese naozaj zaregistrované.

    `HEIF` pribudne až po registrácii `pillow-heif` (zaregistruje sa tu, ak je dostupný): bez nej by `Image.open`
    pri nezhodnom vstupe vyhodil `KeyError` namiesto `UnidentifiedImageError`. Chýbajúca knižnica sa ticho
    preskočí, HEIC sa vtedy odmietne ako neznámy formát.
    """
    from PIL import Image

    try:
        from pillow_heif import register_heif_opener

        register_heif_opener()
    except Exception:
        pass
    return tuple(name for name in PILLOW_DECODE_FORMATS if name != "HEIF" or "HEIF" in Image.OPEN)


def open_allowed_image(fp):
    """`Image.open` len pre povolené formáty; iný formát vyhodí `PIL.UnidentifiedImageError`.

    MPO súbory z mobilov sa otvoria cez modul `JPEG` (formát potom hlási `MPO`), preto ich netreba uvádzať zvlášť.
    """
    from PIL import Image

    return Image.open(fp, formats=allowed_pillow_formats())
