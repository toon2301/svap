#!/usr/bin/env python3
"""
Script pre nastavenie email konfigurácie pre Swaply
"""

import os
from pathlib import Path


def create_env_file():
    """Vytvorí .env súbor s email konfiguráciou"""

    env_content = """# Email konfigurácia pre Swaply
# Vyplň skutočné údaje pre svoj email

# Email nastavenia (Gmail)
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-16-character-app-password
DEFAULT_FROM_EMAIL=your-email@gmail.com

# Google OAuth (voliteľné)
GOOGLE_OAUTH2_CLIENT_ID=
GOOGLE_OAUTH2_SECRET=

# Frontend URLs
FRONTEND_CALLBACK_URL=http://localhost:3000/auth/callback/
BACKEND_CALLBACK_URL=http://localhost:8000/api/oauth/google/callback/
FRONTEND_URL=http://localhost:3000

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://192.168.68.103:3000

# Hosts
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0,192.168.68.103
"""

    env_path = Path(__file__).parent / ".env"

    if env_path.exists():
        print("❌ .env súbor už existuje!")
        response = input("Chceš ho prepísať? (y/N): ")
        if response.lower() != "y":
            print("❌ Zrušené.")
            return False

    with open(env_path, "w", encoding="utf-8") as f:
        f.write(env_content)

    print("✅ .env súbor bol vytvorený!")
    print("\n📧 Ďalšie kroky:")
    print("1. Nastav Gmail App Password:")
    print("   - Choď na https://myaccount.google.com/apppasswords")
    print("   - Vytvor App Password pre 'Mail'")
    print("   - Skopíruj 16-znakové heslo")
    print("\n2. Uprav .env súbor:")
    print(f"   - Otvor súbor: {env_path}")
    print("   - Nahraď 'your-email@gmail.com' svojím emailom")
    print("   - Nahraď 'your-16-character-app-password' svojím App Password")

    return True


def run_migrations():
    """Spustí Django migrácie"""
    import subprocess
    import sys

    print("\n🗄️ Spúšťam Django migrácie...")
    try:
        subprocess.check_call([sys.executable, "manage.py", "migrate"])
        print("✅ Migrácie boli spustené!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Chyba pri migráciách: {e}")
        return False


def main():
    """Vytvorí .env s email konfiguráciou, spustí migrácie a vypíše ďalšie kroky."""
    print("🚀 Nastavenie email konfigurácie pre Swaply\n")

    # 1. Vytvor .env súbor
    if not create_env_file():
        return

    # 2. Spusti migrácie
    if not run_migrations():
        print("❌ Nepodarilo sa spustiť migrácie")
        return

    print("\n🎉 Nastavenie dokončené!")
    print("\n📋 Ďalšie kroky:")
    print("1. Uprav .env súbor s email údajmi")
    print("2. Spusti Django server: python manage.py runserver")


if __name__ == "__main__":
    main()
