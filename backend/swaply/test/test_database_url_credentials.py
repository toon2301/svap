"""Exercise database URL credentials without connecting to a database."""

import os
from copy import deepcopy
from unittest.mock import patch
from urllib.parse import quote

import pytest
from django.db.backends.base.base import BaseDatabaseWrapper

from swaply.test.test_settings_production_secret_key import reload_settings_production
from swaply.test.test_settings_runtime import load_settings_with_env


@pytest.fixture(autouse=True)
def forbid_database_connections(monkeypatch):
    """Fail immediately if a settings import attempts a database connection."""

    def reject_connection(*args, **kwargs):
        """Keep configuration tests independent of database services and data."""
        raise AssertionError("Database URL parsing must not connect to a database.")

    monkeypatch.setattr(BaseDatabaseWrapper, "connect", reject_connection)


@pytest.fixture(params=["split", "production"])
def load_database_settings(request, monkeypatch):
    """Load both real settings paths with only synthetic environment values."""

    def load(database_url):
        """Return an isolated connection configuration for a synthetic URL."""
        test_env = {
            "DEBUG": "True",
            "SECRET_KEY": "database-url-unit-test-secret",
            "DATABASE_URL": database_url,
            "DB_STATEMENT_TIMEOUT_MS": "0",
            "PYTHON_DOTENV_DISABLED": "1",
        }
        with patch.dict(os.environ, {}, clear=True), monkeypatch.context() as isolated:
            if request.param == "production":
                module = reload_settings_production(isolated, test_env)
            else:
                module = load_settings_with_env(isolated, test_env)
            return deepcopy(module.DATABASES["default"])

    return load


@pytest.fixture(params=["postgres", "postgresql"])
def scheme(request):
    """Exercise both PostgreSQL URL schemes supported by the application."""
    return request.param


def assert_connection_settings_unchanged(database):
    """Check that decoding credentials does not alter routing or DB options."""
    assert database["ENGINE"] == "django.db.backends.postgresql"
    assert database["NAME"] == "test%2Fdatabase"
    assert database["HOST"] == "db.example.invalid"
    assert database["PORT"] == "6432"
    assert database["CONN_MAX_AGE"] == 300
    assert database["CONN_HEALTH_CHECKS"] is True
    assert database["OPTIONS"] == {
        "connect_timeout": 5,
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
    }


@pytest.mark.parametrize(
    ("username", "password"),
    [
        pytest.param("test-user", "test-password", id="plain"),
        pytest.param("test/user", "test/password", id="slash"),
        pytest.param("test=user", "test=password", id="equals"),
        pytest.param("test%user", "test%password", id="percent"),
        pytest.param("test@user", "test@password", id="at"),
        pytest.param("user/=%@", "password/=%@", id="combined"),
        pytest.param("user%2F", "password%40", id="decode-once"),
        pytest.param("user+name", "password+suffix", id="encoded-plus"),
        pytest.param("používateľ", "heslo-ľščť", id="unicode"),
    ],
)
def test_database_url_decodes_credentials(
    load_database_settings, scheme, username, password
):
    """Decode escaped credentials exactly once in both settings paths."""
    database_url = (
        f"{scheme}://{quote(username, safe='')}:{quote(password, safe='')}"
        "@db.example.invalid:6432/test%2Fdatabase"
    )

    database = load_database_settings(database_url)

    assert database["USER"] == username
    assert database["PASSWORD"] == password
    assert_connection_settings_unchanged(database)


def test_database_url_preserves_literal_plus(load_database_settings, scheme):
    """Treat literal plus signs as credentials, not form-encoded spaces."""
    database = load_database_settings(
        f"{scheme}://user+name:password+suffix"
        "@db.example.invalid:6432/test%2Fdatabase"
    )

    assert database["USER"] == "user+name"
    assert database["PASSWORD"] == "password+suffix"
    assert_connection_settings_unchanged(database)


@pytest.mark.parametrize(
    ("userinfo", "username", "password"),
    [
        pytest.param("", "", "", id="missing-both"),
        pytest.param("test-user@", "test-user", "", id="missing-password"),
        pytest.param("test-user:@", "test-user", "", id="empty-password"),
        pytest.param(":test-password@", "", "test-password", id="empty-username"),
        pytest.param(":@", "", "", id="empty-both"),
    ],
)
def test_database_url_preserves_empty_credentials(
    load_database_settings, scheme, userinfo, username, password
):
    """Keep the existing empty-string fallback for absent credential parts."""
    database = load_database_settings(
        f"{scheme}://{userinfo}db.example.invalid:6432/test%2Fdatabase"
    )

    assert database["USER"] == username
    assert database["PASSWORD"] == password
    assert_connection_settings_unchanged(database)
