from io import StringIO

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import UserType
from accounts.name_normalization import carry_display_name_on_type_switch

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


# --- Nález 99: zmena typu účtu nesmie meniť zobrazené meno (ani odkaz na profil) ---


def _create_user(username, **fields):
    """Vytvorí overeného používateľa s pevným heslom pre testy mena a typu účtu."""
    return User.objects.create_user(
        username=username,
        email=f"{username}@example.com",
        password="StrongPass123",
        is_verified=True,
        **fields,
    )


def _switch_type(api_client, user, user_type, **extra):
    """Pošle PATCH so zmenou typu účtu (voliteľne aj s ďalšími poľami) a vráti odpoveď."""
    user.refresh_from_db()
    api_client.force_authenticate(user=user)
    return api_client.patch(
        reverse("accounts:update_profile"),
        {"user_type": user_type, **extra},
        format="json",
    )


def _create_company_with_other_first_name():
    """Firma z nálezu 99: v `first_name` zostalo staré osobné meno, zobrazuje sa názov firmy."""
    return _create_user(
        "svaplynko",
        first_name="Anton",
        last_name="",
        company_name="Svaplynko malyčky",
        user_type=UserType.COMPANY,
    )


@pytest.mark.django_db
def test_company_to_individual_keeps_the_shown_company_name(api_client):
    """Firma s iným menom v `first_name` si po prepnutí na osobný účet ponechá zobrazený názov."""
    user = _create_company_with_other_first_name()
    slug_before = user.slug

    response = _switch_type(api_client, user, "individual")

    assert response.status_code == status.HTTP_200_OK
    user.refresh_from_db()
    assert user.display_name == "Svaplynko malyčky"
    assert (user.first_name, user.last_name, user.company_name) == (
        "Svaplynko malyčky",
        "",
        "",
    )
    assert user.slug == slug_before
    assert response.data["user"]["slug"] == slug_before


@pytest.mark.django_db
def test_company_to_individual_and_back_keeps_the_company_name(api_client):
    """Firma -> osoba -> firma nezmení meno ani odkaz na profil (scenár z nálezu)."""
    user = _create_company_with_other_first_name()
    slug_before = user.slug

    _switch_type(api_client, user, "individual")
    response = _switch_type(api_client, user, "company")

    assert response.status_code == status.HTTP_200_OK
    user.refresh_from_db()
    assert user.user_type == UserType.COMPANY
    assert user.company_name == "Svaplynko malyčky"
    assert user.display_name == "Svaplynko malyčky"
    assert user.slug == slug_before


@pytest.mark.django_db
def test_individual_to_company_and_back_restores_first_and_last_name(api_client):
    """Osoba -> firma -> osoba vráti meno aj priezvisko a odkaz na profil sa nezmení."""
    user = _create_user(
        "anton-osoba",
        first_name="Anton",
        last_name="Chudjačik",
        user_type=UserType.INDIVIDUAL,
    )
    slug_before = user.slug

    _switch_type(api_client, user, "company")
    user.refresh_from_db()
    assert user.company_name == "Anton Chudjačik"
    assert user.slug == slug_before

    _switch_type(api_client, user, "individual")
    user.refresh_from_db()
    assert (user.first_name, user.last_name, user.company_name) == (
        "Anton",
        "Chudjačik",
        "",
    )
    assert user.display_name == "Anton Chudjačik"
    assert user.slug == slug_before


@pytest.mark.django_db
def test_type_switch_keeps_a_suffixed_profile_slug(api_client):
    """Odkaz na profil s príponou kolízie sa pri prepnutí typu a späť nezmení."""
    first_owner = _create_user(
        "anton-prvy",
        first_name="Anton",
        last_name="Chudjačik",
        user_type=UserType.INDIVIDUAL,
    )
    user = _create_user(
        "anton-druhy",
        first_name="Anton",
        last_name="Chudjačik",
        user_type=UserType.INDIVIDUAL,
    )
    slug_before = user.slug
    assert slug_before != first_owner.slug
    assert slug_before.startswith(first_owner.slug)

    _switch_type(api_client, user, "company")
    _switch_type(api_client, user, "individual")

    user.refresh_from_db()
    assert user.slug == slug_before


@pytest.mark.django_db
def test_long_company_name_is_carried_to_individual_as_is(api_client):
    """Dlhý názov firmy (nad limit osobného mena) sa prenesie bez zmeny a bez chyby."""
    long_name = ("Veľmi dlhý názov firmy " * 3).strip()
    assert len(long_name) > 50
    user = _create_user(
        "dlha-firma",
        first_name="Anton",
        last_name="",
        company_name=long_name,
        user_type=UserType.COMPANY,
    )
    slug_before = user.slug

    response = _switch_type(api_client, user, "individual")

    assert response.status_code == status.HTTP_200_OK
    user.refresh_from_db()
    assert user.first_name == long_name
    assert user.display_name == long_name
    assert user.slug == slug_before


@pytest.mark.django_db
def test_company_name_with_punctuation_is_carried_to_individual_as_is(api_client):
    """Názov firmy so znakmi mimo povolených pre osobné meno (čiarka, bodky) sa prenesie bez zmeny."""
    user = _create_user(
        "firma-sro",
        first_name="Anton",
        last_name="",
        company_name="Svaplynko, s.r.o.",
        user_type=UserType.COMPANY,
    )

    response = _switch_type(api_client, user, "individual")

    assert response.status_code == status.HTTP_200_OK
    user.refresh_from_db()
    assert user.first_name == "Svaplynko, s.r.o."
    assert user.display_name == "Svaplynko, s.r.o."


@pytest.mark.django_db
def test_type_switch_with_names_in_the_same_request_is_a_user_edit(api_client):
    """Ak PATCH s typom nesie aj mená, ide o úpravu používateľa a platí doterajšia logika."""
    person = _create_user(
        "uprava-osoba",
        first_name="Anton",
        last_name="Chudjačik",
        user_type=UserType.INDIVIDUAL,
    )
    response = _switch_type(api_client, person, "company", company_name="Nová firma")

    assert response.status_code == status.HTTP_200_OK
    person.refresh_from_db()
    assert person.user_type == UserType.COMPANY
    assert person.company_name == "Nová firma"
    assert person.first_name == "Anton"
    assert person.last_name == ""

    company = _create_company_with_other_first_name()
    response = _switch_type(
        api_client, company, "individual", first_name="Jana", last_name="Nová"
    )

    assert response.status_code == status.HTTP_200_OK
    company.refresh_from_db()
    assert company.user_type == UserType.INDIVIDUAL
    assert (company.first_name, company.last_name, company.company_name) == (
        "Jana",
        "Nová",
        "",
    )
    assert company.display_name == "Jana Nová"


@pytest.mark.django_db
def test_type_switch_with_a_first_name_ignores_the_stale_company_name(api_client):
    """Prepnutie na firmu s novým menom v tej istej požiadavke odvodí názov z mien, nie zo starého názvu firmy."""
    user = _create_user(
        "stary-nazov",
        first_name="Anton",
        last_name="Chudjačik",
        company_name="Stará firma",
        user_type=UserType.INDIVIDUAL,
    )

    response = _switch_type(api_client, user, "company", first_name="Jana")

    assert response.status_code == status.HTTP_200_OK
    user.refresh_from_db()
    assert user.company_name == "Jana Chudjačik"
    assert user.first_name == "Jana"
    assert user.last_name == ""


@pytest.mark.django_db
def test_same_type_patch_does_not_touch_the_names(api_client):
    """PATCH s rovnakým typom (bez zmeny) mená ani odkaz na profil nemení."""
    user = _create_company_with_other_first_name()
    slug_before = user.slug

    response = _switch_type(api_client, user, "company")

    assert response.status_code == status.HTTP_200_OK
    user.refresh_from_db()
    assert (user.first_name, user.last_name, user.company_name) == (
        "Anton",
        "",
        "Svaplynko malyčky",
    )
    assert user.slug == slug_before


@pytest.mark.parametrize(
    ("to_type", "first", "last", "company", "expected"),
    [
        # firma -> osoba: názov firmy sa stane menom, ak sa nezhoduje s osobným menom
        (
            "individual",
            "Anton",
            "",
            "Svaplynko malyčky",
            {"first_name": "Svaplynko malyčky", "last_name": "", "company_name": ""},
        ),
        # zhoda s menom a priezviskom: nič sa nemení
        (
            "individual",
            "Anton",
            "Chudjačik",
            "Anton Chudjačik",
            {"first_name": "Anton", "last_name": "Chudjačik", "company_name": ""},
        ),
        # názov začína menom: priezvisko sa dopočíta (rozdelenie sa obnoví)
        (
            "individual",
            "Anton",
            "",
            "Anton Chudjačik",
            {"first_name": "Anton", "last_name": "Chudjačik", "company_name": ""},
        ),
        # prázdne meno: celý názov firmy ide do mena
        (
            "individual",
            "",
            "",
            "Studio",
            {"first_name": "Studio", "last_name": "", "company_name": ""},
        ),
        # názov firmy rovný menu: nič sa nemení
        (
            "individual",
            "Anton",
            "",
            "Anton",
            {"first_name": "Anton", "last_name": "", "company_name": ""},
        ),
        # chýbajúci názov firmy (staré dáta): osobné meno ostáva
        (
            "individual",
            "Anton",
            "Chudjačik",
            "",
            {"first_name": "Anton", "last_name": "Chudjačik", "company_name": ""},
        ),
        # zhoda len s priezviskom: rozdelenie ostáva, neprehodí sa celé do mena
        (
            "individual",
            "",
            "Chudjačik",
            "Chudjačik",
            {"first_name": "", "last_name": "Chudjačik", "company_name": ""},
        ),
        # názov začína rovnakými písmenami, ale nie menom + medzerou: nerozdeľuje sa
        (
            "individual",
            "Anton",
            "",
            "Antonín Studio",
            {"first_name": "Antonín Studio", "last_name": "", "company_name": ""},
        ),
        # viac medzier za menom: priezvisko sa dopočíta bez nich
        (
            "individual",
            "Anton",
            "",
            "Anton  Chudjačik",
            {"first_name": "Anton", "last_name": "Chudjačik", "company_name": ""},
        ),
        # osoba -> firma: zobrazené meno sa stane názvom, priezvisko sa u firmy ukladá prázdne
        (
            "company",
            "Anton",
            "Chudjačik",
            "stará firma",
            {"first_name": "Anton", "last_name": "", "company_name": "Anton Chudjačik"},
        ),
        # iba priezvisko
        (
            "company",
            "",
            "Chudjačik",
            "",
            {"first_name": "Chudjačik", "last_name": "", "company_name": "Chudjačik"},
        ),
        # bez mena: názov firmy zostane prázdny (validácia ho potom vyžiada)
        (
            "company",
            "",
            "",
            "",
            {"first_name": "", "last_name": "", "company_name": ""},
        ),
    ],
)
def test_carry_display_name_on_type_switch(to_type, first, last, company, expected):
    """Funkcia prenáša zobrazené meno pri zmene typu účtu a nič nemaže."""
    assert (
        carry_display_name_on_type_switch(
            to_type=to_type,
            first_name=first,
            last_name=last,
            company_name=company,
        )
        == expected
    )
