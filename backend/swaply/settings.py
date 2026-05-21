"""
Swaply Django settings (facade).

This file stays small (<500 lines) and keeps backwards compatibility with:
  DJANGO_SETTINGS_MODULE=swaply.settings

Actual settings are split into modules under `swaply/settings_split/`.
"""

import importlib
import os
import sys
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration


def _sentry_event_exception_types(event):
    for exc in (event.get("exception") or {}).get("values") or ():
        exc_type = exc.get("type")
        if exc_type:
            yield str(exc_type)

    extra_type = (event.get("extra") or {}).get("exception_type")
    if extra_type:
        yield str(extra_type)


def _sentry_text_values(event):
    logentry = event.get("logentry") or {}
    for key in ("message", "formatted"):
        value = logentry.get(key)
        if value:
            yield str(value)

    message = event.get("message")
    if message:
        yield str(message)

    for exc in (event.get("exception") or {}).get("values") or ():
        value = exc.get("value")
        if value:
            yield str(value)

    extra = event.get("extra") or {}
    for key in ("error", "message", "detail"):
        value = extra.get(key)
        if value:
            yield str(value)

    for breadcrumb in (event.get("breadcrumbs") or {}).get("values") or ():
        value = breadcrumb.get("message")
        if value:
            yield str(value)


def _is_safesearch_validation_event(event) -> bool:
    has_validation_error = any(
        exc_type.endswith("ValidationError")
        for exc_type in _sentry_event_exception_types(event)
    )
    if not has_validation_error:
        return False

    event_text = " ".join(_sentry_text_values(event)).lower()
    return "image rejected" in event_text or (
        "safesearch" in event_text and "rejected" in event_text
    )


def _sentry_before_send(event, hint):
    if _is_safesearch_validation_event(event):
        return None
    return event


def _safe_sentry_traces_sample_rate() -> float:
    raw_value = os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.1")
    try:
        value = float(raw_value)
    except (TypeError, ValueError):
        value = 0.1
    return max(0.0, min(1.0, value))


SENTRY_DSN = os.getenv("SENTRY_DSN")
if SENTRY_DSN:
    SENTRY_TRACES_SAMPLE_RATE = _safe_sentry_traces_sample_rate()
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[DjangoIntegration()],
        before_send=_sentry_before_send,
        send_default_pii=True,
        environment=os.getenv("SENTRY_ENVIRONMENT", "production"),
        traces_sample_rate=SENTRY_TRACES_SAMPLE_RATE,
    )

# Test helper `swaply/test/test_settings_runtime.py` načíta settings.py do nového (temp) názvu modulu,
# ale sub-moduly `swaply.settings_split.*` by inak ostali cache-ované v sys.modules.
# Keď settings importujeme mimo `swaply.settings`, sprav "soft reload" settings split modulov,
# aby env overrides v testoch fungovali deterministicky.
if __name__ != "swaply.settings":
    for key in list(sys.modules.keys()):
        if key.startswith("swaply.settings_split.") or key.startswith(
            "swaply.settings_parts."
        ):
            try:
                importlib.reload(sys.modules[key])
            except Exception as e:
                if isinstance(e, ValueError):
                    raise
                pass

from swaply.settings_split.base import *  # noqa
