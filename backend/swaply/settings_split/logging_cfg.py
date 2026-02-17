from .env import os
from .security import DEBUG
from .env import env_bool

# Logging configuration pre cloud (Railway)
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
            "style": "{",
        },
        "simple": {
            "format": "{levelname} {message}",
            "style": "{",
        },
        "json": {
            "format": '{"level": "%(levelname)s", "time": "%(asctime)s", "module": "%(module)s", "message": "%(message)s"}',
        },
    },
    "handlers": {
        "console": {
            "level": "DEBUG" if DEBUG else "INFO",
            "class": "logging.StreamHandler",
            "formatter": "simple",
        },
        "audit_console": {
            "level": "INFO",
            "class": "logging.StreamHandler",
            "formatter": "json",
        },
        "security_console": {
            "level": "WARNING",
            "class": "logging.StreamHandler",
            "formatter": "json",
        },
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": True,
        },
        "swaply": {
            "handlers": ["console"],
            "level": "DEBUG" if DEBUG else "INFO",
            "propagate": True,
        },
        "accounts": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": True,
        },
        "audit": {
            "handlers": ["audit_console"],
            "level": "INFO",
            "propagate": False,
        },
        "security": {
            "handlers": ["security_console"],
            "level": "WARNING",
            "propagate": False,
        },
    },
}

# On Railway/containers: log to stdout instead of files to avoid FS errors
if os.getenv("RAILWAY_ENVIRONMENT_ID") or os.getenv("LOG_TO_STDOUT", "0") == "1":
    LOGGING = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "simple": {
                "format": "{levelname} {message}",
                "style": "{",
            },
            "json": {
                "format": '{"level": "%(levelname)s", "time": "%(asctime)s", "module": "%(module)s", "message": "%(message)s"}',
            },
        },
        "handlers": {
            "console": {
                "level": "INFO",
                "class": "logging.StreamHandler",
                "formatter": "simple",
            },
            "console_json": {
                "level": "INFO",
                "class": "logging.StreamHandler",
                "formatter": "json",
            },
        },
        "loggers": {
            "django": {
                "handlers": ["console"],
                "level": "INFO",
                "propagate": True,
            },
            "swaply": {
                "handlers": ["console"],
                "level": "INFO",
                "propagate": True,
            },
            "accounts": {
                "handlers": ["console"],
                "level": "INFO",
                "propagate": True,
            },
            "audit": {
                "handlers": ["console_json"],
                "level": "INFO",
                "propagate": False,
            },
            "security": {
                "handlers": ["console_json"],
                "level": "WARNING",
                "propagate": False,
            },
        },
    }

# Monitoring bezpečnostných udalostí (feature flag)
AUDIT_LOGGING_ENABLED = env_bool("AUDIT_LOGGING_ENABLED", True)
