import json
import os
import re
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

from swaply.image_metadata import strip_image_metadata
from swaply.validators import validate_image_file


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


def generate_heic_file(
    name: str = "avatar.heic", *, include_gps: bool = False
) -> SimpleUploadedFile:
    """Vytvor platný HEIC upload, voliteľne s citlivými GPS metadátami."""
    from pillow_heif import register_heif_opener

    register_heif_opener()
    buffer = BytesIO()
    save_kwargs = {"exif": _build_gps_exif().tobytes()} if include_gps else {}
    Image.new("RGB", (32, 32), (10, 20, 30)).save(
        buffer,
        format="HEIF",
        **save_kwargs,
    )
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/heic")


def generate_corrupted_heic_with_gps() -> SimpleUploadedFile:
    """Vytvor HEIC s GPS, ktorého obrazové dáta aktuálny kodek nedekóduje."""
    upload = generate_heic_file("corrupted-location.heic", include_gps=True)
    content = bytearray(upload.read())
    media_data_offset = content.find(b"mdat") + 4
    if media_data_offset < 4 or media_data_offset >= len(content):
        raise AssertionError("HEIC test fixture does not contain an mdat payload")
    content[media_data_offset] ^= 0xFF
    return SimpleUploadedFile(
        "corrupted-location.heic",
        bytes(content),
        content_type="image/heic",
    )


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

    def test_empty_multipart_patch_is_rejected_without_changing_avatar(self):
        """Prázdny FormData upload nesmie vrátiť falošný úspech."""
        original = generate_image_file("JPEG", "original.jpg")
        assert self.client.patch(
            self.url, {"avatar": original}, format="multipart"
        ).status_code == status.HTTP_200_OK
        self.user.refresh_from_db()
        original_name = self.user.avatar.name

        response = self.client.patch(self.url, {}, format="multipart")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data == {"code": "empty_avatar_upload"}
        self.user.refresh_from_db()
        assert self.user.avatar.name == original_name

    def test_json_profile_patch_and_avatar_removal_remain_supported(self):
        """Multipart guard nesmie blokovať JSON profil ani explicitné zmazanie."""
        original = generate_image_file("JPEG", "original.jpg")
        assert self.client.patch(
            self.url, {"avatar": original}, format="multipart"
        ).status_code == status.HTTP_200_OK

        profile_response = self.client.patch(
            self.url, {"bio": "Aktualizované bio"}, format="json"
        )
        assert profile_response.status_code == status.HTTP_200_OK
        assert profile_response.data["user"]["bio"] == "Aktualizované bio"

        removal_response = self.client.patch(
            self.url, {"avatar": None}, format="json"
        )
        assert removal_response.status_code == status.HTTP_200_OK
        assert removal_response.data["user"]["avatar_url"] is None
        self.user.refresh_from_db()
        assert not self.user.avatar

    def test_multipart_profile_fields_without_avatar_remain_supported(self):
        """Neprázdny multipart PATCH môže ďalej upravovať bežné polia profilu."""
        response = self.client.patch(
            self.url, {"bio": "Multipart bio"}, format="multipart"
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["user"]["bio"] == "Multipart bio"
        self.user.refresh_from_db()
        assert self.user.bio == "Multipart bio"

    def test_reusing_client_filename_always_creates_a_new_opaque_key(self):
        """Každá výmena musí mať inú URL bez pôvodného používateľského názvu."""
        first = generate_image_file("JPEG", "my-private-name.jpg", color=(1, 2, 3))
        first_response = self.client.patch(
            self.url, {"avatar": first}, format="multipart"
        )
        assert first_response.status_code == status.HTTP_200_OK
        self.user.refresh_from_db()
        first_name = self.user.avatar.name
        first_url = first_response.data["user"]["avatar_url"]

        second = generate_image_file("JPEG", "my-private-name.jpg", color=(4, 5, 6))
        second_response = self.client.patch(
            self.url, {"avatar": second}, format="multipart"
        )
        assert second_response.status_code == status.HTTP_200_OK
        self.user.refresh_from_db()
        second_name = self.user.avatar.name

        assert first_name != second_name
        assert first_url != second_response.data["user"]["avatar_url"]
        assert re.fullmatch(r"avatars/[0-9a-f]{32}\.jpg", first_name)
        assert re.fullmatch(r"avatars/[0-9a-f]{32}\.jpg", second_name)
        assert "my-private-name" not in first_name
        assert "my-private-name" not in second_name

    def test_large_oriented_avatar_is_resized_and_metadata_is_removed(self):
        """Avatar zmenši po otočení a neuloží EXIF ani GPS údaje."""
        image = Image.new("RGB", (1600, 800), (10, 20, 30))
        exif = _build_gps_exif()
        exif[0x0112] = 6  # Orientation: 90° clockwise
        buffer = BytesIO()
        image.save(buffer, "JPEG", exif=exif)
        upload = SimpleUploadedFile(
            "large-camera-photo.jpg", buffer.getvalue(), content_type="image/jpeg"
        )

        with override_settings(SAFESEARCH_ENABLED=False):
            response = self.client.patch(
                self.url, {"avatar": upload}, format="multipart"
            )
        assert response.status_code == status.HTTP_200_OK

        self.user.refresh_from_db()
        with Image.open(self.user.avatar.path) as stored:
            assert stored.size == (512, 1024)
            assert len(stored.getexif()) == 0
            assert not stored.getexif().get_ifd(0x8825)

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

    def test_upload_valid_heic_is_safely_converted(self):
        """Spracovateľný HEIC sa očistí a verejne uloží ako JPEG."""
        with override_settings(SAFESEARCH_ENABLED=False):
            response = self.client.patch(
                self.url,
                {"avatar": generate_heic_file()},
                format="multipart",
            )

        assert response.status_code == status.HTTP_200_OK
        self.user.refresh_from_db()
        assert self.user.avatar.name.endswith(".jpg")
        with Image.open(self.user.avatar.path) as stored:
            assert stored.format == "JPEG"
            assert len(stored.getexif()) == 0

    def test_heic_processing_failure_is_rejected_without_storage(self):
        """HEIC bez bezpečného spracovania nesmie uložiť pôvodné bajty."""
        from unittest.mock import patch

        for filename in ("private-location.heic", "private-location.heif"):
            upload = generate_heic_file(filename, include_gps=True)
            with Image.open(BytesIO(upload.read())) as source:
                assert source.getexif().get_ifd(0x8825)
            upload.seek(0)

            with (
                override_settings(SAFESEARCH_ENABLED=False),
                patch("accounts.avatar_images.strip_image_metadata", return_value=None),
            ):
                response = self.client.patch(
                    self.url,
                    {"avatar": upload},
                    format="multipart",
                )

            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert "avatar" in response.data["details"]
            self.user.refresh_from_db()
            assert not self.user.avatar

    def test_real_corrupted_heic_never_exposes_its_gps_metadata(self):
        """Reálny HEIC decode edge case sa buď očistí, alebo odmietne."""
        probe = generate_corrupted_heic_with_gps()
        with Image.open(BytesIO(probe.read())) as source:
            assert source.getexif().get_ifd(0x8825)
        probe.seek(0)
        processed_probe = strip_image_metadata(probe, max_side=1024)

        with override_settings(SAFESEARCH_ENABLED=False):
            response = self.client.patch(
                self.url,
                {"avatar": generate_corrupted_heic_with_gps()},
                format="multipart",
            )

        self.user.refresh_from_db()
        if processed_probe is None:
            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert not self.user.avatar
            return

        assert response.status_code == status.HTTP_200_OK
        with Image.open(self.user.avatar.path) as stored:
            assert not stored.getexif().get_ifd(0x8825)

    def test_gif_keeps_the_original_bytes_when_processing_is_skipped(self):
        """Platný GIF si zachová animáciu cez jediný povolený fallback."""
        upload = generate_image_file("GIF", "avatar.gif")
        original_bytes = upload.read()
        upload.seek(0)

        with override_settings(SAFESEARCH_ENABLED=False):
            response = self.client.patch(
                self.url,
                {"avatar": upload},
                format="multipart",
            )

        assert response.status_code == status.HTTP_200_OK
        self.user.refresh_from_db()
        with self.user.avatar.open("rb") as stored:
            assert stored.read() == original_bytes

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
