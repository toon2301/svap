"""Spoločné nastavenia testov backendu (pytest).

Rýchly hasher hesiel: Django 5.2 hashuje heslá algoritmom PBKDF2 s 1 000 000 iteráciami (Django 4.2: 600 000) a každé
vytvorenie používateľa v teste (`create_user`, prihlásenie, zmena hesla) tým trvá približne 0,3 s. Celá backendová sada sa
kvôli tomu na SQLite predĺžila z 13 na 19 minút; s rýchlym hasherom trvá 2 minúty s rovnakým výsledkom (meranie z 30. 10. 2026).
Nastavenie platí len v testoch, produkčné nastavenia sa nemenia.
"""

import pytest
from django.test import override_settings

# MD5 hashuje nové heslá, PBKDF2 ostáva na overenie hashov, ktoré by si test pripravil vopred (napr. z ukážkových údajov).
FAST_PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
]


@pytest.fixture(scope="session", autouse=True)
def fast_password_hashers():
    """Nastaví rýchly hasher hesiel na celú reláciu testov (pokryje aj `setUpTestData` v triedach `TestCase`)."""
    with override_settings(PASSWORD_HASHERS=FAST_PASSWORD_HASHERS):
        yield
