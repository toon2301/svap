"""
Unit testy pre _delete_message_image_storage (messaging/signals.py).

Overujú, že post_delete cleanup maže obrázky cez storage KONKRÉTNEHO poľa
(FieldFile.storage = napr. privátny PrivateMessageStorage), nie cez default_storage.
"""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from messaging.signals import _delete_message_image_storage


def _fake_message(image=None, thumbnail=None):
    return SimpleNamespace(image=image, image_thumbnail=thumbnail)


def test_deletes_both_files_via_their_own_storage():
    img_storage = MagicMock()
    thumb_storage = MagicMock()
    instance = _fake_message(
        image=SimpleNamespace(name="messages/1/a.png", storage=img_storage),
        thumbnail=SimpleNamespace(
            name="messages/1/thumbnails/a.webp", storage=thumb_storage
        ),
    )

    with patch("messaging.signals.default_storage") as default_storage:
        _delete_message_image_storage(instance)

    img_storage.delete.assert_called_once_with("messages/1/a.png")
    thumb_storage.delete.assert_called_once_with("messages/1/thumbnails/a.webp")
    # Kľúčové: default_storage sa NEpoužije (inak by v S3 ostali orphany).
    default_storage.delete.assert_not_called()


def test_skips_empty_image_field_and_deletes_only_thumbnail():
    thumb_storage = MagicMock()
    instance = _fake_message(
        image=SimpleNamespace(name="", storage=MagicMock()),
        thumbnail=SimpleNamespace(name="messages/1/thumbnails/a.webp", storage=thumb_storage),
    )

    _delete_message_image_storage(instance)

    thumb_storage.delete.assert_called_once_with("messages/1/thumbnails/a.webp")
    instance.image.storage.delete.assert_not_called()


def test_both_fields_empty_is_noop():
    instance = _fake_message(
        image=SimpleNamespace(name="", storage=MagicMock()),
        thumbnail=SimpleNamespace(name=None, storage=MagicMock()),
    )

    # Nesmie thrownúť ani zavolať žiadne delete.
    _delete_message_image_storage(instance)

    instance.image.storage.delete.assert_not_called()
    instance.image_thumbnail.storage.delete.assert_not_called()


def test_missing_fieldfile_is_handled():
    instance = _fake_message(image=None, thumbnail=None)
    # None polia sa bezpečne preskočia, žiadny pád.
    _delete_message_image_storage(instance)


def test_delete_failure_is_swallowed_best_effort():
    failing_storage = MagicMock()
    failing_storage.delete.side_effect = RuntimeError("S3 down")
    instance = _fake_message(
        image=SimpleNamespace(name="messages/1/a.png", storage=failing_storage),
    )

    # Best-effort: výnimku pohltíme (radšej orphan než spadnutý CASCADE/delete účtu).
    _delete_message_image_storage(instance)
    failing_storage.delete.assert_called_once()


def test_falls_back_to_default_storage_when_field_has_no_storage():
    instance = _fake_message(
        image=SimpleNamespace(name="messages/1/a.png", storage=None),
    )

    with patch("messaging.signals.default_storage") as default_storage:
        _delete_message_image_storage(instance)

    default_storage.delete.assert_called_once_with("messages/1/a.png")
