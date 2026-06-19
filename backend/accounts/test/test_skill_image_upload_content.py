"""Endpoint testy: multipart upload fotky ku karte overuje reálny obsah súboru."""

from io import BytesIO

import pytest
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase
from django.core.files.uploadedfile import SimpleUploadedFile

from accounts.models import OfferedSkill

User = get_user_model()


def _real_jpeg(name="photo.jpg"):
    buf = BytesIO()
    Image.new("RGB", (16, 16), (0, 128, 255)).save(buf, "JPEG")
    buf.seek(0)
    return SimpleUploadedFile(name, buf.getvalue(), content_type="image/jpeg")


@pytest.fixture(autouse=True)
def _tmp_media(settings, tmp_path):
    settings.MEDIA_ROOT = str(tmp_path / "media")
    settings.ALLOWED_HOSTS = ["testserver"]


@override_settings(SAFESEARCH_ENABLED=False)
class TestSkillImageUploadContent(APITestCase):
    def setUp(self):
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
        resp = self.client.post(self.url, {"image": _real_jpeg()}, format="multipart")
        assert resp.status_code == status.HTTP_201_CREATED
        assert self.skill.images.count() == 1

    def test_disguised_non_image_is_rejected(self):
        evil = SimpleUploadedFile(
            "evil.jpg", b"<?php system($_GET['c']); ?>", content_type="image/jpeg"
        )
        resp = self.client.post(self.url, {"image": evil}, format="multipart")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert self.skill.images.count() == 0
