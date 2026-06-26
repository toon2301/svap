"""
Testy pre strip_image_metadata (swaply/image_metadata.py).

BOD 5: GDPR – GPS/EXIF (a XMP) sa musí kompletne odstrániť aj na PNG a WebP ceste,
nielen na JPEG. exif_transpose zapečie len orientáciu; zvyšok EXIF ostáva v
oriented.info a PNG/WebP by ho pri save() zapísali späť do súboru.
"""

from __future__ import annotations

from io import BytesIO

from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from PIL.TiffImagePlugin import IFDRational

from swaply.image_metadata import strip_image_metadata

GPS_TAG = 0x8825
MAKE_TAG = 0x010F


def _gps_exif_bytes() -> bytes:
    """EXIF blok s GPS lokáciou (správne pripojený GPS sub-IFD) ako bajty."""
    image = Image.new("RGB", (8, 8), (0, 128, 255))
    exif = image.getexif()
    exif[MAKE_TAG] = "EvilCam"
    gps = exif.get_ifd(GPS_TAG)
    gps[1] = "N"
    gps[2] = (IFDRational(48, 1), IFDRational(8, 1), IFDRational(0, 1))
    gps[3] = "E"
    gps[4] = (IFDRational(17, 1), IFDRational(7, 1), IFDRational(0, 1))
    exif[GPS_TAG] = gps
    return exif.tobytes()


def _upload(fmt: str, content_type: str, **save_kwargs) -> SimpleUploadedFile:
    buffer = BytesIO()
    Image.new("RGB", (8, 8), (0, 128, 255)).save(buffer, format=fmt, **save_kwargs)
    return SimpleUploadedFile(f"x.{fmt.lower()}", buffer.getvalue(), content_type=content_type)


def _jpeg_with_gps() -> SimpleUploadedFile:
    image = Image.new("RGB", (8, 8), (0, 128, 255))
    exif = image.getexif()
    exif[MAKE_TAG] = "EvilCam"
    gps = exif.get_ifd(GPS_TAG)
    gps[1] = "N"
    gps[2] = (IFDRational(48, 1), IFDRational(8, 1), IFDRational(0, 1))
    gps[3] = "E"
    gps[4] = (IFDRational(17, 1), IFDRational(7, 1), IFDRational(0, 1))
    exif[GPS_TAG] = gps
    buffer = BytesIO()
    image.save(buffer, format="JPEG", exif=exif)
    return SimpleUploadedFile("x.jpg", buffer.getvalue(), content_type="image/jpeg")


def _read_metadata(content_file):
    content_file.seek(0)
    with Image.open(BytesIO(content_file.read())) as im:
        exif = im.getexif()
        gps = dict(exif.get_ifd(GPS_TAG))
        xmp = im.info.get("xmp")
    return len(exif), gps, xmp


def test_jpeg_gps_is_stripped():
    upload = _jpeg_with_gps()
    # Precondition: reálne GPS pred stripom.
    with Image.open(BytesIO(upload.read())) as src:
        assert src.getexif().get_ifd(GPS_TAG)
    upload.seek(0)

    result = strip_image_metadata(upload)

    exif_len, gps, _xmp = _read_metadata(result)
    assert exif_len == 0
    assert not gps


def test_png_gps_is_stripped():
    upload = _upload("PNG", "image/png", exif=_gps_exif_bytes())
    # Precondition: PNG reálne nesie GPS v eXIf chunku.
    with Image.open(BytesIO(upload.read())) as src:
        assert src.getexif().get_ifd(GPS_TAG)
    upload.seek(0)

    result = strip_image_metadata(upload)

    exif_len, gps, _xmp = _read_metadata(result)
    assert result.name.endswith(".png")
    assert exif_len == 0
    assert not gps


def test_webp_gps_and_xmp_are_stripped():
    upload = _upload(
        "WEBP", "image/webp", exif=_gps_exif_bytes(), xmp=b"<x:xmp>GPS leak</x:xmp>"
    )
    # Precondition: WebP reálne nesie GPS aj XMP.
    with Image.open(BytesIO(upload.read())) as src:
        assert src.getexif().get_ifd(GPS_TAG)
        assert src.info.get("xmp")
    upload.seek(0)

    result = strip_image_metadata(upload)

    exif_len, gps, xmp = _read_metadata(result)
    assert result.name.endswith(".webp")
    assert exif_len == 0
    assert not gps
    assert not xmp


def test_image_without_exif_is_handled():
    upload = _upload("PNG", "image/png")  # žiadne EXIF
    result = strip_image_metadata(upload)
    # Strip nesmie spadnúť a vráti použiteľný súbor bez metadát.
    assert result is not None
    exif_len, gps, _xmp = _read_metadata(result)
    assert exif_len == 0
    assert not gps


def test_gif_is_skipped():
    buffer = BytesIO()
    Image.new("RGB", (8, 8), (1, 2, 3)).save(buffer, format="GIF")
    upload = SimpleUploadedFile("x.gif", buffer.getvalue(), content_type="image/gif")
    # GIF sa preskakuje (fail-open) – vracia None, volajúci ponechá originál.
    assert strip_image_metadata(upload) is None
