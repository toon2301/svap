"""Feed Fáza 1 – retry sémantika spracovania fotky.

Kľúčové rozlíšenie: „staging objekt neexistuje" je TRVALÉ zlyhanie (rovno
REJECTED), kým timeout/5xx/sieťová chyba je PRECHODNÁ a musí prebublať von,
aby ju zopakoval Celery retry (``autoretry_for=(Exception,)``).
"""

from unittest.mock import Mock, patch

import pytest
from django.contrib.auth import get_user_model
from django.test import override_settings

from accounts.feed_image_processing import process_feed_post_image_record
from accounts.models import FeedPost

User = get_user_model()

PENDING_KEY = "uploads/feed/1/photo.jpg"


class _NoSuchKey(Exception):
    """Náhrada za botocore-generovanú ``s3.exceptions.NoSuchKey``."""


def _pending_post():
    user = User.objects.create_user(
        "feed-proc", "feed-proc@example.com", "StrongPass123"
    )
    post = FeedPost.objects.create(
        author=user,
        post_type=FeedPost.PostType.FREE_POST,
        caption="Post s fotkou",
    )
    FeedPost.objects.filter(id=post.id).update(
        image_status=FeedPost.ImageStatus.PENDING,
        image_pending_key=PENDING_KEY,
    )
    post.refresh_from_db()
    return post


def _s3_raising(error, *, no_such_key=_NoSuchKey):
    s3 = Mock()
    s3.exceptions.NoSuchKey = no_such_key
    s3.get_object.side_effect = error
    return s3


@pytest.mark.django_db
class TestStagingReadFailures:
    def _run(self, s3):
        with (
            override_settings(AWS_STORAGE_BUCKET_NAME="test-bucket"),
            patch("accounts.feed_image_processing._s3_client", return_value=s3),
            patch(
                "accounts.feed_image_processing.local_portfolio_upload_enabled",
                return_value=False,
            ),
        ):
            process_feed_post_image_record(self.post.id)

    def test_missing_object_rejects_without_retry(self):
        self.post = _pending_post()
        self._run(_s3_raising(_NoSuchKey("gone")))

        self.post.refresh_from_db()
        # Opakovanie by objekt nevyrobilo – rovno trvalé zlyhanie.
        assert self.post.image_status == FeedPost.ImageStatus.REJECTED
        assert self.post.image_pending_key == ""

    def test_local_missing_file_rejects_without_retry(self):
        self.post = _pending_post()
        with (
            patch(
                "accounts.feed_image_processing.local_portfolio_upload_enabled",
                return_value=True,
            ),
            patch(
                "accounts.feed_image_processing._read_local_key",
                side_effect=FileNotFoundError(PENDING_KEY),
            ),
            patch("accounts.feed_image_processing._delete_local_key"),
        ):
            process_feed_post_image_record(self.post.id)

        self.post.refresh_from_db()
        assert self.post.image_status == FeedPost.ImageStatus.REJECTED

    @pytest.mark.parametrize(
        "error",
        [TimeoutError("read timed out"), RuntimeError("S3 500"), OSError("network")],
    )
    def test_transient_error_propagates_for_celery_retry(self, error):
        self.post = _pending_post()

        # Musí vyletieť von: Celery task ju zachytí a naplánuje retry. Keby sme
        # ju spracovali ako trvalé zlyhanie, používateľ by prišiel o fotku pri
        # krátkodobom výpadku storage.
        with pytest.raises(type(error)):
            self._run(_s3_raising(error))

        self.post.refresh_from_db()
        # Stav ostáva PENDING, aby malo čo opakovať.
        assert self.post.image_status == FeedPost.ImageStatus.PENDING
        assert self.post.image_pending_key == PENDING_KEY
