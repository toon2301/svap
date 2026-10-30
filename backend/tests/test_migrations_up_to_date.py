"""Poistka migrácií: modely projektových aplikácií nemajú nezachytenú zmenu.

Pri povýšení Djanga (aj pri bežnej úprave modelu) sa môže zmeniť to, čo `makemigrations` považuje za zmenu modelu. Ak by
modely a migrácie nesedeli, na čistej databáze (nové nasadenie, lokálne prostredie, CI) by schéma vyzerala inak než v kóde.
Test preto spustí `makemigrations --check --dry-run` len pre aplikácie z tohto repozitára; knižnice (napr. `django_celery_beat`)
dodávajú vlastné migrácie a ich stav nie je vecou tohto projektu.
"""

from io import StringIO
from pathlib import Path

import pytest
from django.apps import apps
from django.conf import settings
from django.core.management import call_command

LIBRARY_DIRS = {"site-packages", "dist-packages"}
OUR_APPS = {"accounts", "messaging", "portfolio"}
LIBRARY_APPS = {
    "admin",
    "auth",
    "rest_framework",
    "authtoken",
    "django_celery_beat",
    "token_blacklist",
}


def project_app_labels() -> list[str]:
    """Štítky aplikácií, ktoré žijú v `backend/`; aplikácie z knižníc (`site-packages`) sa preskočia, aj keď je venv v `backend/`."""
    base_dir = Path(settings.BASE_DIR).resolve()
    labels = []
    for config in apps.get_app_configs():
        path = Path(config.path).resolve()
        if base_dir in path.parents and not LIBRARY_DIRS & set(path.parts):
            labels.append(config.label)
    return sorted(labels)


def test_project_apps_are_detected():
    """Pomocník nájde naše aplikácie a nezahrnie žiadnu knižnicu, inak by kontrola nižšie nič nekontrolovala."""
    labels = set(project_app_labels())

    assert OUR_APPS <= labels
    assert not LIBRARY_APPS & labels


@pytest.mark.django_db
def test_models_and_migrations_are_in_sync():
    """`makemigrations --check` pre projektové aplikácie nehlási žiadnu novú migráciu."""
    output = StringIO()

    try:
        call_command(
            "makemigrations",
            *project_app_labels(),
            check=True,
            dry_run=True,
            interactive=False,
            stdout=output,
        )
    except SystemExit:
        pytest.fail("Modely a migrácie nesedia, chýba migrácia:\n" + output.getvalue())
