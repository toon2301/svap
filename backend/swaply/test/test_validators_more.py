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
        PasswordValidator.validate_password('admin')
        assert False, 'Expected ValidationError'
    except ValidationError:
        assert True


def test_security_validator_sql_and_xss():
    for s in ["SELECT * FROM users", "<script>alert('x')</script>"]:
        try:
            SecurityValidator.validate_input_safety(s)
            assert False, 'Expected ValidationError'
        except ValidationError:
            pass


def test_rate_limit_validator_pass_through():
    class R:
        META = {'REMOTE_ADDR': '127.0.0.1'}
    assert RateLimitValidator.validate_rate_limit(R(), 'any', 'k') is True


def test_validate_image_file_success_png():
    content = b'\x89PNG\r\n\x1a\n'  # PNG signature
    f = SimpleUploadedFile('ok.png', content, content_type='image/png')
    out = validate_image_file(f)
    assert out is f


