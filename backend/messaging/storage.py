"""
Storage pre message prílohy.

Message obrázky musia byť PRIVATE – prístupné len cez proxy `MessageImageView`,
ktorý overuje členstvo v konverzácii, nie priamo zo S3. Ponuky/portfólio/avatary
ostávajú na verejnom default storage (nezmenené).

V produkcii (S3) použijeme private ACL + podpísané URL (querystring auth). V DEV
a testoch (lokálny FileSystemStorage) sa použije default_storage – súbory aj tak
servuje výhradne proxy view, takže ostávajú nedostupné priamo.

`storage=` na ImageField akceptuje callable, ktorý Django vyhodnotí pri načítaní
modelu (a uloží referenciu do migrácie), takže výber je nezávislý od prostredia.
"""

from __future__ import annotations

from django.conf import settings
from django.core.files.storage import default_storage


def _s3_default_storage_active() -> bool:
    """True ak je default storage S3 (produkcia); inak lokálny FS (DEV/test)."""
    backend = ""
    storages = getattr(settings, "STORAGES", None)
    if isinstance(storages, dict):
        backend = (storages.get("default") or {}).get("BACKEND", "") or ""
    if not backend:
        backend = getattr(settings, "DEFAULT_FILE_STORAGE", "") or ""
    return "S3Boto3Storage" in backend


def _build_private_message_storage():
    from storages.backends.s3boto3 import S3Boto3Storage

    class PrivateMessageStorage(S3Boto3Storage):
        """Private S3 storage – žiadne verejné URL, podpísaný prístup."""

        default_acl = "private"
        querystring_auth = True
        file_overwrite = False

    return PrivateMessageStorage()


def get_message_image_storage():
    """Vráti storage pre Message.image / image_thumbnail podľa prostredia."""
    if not _s3_default_storage_active():
        return default_storage
    return _build_private_message_storage()
