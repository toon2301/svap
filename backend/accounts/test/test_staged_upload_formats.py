"""Staged nahrávanie fotiek ponúk a nepovolený formát: so SafeSearch aj bez neho (nález 193).

Dekódovanie obrázka robí `moderate_staged_s3_image` len pri `SAFESEARCH_ENABLED` a vždy až úloha v pozadí. Oprava musí
platiť v oboch režimoch: so SafeSearch sa nepovolený formát odmietne hneď pri dokončení nahrávania (HTTP 400, staging
objekt sa zmaže), bez neho záznam vznikne a úloha ho zamietne.
"""

from __future__ import annotations

import io
from unittest import mock

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import OfferedSkill, OfferedSkillImage
from swaply.test.image_samples import make_image

User = get_user_model()

BUCKET = "test-bucket"


@pytest.fixture
def staged_upload(db, settings):
    """Majiteľ ponuky, kľúč nahraného súboru a postup, ako ho nahrať (S3 je podvrhnuté, SafeSearch beží naprázdno)."""
    settings.AWS_STORAGE_BUCKET_NAME = BUCKET
    owner = User.objects.create_user(
        username="staged-owner", email="staged-owner@example.com", is_verified=True
    )
    skill = OfferedSkill.objects.create(user=owner, category="Test", subcategory="Sub")
    key = f"uploads/offers/{skill.id}/staged.jpg"
    client = APIClient()
    client.force_authenticate(user=owner)

    def upload(fmt: str):
        """Nahrá súbor daného formátu pod `.jpg` a zavolá dokončenie; vráti odpoveď, S3 a zaradenie úlohy."""
        s3 = mock.MagicMock()
        s3.head_object.return_value = {"ContentLength": 1000, "ContentType": "image/jpeg"}
        s3.get_object.side_effect = lambda **kwargs: {"Body": io.BytesIO(make_image(fmt))}
        with mock.patch("accounts.views.skills_upload._get_s3_client", return_value=s3), mock.patch(
            "swaply.staged_image_moderation._s3_client", return_value=s3
        ), mock.patch("swaply.image_moderation.check_image_safety"), mock.patch(
            "swaply.tasks.offer_images.process_offered_skill_image.delay"
        ) as enqueue:
            response = client.post(
                f"/api/auth/skills/{skill.id}/images/upload-complete/", {"key": key}, format="json"
            )
        return response, s3, enqueue

    return skill, key, upload


def test_safesearch_on_rejects_other_format_at_upload_complete(settings, staged_upload):
    """So SafeSearch sa TIFF odmietne hneď: HTTP 400, žiadny záznam, staging objekt zmazaný, úloha sa nezaradí."""
    settings.SAFESEARCH_ENABLED = True
    skill, key, upload = staged_upload

    response, s3, enqueue = upload("TIFF")

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data["code"] == "image_moderation_rejected"
    assert not OfferedSkillImage.objects.filter(skill=skill).exists()
    s3.delete_object.assert_any_call(Bucket=BUCKET, Key=key)
    enqueue.assert_not_called()


def test_safesearch_on_accepts_allowed_format(settings, staged_upload):
    """So SafeSearch prejde povolený formát a vznikne záznam čakajúci na spracovanie."""
    settings.SAFESEARCH_ENABLED = True
    skill, _key, upload = staged_upload

    response, _s3, enqueue = upload("PNG")

    assert response.status_code == status.HTTP_201_CREATED
    assert OfferedSkillImage.objects.get(skill=skill).status == OfferedSkillImage.Status.PENDING
    enqueue.assert_called_once()


def test_safesearch_off_lets_the_task_reject_other_format(settings, staged_upload):
    """Bez SafeSearch záznam vznikne a TIFF zamietne až úloha v pozadí (staging objekt sa zmaže)."""
    from swaply.tasks import offer_images

    settings.SAFESEARCH_ENABLED = False
    skill, key, upload = staged_upload

    with mock.patch("swaply.staged_image_moderation.moderate_staged_s3_image") as moderation:
        response, _s3, enqueue = upload("TIFF")

    assert response.status_code == status.HTTP_201_CREATED
    moderation.assert_not_called()
    image = OfferedSkillImage.objects.get(skill=skill)
    assert image.status == OfferedSkillImage.Status.PENDING
    enqueue.assert_called_once()

    s3 = mock.MagicMock()
    s3.get_object.return_value = {"Body": io.BytesIO(make_image("TIFF"))}
    with mock.patch.object(offer_images, "_s3_client", return_value=s3), mock.patch.object(
        offer_images, "check_image_safety"
    ):
        offer_images.process_offered_skill_image.push_request(retries=0)
        try:
            offer_images.process_offered_skill_image.run(image.id)
        finally:
            offer_images.process_offered_skill_image.pop_request()

    image.refresh_from_db()
    assert image.status == OfferedSkillImage.Status.REJECTED
    s3.delete_object.assert_called_once_with(Bucket=BUCKET, Key=key)
