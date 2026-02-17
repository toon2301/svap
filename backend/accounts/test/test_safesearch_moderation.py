import pytest
from io import BytesIO
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings

from swaply.image_moderation import check_image_safety


def make_dummy_image_bytes() -> bytes:
    # 1x1 red PNG
    return (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde"
        b"\x00\x00\x00\x06PLTE\xff\x00\x00\x00\x00\x00\xa5\xd9\x9b\x9e\x00\x00\x00\x0cIDATx\x9cc``\xf8\x0f\x00\x01\x01\x01\x00\x18\xdd\x1d\x9b\x00\x00\x00\x00IEND\xaeB`\x82"
    )


@pytest.mark.django_db
@override_settings(
    SAFESEARCH_ENABLED=True,
    SAFESEARCH_FAIL_OPEN=False,
    SAFESEARCH_MIN_ADULT="POSSIBLE",
    SAFESEARCH_MIN_VIOLENCE="LIKELY",
    SAFESEARCH_MIN_RACY="LIKELY",
)
def test_check_image_safety_denies_when_threshold_met(monkeypatch):
    class DummyAnnotation:
        def __init__(self):
            # Use integer values like real Vision response: 0..5
            # adult=4 (LIKELY) exceeds POSSIBLE(3)
            self.adult = 4
            self.violence = 1  # VERY_UNLIKELY
            self.racy = 2  # UNLIKELY

    class DummyResponse:
        def __init__(self):
            self.error = type("Err", (), {"message": ""})
            self.safe_search_annotation = DummyAnnotation()

    class DummyClient:
        def safe_search_detection(self, image):
            return DummyResponse()

    def fake_get_client():
        return DummyClient()

    monkeypatch.setattr("swaply.image_moderation._get_client", fake_get_client)

    f = BytesIO(make_dummy_image_bytes())
    with pytest.raises(ValidationError):
        check_image_safety(f)


@pytest.mark.django_db
@override_settings(
    SAFESEARCH_ENABLED=True,
    SAFESEARCH_FAIL_OPEN=True,
    SAFESEARCH_MIN_ADULT="POSSIBLE",
    SAFESEARCH_MIN_VIOLENCE="LIKELY",
    SAFESEARCH_MIN_RACY="LIKELY",
)
def test_check_image_safety_fail_open_allows_on_exception(monkeypatch):
    def fake_get_client():
        raise RuntimeError("network down")

    monkeypatch.setattr("swaply.image_moderation._get_client", fake_get_client)

    f = BytesIO(make_dummy_image_bytes())
    # Should not raise due to fail-open
    check_image_safety(f)
