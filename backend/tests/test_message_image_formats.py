"""Správy s obrázkom: nepovolený formát sa odmietne (nález 193).

TIFF alebo BMP pomenovaný `.jpg` predtým prešiel nahrávaním správy: `strip_image_metadata` pri formáte, ktorý
nepozná, vráti `None` a správa uložila originál, v TIFF-e aj s polohou GPS. Kontrola podpisu totiž rozpoznáva aj
BMP a TIFF, no nepovoľovala ich len podľa prípony.
"""

from __future__ import annotations

import io

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from PIL import Image
from PIL.TiffImagePlugin import IFDRational
from rest_framework import status
from rest_framework.test import APIClient

from messaging.models import Message
from messaging.services.conversations import open_or_create_direct_conversation
from swaply.test.image_samples import ALLOWED_FORMATS, DENIED_FORMATS, UPLOAD_NAME, make_image

User = get_user_model()

GPS_TAG = 0x8825


def _gps_exif():
    """EXIF s polohou GPS (správne pripojený GPS sub-IFD, inak by ho Pillow do súboru nezapísal)."""
    exif = Image.new("RGB", (16, 16)).getexif()
    gps = exif.get_ifd(GPS_TAG)
    gps[1] = "N"
    gps[2] = (IFDRational(48, 1), IFDRational(8, 1), IFDRational(0, 1))
    gps[3] = "E"
    gps[4] = (IFDRational(17, 1), IFDRational(7, 1), IFDRational(0, 1))
    exif[GPS_TAG] = gps
    return exif


def _tiff_with_gps() -> bytes:
    """TIFF s polohou GPS v súbore."""
    buffer = io.BytesIO()
    Image.new("RGB", (16, 16), (0, 128, 255)).save(buffer, format="TIFF", exif=_gps_exif())
    return buffer.getvalue()


@pytest.fixture
def chat(db, settings, tmp_path, monkeypatch):
    """Priamy rozhovor dvoch používateľov a prihlásený klient prvého z nich (bez SafeSearch a bez push správ)."""
    settings.MEDIA_ROOT = str(tmp_path)
    settings.SAFESEARCH_ENABLED = False
    monkeypatch.setattr(
        "messaging.services.push_enqueue.deliver_message_push_task.delay", lambda *args, **kwargs: None
    )
    sender = User.objects.create_user(
        username="sender", email="sender@example.com", is_verified=True, is_active=True
    )
    receiver = User.objects.create_user(
        username="receiver", email="receiver@example.com", is_verified=True, is_active=True
    )
    conversation = open_or_create_direct_conversation(actor=sender, target=receiver).conversation
    client = APIClient()
    client.force_authenticate(user=sender)
    url = reverse("accounts:messaging_send_message", kwargs={"conversation_id": conversation.id})
    return client, url


def _send(chat, django_capture_on_commit_callbacks, upload):
    """Pošle správu s daným súborom ako obrázkom a vykoná odložené úlohy po commite (náhľad); vráti odpoveď API."""
    client, url = chat
    with django_capture_on_commit_callbacks(execute=True):
        return client.post(url, {"image": upload}, format="multipart")


def test_tiff_with_gps_hidden_under_jpg_is_rejected(chat, django_capture_on_commit_callbacks):
    """TIFF s GPS pod príponou `.jpg` sa neprijme, takže sa poloha nedostane ku druhému účastníkovi."""
    upload = SimpleUploadedFile("chat.jpg", _tiff_with_gps(), content_type="image/jpeg")

    response = _send(chat, django_capture_on_commit_callbacks, upload)

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert Message.objects.count() == 0


@pytest.mark.parametrize("fmt", DENIED_FORMATS)
def test_other_formats_hidden_under_jpg_are_rejected(chat, django_capture_on_commit_callbacks, fmt):
    """Nepovolený formát pomenovaný `.jpg` sa odmietne a správa nevznikne."""
    upload = SimpleUploadedFile("chat.jpg", make_image(fmt), content_type="image/jpeg")

    response = _send(chat, django_capture_on_commit_callbacks, upload)

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert Message.objects.count() == 0


@pytest.mark.parametrize("fmt", ALLOWED_FORMATS)
def test_allowed_formats_are_sent(chat, django_capture_on_commit_callbacks, fmt):
    """JPEG, PNG, WebP, GIF, HEIC a MPO sa posielajú ako doteraz."""
    upload = SimpleUploadedFile(UPLOAD_NAME[fmt], make_image(fmt), content_type="application/octet-stream")

    response = _send(chat, django_capture_on_commit_callbacks, upload)

    assert response.status_code == status.HTTP_201_CREATED
    assert Message.objects.count() == 1
