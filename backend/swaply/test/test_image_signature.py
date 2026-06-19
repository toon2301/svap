"""Testy pre detekciu formátu obrázka z magic bytes a content-validáciu uploadu."""

import io

import pytest
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings

from swaply.image_signature import read_file_header, sniff_image_format
from swaply.validators import validate_image_file


# Minimálne validné hlavičky jednotlivých formátov.
JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 16
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 16
GIF = b"GIF89a" + b"\x00" * 16
WEBP = b"RIFF\x00\x00\x00\x00WEBP" + b"\x00" * 16
HEIC = b"\x00\x00\x00\x18ftypheic" + b"\x00" * 16


@pytest.mark.parametrize(
    "header,expected",
    [
        (JPEG, "jpeg"),
        (PNG, "png"),
        (GIF, "gif"),
        (WEBP, "webp"),
        (HEIC, "heif"),
        (b"BM\x00\x00\x00\x00", "bmp"),
        (b"II*\x00", "tiff"),
        (b"<?php echo 1; ?>", None),
        (b"", None),
        (b"ab", None),
    ],
)
def test_sniff_image_format(header, expected):
    assert sniff_image_format(header) == expected


def test_read_file_header_restores_position():
    f = io.BytesIO(JPEG + b"rest-of-file")
    f.seek(5)
    header = read_file_header(f)
    assert header.startswith(b"\xff\xd8\xff")
    # Pozícia kurzora musí zostať nezmenená.
    assert f.tell() == 5


def test_read_file_header_skips_unreadable_object():
    class NoRead:
        name = "x.jpg"

    assert read_file_header(NoRead()) is None


@override_settings(SAFESEARCH_ENABLED=False)
def test_validate_rejects_disguised_non_image():
    # Spustiteľný/textový obsah premenovaný na .jpg → musí byť odmietnutý.
    f = SimpleUploadedFile("evil.jpg", b"<?php system($_GET['c']); ?>", content_type="image/jpeg")
    with pytest.raises(ValidationError):
        validate_image_file(f)


@override_settings(SAFESEARCH_ENABLED=False)
def test_validate_accepts_real_heic_signature():
    # HEIC z iPhonu sa overí cez magic bytes aj bez pillow-heif.
    f = SimpleUploadedFile("photo.heic", HEIC, content_type="image/heic")
    assert validate_image_file(f) is f


@override_settings(SAFESEARCH_ENABLED=False)
def test_validate_accepts_real_webp_and_keeps_pointer():
    f = SimpleUploadedFile("ok.webp", WEBP, content_type="image/webp")
    f.seek(4)
    initial_position = f.tell()
    assert validate_image_file(f) is f
    assert f.tell() == initial_position
