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

    # Force fresh import/reload so env changes are applied
    sys.modules.pop("swaply.settings_production", None)
    mod = importlib.import_module("swaply.settings_production")
    return mod


def test_settings_production_missing_secret_key_raises(monkeypatch):
    with pytest.raises(ValueError):
        reload_settings_production(monkeypatch, {"SECRET_KEY": ""})


def test_settings_production_uses_env_secret_key(monkeypatch):
    mod = reload_settings_production(monkeypatch, {"SECRET_KEY": "prod-secret"})
    assert mod.SECRET_KEY == "prod-secret"
