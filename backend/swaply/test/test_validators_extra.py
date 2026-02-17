from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.exceptions import ValidationError
from swaply.validators import validate_image_file, SecurityValidator
import pytest


def test_validate_image_file_size(monkeypatch):
    class FakeFile:
        name = "pic.jpg"
        size = 6 * 1024 * 1024

    with pytest.raises(ValidationError):
        validate_image_file(FakeFile())


def test_validate_image_file_ext():
    content = b"\x47\x49\x46\x38\x39\x61"  # GIF header
    f = SimpleUploadedFile("avatar.txt", content, content_type="image/gif")
    with pytest.raises(ValidationError):
        validate_image_file(f)


def test_validate_image_file_size_over_limit():
    big_content = b"x" * (5 * 1024 * 1024 + 10)
    f = SimpleUploadedFile("big.jpeg", big_content, content_type="image/jpeg")
    with pytest.raises(ValidationError):
        validate_image_file(f)


def test_security_validator_non_string_passthrough():
    assert SecurityValidator.validate_input_safety(123) == 123
    assert SecurityValidator.validate_input_safety(None) is None
