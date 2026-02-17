import os
import pytest
from django.test import override_settings
from unittest.mock import patch

from swaply.validators import validate_image_file


class DummyUpload:
    def __init__(self, name: str, size: int):
        self.name = name
        self.size = size
        self.file = self


@pytest.mark.django_db
class TestValidateImageFileExtras:
    @override_settings(IMAGE_MAX_SIZE_MB="not-an-int", SAFESEARCH_ENABLED=False)
    def test_max_size_setting_parse_fallback(self):
        f = DummyUpload("x.jpg", size=10)
        assert validate_image_file(f) is f

    @override_settings(
        DEBUG=True,
        SAFESEARCH_ENABLED=True,
        SAFESEARCH_ENFORCE_IN_DEBUG=False,
        SAFESEARCH_STRICT_MODE=False,
        GCP_VISION_SERVICE_ACCOUNT_JSON=None,
    )
    def test_safesearch_skipped_in_debug_without_credentials(self):
        f = DummyUpload("x.jpg", size=10)
        with patch.dict(os.environ, {}, clear=True):
            with patch("swaply.image_moderation.check_image_safety") as check:
                assert validate_image_file(f) is f
                check.assert_not_called()
