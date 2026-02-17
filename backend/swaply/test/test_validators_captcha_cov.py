import pytest
from django.test import override_settings
from unittest.mock import Mock, patch


@pytest.mark.django_db
def test_captcha_validator_debug_disabled_captcha_returns_true():
    # Pokrytie DEBUG vetiev bez volania siete
    from swaply.validators import CAPTCHAValidator

    with override_settings(DEBUG=True, CAPTCHA_ENABLED=False):
        assert CAPTCHAValidator.validate_captcha("any-token") is True


@pytest.mark.django_db
def test_captcha_validator_success_path_with_mocked_requests():
    from swaply.validators import CAPTCHAValidator

    mock_resp = Mock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"success": True, "score": 0.9}

    with override_settings(
        DEBUG=True,
        CAPTCHA_ENABLED=True,
        CAPTCHA_SKIP_IN_TESTS=False,
        CAPTCHA_VERIFY_URL="https://captcha.example/verify",
        CAPTCHA_SECRET_KEY="secret",
    ):
        with patch("swaply.validators.requests.post", return_value=mock_resp) as post:
            assert CAPTCHAValidator.validate_captcha("token-123") is True
            post.assert_called_once()
