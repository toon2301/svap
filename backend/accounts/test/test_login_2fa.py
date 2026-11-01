"""
Prihlásenie s 2FA (TOTP): okno platnosti kódu a hlášky pri chybách.

Overenie kódu je len v `UserLoginSerializer` (`accounts/auth_serializers.py`). Testy používajú pevný čas
(`freezegun`), takže nezávisia od toho, v ktorej sekunde 30-sekundového okna práve bežia – pôvodný test
`TestBioAnd2FAFlows::test_login_requires_totp_when_enabled` kvôli tomu občas zlyhával (nález 179).
"""

import datetime
from unittest import mock

import pyotp
import pytest
from django.core.cache import cache
from django.urls import reverse
from freezegun import freeze_time
from rest_framework import status
from rest_framework.test import APIClient

from accounts.auth_serializers import UserLoginSerializer
from accounts.models import User, UserProfile, encrypt_mfa_secret

PASSWORD = "StrongPass123"
EMAIL = "mfa-window@example.com"
# Začiatok okna + 10 s: kód z predošlého aj nasledujúceho okna je od "teraz" vzdialený 20 až 40 s.
FROZEN_NOW = "2026-11-01 12:00:10"
WINDOW = datetime.timedelta(seconds=30)

# `non_field_errors` z `UserLoginSerializer.validate`.
MSG_INVALID_CODE = "Neplatný 2FA kód."
MSG_CODE_REQUIRED = "Vyžaduje sa 2FA kód."
MSG_NOT_CONFIGURED = "2FA nie je správne nastavené."
MSG_TECHNICAL = "Chyba pri overovaní 2FA."


# Pevný testovací secret (verejne známy príklad z dokumentácie TOTP, nie skutočný kľúč): kódy zo susedných
# okien sa pri ňom nikdy nezhodujú, takže testy nemajú náhodnú zložku.
TEST_SECRET = "JBSWY3DPEHPK3PXP"


@pytest.fixture(autouse=True)
def clean_login_state():
    """Zámok po neúspešných prihláseniach a limit sú v cache podľa e-mailu; každý test začína čistý."""
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def secret():
    """TOTP secret testovacieho používateľa."""
    return TEST_SECRET


@pytest.fixture
def mfa_user(db, secret):
    """Overený používateľ so zapnutým 2FA a zašifrovaným secretom."""
    user = User.objects.create_user(
        username="mfawindow",
        email=EMAIL,
        password=PASSWORD,
        is_verified=True,
    )
    UserProfile.objects.create(
        user=user, mfa_enabled=True, mfa_secret=encrypt_mfa_secret(secret)
    )
    return user


def _code(secret, offset_windows=0):
    """TOTP kód pre okno posunuté o `offset_windows` oproti aktuálnemu (zmrazenému) času."""
    return pyotp.TOTP(secret).at(
        datetime.datetime.now() + offset_windows * WINDOW
    )


def _wrong_code(secret):
    """Šesťčíslie, ktoré nie je platné ani v jednom z troch prijímaných okien."""
    valid = {_code(secret, offset) for offset in (-1, 0, 1)}
    return next(c for c in ("000000", "111111", "222222") if c not in valid)


def _errors(totp):
    """Chyby serializéra prihlásenia pre daný 2FA kód (`None` = pole sa neposiela)."""
    data = {"email": EMAIL, "password": PASSWORD}
    if totp is not None:
        data["totp"] = totp
    serializer = UserLoginSerializer(data=data)
    assert serializer.is_valid() is False
    return [str(e) for e in serializer.errors["non_field_errors"]]


def _login(totp):
    """Prihlásenie cez API; vracia odpoveď."""
    return APIClient().post(
        reverse("accounts:login"),
        {"email": EMAIL, "password": PASSWORD, "totp": totp},
        format="json",
    )


@pytest.mark.django_db
class TestTotpWindow:
    """Kód sa prijíma aj z predošlého a nasledujúceho 30-sekundového okna (hodiny nikdy nesedia presne)."""

    @freeze_time(FROZEN_NOW)
    def test_code_from_the_current_window_is_accepted(self, mfa_user, secret):
        """Kód z aktuálneho okna prihlási používateľa (základný prípad)."""
        assert _login(_code(secret)).status_code == status.HTTP_200_OK

    @freeze_time(FROZEN_NOW)
    def test_code_from_the_previous_window_is_accepted(self, mfa_user, secret):
        """Kód z predošlého okna sa prijme – telefón ide pozadu alebo sa kód zadáva na konci okna (nález 179)."""
        # Telefón ide o niekoľko sekúnd pozadu, alebo sa kód zadáva na konci okna.
        assert _login(_code(secret, -1)).status_code == status.HTTP_200_OK

    @freeze_time(FROZEN_NOW)
    def test_code_from_the_next_window_is_accepted(self, mfa_user, secret):
        """Kód z nasledujúceho okna sa prijme – telefón ide popredu."""
        # Telefón ide o niekoľko sekúnd popredu.
        assert _login(_code(secret, +1)).status_code == status.HTTP_200_OK

    @freeze_time(FROZEN_NOW)
    def test_code_two_windows_old_is_rejected(self, mfa_user, secret):
        """Kód starší o dve okná (60 s) sa odmietne: okno sa nesmie rozšíriť viac než o jedno."""
        response = _login(_code(secret, -2))
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @freeze_time(FROZEN_NOW)
    def test_code_two_windows_ahead_is_rejected(self, mfa_user, secret):
        """Kód o dve okná dopredu sa odmietne."""
        response = _login(_code(secret, +2))
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @freeze_time(FROZEN_NOW)
    def test_code_of_another_secret_is_rejected(self, mfa_user):
        """Kód vygenerovaný z cudzieho secretu sa odmietne."""
        other = "GEZDGNBVGY3TQOJQ"
        assert _login(_code(other)).status_code == status.HTTP_400_BAD_REQUEST

    @freeze_time(FROZEN_NOW)
    def test_codes_of_the_five_windows_around_now_are_all_different(self, secret):
        """Pomocný predpoklad: kódy piatich susedných okien sú rôzne, takže odmietnutie nie je náhoda."""
        # Predpoklad ostatných testov: odmietnutý kód nie je len náhodou zhodný s prijatým.
        codes = [_code(secret, offset) for offset in range(-2, 3)]
        assert len(set(codes)) == 5


@pytest.mark.django_db
class TestTotpMessages:
    """Každá chyba 2FA má svoju hlášku; všeobecná je len pre skutočné technické zlyhanie."""

    @freeze_time(FROZEN_NOW)
    def test_wrong_code_says_invalid_code(self, mfa_user, secret):
        """Zlý kód dostane hlášku „Neplatný 2FA kód.“, nie všeobecnú chybu (nález 234)."""
        # Pôvodne ho zachytil `except Exception` a prepísal na všeobecnú hlášku (nález 234).
        assert _errors(_wrong_code(secret)) == [MSG_INVALID_CODE]

    @freeze_time(FROZEN_NOW)
    def test_code_two_windows_old_says_invalid_code(self, mfa_user, secret):
        """Expirovaný kód dostane hlášku „Neplatný 2FA kód.“."""
        assert _errors(_code(secret, -2)) == [MSG_INVALID_CODE]

    @freeze_time(FROZEN_NOW)
    def test_non_numeric_code_says_invalid_code(self, mfa_user):
        """Kód z písmen dostane hlášku „Neplatný 2FA kód.“ a nespôsobí výnimku."""
        assert _errors("abcdef") == [MSG_INVALID_CODE]

    def test_missing_code_asks_for_it(self, mfa_user):
        """Chýbajúci alebo prázdny kód vyvolá výzvu „Vyžaduje sa 2FA kód.“."""
        assert _errors(None) == [MSG_CODE_REQUIRED]
        assert _errors("   ") == [MSG_CODE_REQUIRED]

    def test_enabled_without_a_secret_says_not_configured(self, mfa_user):
        """Zapnuté 2FA bez secretu dostane hlášku „2FA nie je správne nastavené.“."""
        UserProfile.objects.filter(user=mfa_user).update(mfa_secret="")
        assert _errors("123456") == [MSG_NOT_CONFIGURED]

    def test_unusable_secret_gets_the_generic_message(self, mfa_user):
        """Nepoužiteľný secret je technická chyba, preto dostane všeobecnú hlášku."""
        # Nie je to platný base32 secret: knižnica vyhodí výnimku, nie "zlý kód".
        UserProfile.objects.filter(user=mfa_user).update(mfa_secret="not valid base32 !!")
        assert _errors("123456") == [MSG_TECHNICAL]

    def test_failing_decryption_gets_the_generic_message(self, mfa_user):
        """Zlyhanie dešifrovania secretu je technická chyba, preto dostane všeobecnú hlášku."""
        with mock.patch(
            "accounts.auth_serializers.decrypt_mfa_secret",
            side_effect=RuntimeError("kľúč nie je k dispozícii"),
        ):
            assert _errors("123456") == [MSG_TECHNICAL]

    @freeze_time(FROZEN_NOW)
    def test_the_message_does_not_reveal_the_code_or_the_secret(self, mfa_user, secret):
        """Hláška neobsahuje zadaný kód ani secret."""
        attempt = _wrong_code(secret)
        text = " ".join(_errors(attempt))
        assert attempt not in text
        assert secret not in text


@pytest.mark.django_db
class TestUsersWithoutTwoFactor:
    """Používateľ bez 2FA sa prihlasuje ako doteraz, pole `totp` sa ignoruje."""

    def test_login_without_mfa_does_not_ask_for_a_code(self, db):
        """Používateľ bez 2FA sa prihlási ako doteraz, kód sa nevyžaduje."""
        User.objects.create_user(
            username="nomfa", email=EMAIL, password=PASSWORD, is_verified=True
        )
        response = APIClient().post(
            reverse("accounts:login"),
            {"email": EMAIL, "password": PASSWORD},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
