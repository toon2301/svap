"""Poistka rýchleho hashera hesiel v testoch (`backend/conftest.py`).

Bez neho by sa celá backendová sada na Djangu 5.2 predĺžila približne deväťkrát (PBKDF2 s 1 000 000 iteráciami pri každom
vytvorení používateľa), čo by CI spomalilo bez toho, že by niečo zlyhalo. Test preto zlyhá, ak niekto fixture odstráni alebo
prekryje.
"""

from django.contrib.auth.hashers import (
    PBKDF2PasswordHasher,
    check_password,
    identify_hasher,
    make_password,
)


def test_new_passwords_use_the_fast_hasher():
    """Nové heslá sa v testoch hashujú cez MD5."""
    assert identify_hasher(make_password("StrongPass123!x")).algorithm == "md5"


def test_pbkdf2_hashes_are_still_verified():
    """Hash vo formáte PBKDF2 (napr. pripravený vopred) sa v testoch stále overí a zlé heslo sa odmietne."""
    encoded = PBKDF2PasswordHasher().encode(
        "StrongPass123!x", "testsalt", iterations=1000
    )

    assert check_password("StrongPass123!x", encoded)
    assert not check_password("iné heslo", encoded)
