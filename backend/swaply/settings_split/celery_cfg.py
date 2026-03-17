import os

from .security import DEBUG


# Celery (Redis broker). For production, set REDIS_URL (Railway Redis plugin).
REDIS_URL = os.getenv("REDIS_URL", None) or "redis://localhost:6379/0"

CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", REDIS_URL)
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", REDIS_URL)
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"

# Safer defaults for production: don't block web on task failures.
CELERY_TASK_ALWAYS_EAGER = os.getenv("CELERY_TASK_ALWAYS_EAGER", "0") in ("1", "true", "yes", "on")
CELERY_TASK_EAGER_PROPAGATES = bool(DEBUG)

