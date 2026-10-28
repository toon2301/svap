"""Testy registrácie HEIC/HEIF pri štarte (nález 200): HEIC z iPhonu musí prejsť validáciou aj v čerstvom procese."""

import io
import os
import subprocess
import sys
from pathlib import Path

import pytest
from PIL import Image

from swaply.heif_support import register_heif_support

BACKEND_DIR = Path(__file__).resolve().parents[2]

# V čerstvom Python procese (bez akéhokoľvek spracovania obrázka pred validáciou) overí, či serializér správ
# prijme HEIC. Súbor sa vyrába cez `pillow_heif.from_pillow`, ktoré opener v Pillow nezaregistruje.
FRESH_PROCESS_SCRIPT = """
import io, os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "swaply.settings")
import django
django.setup()
import pillow_heif
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from messaging.api.serializers import SendMessageSerializer

buffer = io.BytesIO()
pillow_heif.from_pillow(Image.new("RGB", (64, 48), (10, 120, 200))).save(buffer)
upload = SimpleUploadedFile("IMG_0001.HEIC", buffer.getvalue(), content_type="image/heic")
serializer = SendMessageSerializer(data={"text": "", "image": upload})
print("VALID" if serializer.is_valid() else "INVALID " + str(dict(serializer.errors)))
"""


def _heic_bytes() -> bytes:
    """Vytvorí malý platný HEIC súbor."""
    import pillow_heif

    buffer = io.BytesIO()
    pillow_heif.from_pillow(Image.new("RGB", (32, 24), (200, 30, 30))).save(buffer)
    return buffer.getvalue()


def test_registration_lets_pillow_open_heic_and_is_repeatable():
    """Po registrácii Pillow otvorí HEIC a opakované volanie (štart aj lenivé registrácie inde) nič nepokazí."""
    assert register_heif_support() is True
    assert register_heif_support() is True

    with Image.open(io.BytesIO(_heic_bytes())) as image:
        assert image.size == (32, 24)


def test_missing_library_does_not_break_startup(monkeypatch, caplog):
    """Bez `pillow-heif` sa štart aplikácie nezhodí: registrácia vráti False a zapíše varovanie."""
    monkeypatch.setitem(sys.modules, "pillow_heif", None)

    with caplog.at_level("WARNING", logger="swaply.heif_support"):
        assert register_heif_support() is False

    assert "HEIC/HEIF support is unavailable" in caplog.text


def test_heic_upload_passes_validation_in_a_fresh_process():
    """Bez registrácie pri štarte by HEIC v čerstvom procese zlyhal na validácii `ImageField`."""
    result = subprocess.run(
        [sys.executable, "-c", FRESH_PROCESS_SCRIPT],
        cwd=BACKEND_DIR,
        env={**os.environ, "PYTHONPATH": str(BACKEND_DIR)},
        capture_output=True,
        text=True,
        timeout=120,
    )

    assert result.returncode == 0, result.stderr[-2000:]
    assert result.stdout.strip().splitlines()[-1] == "VALID"
