import os
import json
from io import BytesIO

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from PIL import Image
from PIL.TiffImagePlugin import IFDRational
from rest_framework import status
from rest_framework.test import APITestCase

from swaply.validators import validate_image_file
from django.test import override_settings


User = get_user_model()


def generate_image_file(
    fmt: str = "JPEG", name: str = "test.jpg", size=(32, 32), color=(255, 0, 0)
) -> SimpleUploadedFile:
    buffer = BytesIO()
    image = Image.new("RGB", size, color)
    image.save(buffer, fmt)
    buffer.seek(0)
    content_type = "image/jpeg" if fmt.upper() == "JPEG" else f"image/{fmt.lower()}"
    return SimpleUploadedFile(name, buffer.getvalue(), content_type=content_type)


def _build_gps_exif():
    """Exif objekt s reálnou GPS lokáciou (GPS sub-IFD pripojený späť na EXIF).

    GPS sub-IFD treba priradiť späť cez exif[0x8825], inak ho Pillow pri save()
    neserializuje (cache z get_ifd sa do súboru nezapíše) a obrázok by reálne GPS
    neobsahoval – test stripovania by potom falošne prešiel.
    """
    exif = Image.new("RGB", (32, 32), (10, 20, 30)).getexif()
    exif[0x010F] = "EvilCam"  # Make
    exif[0x0110] = "ModelX"  # Model
    gps_ifd = exif.get_ifd(0x8825)  # GPSInfo
    gps_ifd[1] = "N"
    gps_ifd[2] = (IFDRational(48, 1), IFDRational(8, 1), IFDRational(0, 1))
    gps_ifd[3] = "E"
    gps_ifd[4] = (IFDRational(17, 1), IFDRational(7, 1), IFDRational(0, 1))
    exif[0x8825] = gps_ifd
    return exif


def generate_jpeg_with_gps_exif(name: str = "gps_avatar.jpg") -> SimpleUploadedFile:
    """JPEG s EXIF metadátami vrátane GPS lokácie (na test stripovania)."""
    image = Image.new("RGB", (32, 32), (10, 20, 30))
    buffer = BytesIO()
    image.save(buffer, "JPEG", exif=_build_gps_exif())
    buffer.seek(0)
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/jpeg")


def generate_image_with_gps_exif(fmt: str, name: str, content_type: str) -> SimpleUploadedFile:
    """PNG/WebP obrázok s GPS EXIF (rovnaký GPS vzor ako JPEG) na test stripovania.

    PNG zapíše GPS do eXIf chunku, WebP do exif bloku (z `exif=` bajtov), takže
    pokrýva práve tie cesty v image_metadata.py, ktoré stripujú EXIF z info.
    """
    image = Image.new("RGB", (32, 32), (10, 20, 30))
    buffer = BytesIO()
    image.save(buffer, fmt, exif=_build_gps_exif().tobytes())
    buffer.seek(0)
    return SimpleUploadedFile(name, buffer.getvalue(), content_type=content_type)


@pytest.fixture(autouse=True)
def tmp_media(settings, tmp_path):
    media_root = tmp_path / "media"
    media_root.mkdir(parents=True, exist_ok=True)
    settings.MEDIA_ROOT = str(media_root)
    settings.MEDIA_URL = "/media/"
    # Ensure API tests use testserver host
    settings.ALLOWED_HOSTS = ["testserver"]
    yield


@pytest.mark.django_db
class TestAvatarValidators:
    def test_rejects_invalid_file_type(self):
        f = SimpleUploadedFile("avatar.txt", b"not-an-image", content_type="text/plain")
        with pytest.raises(ValidationError):
            validate_image_file(f)

    def test_rejects_oversize_file(self):
        # 5MB + 1 byte
        big_content = b"x" * (5 * 1024 * 1024 + 1)
        f = SimpleUploadedFile("big.jpg", big_content, content_type="image/jpeg")
        with pytest.raises(ValidationError):
            validate_image_file(f)


@pytest.mark.django_db
class TestAvatarUploadIntegration(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="john",
            email="john@example.com",
            password="StrongPass123",
            is_verified=True,
        )
        self.client.force_authenticate(user=self.user)
        self.url = reverse("accounts:update_profile")

    def test_upload_valid_jpeg_success(self):
        # Skip SafeSearch in tests to avoid network calls
        with override_settings(SAFESEARCH_SKIP_IN_TESTS=True, SAFESEARCH_ENABLED=True):
            file = generate_image_file("JPEG", "avatar.jpg")
            r = self.client.patch(self.url, {"avatar": file}, format="multipart")
        assert r.status_code == status.HTTP_200_OK
        assert "user" in r.data
        assert r.data["user"].get("avatar_url")

        # DB assertions
        self.user.refresh_from_db()
        assert self.user.avatar
        assert str(self.user.avatar.name).startswith("avatars/")
        # File exists on disk
        assert os.path.exists(self.user.avatar.path)

    def test_upload_valid_png_success(self):
        with override_settings(SAFESEARCH_SKIP_IN_TESTS=True, SAFESEARCH_ENABLED=True):
            file = generate_image_file("PNG", "avatar.png")
            r = self.client.patch(self.url, {"avatar": file}, format="multipart")
        assert r.status_code == status.HTTP_200_OK
        assert r.data["user"].get("avatar_url")

    def test_generated_avatar_url_is_absolute(self):
        file = generate_image_file("JPEG", "avatar.jpg")
        r = self.client.patch(self.url, {"avatar": file}, format="multipart")
        url = r.data["user"].get("avatar_url")
        assert url and url.startswith("http://testserver/")

    def test_handles_storage_save_failure_gracefully(self):
        # Simulate storage (e.g., S3) failure by forcing default_storage.save to raise
        from django.core.files import storage as django_storage
        from unittest.mock import patch

        def fail_save(name, content, *args, **kwargs):
            raise Exception("Simulated storage failure")

        with patch.object(
            django_storage.default_storage, "save", side_effect=fail_save
        ):
            file = generate_image_file("JPEG", "avatar.jpg")
            r = self.client.patch(self.url, {"avatar": file}, format="multipart")
            # Our global middleware should convert unexpected exceptions to a 500 with JSON body
            assert r.status_code == 500
            # Support both DRF Response (.data) and Django JsonResponse (.content)
            try:
                payload = r.data
            except AttributeError:
                payload = json.loads(r.content.decode("utf-8"))
            assert "error" in payload

    def _assert_avatar_upload_strips_gps(self, upload):
        """Nahrá avatar a overí, že GPS/EXIF sú reálne stripnuté (zdieľané JPEG/PNG/WebP)."""
        # Precondition: nahraný avatar skutočne nesie EXIF metadáta vrátane GPS
        # (inak by test overoval stripovanie niečoho, čo tam ani nebolo).
        with Image.open(BytesIO(upload.read())) as src:
            assert len(src.getexif()) > 0
            assert src.getexif().get_ifd(0x8825), "fixture musí obsahovať reálne GPS"
        upload.seek(0)

        with override_settings(SAFESEARCH_ENABLED=False):
            r = self.client.patch(self.url, {"avatar": upload}, format="multipart")
        assert r.status_code == status.HTTP_200_OK

        self.user.refresh_from_db()
        assert self.user.avatar
        with Image.open(self.user.avatar.path) as stored:
            stored_exif = stored.getexif()
            gps_ifd = stored_exif.get_ifd(0x8825)

        # Po uložení nesmú ostať žiadne EXIF metadáta ani GPS lokácia.
        assert len(stored_exif) == 0
        assert not gps_ifd

    def test_avatar_upload_strips_exif_gps_metadata(self):
        self._assert_avatar_upload_strips_gps(generate_jpeg_with_gps_exif())

    def test_avatar_upload_strips_exif_gps_metadata_png(self):
        self._assert_avatar_upload_strips_gps(
            generate_image_with_gps_exif("PNG", "gps_avatar.png", "image/png")
        )

    def test_avatar_upload_strips_exif_gps_metadata_webp(self):
        self._assert_avatar_upload_strips_gps(
            generate_image_with_gps_exif("WEBP", "gps_avatar.webp", "image/webp")
        )

    def test_upload_valid_webp_success(self):
        # WebP bez EXIF nesmie spadnúť (edge case k strip ceste).
        with override_settings(SAFESEARCH_SKIP_IN_TESTS=True, SAFESEARCH_ENABLED=True):
            file = generate_image_file("WEBP", "avatar.webp")
            r = self.client.patch(self.url, {"avatar": file}, format="multipart")
        assert r.status_code == status.HTTP_200_OK
        assert r.data["user"].get("avatar_url")

    def test_replaces_old_avatar_and_deletes_file(self):
        first = generate_image_file("JPEG", "first.jpg", color=(0, 255, 0))
        r1 = self.client.patch(self.url, {"avatar": first}, format="multipart")
        assert r1.status_code == status.HTTP_200_OK
        self.user.refresh_from_db()
        old_path = self.user.avatar.path
        assert os.path.exists(old_path)

        second = generate_image_file("PNG", "second.png", color=(0, 0, 255))
        r2 = self.client.patch(self.url, {"avatar": second}, format="multipart")
        assert r2.status_code == status.HTTP_200_OK
        self.user.refresh_from_db()
        # Expect old file removed
        assert not os.path.exists(old_path)
