"""
Audit logging systém pre Swaply
"""

import logging
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db import models
from django.conf import settings
import json

User = get_user_model()
audit_logger = logging.getLogger("audit")

_PII_DETAIL_KEYS = {
    "email",
    "user_email",
    "phone",
    "contact_email",
    "ico",
    "birth_date",
    "gender",
    "access",
    "refresh",
    "access_token",
    "refresh_token",
    "password",
}


def _sanitize_details(details):
    """
    In production (DEBUG=False) strip PII/secret-like fields from audit details.
    In DEBUG keep details as-is to aid development.
    """
    if getattr(settings, "DEBUG", False):
        return details or {}

    if not isinstance(details, dict):
        return {}

    out = {}
    for k, v in details.items():
        if k in _PII_DETAIL_KEYS:
            continue
        if isinstance(v, dict):
            out[k] = _sanitize_details(v)
        elif isinstance(v, list):
            sanitized_list = []
            for item in v:
                sanitized_list.append(_sanitize_details(item) if isinstance(item, dict) else item)
            out[k] = sanitized_list
        elif isinstance(v, str) and len(v) > 200:
            out[k] = v[:200] + "..."
        else:
            out[k] = v
    return out


def _build_audit_record(*, user=None, details=None, ip_address=None, user_agent=None):
    """
    Build a structured audit record.

    - In production (DEBUG=False) do not include PII (email) in the record.
    - IP and user_agent are allowed ONLY inside the audit system (this record).
    """
    is_debug = getattr(settings, "DEBUG", False)
    record = {
        "user_id": user.id if user and getattr(user, "is_authenticated", False) else None,
        # Preserve key for backwards compatibility; in production keep it None (no PII).
        "user_email": (
            user.email
            if getattr(settings, "DEBUG", False)
            and user
            and getattr(user, "is_authenticated", False)
            else None
        ),
        "details": _sanitize_details(details),
        # IP/UA are stored only inside audit records (never in app logs).
        "ip_address": (ip_address or "").strip() or None,
        "user_agent": (user_agent or "").strip() or None,
        "timestamp": timezone.now().isoformat(),
    }
    if not is_debug:
        # Ensure no PII sneaks in via user_email in production.
        record["user_email"] = None
    return record


def _emit_audit_json(level: str, record: dict) -> None:
    """
    Emit a single JSON audit line. This is intentionally kept within the 'audit' logger,
    so sensitive incident-response metadata (ip/user_agent) does not leak to application logs.
    """
    # Keep output stable & parseable.
    payload = json.dumps(record, ensure_ascii=False, separators=(",", ":"), default=str)
    if level == "warning":
        audit_logger.warning(payload)
    else:
        audit_logger.info(payload)


class AuditLog:
    """
    Trieda pre audit logovanie
    """

    @staticmethod
    def log_user_action(user, action, details=None, ip_address=None, user_agent=None):
        """
        Loguje akcie používateľa
        """
        # Skontroluj, či je audit logging povolený
        if not getattr(settings, "AUDIT_LOGGING_ENABLED", True):
            return

        record = _build_audit_record(
            user=user, details=details, ip_address=ip_address, user_agent=user_agent
        )
        record.update({"action": action, "log_type": "user_action"})
        _emit_audit_json("info", record)

    @staticmethod
    def log_security_event(
        event_type, details=None, ip_address=None, user_agent=None, user=None
    ):
        """
        Loguje bezpečnostné udalosti
        """
        record = _build_audit_record(
            user=user, details=details, ip_address=ip_address, user_agent=user_agent
        )
        record.update({"event_type": event_type, "log_type": "security_event"})
        _emit_audit_json("warning", record)

    @staticmethod
    def log_api_access(
        endpoint, method, user=None, ip_address=None, user_agent=None, status_code=None
    ):
        """
        Loguje prístup k API endpointom
        """
        record = _build_audit_record(
            user=user, details=None, ip_address=ip_address, user_agent=user_agent
        )
        record.update(
            {
                "endpoint": endpoint,
                "method": method,
                "status_code": status_code,
                "log_type": "api_access",
            }
        )
        _emit_audit_json("info", record)

    @staticmethod
    def log_data_change(
        model_name, object_id, action, user=None, changes=None, ip_address=None
    ):
        """
        Loguje zmeny dát
        """
        record = _build_audit_record(
            user=user, details={"changes": changes or {}}, ip_address=ip_address, user_agent=None
        )
        # keep backwards compatible "changes" key
        record["changes"] = record["details"].get("changes", {})
        record.update(
            {
                "model_name": model_name,
                "object_id": object_id,
                "action": action,
                "log_type": "data_change",
            }
        )
        _emit_audit_json("info", record)


def audit_user_action(action, details=None):
    """
    Decorator pre audit logovanie používateľských akcií
    """

    def decorator(view_func):
        def wrapper(request, *args, **kwargs):
            # Získaj informácie o requeste
            ip_address = request.META.get("REMOTE_ADDR")
            user_agent = request.META.get("HTTP_USER_AGENT")
            user = getattr(request, "user", None)

            # Loguj akciu
            AuditLog.log_user_action(
                user=user,
                action=action,
                details=details,
                ip_address=ip_address,
                user_agent=user_agent,
            )

            return view_func(request, *args, **kwargs)

        return wrapper

    return decorator


def audit_api_access(endpoint_name=None):
    """
    Decorator pre audit logovanie API prístupov
    """

    def decorator(view_func):
        def wrapper(request, *args, **kwargs):
            # Získaj informácie o requeste
            ip_address = request.META.get("REMOTE_ADDR")
            user_agent = request.META.get("HTTP_USER_AGENT")
            user = getattr(request, "user", None)
            endpoint = endpoint_name or request.path
            method = request.method

            # Loguj prístup
            AuditLog.log_api_access(
                endpoint=endpoint,
                method=method,
                user=user,
                ip_address=ip_address,
                user_agent=user_agent,
            )

            response = view_func(request, *args, **kwargs)

            # Loguj status code
            if hasattr(response, "status_code"):
                AuditLog.log_api_access(
                    endpoint=endpoint,
                    method=method,
                    user=user,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    status_code=response.status_code,
                )

            return response

        return wrapper

    return decorator


# Prednastavené audit logy pre bežné akcie
def log_login_success(user, ip_address, user_agent):
    """Loguje úspešné prihlásenie"""
    AuditLog.log_user_action(
        user=user,
        action="login_success",
        details={"login_method": "email_password"},
        ip_address=ip_address,
        user_agent=user_agent,
    )


def log_login_failed(email, ip_address, user_agent, reason="invalid_credentials"):
    """Loguje neúspešné prihlásenie"""
    # V produkcii neloguj email (PII)
    details = {"reason": reason}
    if getattr(settings, "DEBUG", False):
        details["email"] = email
    AuditLog.log_security_event(
        event_type="login_failed",
        details=details,
        ip_address=ip_address,
        user_agent=user_agent,
    )


def log_registration_success(user, ip_address, user_agent):
    """Loguje úspešnú registráciu"""
    AuditLog.log_user_action(
        user=user,
        action="registration_success",
        details={"user_type": user.user_type},
        ip_address=ip_address,
        user_agent=user_agent,
    )


def log_email_verification_success(user, ip_address, user_agent):
    """Loguje úspešnú email verifikáciu"""
    AuditLog.log_user_action(
        user=user,
        action="email_verification_success",
        details={},
        ip_address=ip_address,
        user_agent=user_agent,
    )


def log_email_verification_failed(
    token, ip_address, user_agent, reason="invalid_token"
):
    """Loguje neúspešnú email verifikáciu"""
    AuditLog.log_security_event(
        event_type="email_verification_failed",
        details={"token": str(token)[:8] + "...", "reason": reason},
        ip_address=ip_address,
        user_agent=user_agent,
    )


def log_profile_update(user, changes, ip_address, user_agent):
    """Loguje aktualizáciu profilu"""
    AuditLog.log_data_change(
        model_name="UserProfile",
        object_id=user.id,
        action="update",
        user=user,
        changes=changes,
        ip_address=ip_address,
    )
    AuditLog.log_user_action(
        user=user,
        action="profile_update",
        details={"changes": list(changes.keys())},
        ip_address=ip_address,
        user_agent=user_agent,
    )
