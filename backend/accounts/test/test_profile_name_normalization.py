from io import StringIO

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import UserType

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def authenticated_user():
    return User.objects.create_user(
        username="anton",
        email="anton@example.com",
        password="StrongPass123",
        is_verified=True,
        first_name="Anton",
        last_name="Chudjačik",
        company_name="Anton Chudjačik Chudjak",
        user_type=UserType.INDIVIDUAL,
    )


@pytest.mark.django_db
def test_individual_profile_patch_clears_stale_company_name(api_client, authenticated_user):
    api_client.force_authenticate(user=authenticated_user)

    response = api_client.patch(
        reverse("accounts:update_profile"),
        {"first_name": "Anton", "last_name": "Chudjačik"},
        format="json",
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.data["user"]["first_name"] == "Anton"
    assert response.data["user"]["last_name"] == "Chudjačik"
    assert response.data["user"]["company_name"] == ""

    authenticated_user.refresh_from_db()
    assert authenticated_user.company_name == ""


@pytest.mark.django_db
def test_switching_individual_to_company_derives_company_name_and_clears_last_name(
    api_client, authenticated_user
):
    api_client.force_authenticate(user=authenticated_user)

    response = api_client.patch(
        reverse("accounts:update_profile"),
        {"user_type": "company"},
        format="json",
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.data["user"]["user_type"] == "company"
    assert response.data["user"]["company_name"] == "Anton Chudjačik"
    assert response.data["user"]["first_name"] == "Anton"
    assert response.data["user"]["last_name"] == ""

    authenticated_user.refresh_from_db()
    assert authenticated_user.user_type == UserType.COMPANY
    assert authenticated_user.company_name == "Anton Chudjačik"
    assert authenticated_user.last_name == ""


@pytest.mark.django_db
def test_switching_company_to_individual_clears_company_name(api_client):
    user = User.objects.create_user(
        username="studio-anton",
        email="studio@example.com",
        password="StrongPass123",
        is_verified=True,
        first_name="Studio Anton",
        last_name="",
        company_name="Studio Anton",
        user_type=UserType.COMPANY,
    )
    api_client.force_authenticate(user=user)

    response = api_client.patch(
        reverse("accounts:update_profile"),
        {"user_type": "individual"},
        format="json",
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.data["user"]["user_type"] == "individual"
    assert response.data["user"]["company_name"] == ""
    assert response.data["user"]["first_name"] == "Studio Anton"
    assert response.data["user"]["last_name"] == ""

    user.refresh_from_db()
    assert user.user_type == UserType.INDIVIDUAL
    assert user.company_name == ""


@pytest.mark.django_db
def test_normalize_profile_names_command_supports_dry_run_and_safe_updates():
    individual_safe = User.objects.create_user(
        username="individual-safe",
        email="individual-safe@example.com",
        password="StrongPass123",
        is_verified=True,
        first_name="Anton",
        last_name="Chudjačik",
        company_name="Anton Chudjačik",
        user_type=UserType.INDIVIDUAL,
    )
    company_safe = User.objects.create_user(
        username="company-safe",
        email="company-safe@example.com",
        password="StrongPass123",
        is_verified=True,
        first_name="Anton Studio",
        last_name="",
        company_name="",
        user_type=UserType.COMPANY,
    )
    company_conflict = User.objects.create_user(
        username="company-conflict",
        email="company-conflict@example.com",
        password="StrongPass123",
        is_verified=True,
        first_name="Anton",
        last_name="Chudjačik",
        company_name="Studio Anton",
        user_type=UserType.COMPANY,
    )

    dry_run_out = StringIO()
    call_command(
        "normalize_profile_names",
        "--dry-run",
        stdout=dry_run_out,
    )
    dry_run_report = dry_run_out.getvalue()
    assert "dry_run: true" in dry_run_report
    assert "safe_updates: 2" in dry_run_report
    assert "company_conflicts: 1" in dry_run_report

    individual_safe.refresh_from_db()
    company_safe.refresh_from_db()
    company_conflict.refresh_from_db()
    assert individual_safe.company_name == "Anton Chudjačik"
    assert company_safe.company_name == ""
    assert company_conflict.company_name == "Studio Anton"

    run_out = StringIO()
    call_command("normalize_profile_names", stdout=run_out)
    run_report = run_out.getvalue()
    assert "dry_run: false" in run_report
    assert "safe_updates: 2" in run_report
    assert f"conflict_user_ids: {company_conflict.id}" in run_report

    individual_safe.refresh_from_db()
    company_safe.refresh_from_db()
    company_conflict.refresh_from_db()
    assert individual_safe.company_name == ""
    assert company_safe.company_name == "Anton Studio"
    assert company_safe.first_name == "Anton Studio"
    assert company_safe.last_name == ""
    assert company_conflict.company_name == "Studio Anton"
    assert company_conflict.first_name == "Anton"
