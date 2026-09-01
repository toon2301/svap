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
            "accounts.offer_watch_tasks",
            "accounts.offer_watch_notification_tasks",
            "accounts.password_reset_tasks",
            "swaply.tasks.offer_images",
            "swaply.tasks.portfolio_images",
            "swaply.tasks.webpush",
            "swaply.tasks.notifications",
            "swaply.tasks.profile_visits",
            "swaply.tasks.feed_images",
        )
    )
)

# Periodické (beat) tasky. Celery beží v UTC (žiadny CELERY_TIMEZONE override),
# takže crontab(hour=3) = 03:00 UTC – nízka záťaž.
app.conf.beat_schedule = {
    "recover-pending-offer-watch-notifications": {
        "task": (
            "accounts.offer_watch_notification_tasks."
            "recover_pending_offer_watch_notifications_task"
        ),
        "schedule": crontab(minute="*/5"),
    },
    "recover-pending-offer-watch-matches": {
        "task": (
            "accounts.offer_watch_tasks."
            "recover_pending_offer_watch_matches_task"
        ),
        "schedule": crontab(minute="*/5"),
    },
    "recover-pending-bug-report-notifications": {
        "task": "accounts.tasks.recover_pending_bug_report_notifications_task",
        "schedule": crontab(minute="*/5"),
    },
    "purge-old-bug-reports-daily": {
        "task": "accounts.tasks.purge_old_bug_reports_task",
        "schedule": crontab(hour=3, minute=30),
    },
    "purge-old-notifications-daily": {
        "task": "swaply.tasks.notifications.purge_old_notifications_task",
        "schedule": crontab(hour=3, minute=0),
    },
    # Iný minute než notifikácie, aby dve nočné údržby nebežali naraz.
    "purge-old-profile-visits-daily": {
        "task": "swaply.tasks.profile_visits.purge_old_profile_visits_task",
        "schedule": crontab(hour=3, minute=15),
    },
}
