import pytest
from django.core.exceptions import ValidationError
from swaply.validators import (
    EmailValidator,
    PasswordValidator,
    NameValidator,
    PhoneValidator,
    URLValidator,
    BioValidator,
    HtmlSanitizer,
    SecurityValidator,
    CAPTCHAValidator,
    validate_image_file,
)
from unittest.mock import patch, Mock
from django.test import override_settings
from django.core.files.uploadedfile import SimpleUploadedFile


def test_email_validator_basic():
    assert EmailValidator.validate_email("user@example.com") == "user@example.com"
    with pytest.raises(ValidationError):
        EmailValidator.validate_email("bad-email")
    with pytest.raises(ValidationError):
        EmailValidator.validate_email("x" * 255 + "@example.com")


def test_password_validator_rules():
    with pytest.raises(ValidationError):
        PasswordValidator.validate_password("short7A")
    with pytest.raises(ValidationError):
        PasswordValidator.validate_password("a" * 129)
    with pytest.raises(ValidationError):
        PasswordValidator.validate_password("alllowercase123")
    with pytest.raises(ValidationError):
        PasswordValidator.validate_password("ALLUPPERCASE123")
    with pytest.raises(ValidationError):
        PasswordValidator.validate_password("NoDigitsHere")
    with pytest.raises(ValidationError):
        PasswordValidator.validate_password("password")
    # valid
    assert PasswordValidator.validate_password("GoodPass123") == "GoodPass123"


def test_name_validator():
    with pytest.raises(ValidationError):
        NameValidator.validate_name("", "Meno")
    with pytest.raises(ValidationError):
        NameValidator.validate_name("A", "Meno")
    with pytest.raises(ValidationError):
        NameValidator.validate_name("John#", "Meno")
    assert NameValidator.validate_name("Ján Novák", "Meno") == "Ján Novák"


def test_phone_validator():
    assert PhoneValidator.validate_phone(None) is None
    with pytest.raises(ValidationError):
        PhoneValidator.validate_phone("abc")
    with pytest.raises(ValidationError):
        PhoneValidator.validate_phone("1234")
    # valid formats
    assert PhoneValidator.validate_phone("+421 901 234 567") == "+421 901 234 567"


def test_url_validator():
    assert URLValidator.validate_url(None) is None
    with pytest.raises(ValidationError):
        URLValidator.validate_url("example.com")
    long_url = "http://example.com/" + "a" * 300
    with pytest.raises(ValidationError):
        URLValidator.validate_url(long_url)
    assert (
        URLValidator.validate_url("https://example.com/page")
        == "https://example.com/page"
    )


def test_bio_validator():
    assert BioValidator.validate_bio(None) is None
    with pytest.raises(ValidationError):
        BioValidator.validate_bio("too short")
    long_bio = "x" * 501
    with pytest.raises(ValidationError):
        BioValidator.validate_bio(long_bio)
    assert BioValidator.validate_bio("Toto je platné bio s dostatočnou dĺžkou.")


def test_html_sanitizer():
    dirty = '<p>Hello<script>alert(1)</script><span class="x">World</span></p>'
    cleaned = HtmlSanitizer.sanitize_html(dirty)
    assert "<script>" not in cleaned
    assert "<p>" in cleaned and "</p>" in cleaned


def test_security_validator():
    with pytest.raises(ValidationError):
        SecurityValidator.validate_input_safety("SELECT * FROM users")
    # XSS patterns are returned unchanged (sanitization happens later)
    xss = "<script>alert(1)</script>"
    assert SecurityValidator.validate_input_safety(xss) == xss
    # Safe string
    assert SecurityValidator.validate_input_safety("Hello World") == "Hello World"


@override_settings(CAPTCHA_ENABLED=False)
def test_captcha_disabled_skips_validation():
    assert CAPTCHAValidator.validate_captcha("anything") is True


@override_settings(CAPTCHA_ENABLED=True, CAPTCHA_SKIP_IN_TESTS=False)
@patch("swaply.validators.requests.post")
def test_captcha_low_score_fails(mock_post):
    mock_response = Mock()
    mock_response.json.return_value = {"success": True, "score": 0.3}
    mock_post.return_value = mock_response
    with pytest.raises(ValidationError):
        CAPTCHAValidator.validate_captcha("token")


@override_settings(CAPTCHA_ENABLED=True, CAPTCHA_SKIP_IN_TESTS=False)
@patch("swaply.validators.requests.post")
def test_captcha_missing_token_fails(mock_post):
    with pytest.raises(ValidationError):
        CAPTCHAValidator.validate_captcha("")


@override_settings(CAPTCHA_ENABLED=True, CAPTCHA_SKIP_IN_TESTS=False)
@patch("swaply.validators.requests.post", side_effect=Exception("boom"))
def test_captcha_request_exception_raises(
    _,
):
    with pytest.raises(ValidationError):
        CAPTCHAValidator.validate_captcha("token")


@override_settings(CAPTCHA_ENABLED=True, CAPTCHA_SKIP_IN_TESTS=True)
def test_captcha_skips_in_pytest_environment(monkeypatch):
    # Keď je CAPTCHA_SKIP_IN_TESTS True a beží pytest, validácia sa má preskočiť
    assert CAPTCHAValidator.validate_captcha("any") is True


@override_settings(SAFESEARCH_ENABLED=False)
def test_validate_image_file_success_jpeg():
    content = b"\xff\xd8\xff" + b"0" * 100
    f = SimpleUploadedFile("img.jpg", content, content_type="image/jpeg")
    assert validate_image_file(f) is f


from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from swaply.validators import (
    PasswordValidator,
    SecurityValidator,
    RateLimitValidator,
    validate_image_file,
)


def test_password_common_rejected():
    try:
        PasswordValidator.validate_password("admin")
        assert False, "Expected ValidationError"
    except ValidationError:
        assert True


def test_security_validator_sql_and_xss():
    for s in ["SELECT * FROM users", "<script>alert('x')</script>"]:
        try:
            SecurityValidator.validate_input_safety(s)
            assert False, "Expected ValidationError"
        except ValidationError:
            pass


def test_rate_limit_validator_pass_through():
    class R:
        META = {"REMOTE_ADDR": "127.0.0.1"}

    assert RateLimitValidator.validate_rate_limit(R(), "any", "k") is True


@override_settings(SAFESEARCH_ENABLED=False)
def test_validate_image_file_success_png():
    content = b"\x89PNG\r\n\x1a\n"  # PNG signature
    f = SimpleUploadedFile("ok.png", content, content_type="image/png")
    out = validate_image_file(f)
    assert out is f
