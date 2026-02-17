import pytest


def reload_settings_production(monkeypatch, env_overrides: dict):
    import importlib
    import sys

    for k, v in env_overrides.items():
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
