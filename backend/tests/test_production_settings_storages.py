"""Poistka úložísk v produkčných nastaveniach.

Django 5.1 odstránilo nastavenia `DEFAULT_FILE_STORAGE` a `STATICFILES_STORAGE` a mlčky ich ignoruje. Keby zostali
v `swaply/settings_production.py`, aplikácia by bežala ďalej, no fotky (avatary, ponuky, správy) by sa ukladali na lokálny
disk servera namiesto S3 a po každom nasadení by zmizli. Test preto načíta produkčné nastavenia v samostatnom procese
(v testovacom procese sú načítané bežné nastavenia) a overí, že úložiská sú zadané cez `STORAGES`.

Ak produkčné nastavenia začnú vyžadovať ďalšiu premennú prostredia, doplň ju do `PRODUCTION_ENV`.
"""

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent
S3_BACKEND = "storages.backends.s3boto3.S3Boto3Storage"
PLAIN_STATIC_BACKEND = "django.contrib.staticfiles.storage.StaticFilesStorage"

# Minimálna výbava, ktorú `swaply.settings_production` vyžaduje; hodnoty sú vymyslené a nikam sa nepripájajú.
PRODUCTION_ENV = {
    "DJANGO_SETTINGS_MODULE": "swaply.settings_production",
    "SECRET_KEY": "test-only-" + "x" * 60,
    "MFA_ENCRYPTION_KEY": "test-only-mfa-key",
    "ALLOWED_HOSTS": "svaply.com,www.svaply.com,api.svaply.com,stunning-inspiration-svap.up.railway.app",
    "DATABASE_URL": "postgresql://user:password@localhost:5432/svaply",
    "CSRF_TRUSTED_ORIGINS": "https://svaply.com",
    "RESEND_API_KEY": "re_test_only",
    "DEFAULT_FROM_EMAIL": "noreply@svaply.com",
    "CAPTCHA_ENABLED": "False",
    "SAFESEARCH_ENABLED": "False",
}

PROBE = """
import json
import django
django.setup()
from django.conf import settings
print(json.dumps({
    "storages": {alias: cfg["BACKEND"] for alias, cfg in settings.STORAGES.items()},
    "legacy": [name for name in ("DEFAULT_FILE_STORAGE", "STATICFILES_STORAGE") if settings.is_overridden(name)],
}))
"""


@pytest.fixture(scope="module")
def storage_settings() -> dict:
    """Načíta produkčné nastavenia v novom procese a vráti úložiská a ostávajúce staré nastavenia."""
    result = subprocess.run(
        [sys.executable, "-c", PROBE],
        cwd=BACKEND_DIR,
        env={**os.environ, **PRODUCTION_ENV},
        capture_output=True,
        text=True,
        timeout=120,
    )
    message = f"Načítanie produkčných nastavení zlyhalo:\n{result.stderr[-1500:]}"
    assert result.returncode == 0, message
    return json.loads(result.stdout.strip().splitlines()[-1])


def test_production_media_go_to_s3(storage_settings):
    assert storage_settings["storages"]["default"] == S3_BACKEND


def test_production_static_files_use_plain_storage_for_whitenoise(storage_settings):
    assert storage_settings["storages"]["staticfiles"] == PLAIN_STATIC_BACKEND


def test_production_settings_do_not_use_removed_storage_settings(storage_settings):
    assert storage_settings["legacy"] == []
