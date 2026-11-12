"""Testy: kategórie upozornení v API nastavení (nález 321, etapa 2, služby a rozhranie).

`GET` a `PATCH /api/auth/push/preferences/` vracajú a menia všetkých sedem volieb (dva hlavné vypínače a päť
kategórií), `PATCH` prijme ľubovoľnú podmnožinu a odmietne každý neznámy kľúč, aj keď je v požiadavke popri známom.
Rovnaké voľby sú aj v bloku `notifications` cesty `dashboard/settings/`.
"""

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import UserProfile

User = get_user_model()

CATEGORY_FIELDS = (
    "notify_likes",
    "notify_comment_likes",
    "notify_comments",
    "notify_tags_and_shares",
    "notify_skill_requests",
)
ALL_OPTIONS = ("in_app_notifications", "push_notifications", *CATEGORY_FIELDS)


@pytest.fixture
def user(db):
    """Prihlásený používateľ s profilom, ktorý má všetky voľby zapnuté."""
    created = User.objects.create_user(
        username="prefs-user", email="prefs-user@example.com", password="StrongPass123"
    )
    UserProfile.objects.create(user=created)
    return created


@pytest.fixture
def auth_client(user):
    """Klient prihlásený ako `user`."""
    api_client = APIClient()
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def push_url():
    """Adresa nastavení upozornení."""
    return reverse("accounts:push_preferences")


@pytest.fixture
def settings_url():
    """Adresa nastavení rozhrania, ktorej blok `notifications` nesie tie isté voľby."""
    return reverse("accounts:dashboard_settings")


def _stored(user):
    """Hodnoty všetkých siedmich volieb tak, ako sú uložené v databáze."""
    profile = UserProfile.objects.get(user=user)
    return {name: getattr(profile, name) for name in ALL_OPTIONS}


def _all(value):
    """Všetkých sedem volieb nastavených na rovnakú hodnotu."""
    return dict.fromkeys(ALL_OPTIONS, value)


@pytest.mark.django_db
class TestPreferencesGet:
    """`GET push/preferences/` vracia všetkých sedem volieb."""

    def test_returns_all_seven_options_enabled_by_default(self, auth_client, push_url):
        """Nový používateľ dostane všetkých sedem volieb zapnutých."""
        response = auth_client.get(push_url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data == _all(True)

    def test_returns_every_persisted_value(self, auth_client, push_url, user):
        """GET vráti uloženú hodnotu každej zo siedmich volieb (striedavé hodnoty)."""
        # Striedavé hodnoty: pole vynechané v odpovedi by sa prezradilo.
        expected = {name: index % 2 == 0 for index, name in enumerate(ALL_OPTIONS)}
        UserProfile.objects.filter(user=user).update(**expected)

        response = auth_client.get(push_url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data == expected

    @pytest.mark.parametrize("field", ALL_OPTIONS)
    def test_returns_each_option_from_its_own_field(
        self, auth_client, push_url, user, field
    ):
        """Každá voľba sa v odpovedi číta zo svojho poľa, nie z cudzieho."""
        # Vypnutá je len jedna voľba: odpoveď, ktorá by ju čítala z cudzieho poľa, by sa prezradila.
        UserProfile.objects.filter(user=user).update(**{field: False})

        response = auth_client.get(push_url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data == {**_all(True), field: False}

    def test_creates_profile_for_user_without_one(self, push_url):
        """GET vytvorí chýbajúci profil a vráti predvolené hodnoty."""
        lone = User.objects.create_user(
            username="prefs-lone",
            email="prefs-lone@example.com",
            password="StrongPass123",
        )
        lone_client = APIClient()
        lone_client.force_authenticate(user=lone)

        response = lone_client.get(push_url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data == _all(True)


@pytest.mark.django_db
class TestPreferencesPatch:
    """`PATCH push/preferences/` mení len zadané voľby a odpovedá všetkými siedmimi."""

    @pytest.mark.parametrize("field", CATEGORY_FIELDS)
    def test_single_category_changes_only_that_category(
        self, auth_client, push_url, user, field
    ):
        """PATCH jednej kategórie zmení len ju a odpovie všetkými siedmimi hodnotami."""
        response = auth_client.patch(push_url, {field: False}, format="json")

        expected = {**_all(True), field: False}
        assert response.status_code == status.HTTP_200_OK
        assert response.data == expected
        assert _stored(user) == expected

    @pytest.mark.parametrize("field", CATEGORY_FIELDS)
    def test_category_can_be_enabled_again(self, auth_client, push_url, user, field):
        """Vypnutú kategóriu sa dá cez PATCH zapnúť späť."""
        UserProfile.objects.filter(user=user).update(**{field: False})

        response = auth_client.patch(push_url, {field: True}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data == _all(True)
        assert _stored(user) == _all(True)

    def test_subset_of_options_changes_only_those(self, auth_client, push_url, user):
        """PATCH s podmnožinou volieb zmení len zadané voľby."""
        response = auth_client.patch(
            push_url,
            {
                "notify_likes": False,
                "notify_skill_requests": False,
                "in_app_notifications": False,
            },
            format="json",
        )

        expected = {
            **_all(True),
            "notify_likes": False,
            "notify_skill_requests": False,
            "in_app_notifications": False,
        }
        assert response.status_code == status.HTTP_200_OK
        assert response.data == expected
        assert _stored(user) == expected

    def test_old_request_shape_still_works(self, auth_client, push_url, user):
        """Starý tvar požiadavky (jeden z dvoch pôvodných kľúčov) funguje bez zmeny."""
        response = auth_client.patch(
            push_url, {"push_notifications": False}, format="json"
        )

        expected = {**_all(True), "push_notifications": False}
        assert response.status_code == status.HTTP_200_OK
        assert response.data == expected
        assert _stored(user) == expected

    def test_only_unknown_key_returns_400_and_changes_nothing(
        self, auth_client, push_url, user
    ):
        """Požiadavka len s neznámym kľúčom je 400 a nič nezmení."""
        response = auth_client.patch(push_url, {"notify_unknown": False}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert _stored(user) == _all(True)

    @pytest.mark.parametrize(
        "unknown_key",
        [
            "notify_coments",  # preklep v názve druhej kategórie
            "foo",
            "Notify_Likes",  # iná veľkosť písmen
            "mfa_enabled",  # existujúce pole profilu, ktoré toto API nesmie meniť
            "show_email",
        ],
    )
    def test_known_and_unknown_key_returns_400_and_changes_nothing(
        self, auth_client, push_url, user, unknown_key
    ):
        """Známy kľúč popri neznámom neprejde: 400, nič sa neuloží a neznámy kľúč je v chybe."""
        response = auth_client.patch(
            push_url, {"notify_likes": False, unknown_key: False}, format="json"
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert unknown_key in response.data["details"]
        # Známy kľúč z tej istej požiadavky sa nesmie uložiť ani čiastočne.
        assert _stored(user) == _all(True)
        profile = UserProfile.objects.get(user=user)
        assert profile.mfa_enabled is False
        assert profile.show_email is False

    def test_empty_body_returns_400(self, auth_client, push_url, user):
        """Prázdne telo požiadavky je 400 a nič sa nezmení."""
        response = auth_client.patch(push_url, {}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert _stored(user) == _all(True)

    def test_non_boolean_value_returns_400_and_changes_nothing(
        self, auth_client, push_url, user
    ):
        """Hodnota, ktorá nie je pravdivostná, je 400 a nič sa neuloží."""
        response = auth_client.patch(
            push_url, {"notify_comments": "maybe"}, format="json"
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert _stored(user) == _all(True)


@pytest.mark.django_db
class TestDashboardSettingsNotifications:
    """Blok `notifications` v `dashboard/settings/` nesie tých istých sedem volieb."""

    def test_get_returns_all_seven_options(self, auth_client, settings_url, user):
        """GET nastavení rozhrania nesie v bloku `notifications` všetkých sedem volieb."""
        expected = {name: index % 2 == 1 for index, name in enumerate(ALL_OPTIONS)}
        UserProfile.objects.filter(user=user).update(**expected)

        response = auth_client.get(settings_url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["notifications"] == expected

    @pytest.mark.parametrize("field", ALL_OPTIONS)
    def test_patch_changes_only_the_given_option(
        self, auth_client, settings_url, user, field
    ):
        """PATCH jednej voľby v bloku `notifications` zmení len ju."""
        response = auth_client.patch(
            settings_url, {"notifications": {field: False}}, format="json"
        )

        expected = {**_all(True), field: False}
        assert response.status_code == status.HTTP_200_OK
        assert response.data["settings"]["notifications"] == expected
        assert _stored(user) == expected

    def test_patch_still_ignores_unknown_keys_as_before(
        self, auth_client, settings_url, user
    ):
        """Neznáme kľúče v bloku `notifications` sa ticho ignorujú ako doteraz."""
        response = auth_client.patch(
            settings_url,
            {"notifications": {"notify_likes": False, "notify_unknown": False}},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert _stored(user) == {**_all(True), "notify_likes": False}

    @pytest.mark.parametrize("field", ALL_OPTIONS)
    @pytest.mark.parametrize(("text", "expected"), [("false", False), ("true", True)])
    def test_patch_converts_boolean_strings_by_meaning(
        self, auth_client, settings_url, user, field, text, expected
    ):
        """Pravdivostný reťazec sa prevedie podľa významu, nie ako neprázdny text (vždy pravda)."""
        UserProfile.objects.filter(user=user).update(**{field: not expected})

        response = auth_client.patch(
            settings_url, {"notifications": {field: text}}, format="json"
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["settings"]["notifications"][field] is expected
        assert _stored(user)[field] is expected

    @pytest.mark.parametrize(
        "field", ["in_app_notifications", "notify_likes", "notify_skill_requests"]
    )
    @pytest.mark.parametrize("bad_value", ["maybe", "", None, [], {}, 2])
    def test_patch_rejects_invalid_value_with_400_and_changes_nothing(
        self, auth_client, settings_url, user, field, bad_value
    ):
        """Hodnota, ktorá nie je pravdivostná (aj null), je 400 a nič sa neuloží."""
        response = auth_client.patch(
            settings_url, {"notifications": {field: bad_value}}, format="json"
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert field in response.data["validation_errors"]["notifications"]
        assert _stored(user) == _all(True)

    def test_invalid_value_blocks_the_whole_request(
        self, auth_client, settings_url, user
    ):
        """Neplatná hodnota zastaví celú požiadavku: neuloží sa platná voľba ani súkromie."""
        response = auth_client.patch(
            settings_url,
            {
                "notifications": {"notify_likes": "maybe", "notify_comments": False},
                "privacy": {"show_email": True},
            },
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert _stored(user) == _all(True)
        assert UserProfile.objects.get(user=user).show_email is False


@pytest.mark.django_db
def test_service_rejects_unknown_option_name_and_changes_nothing(user):
    """Preklep v názve voľby pri volaní priamo zo služby vyvolá TypeError a nič sa neuloží."""
    from accounts.services.settings import update_notification_preferences

    with pytest.raises(TypeError, match="notify_likez"):
        update_notification_preferences(user, notify_likes=False, notify_likez=False)

    assert _stored(user) == _all(True)


def test_serializer_and_service_use_the_same_options():
    """Serializátor aj služba poznajú presne tých istých sedem volieb a všetky sú polia profilu."""
    from accounts.push_serializers import PushPreferencesSerializer
    from accounts.services.settings import (
        NOTIFICATION_CATEGORY_FIELDS,
        NOTIFICATION_PREFERENCE_FIELDS,
    )

    assert set(PushPreferencesSerializer().fields) == set(ALL_OPTIONS)
    assert tuple(NOTIFICATION_CATEGORY_FIELDS) == CATEGORY_FIELDS
    assert tuple(NOTIFICATION_PREFERENCE_FIELDS) == ALL_OPTIONS
    for name in ALL_OPTIONS:
        assert UserProfile._meta.get_field(name).get_internal_type() == "BooleanField"
