import pytest


def _baseline_prod_env() -> dict:
    """Kompletný platný produkčný env, aby sa settings_production dal naimportovať.

    Test je tak sebestačný a deterministický – nezávisí od ambientných premenných
    CI/lokálneho stroja. Jednotlivé testy si cez `env_overrides` prepíšu len to,
    čo overujú.
    """
    return {
        "SECRET_KEY": "prod-secret",
        "MFA_ENCRYPTION_KEY": "test-mfa-encryption-key",
        # Vypnuté integrácie, ktoré by inak pri importe vyžadovali reálne kredenciály.
        "CAPTCHA_ENABLED": "False",
        # Dummy hodnoty (nie reálne kľúče): produkčný check zakazuje prázdne a
        # default "test-secret-key"/"test-site-key" hodnoty, tieto ním prejdú
        # aj keby override zapol CAPTCHA_ENABLED.
        "CAPTCHA_SECRET_KEY": "test-captcha-key-for-ci",
        "CAPTCHA_SITE_KEY": "test-captcha-site-key-for-ci",
        # Neťahaj lokálny backend/.env pri re-importe settings reťazca — test musí
        # bežať identicky na CI (bez .env) aj na stroji s reálnym .env.
        "PYTHON_DOTENV_DISABLED": "1",
        "SAFESEARCH_ENABLED": "False",
        "ALLOWED_HOSTS": (
            "svaply.com,www.svaply.com,api.svaply.com,"
            "stunning-inspiration-svap.up.railway.app"
        ),
        "DATABASE_URL": "postgres://user:pass@localhost:5432/swaply",
        "RESEND_API_KEY": "test-resend-key",
        "DEFAULT_FROM_EMAIL": "noreply@svaply.com",
    }


def reload_settings_production(monkeypatch, env_overrides: dict):
    import importlib
    import sys

    env = {**_baseline_prod_env(), **env_overrides}
    for k, v in env.items():
        if v is None:
            monkeypatch.delenv(k, raising=False)
        else:
            monkeypatch.setenv(k, str(v))

    # settings_production robí `from .settings import *` — CAPTCHA_* a spol. by
    # inak ostali cache-ované z prvého importu session (s ambientným env, na CI
    # teda s default "test-secret-key"). Zahoď celý settings reťazec, nech sa
    # re-importuje pod monkeypatchnutým env. monkeypatch.delitem po teste vráti
    # pôvodné moduly do sys.modules, takže ostatné testy nič nepocítia.
    for name in list(sys.modules):
        if (
            name in ("swaply.settings", "swaply.settings_production")
            or name.startswith("swaply.settings_split")
            or name.startswith("swaply.settings_parts")
        ):
            monkeypatch.delitem(sys.modules, name, raising=False)

    mod = importlib.import_module("swaply.settings_production")
    return mod


def test_settings_production_missing_secret_key_raises(monkeypatch):
    with pytest.raises(ValueError, match="SECRET_KEY must be set"):
        reload_settings_production(monkeypatch, {"SECRET_KEY": ""})


def test_settings_production_uses_env_secret_key(monkeypatch):
    mod = reload_settings_production(monkeypatch, {"SECRET_KEY": "prod-secret"})
    assert mod.SECRET_KEY == "prod-secret"
