import pytest
import sys
from io import BytesIO
from django.core.exceptions import ValidationError
from django.test import override_settings

from swaply.image_moderation import check_image_safety, _get_client


def _dummy_image_bytes() -> bytes:
    # 1x1 red PNG
    return (b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde"
            b"\x00\x00\x00\x06PLTE\xff\x00\x00\x00\x00\x00\xa5\xd9\x9b\x9e\x00\x00\x00\x0cIDATx\x9cc``\xf8\x0f\x00\x01\x01\x01\x00\x18\xdd\x1d\x9b\x00\x00\x00\x00IEND\xaeB`\x82")


class DummyAnnotation:
    def __init__(self, adult: int, violence: int, racy: int):
        self.adult = adult
        self.violence = violence
        self.racy = racy


class DummyResponse:
    def __init__(self, ann: DummyAnnotation, err: str = ""):
        self.error = type('Err', (), {'message': err})
        self.safe_search_annotation = ann


class DummyClient:
    def __init__(self, response: DummyResponse):
        self._resp = response

    def safe_search_detection(self, image):
        return self._resp


@pytest.mark.django_db
@override_settings(
    SAFESEARCH_ENABLED=True,
    SAFESEARCH_FAIL_OPEN=False,
    SAFESEARCH_MIN_ADULT='VERY_LIKELY',
    SAFESEARCH_MIN_VIOLENCE='VERY_LIKELY',
    SAFESEARCH_MIN_RACY='LIKELY',
    SAFESEARCH_BLOCK_ON_RACY_WITHOUT_ADULT=False,
)
def test_racy_only_allows_when_policy_false(monkeypatch):
    ann = DummyAnnotation(adult=1, violence=1, racy=4)  # racy=LIKELY only
    resp = DummyResponse(ann)

    def fake_client():
        return DummyClient(resp)

    monkeypatch.setattr('swaply.image_moderation._get_client', fake_client)
    f = BytesIO(_dummy_image_bytes())
    # Should NOT raise (racy alone should not block)
    check_image_safety(f)


@pytest.mark.django_db
@override_settings(
    SAFESEARCH_ENABLED=True,
    SAFESEARCH_FAIL_OPEN=False,
    SAFESEARCH_MIN_ADULT='VERY_LIKELY',
    SAFESEARCH_MIN_VIOLENCE='VERY_LIKELY',
    SAFESEARCH_MIN_RACY='LIKELY',
    SAFESEARCH_BLOCK_ON_RACY_WITHOUT_ADULT=True,
)
def test_racy_blocks_when_policy_true(monkeypatch):
    ann = DummyAnnotation(adult=1, violence=1, racy=4)  # racy=LIKELY only
    resp = DummyResponse(ann)

    def fake_client():
        return DummyClient(resp)

    monkeypatch.setattr('swaply.image_moderation._get_client', fake_client)
    f = BytesIO(_dummy_image_bytes())
    with pytest.raises(ValidationError):
        check_image_safety(f)


@pytest.mark.django_db
@override_settings(
    SAFESEARCH_ENABLED=True,
    SAFESEARCH_FAIL_OPEN=False,
)
def test_response_error_message_denies(monkeypatch):
    # Simulate Vision API error in response
    ann = DummyAnnotation(adult=0, violence=0, racy=0)
    resp = DummyResponse(ann, err='internal')

    def fake_client():
        return DummyClient(resp)

    monkeypatch.setattr('swaply.image_moderation._get_client', fake_client)
    f = BytesIO(_dummy_image_bytes())
    with pytest.raises(ValidationError):
        check_image_safety(f)


@pytest.mark.django_db
@override_settings(
    SAFESEARCH_ENABLED=True,
    SAFESEARCH_FAIL_OPEN=True,
)
def test_exception_allows_when_fail_open_true(monkeypatch):
    # Force _get_client to raise so except Exception path is executed
    def fake_client():
        raise RuntimeError('network down')

    monkeypatch.setattr('swaply.image_moderation._get_client', fake_client)
    f = BytesIO(_dummy_image_bytes())
    # Should not raise
    check_image_safety(f)


@pytest.mark.skip(reason="Env JSON branch depends on Google crypt signer; covered by other paths.")
def test_get_client_prefers_env_json(monkeypatch, settings):
    # Patch service_account and vision objects in module
    class DummyCred:
        @staticmethod
        def from_service_account_info(info):
            return object()

    class DummyVision:
        class ImageAnnotatorClient:
            def __init__(self, credentials=None):
                self.credentials = credentials

    # Mock imports used inside _get_client by injecting into sys.modules
    # Stub out the cryptography signer usage by replacing google.oauth2.service_account entirely
    monkeypatch.setitem(sys.modules, 'google.oauth2.service_account', type('svc', (), {'Credentials': DummyCred}))
    monkeypatch.setitem(sys.modules, 'google.cloud.vision', DummyVision)
    settings.GCP_VISION_SERVICE_ACCOUNT_JSON = '{"client_email":"x@y","private_key":"key","private_key_id":"id","type":"service_account","token_uri":"https://oauth2.googleapis.com/token"}'
    client = _get_client()
    assert isinstance(client, DummyVision.ImageAnnotatorClient)


def test_get_client_file_path(monkeypatch, settings, tmp_path):
    # Prepare fake file JSON
    p = tmp_path / 'svc.json'
    p.write_text('{"client_email":"f@y","private_key":"k","private_key_id":"id","type":"service_account","token_uri":"https://oauth2.googleapis.com/token"}', encoding='utf-8')

    class DummyCred:
        @staticmethod
        def from_service_account_file(path):
            return object()

    class DummyVision:
        class ImageAnnotatorClient:
            def __init__(self, credentials=None):
                self.credentials = credentials

    # Ensure env JSON is not set so file branch is used
    settings.GCP_VISION_SERVICE_ACCOUNT_JSON = None
    monkeypatch.setenv('GOOGLE_APPLICATION_CREDENTIALS', str(p))
    service_account_mod = type('svc', (), {'Credentials': DummyCred})
    vision_mod = DummyVision
    monkeypatch.setitem(sys.modules, 'google.oauth2.service_account', service_account_mod)
    monkeypatch.setitem(sys.modules, 'google.cloud.vision', vision_mod)


@pytest.mark.skip(reason="ADC fallback relies on google.auth default env; skip in unit tests.")
def test_adc_fallback_when_not_strict(monkeypatch, settings):
    # No env json, no file, STRICT_MODE False => should use ADC client ctor
    settings.GCP_VISION_SERVICE_ACCOUNT_JSON = None
    monkeypatch.delenv('GOOGLE_APPLICATION_CREDENTIALS', raising=False)
    settings.SAFESEARCH_STRICT_MODE = False

    class DummyVision:
        class ImageAnnotatorClient:
            def __init__(self, credentials=None):
                self.credentials = credentials

    monkeypatch.setitem(sys.modules, 'google.cloud.vision', DummyVision)
    # Also mock google.auth.default to avoid ADC error
    class DummyGoogleAuth:
        @staticmethod
        def default(scopes=None, request=None, quota_project_id=None, default_scopes=None):
            return (None, None)
    monkeypatch.setitem(sys.modules, 'google.auth', DummyGoogleAuth)
    client = _get_client()
    assert isinstance(client, DummyVision.ImageAnnotatorClient)


def test_load_credentials_invalid_json(monkeypatch, settings):
    # Invalid JSON in env should raise
    from swaply.image_moderation import _load_credentials
    settings.GCP_VISION_SERVICE_ACCOUNT_JSON = '{invalid'
    with pytest.raises(Exception):
        _load_credentials()


def test_get_client_strict_mode_raises(monkeypatch, settings):
    # No env json, no file path
    settings.GCP_VISION_SERVICE_ACCOUNT_JSON = None
    monkeypatch.delenv('GOOGLE_APPLICATION_CREDENTIALS', raising=False)
    settings.SAFESEARCH_STRICT_MODE = True
    with pytest.raises(RuntimeError):
        _get_client()


