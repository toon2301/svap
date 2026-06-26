"""
Signály messaging aplikácie.

post_delete na Message: pri tvrdom zmazaní záznamu (napr. CASCADE pri
delete_group, alebo budúce čistenie) zmaže obrázkové súbory zo storage, aby
v S3/lokáli nezostávali „orphaned" súbory (náklady + GDPR minimalizácia).

Pozn.: delete_message_for_all robí len soft-delete (is_deleted=True, riadok
OSTÁVA v DB) a obrázky maže explicitne, takže post_delete sa pri ňom NEspúšťa
a nedochádza k dvojitému mazaniu.
"""

from __future__ import annotations

from django.core.files.storage import default_storage
from django.db import transaction
from django.db.models.signals import post_delete
from django.dispatch import receiver

from .models import Message


def _delete_message_image_storage(instance: Message) -> None:
    """Best-effort zmazanie obrázkových súborov správy z ich VLASTNEJ storage.

    Message.image / image_thumbnail môžu byť na privátnom S3 (PrivateMessageStorage),
    nie na default_storage. Mazať preto treba cez storage konkrétneho poľa (FieldFile
    .storage), inak by default_storage súbor v S3 nenašiel a ostal by tam ako orphan.
    """
    seen: set[str] = set()
    for field_name in ("image", "image_thumbnail"):
        file_field = getattr(instance, field_name, None)
        name = (getattr(file_field, "name", "") or "").strip()
        if not name or name in seen:
            continue
        seen.add(name)
        storage = getattr(file_field, "storage", None) or default_storage
        try:
            storage.delete(name)
        except Exception:
            # Radšej osamotený súbor než spadnuté mazanie (CASCADE/skupina/účet).
            pass


@receiver(post_delete, sender=Message)
def delete_message_image_files_after_delete(sender, instance, **kwargs):
    transaction.on_commit(
        lambda instance=instance: _delete_message_image_storage(instance)
    )
