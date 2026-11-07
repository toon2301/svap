"""Vzorové obrázky pre testy povolených formátov (nález 193).

Každý formát vyrobí Pillow v procese (HEIC cez pillow-heif, MPO ako dvojsnímkové JPEG), takže testy
nepotrebujú súbory v repozitári.
"""

from __future__ import annotations

import io

from PIL import Image, PngImagePlugin
from PIL.TiffImagePlugin import IFDRational

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


#: Animované vzorky (`make_animated_image`): farby snímok, ich trvanie v ms a počet opakovaní animácie.
ANIMATION_COLORS = ((255, 0, 0), (0, 255, 0), (0, 0, 255))
ANIMATION_DURATIONS = (100, 200, 300)
ANIMATION_LOOP = 2

#: Texty, ktoré `make_animated_image(with_metadata=True)` vloží do súboru; po úprave v ňom už nesmú byť.
ANIMATION_SECRET_MARKERS = (b"EvilCam", b"xmpmeta", b"PrivateNote")

_XMP = "<x:xmpmeta>XmpPrivate</x:xmpmeta>"


def gps_exif_bytes() -> bytes:
    """EXIF s výrobcom fotoaparátu `EvilCam` a polohou GPS (sub-IFD s GPS treba priradiť späť, inak ho Pillow nezapíše)."""
    exif = Image.Exif()
    exif[0x010F] = "EvilCam"  # Make
    gps = exif.get_ifd(0x8825)  # GPSInfo
    gps[1] = "N"
    gps[2] = (IFDRational(48, 1), IFDRational(8, 1), IFDRational(0, 1))
    gps[3] = "E"
    gps[4] = (IFDRational(17, 1), IFDRational(7, 1), IFDRational(0, 1))
    exif[0x8825] = gps
    return exif.tobytes()


def make_animated_image(
    fmt: str, *, with_metadata: bool = False, size: tuple[int, int] = (24, 16)
) -> bytes:
    """Animovaný `WEBP` alebo `PNG` (APNG) s tromi jednofarebnými snímkami (pozri `ANIMATION_*`).

    WebP je bezstratový, takže sa po dekódovaní dá presne porovnať farba každej snímky. `with_metadata` pridá EXIF s
    výrobcom a polohou GPS, XMP a pri PNG aj textový chunk (texty sú v `ANIMATION_SECRET_MARKERS`).
    """
    frames = [Image.new("RGB", size, color) for color in ANIMATION_COLORS]
    options: dict = {
        "save_all": True,
        "append_images": frames[1:],
        "duration": list(ANIMATION_DURATIONS),
        "loop": ANIMATION_LOOP,
    }
    if fmt == "WEBP":
        options["lossless"] = True
        if with_metadata:
            options.update(exif=gps_exif_bytes(), xmp=_XMP.encode("ascii"))
    elif fmt == "PNG":
        if with_metadata:
            info = PngImagePlugin.PngInfo()
            info.add_text("Comment", "PrivateNote")
            info.add_itxt("XML:com.adobe.xmp", _XMP)
            options.update(exif=gps_exif_bytes(), pnginfo=info)
    else:
        raise ValueError(f"Animované vzorky sú len WEBP a PNG, nie {fmt}.")
    buffer = io.BytesIO()
    frames[0].save(buffer, format=fmt, **options)
    return buffer.getvalue()


def animation_of(data: bytes) -> list[tuple[int, tuple[int, int, int]]]:
    """Trvanie (ms) a farba každej snímky animovaného obrázka, na porovnanie pred a po úprave."""
    result = []
    with Image.open(io.BytesIO(data)) as image:
        for index in range(image.n_frames):
            image.seek(index)
            image.load()  # trvanie snímky WebP sa nastaví až pri jej načítaní
            color = image.convert("RGB").getpixel((0, 0))
            result.append((int(image.info["duration"]), color))
    return result
