#!/usr/bin/env python
"""Script na vytvorenie superuser účtu"""
import os
import sys
import django

# Nastavenie Django prostredia
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "swaply.settings")
django.setup()

from accounts.models import User


def create_superuser(username, email, password):
    """Vytvori alebo aktualizuje superuser ucet"""
    print(f"Vytvaranie/aktualizacia superuser uctu: {username} (<redacted>)...")

    # Skontroluj, ci uz existuje
    user = None
    if User.objects.filter(email=email).exists():
        user = User.objects.get(email=email)
        print(
            f"Pouzivatel s emailom '{email}' uz existuje. Aktualizujem na superuser..."
        )
    elif User.objects.filter(username=username).exists():
        user = User.objects.get(username=username)
        print(
            f"Pouzivatel s username '{username}' uz existuje. Aktualizujem na superuser..."
        )

    if user:
        # Aktualizacia existujuceho pouzivatela
        user.username = username
        user.email = email
        user.set_password(password)
        user.is_active = True
        user.is_staff = True
        user.is_superuser = True
        user.is_verified = True
        user.is_public = True
        user.save()
        print(
            f"\nOK: Pouzivatel '{username}' ({email}) bol aktualizovany na superuser!"
        )
        return user
    else:
        # Vytvorenie noveho superuser
        try:
            user = User.objects.create_superuser(
                username=username,
                email=email,
                password=password,
                is_active=True,
                is_staff=True,
                is_superuser=True,
                is_verified=True,
                is_public=True,
            )
            print(f"\nOK: Superuser '{username}' (<redacted>) bol uspesne vytvoreny!")
            return user
        except Exception as e:
            print(f"\nCHYBA pri vytvarani superuser: {e}")
            sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) == 4:
        username = sys.argv[1]
        email = sys.argv[2]
        password = sys.argv[3]
        create_superuser(username, email, password)
    else:
        print("Použitie: python create_superuser.py <username> <email> <password>")
        sys.exit(1)
