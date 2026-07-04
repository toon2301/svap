import os

from celery import Celery
from celery.schedules import crontab


os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE", os.getenv("DJANGO_SETTINGS_MODULE", "swaply.settings")
)

app = Celery("swaply")
app.config_from_object("django.conf:settings", namespace="CELERY")

# Autodiscover Django app tasks + explicitly import project-level tasks.
# Note: `swaply` (project package) isn't a Django app in INSTALLED_APPS, so
# Celery wouldn't discover `swaply/tasks/*.py` automatically.
app.autodiscover_tasks()
app.conf.imports = tuple(
    set(
        getattr(app.conf, "imports", ())
        + (
            "swaply.tasks.offer_images",
            "swaply.tasks.portfolio_images",
            "swaply.tasks.webpush",
            "swaply.tasks.notifications",
        )
    )
)

# Periodické (beat) tasky. Celery beží v UTC (žiadny CELERY_TIMEZONE override),
# takže crontab(hour=3) = 03:00 UTC – nízka záťaž.
app.conf.beat_schedule = {
    "purge-old-notifications-daily": {
        "task": "swaply.tasks.notifications.purge_old_notifications_task",
        "schedule": crontab(hour=3, minute=0),
    },
}
