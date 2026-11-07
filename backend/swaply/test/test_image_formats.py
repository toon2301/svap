"""Povolené formáty obrázkov (nález 193): pomocník `open_allowed_image`, podpisy pri nahrávaní a avatary.

Aplikácia prijíma JPEG, PNG, WebP, GIF a HEIC (z mobilov aj MPO). Pillow bez `formats=` skúsi každý formát, ktorý
pozná, takže nepovolené formáty (TIFF, BMP a ďalšie) sa dekódovali. Tieto testy držia spoločné pravidlo na jednom
mieste; že ho používa každé z piatich miest dekódovania, overuje `test_image_decode_sites.py`.
"""

from __future__ import annotations

import io
import os
import subprocess
import sys
from pathlib import Path

import pytest
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image, UnidentifiedImageError

from swaply.test.image_samples import (
    ALLOWED_FORMATS,
    DENIED_FORMATS,
    NOT_AN_IMAGE,
    PILLOW_FORMAT_NAME,
    UPLOAD_NAME,
    make_image,
)

BACKEND_DIR = Path(__file__).resolve().parents[2]

# V čerstvom procese bez Djanga (štart aplikácie by HEIC zaregistroval sám) sa `pillow-heif` len naimportuje, opener
# v Pillow nezaregistruje. Pomocník musí HEIC otvoriť sám: nesmie sa spoliehať na to, že registráciu spravilo iné miesto.
FRESH_PROCESS_SCRIPT = """
import io
import pillow_heif
from PIL import Image

buffer = io.BytesIO()
pillow_heif.from_pillow(Image.new("RGB", (32, 24), (10, 120, 200))).save(buffer)
print("HEIF_BEFORE", "HEIF" in Image.OPEN)
from swaply.image_signature import allowed_pillow_formats, open_allowed_image

image = open_allowed_image(io.BytesIO(buffer.getvalue()))
print("FORMAT", image.format, "FORMATS", ",".join(allowed_pillow_formats()))
"""


# ---------------------------------------------------------------------------
# `open_allowed_image`
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("fmt", ALLOWED_FORMATS)
def test_open_allowed_image_opens_allowed_formats(fmt):
    """JPEG, PNG, WebP, GIF, HEIC a MPO sa otvoria a dekódujú."""
    from swaply.image_signature import open_allowed_image

    with open_allowed_image(io.BytesIO(make_image(fmt))) as image:
        image.load()
        assert image.format == PILLOW_FORMAT_NAME.get(fmt, fmt)


@pytest.mark.parametrize("fmt", DENIED_FORMATS)
def test_open_allowed_image_rejects_other_formats(fmt):
    """Iný formát, ktorý Pillow pozná, vyhodí `UnidentifiedImageError`, nie `KeyError` ani úspech."""
    from swaply.image_signature import open_allowed_image

    with pytest.raises(UnidentifiedImageError):
        open_allowed_image(io.BytesIO(make_image(fmt)))


@pytest.mark.parametrize("payload", [NOT_AN_IMAGE, os.urandom(64), b""], ids=["html", "random", "empty"])
def test_open_allowed_image_rejects_non_images(payload):
    """Aj obsah, ktorý nie je obrázok, vyhodí `UnidentifiedImageError` (nie `KeyError` zo zoznamu formátov)."""
    from swaply.image_signature import open_allowed_image

    with pytest.raises(UnidentifiedImageError):
        open_allowed_image(io.BytesIO(payload))


def test_mpo_is_not_listed_as_a_format_name():
    """`MPO` v zozname nie je: otvára ho modul `JPEG`, takže by `Image.open` pri nezhodnom vstupe zlyhal s `KeyError`."""
    from swaply.image_signature import PILLOW_DECODE_FORMATS, allowed_pillow_formats

    assert "MPO" not in PILLOW_DECODE_FORMATS
    assert "MPO" not in allowed_pillow_formats()


def test_formats_exclude_heif_when_it_is_not_registered(monkeypatch):
    """Bez zaregistrovaného `pillow-heif` ostane zoznam bez `HEIF` a nezhodný vstup stále hlási `UnidentifiedImageError`."""
    from swaply.image_signature import allowed_pillow_formats, open_allowed_image

    monkeypatch.setitem(sys.modules, "pillow_heif", None)
    monkeypatch.delitem(Image.OPEN, "HEIF", raising=False)

    assert allowed_pillow_formats() == ("JPEG", "PNG", "WEBP", "GIF")
    with pytest.raises(UnidentifiedImageError):
        open_allowed_image(io.BytesIO(make_image("TIFF")))
    with open_allowed_image(io.BytesIO(make_image("PNG"))) as image:
        assert image.format == "PNG"


def test_fresh_process_registers_heif_by_itself():
    """V čerstvom procese pomocník HEIC otvorí sám a `HEIF` je v zozname povolených formátov."""
    result = subprocess.run(
        [sys.executable, "-c", FRESH_PROCESS_SCRIPT],
        cwd=BACKEND_DIR,
        capture_output=True,
        text=True,
        timeout=120,
    )

    assert result.returncode == 0, result.stderr[-500:]
    # Predpoklad testu: pred prvým použitím pomocníka nie je HEIF nikým zaregistrovaný.
    assert "HEIF_BEFORE False" in result.stdout
    assert "FORMAT HEIF FORMATS JPEG,PNG,WEBP,GIF,HEIF" in result.stdout


# ---------------------------------------------------------------------------
# Podpis pri nahrávaní (správy, avatary, priamy upload ponúk)
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("fmt", ALLOWED_FORMATS)
def test_validate_image_file_accepts_allowed_formats(settings, fmt):
    """Povolený formát prejde kontrolou prípony aj podpisu."""
    from swaply.validators import validate_image_file

    settings.SAFESEARCH_ENABLED = False
    validate_image_file(SimpleUploadedFile(UPLOAD_NAME[fmt], make_image(fmt)))


@pytest.mark.parametrize("fmt", DENIED_FORMATS)
def test_validate_image_file_rejects_other_formats_hidden_under_jpg(settings, fmt):
    """Nepovolený formát pomenovaný `.jpg` neprejde; TIFF a BMP kontrola podpisu rozpoznáva, no nepovoľuje."""
    from swaply.validators import validate_image_file

    settings.SAFESEARCH_ENABLED = False
    with pytest.raises(ValidationError):
        validate_image_file(SimpleUploadedFile("photo.jpg", make_image(fmt)))


# ---------------------------------------------------------------------------
# Avatary
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("fmt", [name for name in ALLOWED_FORMATS if name != "GIF"])
def test_avatar_upload_reencodes_allowed_formats(fmt):
    """Povolené formáty sa prekódujú bez metadát."""
    from accounts.avatar_images import prepare_avatar_upload

    result = prepare_avatar_upload(SimpleUploadedFile(UPLOAD_NAME[fmt], make_image(fmt)))

    assert result.name.rsplit(".", 1)[-1] in {"jpg", "png", "webp"}


def test_avatar_upload_keeps_gif_untouched():
    """GIF sa neprekóduje (animácia), ak prípona aj podpis súhlasia."""
    from accounts.avatar_images import prepare_avatar_upload

    upload = SimpleUploadedFile("photo.gif", make_image("GIF"))

    assert prepare_avatar_upload(upload) is upload


@pytest.mark.parametrize("fmt", DENIED_FORMATS)
def test_avatar_upload_rejects_other_formats(fmt):
    """Nepovolený formát sa pri avatare odmietne."""
    from accounts.avatar_images import prepare_avatar_upload

    with pytest.raises(ValidationError):
        prepare_avatar_upload(SimpleUploadedFile("photo.jpg", make_image(fmt)))
