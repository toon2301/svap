"""
Testy pre management command `cleanup_orphan_message_images`.

Pokrýva: dry-run (default), execute+confirm, ochranu --execute bez --confirm,
vynútený dry-run, min-age filter, prázdny prefix, mix orphan/non-orphan,
strankovanie a fail-open pri zlyhaní mazania jedného objektu.
"""

from __future__ import annotations

from datetime import timedelta
from io import StringIO
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase
from django.utils import timezone

from messaging.models import Message
from messaging.services.conversations import open_or_create_direct_conversation

User = get_user_model()

CMD = "cleanup_orphan_message_images"
CMD_MODULE = "messaging.management.commands.cleanup_orphan_message_images"


class _FakePaginator:
    def __init__(self, pages):
        self._pages = pages

    def paginate(self, **_kwargs):
        for page in self._pages:
            yield {"Contents": list(page)}


class _FakeClient:
    def __init__(self, pages):
        self._paginator = _FakePaginator(pages)

    def get_paginator(self, name):
        assert name == "list_objects_v2"
        return self._paginator


class _FakeStorage:
    """Napodobňuje S3Boto3Storage natoľko, koľko príkaz potrebuje."""

    location = ""
    bucket_name = "test-bucket"

    def __init__(self, pages, fail_keys=None):
        self.connection = SimpleNamespace(
            meta=SimpleNamespace(client=_FakeClient(pages))
        )
        self.deleted: list[str] = []
        self._fail_keys = set(fail_keys or [])

    def delete(self, name):
        if name in self._fail_keys:
            raise RuntimeError(f"boom {name}")
        self.deleted.append(name)


def _obj(key: str, *, age_hours: float = 100.0, size: int = 10):
    """S3 objekt tak, ako ho vráti list_objects_v2 (tz-aware LastModified)."""
    return {
        "Key": key,
        "LastModified": timezone.now() - timedelta(hours=age_hours),
        "Size": size,
    }


@pytest.mark.django_db
class TestCleanupOrphanMessageImages(TestCase):
    def setUp(self):
        self.u1 = User.objects.create_user(
            username="c1",
            email="c1@example.com",
            password="StrongPass123",
            is_verified=True,
            is_active=True,
        )
        self.u2 = User.objects.create_user(
            username="c2",
            email="c2@example.com",
            password="StrongPass123",
            is_verified=True,
            is_active=True,
        )
        self.convo = open_or_create_direct_conversation(
            actor=self.u1, target=self.u2
        ).conversation

        # Message s referencovaným obrázkom + náhľadom.
        self.keep_image = f"messages/{self.convo.id}/keep.png"
        self.keep_thumb = f"messages/{self.convo.id}/thumbnails/keep.webp"
        Message.objects.create(
            conversation=self.convo,
            sender=self.u1,
            image=self.keep_image,
            image_thumbnail=self.keep_thumb,
        )

        self.orphan_image = f"messages/{self.convo.id}/orphan.png"
        self.orphan_thumb = f"messages/{self.convo.id}/thumbnails/orphan.webp"

    def _run(self, storage, *args):
        out, err = StringIO(), StringIO()
        with patch(f"{CMD_MODULE}.get_message_image_storage", return_value=storage):
            call_command(CMD, *args, stdout=out, stderr=err)
        return out.getvalue(), err.getvalue()

    def test_dry_run_is_default_and_deletes_nothing(self):
        storage = _FakeStorage(
            [[_obj(self.keep_image), _obj(self.keep_thumb), _obj(self.orphan_image)]]
        )
        out, _err = self._run(storage)

        assert storage.deleted == []
        assert f"[orphan] {self.orphan_image}" in out
        assert f"[orphan] {self.keep_image}" not in out
        assert "DRY-RUN" in out
        assert "nájdených orphanov:     1" in out

    def test_execute_without_confirm_raises(self):
        storage = _FakeStorage([[_obj(self.orphan_image)]])
        with pytest.raises(CommandError):
            self._run(storage, "--execute")
        assert storage.deleted == []

    def test_execute_with_confirm_deletes_only_orphans(self):
        storage = _FakeStorage(
            [
                [
                    _obj(self.keep_image),
                    _obj(self.keep_thumb),
                    _obj(self.orphan_image),
                    _obj(self.orphan_thumb),
                ]
            ]
        )
        out, _err = self._run(storage, "--execute", "--confirm")

        assert sorted(storage.deleted) == sorted([self.orphan_image, self.orphan_thumb])
        assert self.keep_image not in storage.deleted
        assert self.keep_thumb not in storage.deleted
        assert "zmazaných:              2" in out

    def test_dry_run_flag_overrides_execute(self):
        storage = _FakeStorage([[_obj(self.orphan_image)]])
        out, _err = self._run(storage, "--execute", "--confirm", "--dry-run")

        assert storage.deleted == []
        assert "DRY-RUN" in out

    def test_recent_objects_are_skipped(self):
        storage = _FakeStorage([[_obj(self.orphan_image, age_hours=1)]])
        out, _err = self._run(storage, "--execute", "--confirm", "--min-age-hours", "24")

        assert storage.deleted == []
        assert "preskočených (čerstvé): 1" in out
        assert "nájdených orphanov:     0" in out

    def test_min_age_zero_considers_all_objects(self):
        storage = _FakeStorage([[_obj(self.orphan_image, age_hours=0.1)]])
        out, _err = self._run(storage, "--execute", "--confirm", "--min-age-hours", "0")

        assert storage.deleted == [self.orphan_image]
        assert "zmazaných:              1" in out

    def test_empty_prefix_is_noop(self):
        storage = _FakeStorage([])  # žiadne strany / žiadne objekty
        out, _err = self._run(storage, "--execute", "--confirm")

        assert storage.deleted == []
        assert "naskenovaných objektov: 0" in out
        assert "nájdených orphanov:     0" in out

    def test_directory_markers_are_ignored(self):
        storage = _FakeStorage(
            [[_obj(f"messages/{self.convo.id}/", size=0), _obj(self.orphan_image)]]
        )
        out, _err = self._run(storage, "--execute", "--confirm")

        assert storage.deleted == [self.orphan_image]
        assert "naskenovaných objektov: 1" in out

    def test_pagination_across_multiple_pages(self):
        storage = _FakeStorage(
            [
                [_obj(self.keep_image), _obj(self.orphan_image)],
                [_obj(self.keep_thumb), _obj(self.orphan_thumb)],
            ]
        )
        out, _err = self._run(storage, "--execute", "--confirm")

        assert sorted(storage.deleted) == sorted([self.orphan_image, self.orphan_thumb])
        assert "naskenovaných objektov: 4" in out

    def test_delete_failure_is_fail_open(self):
        storage = _FakeStorage(
            [[_obj(self.orphan_image), _obj(self.orphan_thumb)]],
            fail_keys=[self.orphan_image],
        )
        out, err = self._run(storage, "--execute", "--confirm")

        # Jedno zlyhanie nezhodí celú dávku – druhý orphan sa zmaže.
        assert storage.deleted == [self.orphan_thumb]
        assert "zlyhalo mazanie" in err
        assert "zmazaných:              1" in out

    def test_non_s3_storage_raises(self):
        storage = SimpleNamespace(location="", bucket_name=None, connection=None)
        with pytest.raises(CommandError):
            self._run(storage)
