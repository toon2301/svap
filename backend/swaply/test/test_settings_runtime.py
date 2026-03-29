import os
import types
import importlib.util
from pathlib import Path
import random
import string
import pytest


_TEST_ENV_KEYS = {
    "ALLOWED_HOSTS",
    "BACKEND_ORIGIN",
    "CACHE_IGNORE_EXCEPTIONS",
    "CACHE_KEY_PREFIX",
    "CACHE_REDIS_MAX_CONNECTIONS",
    "CACHE_REDIS_URL",
    "CACHE_RETRY_ON_TIMEOUT",
    "CACHE_SOCKET_CONNECT_TIMEOUT",
    "CACHE_SOCKET_TIMEOUT",
    "CELERY_BROKER_URL",
    "CELERY_REDIS_URL",
    "CELERY_RESULT_BACKEND",
    "CHANNELS_REDIS_URL",
    "DATABASE_URL",
    "DB_DISABLE_SERVER_SIDE_CURSORS",
    "DEBUG",
    "DEFAULT_FROM_EMAIL",
    "EMAIL_BACKEND",
    "EMAIL_HOST",
    "EMAIL_HOST_PASSWORD",
    "EMAIL_HOST_USER",
    "EMAIL_PORT",
    "EMAIL_USE_TLS",
    "LOG_TO_STDOUT",
    "REDIS_URL",
    "SECRET_KEY",
}


def load_settings_with_env(monkeypatch, env_overrides: dict):
    for key in _TEST_ENV_KEYS:
        if key not in env_overrides:
            monkeypatch.delenv(key, raising=False)
    for k, v in env_overrides.items():
        if v is None:
            monkeypatch.delenv(k, raising=False)
        else:
            monkeypatch.setenv(k, str(v))
    # Load settings.py into a fresh module name to avoid touching Django's loaded settings
    base_dir = Path(__file__).resolve().parents[1]
    settings_path = base_dir / "settings.py"
    mod_name = "temp_settings_" + "".join(random.choices(string.ascii_lowercase, k=6))
    spec = importlib.util.spec_from_file_location(mod_name, settings_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def test_prod_csrf_and_redis_enforced(monkeypatch):
    mod = load_settings_with_env(
        monkeypatch,
        {
            "DEBUG": "False",
            "SECRET_KEY": "prod-secret",
            "ALLOWED_HOSTS": "svaply.com,www.svaply.com,api.svaply.com,stunning-inspiration-svap.up.railway.app,exemplary-tranquility-svap.up.railway.app",
            "EMAIL_HOST": "smtp.example.com",
            "EMAIL_PORT": "587",
            "EMAIL_HOST_USER": "smtp-user@example.com",
            "EMAIL_HOST_PASSWORD": "smtp-pass",
            "REDIS_URL": "redis://localhost:6379/0",
            "CACHE_KEY_PREFIX": "swaply",
        },
    )
    assert mod.DEBUG is False
    assert mod.CSRF_ENFORCE_API is True
    assert mod.SECRET_KEY == "prod-secret"
    assert "redis" in mod.CACHES["default"]["BACKEND"]
    assert mod.CACHES["default"]["KEY_PREFIX"] == "swaply"
    assert mod.CACHE_REDIS_URL == "redis://localhost:6379/0"
    assert mod.CACHES["default"]["LOCATION"] == "redis://localhost:6379/0"
    assert mod.CACHES["default"]["OPTIONS"]["SOCKET_TIMEOUT"] == 0.3
    assert mod.CACHES["default"]["OPTIONS"]["SOCKET_CONNECT_TIMEOUT"] == 0.2
    assert mod.CACHES["default"]["OPTIONS"]["IGNORE_EXCEPTIONS"] is True
    assert (
        mod.CACHES["default"]["OPTIONS"]["CONNECTION_POOL_KWARGS"]["retry_on_timeout"]
        is False
    )


def test_cache_redis_url_takes_precedence_and_applies_cache_options(monkeypatch):
    mod = load_settings_with_env(
        monkeypatch,
        {
            "DEBUG": "False",
            "SECRET_KEY": "prod-secret",
            "ALLOWED_HOSTS": "svaply.com,www.svaply.com,api.svaply.com,stunning-inspiration-svap.up.railway.app,exemplary-tranquility-svap.up.railway.app",
            "EMAIL_HOST": "smtp.example.com",
            "EMAIL_PORT": "587",
            "EMAIL_HOST_USER": "smtp-user@example.com",
            "EMAIL_HOST_PASSWORD": "smtp-pass",
            "REDIS_URL": "redis://shared.example.com:6379/0",
            "CACHE_REDIS_URL": "redis://cache.example.com:6379/1",
            "CACHE_KEY_PREFIX": "swaply-auth",
            "CACHE_SOCKET_TIMEOUT": "0.45",
            "CACHE_SOCKET_CONNECT_TIMEOUT": "0.15",
            "CACHE_IGNORE_EXCEPTIONS": "0",
            "CACHE_RETRY_ON_TIMEOUT": "1",
            "CACHE_REDIS_MAX_CONNECTIONS": "123",
        },
    )
    assert mod.CACHE_REDIS_URL == "redis://cache.example.com:6379/1"
    assert mod.CACHES["default"]["LOCATION"] == "redis://cache.example.com:6379/1"
    assert mod.CACHES["default"]["KEY_PREFIX"] == "swaply-auth"
    assert mod.CACHES["default"]["OPTIONS"]["SOCKET_TIMEOUT"] == 0.45
    assert mod.CACHES["default"]["OPTIONS"]["SOCKET_CONNECT_TIMEOUT"] == 0.15
    assert mod.CACHES["default"]["OPTIONS"]["IGNORE_EXCEPTIONS"] is False
    assert (
        mod.CACHES["default"]["OPTIONS"]["CONNECTION_POOL_KWARGS"]["retry_on_timeout"]
        is True
    )
    assert (
        mod.CACHES["default"]["OPTIONS"]["CONNECTION_POOL_KWARGS"]["max_connections"]
        == 123
    )


def test_postgres_can_disable_server_side_cursors_for_transaction_pooling(monkeypatch):
    mod = load_settings_with_env(
        monkeypatch,
        {
            "DEBUG": "False",
            "SECRET_KEY": "prod-secret",
            "ALLOWED_HOSTS": "svaply.com,www.svaply.com,api.svaply.com,stunning-inspiration-svap.up.railway.app,exemplary-tranquility-svap.up.railway.app",
            "EMAIL_HOST": "smtp.example.com",
            "EMAIL_PORT": "587",
            "EMAIL_HOST_USER": "smtp-user@example.com",
            "EMAIL_HOST_PASSWORD": "smtp-pass",
            "DATABASE_URL": "postgresql://user:pass@pgbouncer.railway.internal:6432/railway",
            "DB_DISABLE_SERVER_SIDE_CURSORS": "1",
        },
    )
    assert mod.DATABASES["default"]["ENGINE"] == "django.db.backends.postgresql"
    assert mod.DATABASES["default"]["DISABLE_SERVER_SIDE_CURSORS"] is True


def test_channels_redis_url_takes_precedence_over_shared_redis(monkeypatch):
    mod = load_settings_with_env(
        monkeypatch,
        {
            "DEBUG": "True",
            "SECRET_KEY": "dev-secret",
            "REDIS_URL": "redis://shared.example.com:6379/0",
            "CHANNELS_REDIS_URL": "redis://channels.example.com:6379/2",
        },
    )
    assert mod.CHANNELS_REDIS_URL == "redis://channels.example.com:6379/2"
    assert mod.CHANNEL_LAYERS["default"]["CONFIG"]["hosts"] == [
        "redis://channels.example.com:6379/2"
    ]


def test_celery_redis_url_takes_precedence_before_shared_redis(monkeypatch):
    mod = load_settings_with_env(
        monkeypatch,
        {
            "DEBUG": "True",
            "SECRET_KEY": "dev-secret",
            "REDIS_URL": "redis://shared.example.com:6379/0",
            "CELERY_REDIS_URL": "redis://celery.example.com:6379/3",
        },
    )
    assert mod.CELERY_REDIS_URL == "redis://celery.example.com:6379/3"
    assert mod.CELERY_BROKER_URL == "redis://celery.example.com:6379/3"
    assert mod.CELERY_RESULT_BACKEND == "redis://celery.example.com:6379/3"


def test_dev_locmem_and_rate_allow_paths(monkeypatch):
    mod = load_settings_with_env(
        monkeypatch,
        {
            "DEBUG": "True",
            "REDIS_URL": None,
            "SECRET_KEY": "dev-secret",
        },
    )
    assert mod.DEBUG is True
    assert "locmem" in mod.CACHES["default"]["BACKEND"]
    # In DEBUG block we set RATE_LIMIT_ALLOW_PATHS
    assert hasattr(mod, "RATE_LIMIT_ALLOW_PATHS")


def test_database_url_sqlite_branch(monkeypatch):
    mod = load_settings_with_env(
        monkeypatch,
        {
            "DEBUG": "True",
            "DATABASE_URL": "sqlite:///C:/tmp/app.sqlite3",
            "SECRET_KEY": "dev",
        },
    )
    assert mod.DATABASES["default"]["ENGINE"] == "django.db.backends.sqlite3"


def test_allowed_hosts_from_backend_origin(monkeypatch):
    mod = load_settings_with_env(
        monkeypatch,
        {
            "DEBUG": "True",
            "SECRET_KEY": "dev",
            "BACKEND_ORIGIN": "https://api.example.com",
        },
    )
    assert "api.example.com" in mod.ALLOWED_HOSTS


def test_logging_stdout_mode(monkeypatch):
    mod = load_settings_with_env(
        monkeypatch,
        {
            "DEBUG": "False",
            "SECRET_KEY": "prod",
            "ALLOWED_HOSTS": "svaply.com,www.svaply.com,api.svaply.com,stunning-inspiration-svap.up.railway.app,exemplary-tranquility-svap.up.railway.app",
            "EMAIL_HOST": "smtp.example.com",
            "EMAIL_PORT": "587",
            "EMAIL_HOST_USER": "smtp-user@example.com",
            "EMAIL_HOST_PASSWORD": "smtp-pass",
            "LOG_TO_STDOUT": "1",
        },
    )
    # expect logger config switched to stdout simple/json handlers
    assert "console_json" in mod.LOGGING.get("handlers", {})


def test_prod_adds_runtime_railway_public_domain_to_allowed_hosts(monkeypatch):
    mod = load_settings_with_env(
        monkeypatch,
        {
            "DEBUG": "False",
            "SECRET_KEY": "prod-secret",
            "ALLOWED_HOSTS": "svaply.com,www.svaply.com,api.svaply.com,stunning-inspiration-svap.up.railway.app,exemplary-tranquility-svap.up.railway.app",
            "RAILWAY_PUBLIC_DOMAIN": "backend-http-svap.up.railway.app",
            "EMAIL_HOST": "smtp.example.com",
            "EMAIL_PORT": "587",
            "EMAIL_HOST_USER": "smtp-user@example.com",
            "EMAIL_HOST_PASSWORD": "smtp-pass",
        },
    )
    assert "backend-http-svap.up.railway.app" in mod.ALLOWED_HOSTS


def test_missing_secret_key_raises_in_prod(monkeypatch):
    # Ak nie je SECRET_KEY a DEBUG=False, settings.py by mal vyhodiť ValueError
    with pytest.raises(ValueError):
        load_settings_with_env(
            monkeypatch,
            {
                "DEBUG": "False",
                "SECRET_KEY": "",
            },
        )


def test_missing_allowed_hosts_raises_in_prod(monkeypatch):
    with pytest.raises(ValueError):
        load_settings_with_env(
            monkeypatch,
            {
                "DEBUG": "False",
                "SECRET_KEY": "prod",
                "ALLOWED_HOSTS": "",
            },
        )


def test_missing_email_envs_raises_in_prod(monkeypatch):
    with pytest.raises(ValueError):
        load_settings_with_env(
            monkeypatch,
            {
                "DEBUG": "False",
                "SECRET_KEY": "prod",
                "ALLOWED_HOSTS": "svaply.com,www.svaply.com,api.svaply.com,stunning-inspiration-svap.up.railway.app,exemplary-tranquility-svap.up.railway.app",
                "EMAIL_HOST": "",
                "EMAIL_PORT": "",
                "EMAIL_HOST_USER": "",
                "EMAIL_HOST_PASSWORD": "",
            },
        )
