"""Testy stráže proti prázdnym multipart nahrávaniam (fotka z iPhonu, ktorá na server nedorazí)."""

import pytest
from rest_framework.parsers import JSONParser, MultiPartParser
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory

from swaply.empty_upload import (
    EMPTY_AVATAR_UPLOAD,
    EMPTY_MESSAGE_UPLOAD,
    empty_multipart_response,
    is_empty_multipart_request,
)

MULTIPART = "multipart/form-data; boundary=----WebKitFormBoundaryAbCdEf123456"
FACTORY = APIRequestFactory()


def _drf_request(method: str, *, body: bytes = b"", content_type: str = MULTIPART, **extra):
    """Zostaví DRF požiadavku s daným telom a typom obsahu (vrátane prázdneho tela)."""
    raw = FACTORY.generic(
        method,
        "/api/test/",
        data=body,
        content_type=content_type,
        CONTENT_LENGTH=str(len(body)),
        **extra,
    )
    return Request(raw, parsers=[MultiPartParser(), JSONParser()])


def _multipart_body(**fields: str) -> bytes:
    """Zloží multipart telo s textovými poliami (bez súboru)."""
    boundary = MULTIPART.split("boundary=")[1]
    parts = [
        f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'
        for name, value in fields.items()
    ]
    return ("".join(parts) + f"--{boundary}--\r\n").encode()


@pytest.mark.parametrize("method", ["POST", "PUT", "PATCH"])
def test_empty_multipart_body_is_detected(method):
    assert is_empty_multipart_request(_drf_request(method)) is True


def test_multipart_with_a_field_is_not_empty():
    request = _drf_request("POST", body=_multipart_body(text="Ahoj"))
    assert is_empty_multipart_request(request) is False


def test_json_request_is_never_treated_as_an_empty_upload():
    request = _drf_request("POST", body=b"{}", content_type="application/json")
    assert is_empty_multipart_request(request) is False


def test_get_request_is_ignored():
    assert is_empty_multipart_request(_drf_request("GET")) is False


def test_methods_can_be_narrowed():
    assert is_empty_multipart_request(_drf_request("POST"), methods=("PATCH",)) is False
    assert is_empty_multipart_request(_drf_request("PATCH"), methods=("PATCH",)) is True


def test_response_carries_only_the_code_and_is_a_400():
    response = empty_multipart_response(_drf_request("POST"), EMPTY_MESSAGE_UPLOAD)

    assert response.status_code == 400
    assert response.data == {"code": "empty_message_upload"}
    assert EMPTY_AVATAR_UPLOAD == "empty_avatar_upload"


def test_response_logs_technical_details_only(caplog):
    request = _drf_request(
        "POST",
        HTTP_USER_AGENT="Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_1 like Mac OS X)",
        HTTP_COOKIE="access_token=SECRET-TOKEN",
        HTTP_AUTHORIZATION="Bearer SECRET-TOKEN",
    )

    with caplog.at_level("WARNING", logger="swaply.empty_upload"):
        empty_multipart_response(request, EMPTY_MESSAGE_UPLOAD)

    assert len(caplog.records) == 1
    message = caplog.records[0].getMessage()
    assert "code=empty_message_upload" in message
    assert "path=/api/test/" in message
    assert "method=POST" in message
    assert "content_length=0" in message
    assert "iPhone OS 27_0_1" in message
    assert "SECRET-TOKEN" not in message


def test_logged_user_agent_is_truncated(caplog):
    request = _drf_request("POST", HTTP_USER_AGENT="A" * 1000)

    with caplog.at_level("WARNING", logger="swaply.empty_upload"):
        empty_multipart_response(request, EMPTY_MESSAGE_UPLOAD)

    assert "A" * 160 in caplog.records[0].getMessage()
    assert "A" * 161 not in caplog.records[0].getMessage()


def test_missing_user_agent_does_not_break_logging(caplog):
    with caplog.at_level("WARNING", logger="swaply.empty_upload"):
        response = empty_multipart_response(_drf_request("POST"), EMPTY_MESSAGE_UPLOAD)

    assert response.status_code == 400
    assert "user_agent=" in caplog.records[0].getMessage()
