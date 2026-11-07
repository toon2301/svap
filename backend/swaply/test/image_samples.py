"""Vzorové obrázky pre testy povolených formátov (nález 193).

Každý formát vyrobí Pillow v procese (HEIC cez pillow-heif, MPO ako dvojsnímkové JPEG), takže testy
nepotrebujú súbory v repozitári.
"""

from __future__ import annotations

import io

from PIL import Image

#: Formáty, ktoré aplikácia prijíma: JPEG, PNG, WebP, GIF, HEIC z iPhonu a MPO (viacsnímkové JPEG z mobilov).
ALLOWED_FORMATS = ("JPEG", "PNG", "WEBP", "GIF", "HEIC", "MPO")

#: Formáty, ktoré Pillow pozná, no aplikácia ich neprijíma. TIFF a BMP sú tie, ktoré rozpoznáva aj kontrola podpisu.
DENIED_FORMATS = ("TIFF", "BMP", "ICO", "PCX", "TGA", "JPEG2000")

#: Názov, pod ktorým klient súbor nahrá; nepovolený formát sa dá schovať pod `.jpg`.
UPLOAD_NAME = {
    "JPEG": "photo.jpg",
    "PNG": "photo.png",
    "WEBP": "photo.webp",
    "GIF": "photo.gif",
    "HEIC": "photo.heic",
    "MPO": "photo.jpg",
}

#: Názov formátu, ktorý po otvorení hlási Pillow (HEIC sa hlási ako HEIF).
PILLOW_FORMAT_NAME = {"HEIC": "HEIF"}

#: Obsah, ktorý nie je obrázok vôbec.
NOT_AN_IMAGE = b"<html><script>alert(1)</script></html>"


def make_image(fmt: str, size: tuple[int, int] = (64, 48)) -> bytes:
    """Vráti bajty malého platného obrázka daného formátu (pozri `ALLOWED_FORMATS` a `DENIED_FORMATS`)."""
    image = Image.new("RGB", size, (200, 30, 90))
    buffer = io.BytesIO()
    if fmt == "HEIC":
        import pillow_heif

        pillow_heif.from_pillow(image).save(buffer)
    elif fmt == "MPO":
        second = Image.new("RGB", size, (10, 200, 10))
        image.save(buffer, format="MPO", save_all=True, append_images=[second])
    elif fmt == "ICO":
        image.save(buffer, format="ICO", sizes=[(32, 32)])
    else:
        image.save(buffer, format=fmt)
    return buffer.getvalue()
