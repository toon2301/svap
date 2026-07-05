"""
MFA secret encryption at rest (Fernet) – vyčlenené z models.py.

Ak nie je nastavený MFA_ENCRYPTION_KEY, funkcie fungujú ako no-op (fallback na
plain text), aby appka nespadla.
"""

from cryptography.fernet import Fernet
from django.conf import settings as _settings
from django.core.exceptions import ImproperlyConfigured


def _get_fernet():
    key = getattr(_settings, "MFA_ENCRYPTION_KEY", "")
    if not key:
        # Kľúč nie je nastavený -> plaintext fallback (spätná kompatibilita).
        return None
    try:
        return Fernet(key.encode() if isinstance(key, str) else key)
    except Exception as exc:
        # Kľúč JE nastavený, ale je neplatný -> fail loud, nikdy ticho neukladaj
        # plaintext (rovnaký vzor ako webpush_crypto._get_web_push_fernet).
        raise ImproperlyConfigured("MFA_ENCRYPTION_KEY is invalid.") from exc


def encrypt_mfa_secret(value: str) -> str:
    if not value:
        return value
    f = _get_fernet()
    if f is None:
        return value  # fallback ak kľúč nie je nastavený
    return f.encrypt(value.encode()).decode()


def decrypt_mfa_secret(value: str) -> str:
    if not value:
        return value
    f = _get_fernet()
    if f is None:
        return value
    try:
        return f.decrypt(value.encode()).decode()
    except Exception:
        return value  # ak nie je zašifrované (staré záznamy), vráť as-is
