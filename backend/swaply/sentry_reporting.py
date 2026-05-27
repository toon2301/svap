"""
Helpers for reporting backend exceptions to Sentry with full stack traces.

Production logging intentionally avoids exception messages and tracebacks in log
extra fields (PII risk). Sentry receives the live exception via capture_exception().
"""

from __future__ import annotations

import logging
from typing import Any

import sentry_sdk

logger = logging.getLogger(__name__)


def capture_reportable_exception(exception: BaseException, request: Any | None = None) -> str | None:
    """
    Report an exception to Sentry with request context (no sensitive message in logs).

    Returns the Sentry event id when the SDK accepts the event, else None.
    """
    with sentry_sdk.push_scope() as scope:
        if request is not None:
            method = str(getattr(request, "method", "") or "")
            path = str(getattr(request, "path", "") or "")
            if method:
                scope.set_tag("http.method", method)
            if path:
                scope.set_tag("http.route", path)

            user = getattr(request, "user", None)
            if user is not None and getattr(user, "is_authenticated", False):
                user_id = getattr(user, "id", None)
                if user_id is not None:
                    scope.set_user({"id": str(user_id)})

        return sentry_sdk.capture_exception(exception)


def log_handled_api_exception(
    exception: BaseException,
    request: Any | None,
    *,
    debug: bool,
    response_status: int | None = None,
    response_data: Any | None = None,
) -> None:
    """Structured log for handled API errors without sending a second Sentry log event."""
    log_extra = {
        "request_path": getattr(request, "path", "unknown") if request else "unknown",
        "request_method": getattr(request, "method", "unknown") if request else "unknown",
        "user_id": (
            getattr(request.user, "id", None)
            if request and hasattr(request, "user")
            else None
        ),
    }
    if response_status is not None:
        log_extra["response_status"] = response_status

    if debug:
        if response_data is not None:
            log_extra["response_data"] = response_data
        logger.error("API Error: %s", str(exception), extra=log_extra)
        return

    log_extra["exception_type"] = exception.__class__.__name__
    logger.info("API Error", extra=log_extra)
