"""Päť miest, ktoré dekódujú obrázky, prijme len povolené formáty (nález 193).

Pillow bez `formats=` skúsi každý formát, ktorý pozná, takže sa dekódovali aj TIFF, BMP a ďalšie (ponuka
z nich skončila schválená). Každé miesto sa tu overí samostatne so skutočným kódom: povolené formáty (JPEG, PNG,
WebP, GIF, HEIC, MPO) prejdú a nepovolené sa odmietnu spôsobom, ktorý to miesto už má (zamietnutý záznam, výnimka
moderácie, `None` bez dekódovania).
"""

from __future__ import annotations

import io
from unittest import mock

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import ImageOps, UnidentifiedImageError

from accounts.models import OfferedSkill, OfferedSkillImage
from swaply.test.image_samples import ALLOWED_FORMATS, DENIED_FORMATS, UPLOAD_NAME, make_image

User = get_user_model()

#: Prípona výsledku `strip_image_metadata` podľa vstupného formátu (GIF sa neprekóduje).
STRIP_SUFFIX = {"JPEG": ".jpg", "MPO": ".jpg", "HEIC": ".jpg", "PNG": ".png", "WEBP": ".webp"}


# ---------------------------------------------------------------------------
# 1. Ponuky: úloha v Celery
# ---------------------------------------------------------------------------


@pytest.mark.django_db
@pytest.mark.parametrize("fmt", ALLOWED_FORMATS + DENIED_FORMATS)
def test_offer_image_task_approves_only_allowed_formats(settings, fmt):
    """Fotka ponuky v povolenom formáte skončí schválená, v inom zamietnutá a staging objekt sa zmaže."""
    from swaply.tasks import offer_images

    settings.AWS_STORAGE_BUCKET_NAME = "test-bucket"
    user = User.objects.create_user(
        username="offer-owner", email="offer-owner@example.com", is_verified=True
    )
    skill = OfferedSkill.objects.create(user=user, category="Test", subcategory="Sub")
    key = f"uploads/offers/{skill.id}/staged.jpg"
    image = OfferedSkillImage.objects.create(
        skill=skill, status=OfferedSkillImage.Status.PENDING, pending_key=key
    )
    s3 = mock.MagicMock()
    s3.get_object.return_value = {"Body": io.BytesIO(make_image(fmt))}

    with mock.patch.object(offer_images, "_s3_client", return_value=s3), mock.patch.object(
        offer_images, "check_image_safety"
    ):
        offer_images.process_offered_skill_image.push_request(retries=0)
        try:
            offer_images.process_offered_skill_image.run(image.id)
        finally:
            offer_images.process_offered_skill_image.pop_request()

    image.refresh_from_db()
    if fmt in ALLOWED_FORMATS:
        assert image.status == OfferedSkillImage.Status.APPROVED
    else:
        assert image.status == OfferedSkillImage.Status.REJECTED
        assert image.rejected_reason == "Invalid or unsupported image format."
        s3.delete_object.assert_called_once_with(Bucket="test-bucket", Key=key)


# ---------------------------------------------------------------------------
# 2. Staged moderácia (ponuky, portfólio, príspevky)
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("fmt", ALLOWED_FORMATS)
def test_staged_moderation_accepts_allowed_formats(fmt):
    """Povolený formát prejde dekódovaním a ide do SafeSearch; staging objekt sa nemaže."""
    from swaply.staged_image_moderation import moderate_staged_s3_image

    s3 = mock.MagicMock()
    s3.get_object.return_value = {"Body": io.BytesIO(make_image(fmt))}
    with mock.patch("swaply.staged_image_moderation._s3_client", return_value=s3), mock.patch(
        "swaply.image_moderation.check_image_safety"
    ) as safety:
        moderate_staged_s3_image("bucket", "uploads/k.jpg")

    safety.assert_called_once()
    s3.delete_object.assert_not_called()


@pytest.mark.parametrize("fmt", DENIED_FORMATS)
def test_staged_moderation_rejects_other_formats(fmt):
    """Nepovolený formát sa odmietne ešte pred SafeSearch a staging objekt sa zmaže."""
    from swaply.staged_image_moderation import ModerationRejectedError, moderate_staged_s3_image

    s3 = mock.MagicMock()
    s3.get_object.return_value = {"Body": io.BytesIO(make_image(fmt))}
    with mock.patch("swaply.staged_image_moderation._s3_client", return_value=s3), mock.patch(
        "swaply.image_moderation.check_image_safety"
    ) as safety:
        with pytest.raises(ModerationRejectedError):
            moderate_staged_s3_image("bucket", "uploads/k.jpg")

    safety.assert_not_called()
    s3.delete_object.assert_called_once_with(Bucket="bucket", Key="uploads/k.jpg")


# ---------------------------------------------------------------------------
# 3. Odstránenie metadát (správy, avatary)
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("fmt", ALLOWED_FORMATS)
def test_strip_metadata_handles_allowed_formats(fmt):
    """Povolené formáty sa prekódujú; GIF zámerne nie, aby sa nezničila animácia."""
    from swaply.image_metadata import strip_image_metadata

    result = strip_image_metadata(SimpleUploadedFile(UPLOAD_NAME[fmt], make_image(fmt)))

    if fmt == "GIF":
        assert result is None
    else:
        assert result is not None
        assert result.name.endswith(STRIP_SUFFIX[fmt])


@pytest.mark.parametrize("fmt", DENIED_FORMATS)
def test_strip_metadata_does_not_decode_other_formats(fmt):
    """Nepovolený formát vráti `None` bez toho, aby sa obrázok dekódoval (orientácia sa ani nečíta)."""
    from swaply.image_metadata import strip_image_metadata

    with mock.patch("PIL.ImageOps.exif_transpose", wraps=ImageOps.exif_transpose) as transpose:
        result = strip_image_metadata(SimpleUploadedFile("photo.jpg", make_image(fmt)))

    assert result is None
    transpose.assert_not_called()


# ---------------------------------------------------------------------------
# 4. Spracovanie portfólia a príspevkov (`_decode_image`)
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("fmt", ALLOWED_FORMATS)
def test_decode_image_accepts_allowed_formats(fmt):
    """Povolený formát sa dekóduje na obrázok."""
    from portfolio.image_processing import _decode_image

    assert _decode_image(make_image(fmt)).size[0] > 0


@pytest.mark.parametrize("fmt", DENIED_FORMATS)
def test_decode_image_rejects_other_formats(fmt):
    """Nepovolený formát vyhodí `UnidentifiedImageError`, na ktorý volajúci reaguje zamietnutím záznamu."""
    from portfolio.image_processing import _decode_image

    with pytest.raises(UnidentifiedImageError):
        _decode_image(make_image(fmt))


# ---------------------------------------------------------------------------
# 5. Náhľad obrázka v správe
# ---------------------------------------------------------------------------


class _FakeImageField:
    """Najmenšie, čo `build_message_thumbnail` od poľa potrebuje: `open`, `file` a `close`."""

    def __init__(self, data: bytes):
        """Uloží bajty obrázka do súboru v pamäti."""
        self.file = io.BytesIO(data)

    def __bool__(self) -> bool:
        """Pole s obrázkom je „neprázdne“, takže náhľad sa vyrába."""
        return True

    def open(self, mode: str = "rb") -> None:
        """Vráti kurzor na začiatok, ako by to spravilo skutočné pole."""
        self.file.seek(0)

    def close(self) -> None:
        """Nerobí nič: súbor v pamäti netreba zatvárať."""


@pytest.mark.parametrize("fmt", ALLOWED_FORMATS)
def test_message_thumbnail_is_built_for_allowed_formats(fmt):
    """Povolený formát dostane náhľad WebP."""
    from messaging.services.image_thumbnails import build_message_thumbnail

    thumbnail = build_message_thumbnail(_FakeImageField(make_image(fmt)))

    assert thumbnail is not None
    assert thumbnail.name == "thumbnail.webp"


@pytest.mark.parametrize("fmt", DENIED_FORMATS)
def test_message_thumbnail_is_not_built_for_other_formats(fmt):
    """Nepovolený formát náhľad nedostane (správa ostane bez neho)."""
    from messaging.services.image_thumbnails import build_message_thumbnail

    assert build_message_thumbnail(_FakeImageField(make_image(fmt))) is None
