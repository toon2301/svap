try:
    from .celery import app as celery_app  # type: ignore

    __all__ = ("celery_app",)
except Exception:
    # Celery is optional for local/dev tooling; production installs it.
    __all__ = ()
