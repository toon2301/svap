import os
import types
import importlib.util
from pathlib import Path
import random
import string
import pytest


def load_settings_with_env(monkeypatch, env_overrides: dict):
    for k, v in env_overrides.items():
        if v is None:
            monkeypatch.delenv(k, raising=False)
        else:
            monkeypatch.setenv(k, str(v))
    # Load settings.py into a fresh module name to avoid touching Django's loaded settings
    base_dir = Path(__file__).resolve().parents[1]
    settings_path = base_dir / 'settings.py'
    mod_name = 'temp_settings_' + ''.join(random.choices(string.ascii_lowercase, k=6))
    spec = importlib.util.spec_from_file_location(mod_name, settings_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def test_prod_csrf_and_redis_enforced(monkeypatch):
    mod = load_settings_with_env(monkeypatch, {
        'DEBUG': 'False',
        'SECRET_KEY': 'prod-secret',
        'REDIS_URL': 'redis://localhost:6379/0',
        'CACHE_KEY_PREFIX': 'swaply',
    })
    assert mod.DEBUG is False
    assert mod.CSRF_ENFORCE_API is True
    assert mod.SECRET_KEY == 'prod-secret'
    assert 'redis' in mod.CACHES['default']['BACKEND']
    assert mod.CACHES['default']['KEY_PREFIX'] == 'swaply'


def test_dev_locmem_and_rate_allow_paths(monkeypatch):
    mod = load_settings_with_env(monkeypatch, {
        'DEBUG': 'True',
        'REDIS_URL': None,
        'SECRET_KEY': 'dev-secret',
    })
    assert mod.DEBUG is True
    assert 'locmem' in mod.CACHES['default']['BACKEND']
    # In DEBUG block we set RATE_LIMIT_ALLOW_PATHS
    assert hasattr(mod, 'RATE_LIMIT_ALLOW_PATHS')


def test_database_url_sqlite_branch(monkeypatch):
    mod = load_settings_with_env(monkeypatch, {
        'DEBUG': 'True',
        'DATABASE_URL': 'sqlite:///C:/tmp/app.sqlite3',
        'SECRET_KEY': 'dev',
    })
    assert mod.DATABASES['default']['ENGINE'] == 'django.db.backends.sqlite3'


def test_missing_secret_key_raises_in_prod(monkeypatch):
    # Ak nie je SECRET_KEY a DEBUG=False, settings.py by mal vyhodiť ValueError
    with pytest.raises(ValueError):
        load_settings_with_env(monkeypatch, {
            'DEBUG': 'False',
            'SECRET_KEY': '',
        })
