"""
Testy pre centralizované validátory
"""
import pytest
from django.core.exceptions import ValidationError
from django.test import override_settings
from swaply.validators import (
    EmailValidator, PasswordValidator, NameValidator, PhoneValidator,
    URLValidator, BioValidator, HtmlSanitizer, SecurityValidator, CAPTCHAValidator
)


class TestEmailValidator:
    def test_valid_email(self):
        assert EmailValidator.validate_email('user@example.com') == 'user@example.com'

    @pytest.mark.parametrize('email', ['', 'bad', 'a@b', 'x@', 'x@z.', 'a'*255 + '@example.com'])
    def test_invalid_emails(self, email):
        with pytest.raises(ValidationError):
                    EmailValidator.validate_email(email)
    

class TestPasswordValidator:
    def test_valid_password(self):
        assert PasswordValidator.validate_password('StrongPass1') == 'StrongPass1'

    @pytest.mark.parametrize('password', ['', 'short1A', 'a'*129])
    def test_invalid_length(self, password):
        with pytest.raises(ValidationError):
            PasswordValidator.validate_password(password)

    @pytest.mark.parametrize('password', ['nouppercase1', 'NOLOWERCASE1', 'NoDigitsAAAA'])
    def test_missing_complexity(self, password):
        with pytest.raises(ValidationError):
            PasswordValidator.validate_password(password)
    
    def test_common_password(self):
        with pytest.raises(ValidationError):
            PasswordValidator.validate_password('password')


class TestNameValidator:
    def test_valid_name(self):
        assert NameValidator.validate_name('Ján Novák', 'Meno') == 'Ján Novák'

    @pytest.mark.parametrize('name', ['', ' A', 'x', 'x'*51, 'John#Doe'])
    def test_invalid_name(self, name):
        with pytest.raises(ValidationError):
            NameValidator.validate_name(name, 'Meno')


class TestPhoneValidator:
    def test_optional_none(self):
        assert PhoneValidator.validate_phone(None) is None

    def test_valid(self):
        assert PhoneValidator.validate_phone('+421 905-123-456') == '+421 905-123-456'

    @pytest.mark.parametrize('phone', ['abc', '123', '12345678901234567'])
    def test_invalid(self, phone):
        with pytest.raises(ValidationError):
                    PhoneValidator.validate_phone(phone)
    

class TestURLValidator:
    def test_optional_none(self):
        assert URLValidator.validate_url(None) is None

    def test_valid(self):
        assert URLValidator.validate_url('https://example.com', 'Web') == 'https://example.com'

    @pytest.mark.parametrize('url', ['ftp://x', 'example.com', 'http://' + 'a'*205 + '.com'])
    def test_invalid(self, url):
        with pytest.raises(ValidationError):
            URLValidator.validate_url(url, 'Web')


class TestBioValidator:
    def test_optional_none(self):
        assert BioValidator.validate_bio(None) is None

    def test_valid(self):
        assert BioValidator.validate_bio('Toto je moje bio, ktoré je dostatočne dlhé.')

    @pytest.mark.parametrize('bio', ['short', 'x'*501])
    def test_invalid(self, bio):
        with pytest.raises(ValidationError):
            BioValidator.validate_bio(bio)


class TestHtmlSanitizer:
    def test_script_removed_bold_kept(self):
        dirty = 'Hello <script>alert(1)</script><b>World</b>'
        clean = HtmlSanitizer.sanitize_html(dirty)
        assert '<script>' not in clean
        assert '<b>World</b>' in clean or 'World' in clean

    def test_non_string_and_empty(self):
        assert HtmlSanitizer.sanitize_html(None) is None
        assert HtmlSanitizer.sanitize_html('') == ''


class TestSecurityValidator:
    @pytest.mark.parametrize('payload', [
        "SELECT * FROM users",
        "1 OR 1=1",
        "<iframe src='x'></iframe>",
    ])
    def test_sql_patterns_raise(self, payload):
        with pytest.raises(ValidationError):
            SecurityValidator.validate_input_safety(payload)

    def test_pass_through_non_string(self):
        assert SecurityValidator.validate_input_safety(123) == 123

    def test_xss_returns_input_not_raise(self):
        payload = "<script>alert(1)</script>hello"
        assert SecurityValidator.validate_input_safety(payload) == payload


class TestCaptchaValidator:
    @override_settings(CAPTCHA_ENABLED=True, CAPTCHA_SKIP_IN_TESTS=True)
    def test_captcha_skipped_in_tests(self):
        assert CAPTCHAValidator.validate_captcha('anything') is True

    @override_settings(CAPTCHA_ENABLED=False)
    def test_captcha_disabled(self):
        assert CAPTCHAValidator.validate_captcha(None) is True

    @override_settings(CAPTCHA_ENABLED=True, CAPTCHA_SKIP_IN_TESTS=False)
    def test_captcha_enabled_no_skip_requires_token(self):
        with pytest.raises(ValidationError):
            CAPTCHAValidator.validate_captcha(None)

    @override_settings(CAPTCHA_ENABLED=True, CAPTCHA_SKIP_IN_TESTS=False)
    def test_captcha_request_exception(self, monkeypatch):
        import requests
        def boom(*args, **kwargs):
            raise requests.RequestException('network')
        monkeypatch.setattr('swaply.validators.requests.post', boom)
        with pytest.raises(ValidationError):
            CAPTCHAValidator.validate_captcha('token')
