import pytest
from django.test import Client, override_settings


@pytest.mark.django_db
def test_migrate_api_forbidden_without_secret():
    c = Client()
    r = c.get('/api/admin/init-db/')
    assert r.status_code == 403


@pytest.mark.django_db
@override_settings(MIGRATE_SECRET='xyz', DEBUG=True)
def test_migrate_api_runs_with_secret(monkeypatch):
    from django.core.management import call_command
    called = {'ok': False}

    def fake_init_db():
        called['ok'] = True

    def fake_call_command(name, *args, **kwargs):
        if name == 'init_db':
            return fake_init_db()
        return None

    # Patch the symbol used inside the view module
    monkeypatch.setattr('swaply.migrate_api.call_command', fake_call_command)

    # Povoliť endpoint a GET + query secret aj mimo produkcie
    monkeypatch.setenv('MIGRATIONS_API_ENABLED', '1')

    c = Client()
    r = c.get('/api/admin/init-db/?secret=xyz')
    assert r.status_code == 200
    assert called['ok'] is True


@pytest.mark.django_db
@override_settings(MIGRATE_SECRET='xyz', DEBUG=True)
def test_migrate_api_handles_exception(monkeypatch):
    # Simuluj výnimku počas init_db príkazu
    def boom(*args, **kwargs):
        raise Exception('simulated failure')

    monkeypatch.setattr('swaply.migrate_api.call_command', boom)

    # Povoliť endpoint a GET + query secret aj mimo produkcie
    monkeypatch.setenv('MIGRATIONS_API_ENABLED', '1')

    c = Client()
    r = c.get('/api/admin/init-db/?secret=xyz')
    assert r.status_code == 500
    assert 'error' in r.json()


