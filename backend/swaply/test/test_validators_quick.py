import pytest
from django.core.exceptions import ValidationError
from swaply.validators import (
    PasswordValidator,
    EmailValidator,
    NameValidator,
    PhoneValidator,
    URLValidator,
)


def test_password_validator_accepts_strong_password():
    assert PasswordValidator.validate_password('StrongPass123') == 'StrongPass123'

def test_password_validator_common_password_rejected():
    with pytest.raises(ValidationError):
        PasswordValidator.validate_password('Password123')

def test_email_validator_accepts_valid():
    assert EmailValidator.validate_email('user@example.com') == 'user@example.com'

def test_name_validator_valid_name():
    assert NameValidator.validate_name('Ján Novák') == 'Ján Novák'

def test_phone_validator_valid_number():
    assert PhoneValidator.validate_phone('+421 905 123 456') == '+421 905 123 456'

def test_url_validator_valid_http():
    assert URLValidator.validate_url('https://example.com', field_name='Web') == 'https://example.com'

