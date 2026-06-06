"""
Swaply Django settings (facade).

This file stays small (<500 lines) and keeps backwards compatibility with:
  DJANGO_SETTINGS_MODULE=swaply.settings

Actual settings are split into modules under `swaply/settings_split/`.
"""

import importlib
import os
import re
import sys
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration

_SENTRY_MAX_TRACES_SAMPLE_RATE = 0.2
_SENSITIVE_SENTRY_HEADERS = {
    "authorization",
    "cookie",
    "set-cookie",
    "x-csrftoken",
    "x-csrf-token",
}
_SENSITIVE_SENTRY_CACHE_REDIS_SPAN_DATA_KEYS = {
    "cache.key",
    "db.query.text",
    "db.redis.key",
    "db.statement",
    "redis.commands",
    "redis.key",
}
_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


def _sentry_release() -> str | None:
    for key in ("SENTRY_RELEASE", "RAILWAY_GIT_COMMIT_SHA", "VERCEL_GIT_COMMIT_SHA"):
        value = os.getenv(key)
        if value and value.strip():
            return value.strip()
    return None


def _strip_query(value: str) -> str:
    return str(value or "").split("?", 1)[0]


def _normalize_sentry_path(value: str) -> str:
    raw = _strip_query(value).strip()
    if not raw:
        return raw

    try:
        from urllib.parse import urlparse

        parsed = urlparse(raw)
        path = parsed.path if parsed.scheme and parsed.netloc else raw
    except Exception:
        path = raw

    if not path.startswith("/"):
        path = f"/{path}"

    parts = []
    for segment in path.split("/"):
        if not segment:
            parts.append(segment)
            continue
        if segment.isdigit() or _UUID_RE.match(segment):
            parts.append(":id")
        else:
            parts.append(segment)
    return "/".join(parts) or "/"


def _sanitize_sentry_request(request):
    if not isinstance(request, dict):
        return

    url = request.get("url")
    if isinstance(url, str):
        request["url"] = _normalize_sentry_path(url)

    request.pop("query_string", None)
    request.pop("cookies", None)
    request.pop("data", None)

    headers = request.get("headers")
    if isinstance(headers, dict):
        for key in list(headers.keys()):
            if str(key).lower() in _SENSITIVE_SENTRY_HEADERS:
                headers.pop(key, None)


def _sentry_span_container_value(span: dict, key: str):
    normalized_key = key.lower()
    for container_name in ("data", "tags", "attributes"):
        container = span.get(container_name)
        if not isinstance(container, dict):
            continue
        for item_key, item_value in container.items():
            if str(item_key).lower() == normalized_key:
                return item_value
    return None


def _sentry_redis_command_name(value) -> str:
    command_parts = str(value or "").strip().split()
    return command_parts[0] if command_parts else ""


def _safe_sentry_redis_command_name(value) -> str:
    command_name = _sentry_redis_command_name(value).lower()
    return re.sub(r"[^a-z0-9_.-]+", "", command_name)


def _sentry_redis_command_name_for_data(value) -> str:
    command_name = _sentry_redis_command_name(value)
    return re.sub(r"[^A-Za-z0-9_.-]+", "", command_name)


def _is_sentry_cache_or_redis_span(span: dict) -> bool:
    op = str(span.get("op") or "").lower()
    if op.startswith("cache") or op.startswith("redis") or "redis" in op:
        return True

    for container_name in ("data", "tags", "attributes"):
        container = span.get(container_name)
        if not isinstance(container, dict):
            continue
        for key, value in container.items():
            key_text = str(key).lower()
            value_text = str(value).lower()
            if "redis" in key_text or "redis" in value_text:
                return True
            if key_text.startswith("cache."):
                return True
    return False


def _safe_sentry_cache_or_redis_description(span: dict) -> str:
    op = str(span.get("op") or "").strip().lower()
    if op.startswith("cache"):
        return op

    command = (
        _sentry_span_container_value(span, "redis.command")
        or _sentry_span_container_value(span, "db.operation")
        or _sentry_span_container_value(span, "db.operation.name")
    )
    if command:
        safe_command = _safe_sentry_redis_command_name(command)
        if safe_command:
            return f"redis.{safe_command}"

    if "redis" in op:
        return "redis"
    return "cache"


def _remove_sensitive_sentry_span_data(container):
    if not isinstance(container, dict):
        return

    for key in list(container.keys()):
        normalized = str(key).lower()
        if normalized == "redis.command":
            safe_command = _sentry_redis_command_name_for_data(container[key])
            if safe_command:
                container[key] = safe_command
            else:
                container.pop(key, None)
            continue

        is_sensitive_cache_key = "key" in normalized and (
            "cache" in normalized or "redis" in normalized
        )
        if (
            normalized in _SENSITIVE_SENTRY_CACHE_REDIS_SPAN_DATA_KEYS
            or is_sensitive_cache_key
        ):
            container.pop(key, None)


def _sanitize_sentry_cache_or_redis_span(span: dict) -> None:
    if not _is_sentry_cache_or_redis_span(span):
        return

    safe_description = _safe_sentry_cache_or_redis_description(span)
    span["description"] = safe_description
    if isinstance(span.get("name"), str):
        span["name"] = safe_description

    _remove_sensitive_sentry_span_data(span)
    for container_name in ("data", "tags", "attributes"):
        _remove_sensitive_sentry_span_data(span.get(container_name))


def _sentry_before_send_transaction(event, hint):
    transaction = event.get("transaction")
    if isinstance(transaction, str):
        event["transaction"] = _normalize_sentry_path(transaction)

    _sanitize_sentry_request(event.get("request"))

    for span in event.get("spans") or []:
        if not isinstance(span, dict):
            continue
        op = str(span.get("op") or "")
        description = span.get("description")
        if _is_sentry_cache_or_redis_span(span):
            _sanitize_sentry_cache_or_redis_span(span)
        elif isinstance(description, str) and op.startswith("http"):
            span["description"] = _normalize_sentry_path(description)

    return event


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
    return max(0.0, min(_SENTRY_MAX_TRACES_SAMPLE_RATE, value))


SENTRY_DSN = os.getenv("SENTRY_DSN")
if SENTRY_DSN:
    SENTRY_TRACES_SAMPLE_RATE = _safe_sentry_traces_sample_rate()
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[DjangoIntegration(cache_spans=True)],
        before_send=_sentry_before_send,
        before_send_transaction=_sentry_before_send_transaction,
        send_default_pii=False,
        environment=os.getenv("SENTRY_ENVIRONMENT", "production"),
        release=_sentry_release(),
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
