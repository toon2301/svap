from io import BytesIO

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from PIL import Image
from rest_framework import status
from rest_framework.test import APIClient

from accounts.authentication import _USER_CACHE, _redis_user_cache_key

User = get_user_model()


def generate_image_file(
    fmt: str = "JPEG", name: str = "avatar.jpg", size=(32, 32), color=(255, 0, 0)
) -> SimpleUploadedFile:
    buffer = BytesIO()
    image = Image.new("RGB", size, color)
    image.save(buffer, fmt)
    buffer.seek(0)
    content_type = "image/jpeg" if fmt.upper() == "JPEG" else f"image/{fmt.lower()}"
    return SimpleUploadedFile(name, buffer.getvalue(), content_type=content_type)


@pytest.fixture(autouse=True)
def isolated_auth_cache(settings, tmp_path):
    settings.CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "auth-profile-cache-consistency",
        }
    }
    media_root = tmp_path / "media"
    media_root.mkdir(parents=True, exist_ok=True)
    settings.MEDIA_ROOT = str(media_root)
    settings.MEDIA_URL = "/media/"
    settings.ALLOWED_HOSTS = ["testserver"]
    settings.SAFESEARCH_SKIP_IN_TESTS = True
    settings.SAFESEARCH_ENABLED = True
    cache.clear()
    _USER_CACHE.clear()
    yield
    cache.clear()
    _USER_CACHE.clear()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user():
    return User.objects.create_user(
        username="alice",
        email="alice@example.com",
        password="StrongPass123",
        is_verified=True,
        first_name="Alice",
        last_name="Original",
        bio="Old bio",
        location="Bratislava",
        website="https://old.example.com",
        additional_websites=["https://old-extra.example.com"],
        linkedin="https://linkedin.com/in/alice-old",
        facebook="https://facebook.com/alice.old",
        instagram="https://instagram.com/alice.old",
        youtube="https://youtube.com/@aliceold",
        is_public=True,
        user_type="individual",
    )


def login(api_client: APIClient, user):
    return api_client.post(
        reverse("accounts:login"),
        {"email": user.email, "password": "StrongPass123"},
        format="json",
    )


@pytest.mark.django_db
def test_auth_cache_payload_is_minimal_and_contains_no_profile_pii(api_client, user):
    login_response = login(api_client, user)
    assert login_response.status_code == status.HTTP_200_OK

    me_response = api_client.get(reverse("accounts:me"))
    assert me_response.status_code == status.HTTP_200_OK

    payload = cache.get(_redis_user_cache_key(user.id))
    assert payload == {
        "id": user.id,
        "is_active": True,
        "is_staff": False,
        "is_superuser": False,
    }
    for forbidden_key in (
        "email",
        "username",
        "first_name",
        "last_name",
        "bio",
        "location",
        "website",
        "additional_websites",
        "linkedin",
        "facebook",
        "instagram",
        "youtube",
        "company_name",
        "slug",
        "user_type",
        "is_public",
        "is_verified",
    ):
        assert forbidden_key not in payload


@pytest.mark.django_db
def test_profile_patch_invalidates_auth_cache_and_me_returns_fresh_profile_after_worker_switch(
    api_client, user
):
    assert login(api_client, user).status_code == status.HTTP_200_OK
    assert api_client.get(reverse("accounts:me")).status_code == status.HTTP_200_OK
    assert cache.get(_redis_user_cache_key(user.id)) is not None

    patch_payload = {
        "first_name": "Alicia",
        "last_name": "Updated",
        "bio": "New bio",
        "location": "Kosice",
        "website": "https://new.example.com",
        "additional_websites": [
            "https://new-extra-1.example.com",
            "https://new-extra-2.example.com",
        ],
        "linkedin": "https://linkedin.com/in/alicia-updated",
        "facebook": "https://facebook.com/alicia.updated",
        "instagram": "https://instagram.com/alicia.updated",
        "youtube": "https://youtube.com/@aliciaupdated",
        "is_public": False,
        "user_type": "company",
        "company_name": "Alicia Studio",
    }

    patch_response = api_client.patch(
        reverse("accounts:update_profile"), patch_payload, format="json"
    )
    assert patch_response.status_code == status.HTTP_200_OK
    assert patch_response.data["user"]["first_name"] == "Alicia"
    assert patch_response.data["user"]["last_name"] == ""
    assert patch_response.data["user"]["bio"] == "New bio"
    assert patch_response.data["user"]["location"] == "Kosice"
    assert patch_response.data["user"]["website"] == "https://new.example.com"
    assert patch_response.data["user"]["company_name"] == "Alicia Studio"
    assert patch_response.data["user"]["user_type"] == "company"
    assert patch_response.data["user"]["is_public"] is False

    user.refresh_from_db()
    assert user.first_name == "Alicia"
    assert user.last_name == ""
    assert user.bio == "New bio"
    assert user.location == "Kosice"
    assert user.website == "https://new.example.com"
    assert user.additional_websites == [
        "https://new-extra-1.example.com",
        "https://new-extra-2.example.com",
    ]
    assert user.company_name == "Alicia Studio"
    assert user.user_type == "company"
    assert user.is_public is False

    # Explicit invalidation after profile update should clear auth cache.
    assert cache.get(_redis_user_cache_key(user.id)) is None

    # Simulate another worker/process by clearing any local process cache.
    _USER_CACHE.clear()

    me_response = api_client.get(reverse("accounts:me"))
    assert me_response.status_code == status.HTTP_200_OK
    assert me_response.data["first_name"] == "Alicia"
    assert me_response.data["last_name"] == ""
    assert me_response.data["bio"] == "New bio"
    assert me_response.data["location"] == "Kosice"
    assert me_response.data["website"] == "https://new.example.com"
    assert me_response.data["additional_websites"] == [
        "https://new-extra-1.example.com",
        "https://new-extra-2.example.com",
    ]
    assert me_response.data["linkedin"] == "https://linkedin.com/in/alicia-updated"
    assert me_response.data["facebook"] == "https://facebook.com/alicia.updated"
    assert me_response.data["instagram"] == "https://instagram.com/alicia.updated"
    assert me_response.data["youtube"] == "https://youtube.com/@aliciaupdated"
    assert me_response.data["company_name"] == "Alicia Studio"
    assert me_response.data["user_type"] == "company"
    assert me_response.data["is_public"] is False


@pytest.mark.django_db
def test_logout_login_response_and_me_remain_consistent_after_profile_update(
    api_client, user
):
    assert login(api_client, user).status_code == status.HTTP_200_OK
    assert api_client.get(reverse("accounts:me")).status_code == status.HTTP_200_OK

    patch_response = api_client.patch(
        reverse("accounts:update_profile"),
        {
            "first_name": "ReLogin",
            "last_name": "Stable",
            "bio": "Stable bio",
            "location": "Zilina",
            "website": "https://stable.example.com",
            "is_public": False,
        },
        format="json",
    )
    assert patch_response.status_code == status.HTTP_200_OK

    logout_response = api_client.post(reverse("accounts:logout"), {}, format="json")
    assert logout_response.status_code == status.HTTP_200_OK

    login_response = login(api_client, user)
    assert login_response.status_code == status.HTTP_200_OK
    assert login_response.data["user"]["first_name"] == "ReLogin"
    assert login_response.data["user"]["last_name"] == "Stable"
    assert login_response.data["user"]["bio"] == "Stable bio"
    assert login_response.data["user"]["location"] == "Zilina"
    assert login_response.data["user"]["website"] == "https://stable.example.com"
    assert login_response.data["user"]["is_public"] is False

    _USER_CACHE.clear()
    me_response = api_client.get(reverse("accounts:me"))
    assert me_response.status_code == status.HTTP_200_OK
    assert me_response.data["first_name"] == "ReLogin"
    assert me_response.data["last_name"] == "Stable"
    assert me_response.data["bio"] == "Stable bio"
    assert me_response.data["location"] == "Zilina"
    assert me_response.data["website"] == "https://stable.example.com"
    assert me_response.data["is_public"] is False


@pytest.mark.django_db
def test_avatar_update_stays_consistent_in_me_after_cache_boundary(api_client, user):
    assert login(api_client, user).status_code == status.HTTP_200_OK
    assert api_client.get(reverse("accounts:me")).status_code == status.HTTP_200_OK

    file = generate_image_file()
    patch_response = api_client.patch(
        reverse("accounts:update_profile"), {"avatar": file}, format="multipart"
    )
    assert patch_response.status_code == status.HTTP_200_OK
    avatar_url = patch_response.data["user"]["avatar_url"]
    assert avatar_url
    assert cache.get(_redis_user_cache_key(user.id)) is None

    _USER_CACHE.clear()
    me_response = api_client.get(reverse("accounts:me"))
    assert me_response.status_code == status.HTTP_200_OK
    assert me_response.data["avatar_url"] == avatar_url


@pytest.mark.django_db
def test_user_post_save_signal_invalidates_auth_cache_and_me_reads_fresh_db_state(
    api_client, user
):
    assert login(api_client, user).status_code == status.HTTP_200_OK
    assert api_client.get(reverse("accounts:me")).status_code == status.HTTP_200_OK
    assert cache.get(_redis_user_cache_key(user.id)) is not None

    user.first_name = "Signal"
    user.bio = "Signal fresh bio"
    user.save()

    assert cache.get(_redis_user_cache_key(user.id)) is None

    _USER_CACHE.clear()
    me_response = api_client.get(reverse("accounts:me"))
    assert me_response.status_code == status.HTTP_200_OK
    assert me_response.data["first_name"] == "Signal"
    assert me_response.data["bio"] == "Signal fresh bio"


@pytest.mark.django_db
def test_user_post_delete_signal_invalidates_auth_cache(user):
    user_id = user.id
    cache.set(
        _redis_user_cache_key(user_id),
        {"id": user_id, "is_active": True, "is_staff": False, "is_superuser": False},
        timeout=300,
    )
    assert cache.get(_redis_user_cache_key(user_id)) is not None

    user.delete()

    assert cache.get(_redis_user_cache_key(user_id)) is None
