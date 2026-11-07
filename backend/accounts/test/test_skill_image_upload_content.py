"""Endpoint testy: multipart upload fotky ku karte overuje reálny obsah súboru a neukladá EXIF ani GPS (nález 282)."""

import re
from io import BytesIO
from pathlib import Path

import pytest
from django.conf import settings as django_settings
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase
from django.core.files.uploadedfile import SimpleUploadedFile

from accounts.models import OfferedSkill, OfferedSkillImage
from accounts.test.test_avatar_upload_s3 import (
    generate_corrupted_heic_with_gps,
    generate_heic_file,
    generate_image_with_gps_exif,
    generate_jpeg_with_gps_exif,
)
from swaply.test.image_samples import (
    UPLOAD_NAME,
    animation_of,
    make_animated_image,
    make_image,
)

User = get_user_model()

#: Uložený názov fotky ponuky: anonymný (uuid), nie názov, ktorý zvolil používateľ.
ANONYMOUS_STORED_NAME = re.compile(r"^offers/[0-9a-f]{32}\.(jpg|png|webp|gif)$")
GPS_IFD = 0x8825


def _real_jpeg(name="photo.jpg"):
    """Platný malý JPEG, ktorý prejde kontrolou obsahu."""
    buf = BytesIO()
    Image.new("RGB", (16, 16), (0, 128, 255)).save(buf, "JPEG")
    buf.seek(0)
    return SimpleUploadedFile(name, buf.getvalue(), content_type="image/jpeg")


@pytest.fixture(autouse=True)
def _tmp_media(settings, tmp_path):
    """Fotky z testov sa ukladajú do dočasného priečinka a klient smie volať `testserver`."""
    settings.MEDIA_ROOT = str(tmp_path / "media")
    settings.ALLOWED_HOSTS = ["testserver"]


@override_settings(SAFESEARCH_ENABLED=False)
class TestSkillImageUploadContent(APITestCase):
    """Starý multipart endpoint fotiek ponúk: kontrola obsahu súboru a odstránenie metadát."""

    def setUp(self):
        """Prihlásený vlastník s jednou ponukou, na ktorú sa nahrávajú fotky."""
        self.user = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="StrongPass123",
            is_verified=True,
        )
        self.client.force_authenticate(user=self.user)
        self.skill = OfferedSkill.objects.create(
            user=self.user, category="IT", subcategory="Web"
        )
        self.url = reverse("accounts:skill_images", args=[self.skill.id])

    def test_real_image_is_accepted(self):
        """Platný obrázok sa uloží."""
        resp = self.client.post(self.url, {"image": _real_jpeg()}, format="multipart")
        assert resp.status_code == status.HTTP_201_CREATED
        assert self.skill.images.count() == 1

    def test_disguised_non_image_is_rejected(self):
        """Skript premenovaný na `.jpg` sa odmietne a nič sa neuloží."""
        evil = SimpleUploadedFile(
            "evil.jpg", b"<?php system($_GET['c']); ?>", content_type="image/jpeg"
        )
        resp = self.client.post(self.url, {"image": evil}, format="multipart")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert self.skill.images.count() == 0

    def _upload(self, upload):
        """Nahrá súbor starým multipart endpointom a vráti odpoveď."""
        return self.client.post(self.url, {"image": upload}, format="multipart")

    def _assert_gps_removed(self, upload, *, suffix, pillow_format):
        """Nahrá obrázok s GPS a overí, že uložený súbor ho nemá, má anonymný názov a očakávaný formát."""
        # Predpoklad: nahrávaný súbor GPS naozaj nesie (inak by test overoval odstránenie ničoho).
        with Image.open(BytesIO(upload.read())) as source:
            assert source.getexif().get_ifd(GPS_IFD), "vstup musí obsahovať GPS"
        upload.seek(0)

        response = self._upload(upload)

        assert response.status_code == status.HTTP_201_CREATED
        stored = OfferedSkillImage.objects.get(id=response.data["id"])
        assert ANONYMOUS_STORED_NAME.match(stored.image.name), stored.image.name
        assert stored.image.name.endswith(suffix)
        with Image.open(stored.image.path) as image:
            assert image.format == pillow_format
            assert len(image.getexif()) == 0
            assert not image.getexif().get_ifd(GPS_IFD)

    def test_jpeg_gps_is_not_stored(self):
        """JPEG s polohou GPS sa uloží bez nej."""
        self._assert_gps_removed(
            generate_jpeg_with_gps_exif(), suffix=".jpg", pillow_format="JPEG"
        )

    def test_png_gps_is_not_stored(self):
        """PNG s polohou GPS v chunku eXIf sa uloží bez nej."""
        self._assert_gps_removed(
            generate_image_with_gps_exif("PNG", "gps.png", "image/png"),
            suffix=".png",
            pillow_format="PNG",
        )

    def test_webp_gps_is_not_stored(self):
        """WebP s polohou GPS sa uloží bez nej."""
        self._assert_gps_removed(
            generate_image_with_gps_exif("WEBP", "gps.webp", "image/webp"),
            suffix=".webp",
            pillow_format="WEBP",
        )

    def test_heic_gps_is_not_stored_and_the_photo_is_stored_as_jpeg(self):
        """HEIC z iPhonu s polohou GPS sa uloží ako JPEG bez nej."""
        self._assert_gps_removed(
            generate_heic_file("gps.heic", include_gps=True),
            suffix=".jpg",
            pillow_format="JPEG",
        )

    def _assert_animation_kept_without_gps(self, fmt, suffix):
        """Nahrá animovaný obrázok s GPS a overí, že sa uložili všetky snímky s trvaním, bez GPS a pod anonymným názvom."""
        source = make_animated_image(fmt, with_metadata=True)
        with Image.open(BytesIO(source)) as original:
            assert original.getexif().get_ifd(GPS_IFD), "vstup musí obsahovať GPS"

        response = self._upload(SimpleUploadedFile(UPLOAD_NAME[fmt], source))

        assert response.status_code == status.HTTP_201_CREATED
        stored = OfferedSkillImage.objects.get(id=response.data["id"])
        assert ANONYMOUS_STORED_NAME.match(stored.image.name), stored.image.name
        assert stored.image.name.endswith(suffix)
        assert animation_of(Path(stored.image.path).read_bytes()) == animation_of(
            source
        )
        with Image.open(stored.image.path) as image:
            assert not image.getexif().get_ifd(GPS_IFD)

    def test_animated_webp_keeps_its_frames_but_not_the_gps(self):
        """Animovaný WebP s polohou GPS sa uloží so všetkými snímkami, no bez GPS (nesploští sa na jednu snímku)."""
        self._assert_animation_kept_without_gps("WEBP", ".webp")

    def test_animated_png_keeps_its_frames_but_not_the_gps(self):
        """Animovaný PNG (APNG) s polohou GPS sa uloží so všetkými snímkami, no bez GPS."""
        self._assert_animation_kept_without_gps("PNG", ".png")

    def test_the_original_filename_is_not_part_of_the_stored_name(self):
        """Názov súboru od používateľa (môže byť osobný) sa nedostane do verejnej adresy fotky."""
        response = self._upload(generate_jpeg_with_gps_exif("jan-novak-dovolenka.jpg"))

        assert response.status_code == status.HTTP_201_CREATED
        stored = OfferedSkillImage.objects.get(id=response.data["id"])
        assert "novak" not in stored.image.name
        assert "novak" not in response.data["image_url"]

    def test_heic_that_cannot_be_decoded_is_rejected_and_nothing_is_stored(self):
        """Poškodený HEIC s GPS sa odmietne: jeho polohu nejde odstrániť, a v pôvodnej podobe sa preto neuloží."""
        response = self._upload(generate_corrupted_heic_with_gps())

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert self.skill.images.count() == 0
        assert not [
            path
            for path in Path(django_settings.MEDIA_ROOT).rglob("*")
            if path.is_file()
        ]

    def test_gif_is_stored_unchanged_under_an_anonymous_name(self):
        """GIF nemá EXIF, preto ostane bajt po bajte rovnaký (animácia sa nezničí), len s anonymným názvom."""
        original = make_image("GIF")

        response = self._upload(
            SimpleUploadedFile("animacia.gif", original, content_type="image/gif")
        )

        assert response.status_code == status.HTTP_201_CREATED
        stored = OfferedSkillImage.objects.get(id=response.data["id"])
        assert ANONYMOUS_STORED_NAME.match(stored.image.name)
        assert stored.image.name.endswith(".gif")
        assert Path(stored.image.path).read_bytes() == original

    def test_gif_under_another_extension_is_rejected(self):
        """GIF premenovaný na `.jpg` sa odmietne: ponechať sa dá len GIF, ktorého prípona aj obsah súhlasia."""
        response = self._upload(
            SimpleUploadedFile(
                "photo.jpg", make_image("GIF"), content_type="image/jpeg"
            )
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert self.skill.images.count() == 0

    def test_exif_orientation_is_applied_before_the_metadata_is_dropped(self):
        """Fotka otočená len podľa EXIF sa uloží už otočená, inak by po odstránení EXIF ležala na boku."""
        exif = Image.Exif()
        exif[0x0112] = 6  # Orientation: otočiť o 90° v smere hodín
        buffer = BytesIO()
        Image.new("RGB", (20, 10), (0, 128, 255)).save(buffer, "JPEG", exif=exif)

        response = self._upload(
            SimpleUploadedFile(
                "na-vysku.jpg", buffer.getvalue(), content_type="image/jpeg"
            )
        )

        assert response.status_code == status.HTTP_201_CREATED
        stored = OfferedSkillImage.objects.get(id=response.data["id"])
        with Image.open(stored.image.path) as image:
            assert image.size == (10, 20)
            assert len(image.getexif()) == 0

    def test_the_response_keeps_its_shape(self):
        """Odpoveď má ako doteraz `id`, `image_url` a `order` (frontend ju používa vo vývojovej zálohe)."""
        response = self._upload(_real_jpeg())

        assert response.status_code == status.HTTP_201_CREATED
        assert set(response.data) == {"id", "image_url", "order"}
        assert response.data["order"] == 0
        assert response.data["image_url"].endswith(
            OfferedSkillImage.objects.get().image.name
        )
