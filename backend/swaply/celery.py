import os

from celery import Celery


os.environ.setdefault("DJANGO_SETTINGS_MODULE", os.getenv("DJANGO_SETTINGS_MODULE", "swaply.settings"))

app = Celery("swaply")
app.config_from_object("django.conf:settings", namespace="CELERY")

# Autodiscover Django app tasks + explicitly import project-level tasks.
# Note: `swaply` (project package) isn't a Django app in INSTALLED_APPS, so
# Celery wouldn't discover `swaply/tasks/*.py` automatically.
app.autodiscover_tasks()
app.conf.imports = tuple(set(getattr(app.conf, "imports", ()) + ("swaply.tasks.offer_images",)))

