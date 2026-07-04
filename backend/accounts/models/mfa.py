"""
MFA secret encryption at rest (Fernet) – vyčlenené z models.py.

Ak nie je nastavený MFA_ENCRYPTION_KEY, funkcie fungujú ako no-op (fallback na
plain text), aby appka nespadla.
"""

from cryptography.fernet import Fernet
from django.conf import settings as _settings


def _get_fernet():
    key = getattr(_settings, "MFA_ENCRYPTION_KEY", "")
    if not key:
        return None
    try:
        return Fernet(key.encode() if isinstance(key, str) else key)
    except Exception:
        return None


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
