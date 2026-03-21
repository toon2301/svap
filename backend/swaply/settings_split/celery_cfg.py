import os

from .security import DEBUG


# Celery defaults to its dedicated Redis URL and falls back to the legacy shared REDIS_URL.
REDIS_URL = os.getenv("REDIS_URL", None)
CELERY_REDIS_URL = os.getenv("CELERY_REDIS_URL", None) or REDIS_URL or "redis://localhost:6379/0"

CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", CELERY_REDIS_URL)
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", CELERY_REDIS_URL)
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"

# Safer defaults for production: don't block web on task failures.
CELERY_TASK_ALWAYS_EAGER = os.getenv("CELERY_TASK_ALWAYS_EAGER", "0") in ("1", "true", "yes", "on")
CELERY_TASK_EAGER_PROPAGATES = bool(DEBUG)
