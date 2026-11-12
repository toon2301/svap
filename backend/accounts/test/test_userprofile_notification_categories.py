"""Testy: päť kategórií upozornení v UserProfile (nález 321, etapa 1).

Každá kategória má pole `notify_*` a všetky sú predvolene zapnuté: pri novom profile (priamo aj cez registráciu),
pri už existujúcom riadku po migrácii (bez dátovej migrácie), a pole je vidieť v administrácii.
"""

from unittest.mock import patch

import pytest
from django.contrib import admin
from django.contrib.auth import get_user_model
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import RequestFactory, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import UserProfile
from accounts.services.settings import get_or_create_user_profile

User = get_user_model()

CATEGORY_FIELDS = (
    "notify_likes",
    "notify_comment_likes",
    "notify_comments",
    "notify_tags_and_shares",
    "notify_skill_requests",
)

MIGRATE_FROM = ("accounts", "0125_dashboard_search_description_indexes")
MIGRATE_TO = ("accounts", "0126_userprofile_notification_categories")


def _user(username):
    """Vytvorí používateľa s heslom a e-mailom odvodeným od mena."""
    return User.objects.create_user(
        username=username, email=f"{username}@example.com", password="StrongPass123"
    )


def _assert_all_enabled(profile):
    """Overí, že všetkých päť kategórií je zapnutých (aj po novom načítaní z databázy)."""
    profile.refresh_from_db()
    assert {name: getattr(profile, name) for name in CATEGORY_FIELDS} == dict.fromkeys(
        CATEGORY_FIELDS, True
    )


@pytest.mark.django_db
class TestNewProfileDefaults:
    """Nový profil má všetky kategórie zapnuté bez ohľadu na to, ako vznikol."""

    def test_profile_created_directly_has_all_categories_enabled(self):
        """Profil vytvorený priamo cez `UserProfile.objects.create` má všetkých päť kategórií zapnutých."""
        profile = UserProfile.objects.create(user=_user("cat-direct"))

        _assert_all_enabled(profile)

    def test_profile_created_by_settings_service_has_all_categories_enabled(self):
        """Profil vytvorený službou `get_or_create_user_profile` má všetkých päť kategórií zapnutých."""
        profile = get_or_create_user_profile(_user("cat-service"))

        _assert_all_enabled(profile)

    @patch("accounts.models.verification.send_mail")
    @override_settings(EMAIL_VERIFICATION_REQUIRED=True, ALLOW_UNVERIFIED_LOGIN=True)
    def test_profile_created_by_email_registration_has_all_categories_enabled(
        self, mock_send_mail
    ):
        """Profil vytvorený pri registrácii e-mailom má všetkých päť kategórií zapnutých."""
        mock_send_mail.return_value = True
        payload = {
            "username": "cat-register",
            "email": "cat-register@example.com",
            "password": "StrongPass123",
            "password_confirm": "StrongPass123",
            "user_type": "individual",
            "captcha_token": "test_captcha_token",
        }

        response = APIClient().post(
            reverse("accounts:register"), payload, format="json"
        )

        assert response.status_code == status.HTTP_201_CREATED, response.data
        _assert_all_enabled(
            UserProfile.objects.get(user__email="cat-register@example.com")
        )

    def test_category_fields_are_booleans_with_default_true(self):
        """Každé z piatich polí je `BooleanField` s predvolenou hodnotou `True`."""
        for name in CATEGORY_FIELDS:
            field = UserProfile._meta.get_field(name)
            assert field.get_internal_type() == "BooleanField"
            assert field.default is True


@pytest.fixture
def historical_apps(transactional_db):
    """Vráti schému tesne pred migráciou a po teste vždy obnoví najnovší stav testovacej databázy."""
    executor = MigrationExecutor(connection)
    latest = executor.loader.graph.leaf_nodes()
    executor.migrate([MIGRATE_FROM])
    apps = executor.loader.project_state([MIGRATE_FROM]).apps
    try:
        yield apps
    finally:
        MigrationExecutor(connection).migrate(latest)


def test_migration_enables_all_categories_on_existing_profile(historical_apps):
    """Existujúci riadok po migrácii dostane všetky kategórie zapnuté a staré voľby ostanú, aké boli."""
    HistoricalUser = historical_apps.get_model("accounts", "User")
    HistoricalProfile = historical_apps.get_model("accounts", "UserProfile")
    user = HistoricalUser.objects.create(
        username="cat-migration", email="cat-migration@example.com"
    )
    profile = HistoricalProfile.objects.create(
        user=user, in_app_notifications=False, push_notifications=False
    )
    assert not any(hasattr(profile, name) for name in CATEGORY_FIELDS)

    executor = MigrationExecutor(connection)
    executor.migrate([MIGRATE_TO])
    migrated_apps = executor.loader.project_state([MIGRATE_TO]).apps
    migrated = migrated_apps.get_model("accounts", "UserProfile").objects.get(
        pk=profile.pk
    )

    assert {name: getattr(migrated, name) for name in CATEGORY_FIELDS} == dict.fromkeys(
        CATEGORY_FIELDS, True
    )
    assert migrated.in_app_notifications is False
    assert migrated.push_notifications is False


@pytest.mark.django_db
def test_admin_form_contains_category_fields():
    """Formulár profilu v administrácii obsahuje všetkých päť kategórií upozornení.

    Stránka sa nevykresľuje: produkčné úložisko statických súborov v testoch bez `collectstatic` pád vyvolá samo.
    """
    admin_user = User.objects.create_superuser(
        username="cat-admin", email="cat-admin@example.com", password="StrongPass123"
    )
    profile = UserProfile.objects.create(user=_user("cat-admin-target"))
    request = RequestFactory().get("/")
    request.user = admin_user
    model_admin = admin.site._registry[UserProfile]

    form_class = model_admin.get_form(request, obj=profile)

    assert set(CATEGORY_FIELDS) <= set(form_class.base_fields)
    shown = {
        name
        for _title, options in model_admin.get_fieldsets(request, profile)
        for name in options["fields"]
    }
    assert set(CATEGORY_FIELDS) <= shown
