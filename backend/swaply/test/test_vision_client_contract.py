"""Kontrola obrázkov (SafeSearch) cez skutočnú knižnicu `google-cloud-vision`, bez účtu Google a bez siete.

Ostatné testy kontroly obrázkov podstrkujú atrapu klienta, takže skutočnú knižnicu (protobuf, proto-plus, gRPC)
nepoužijú vôbec. Produkcia má pritom `SAFESEARCH_FAIL_OPEN=False`: pokazená knižnica po povýšení by zamietla každé
nahrávanie obrázka (avatar, ponuku, príspevok aj správu) a ukázalo by sa to až na Railway. Preto tu beží skutočný
`ImageAnnotatorClient` proti falošnému gRPC serveru na lokálnom porte. Overí sa serializácia požiadavky, parsovanie
odpovede a vyhodnotenie prahov v `check_image_safety`. Produkčná cesta `_get_client` (účet z JSON) sa overí zvlášť.
"""

import json
from concurrent import futures
from io import BytesIO

import grpc
import pytest
from django.core.exceptions import ValidationError
from django.test import override_settings
from google.cloud import vision
from google.cloud.vision_v1.services.image_annotator.transports import (
    ImageAnnotatorGrpcTransport,
)
from google.rpc import status_pb2

from swaply.image_moderation import _get_client, check_image_safety

SERVICE = "google.cloud.vision.v1.ImageAnnotator"
SAFE_SETTINGS = dict(
    SAFESEARCH_ENABLED=True,
    SAFESEARCH_MIN_ADULT="POSSIBLE",
    SAFESEARCH_MIN_VIOLENCE="LIKELY",
    SAFESEARCH_MIN_RACY="LIKELY",
)


def _answer(content: bytes) -> vision.AnnotateImageResponse:
    """Odpoveď falošného servera: obsah začínajúci `ADULT` je rizikový, `ERROR` vráti chybu API, ostatné sú čisté."""
    if content.startswith(b"ERROR"):
        return vision.AnnotateImageResponse(
            error=status_pb2.Status(code=3, message="chyba falošného servera")
        )
    adult = (
        vision.Likelihood.LIKELY
        if content.startswith(b"ADULT")
        else vision.Likelihood.VERY_UNLIKELY
    )
    return vision.AnnotateImageResponse(
        safe_search_annotation=vision.SafeSearchAnnotation(
            adult=adult,
            violence=vision.Likelihood.VERY_UNLIKELY,
            racy=vision.Likelihood.UNLIKELY,
        )
    )


@pytest.fixture(scope="module")
def vision_server():
    """Falošný `ImageAnnotator` na lokálnom porte; zapisuje prijaté požiadavky do zoznamu."""
    received = []

    def batch_annotate(request, context):
        received.append(request)
        return vision.BatchAnnotateImagesResponse(
            responses=[_answer(item.image.content) for item in request.requests]
        )

    handler = grpc.method_handlers_generic_handler(
        SERVICE,
        {
            "BatchAnnotateImages": grpc.unary_unary_rpc_method_handler(
                batch_annotate,
                request_deserializer=vision.BatchAnnotateImagesRequest.deserialize,
                response_serializer=vision.BatchAnnotateImagesResponse.serialize,
            )
        },
    )
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=2))
    server.add_generic_rpc_handlers((handler,))
    port = server.add_insecure_port("127.0.0.1:0")
    assert port, "falošný server sa nepodarilo viazať na lokálny port"
    server.start()
    yield port, received
    server.stop(0)


@pytest.fixture
def real_client(vision_server, monkeypatch):
    """Skutočný `ImageAnnotatorClient` namierený na falošný server a podstrčený do `_get_client`."""
    port, received = vision_server
    received.clear()
    # Bez proxy: v prostrediach s `http_proxy` by gRPC inak skúsil ísť na lokálny port cez proxy.
    channel = grpc.insecure_channel(
        f"127.0.0.1:{port}", options=[("grpc.enable_http_proxy", 0)]
    )
    client = vision.ImageAnnotatorClient(
        transport=ImageAnnotatorGrpcTransport(channel=channel)
    )
    monkeypatch.setattr("swaply.image_moderation._get_client", lambda: client)
    yield client, received
    channel.close()


def test_real_client_sends_safe_search_request_and_parses_likelihoods(real_client):
    """Požiadavka nesie obrázok a funkciu SafeSearch; odpoveď sa dá porovnávať ako čísla 0 až 5."""
    client, received = real_client

    response = client.safe_search_detection(image=vision.Image(content=b"ADULT-ukazka"))

    sent = received[0].requests[0]
    assert sent.image.content == b"ADULT-ukazka"
    assert [feature.type_ for feature in sent.features] == [
        vision.Feature.Type.SAFE_SEARCH_DETECTION
    ]
    annotation = response.safe_search_annotation
    assert not response.error.message
    assert (int(annotation.adult), int(annotation.violence), int(annotation.racy)) == (
        4,
        1,
        2,
    )


@override_settings(SAFESEARCH_FAIL_OPEN=False, **SAFE_SETTINGS)
def test_check_image_safety_rejects_risky_image_through_real_client(real_client):
    """Rizikový obrázok zamietne skutočná cesta knižnice, nie atrapa."""
    with pytest.raises(ValidationError) as caught:
        check_image_safety(BytesIO(b"ADULT-ukazka"))

    assert caught.value.code == "image_moderation_rejected"


@override_settings(SAFESEARCH_FAIL_OPEN=False, **SAFE_SETTINGS)
def test_check_image_safety_allows_clean_image_and_resets_cursor(real_client):
    """Čistý obrázok prejde aj pri zakázanom fail-open (teda kontrola naozaj prebehla) a kurzor sa vráti na začiatok."""
    client, received = real_client
    upload = BytesIO(b"cisty-obrazok")

    check_image_safety(upload)

    assert len(received) == 1
    assert upload.tell() == 0


@override_settings(SAFESEARCH_FAIL_OPEN=False, **SAFE_SETTINGS)
def test_api_error_response_denies_when_fail_closed(real_client):
    """Chyba v odpovedi API zamietne upload, ak je fail-open vypnutý."""
    with pytest.raises(ValidationError):
        check_image_safety(BytesIO(b"ERROR-ukazka"))


@override_settings(SAFESEARCH_FAIL_OPEN=True, **SAFE_SETTINGS)
def test_api_error_response_allows_when_fail_open(real_client):
    """Pri zapnutom fail-open chyba API upload nezastaví (správanie produkcie zostáva)."""
    check_image_safety(BytesIO(b"ERROR-ukazka"))


def test_production_path_builds_client_from_service_account_json():
    """Produkčná cesta `_get_client`: klient sa postaví z JSON účtu. Kľúč je jednorazový, vygenerovaný v teste a nikam sa neposiela."""
    pytest.importorskip("cryptography")
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import rsa

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    account = {
        "type": "service_account",
        "project_id": "test-projekt",
        "private_key_id": "kluc1",
        "private_key": key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        ).decode(),
        "client_email": "test@test-projekt.iam.gserviceaccount.com",
        "client_id": "123",
        "token_uri": "https://oauth2.googleapis.com/token",
    }

    with override_settings(GCP_VISION_SERVICE_ACCOUNT_JSON=json.dumps(account)):
        client = _get_client()

    assert isinstance(client, vision.ImageAnnotatorClient)
