"""Príprava fotky ponuky pre starý multipart endpoint (nález 282).

`prepare_offer_image_upload` očistí fotku od EXIF a polohy GPS, dá jej anonymný názov a odmietne súbor, z ktorého sa
metadáta nedajú bezpečne odstrániť. Verejná fotka ponuky tak nikdy neprezradí, kde bola nasnímaná ani ako sa volal súbor.
"""

import re
from io import BytesIO

import pytest
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from accounts.offer_image_upload import prepare_offer_image_upload
from accounts.test.test_avatar_upload_s3 import (
    generate_corrupted_heic_with_gps,
    generate_heic_file,
    generate_image_with_gps_exif,
    generate_jpeg_with_gps_exif,
)
from swaply.test.image_samples import UPLOAD_NAME, make_image

#: Názov po úprave: 32 hexadecimálnych znakov (uuid) a prípona podľa výstupného formátu.
ANONYMOUS_NAME = re.compile(r"^[0-9a-f]{32}\.(jpg|png|webp|gif)$")

GPS_IFD = 0x8825


def _upload(fmt: str) -> SimpleUploadedFile:
    """Obyčajný (bez metadát) obrázok daného formátu pod názvom, pod ktorým ho klient nahrá."""
    return SimpleUploadedFile(UPLOAD_NAME[fmt], make_image(fmt))


def _decode(content: ContentFile) -> Image.Image:
    """Dekóduje výsledok funkcie, aby sa dal skontrolovať formát a metadáta."""
    return Image.open(BytesIO(content.read()))


@pytest.mark.parametrize(
    ("fmt", "suffix", "pillow_format"),
    [
        ("JPEG", ".jpg", "JPEG"),
        ("PNG", ".png", "PNG"),
        ("WEBP", ".webp", "WEBP"),
        ("HEIC", ".jpg", "JPEG"),
        ("MPO", ".jpg", "JPEG"),
    ],
)
def test_allowed_formats_are_reencoded_under_an_anonymous_name(
    fmt, suffix, pillow_format
):
    """Každý povolený formát (okrem GIF) sa prekóduje; HEIC aj MPO vyjdú ako JPEG a názov je anonymný."""
    result = prepare_offer_image_upload(_upload(fmt))

    assert isinstance(result, ContentFile)
    assert ANONYMOUS_NAME.match(result.name)
    assert result.name.endswith(suffix)
    with _decode(result) as image:
        assert image.format == pillow_format


@pytest.mark.parametrize(
    "build_upload",
    [
        generate_jpeg_with_gps_exif,
        lambda: generate_image_with_gps_exif("PNG", "gps.png", "image/png"),
        lambda: generate_image_with_gps_exif("WEBP", "gps.webp", "image/webp"),
        lambda: generate_heic_file("gps.heic", include_gps=True),
    ],
    ids=["jpeg", "png", "webp", "heic"],
)
def test_gps_location_is_removed(build_upload):
    """Výsledok už nenesie EXIF ani GPS, hoci vstup ich mal (predpoklad sa overuje, nech test nepreukazuje nič nad ničím)."""
    upload = build_upload()
    with Image.open(BytesIO(upload.read())) as source:
        assert source.getexif().get_ifd(GPS_IFD), "vstup musí obsahovať GPS"
    upload.seek(0)

    result = prepare_offer_image_upload(upload)

    with _decode(result) as image:
        assert len(image.getexif()) == 0
        assert not image.getexif().get_ifd(GPS_IFD)


def test_the_original_filename_is_not_kept():
    """Názov, ktorý zvolil používateľ (môže byť osobný), sa do výsledku nedostane."""
    upload = generate_jpeg_with_gps_exif("jan-novak-dovolenka.jpg")

    result = prepare_offer_image_upload(upload)

    assert "novak" not in result.name
    assert ANONYMOUS_NAME.match(result.name)


def test_every_call_gets_a_different_name():
    """Dve fotky nikdy nedostanú rovnaký názov (inak by si v úložisku prepisovali súbor)."""
    names = {prepare_offer_image_upload(_upload("JPEG")).name for _ in range(5)}

    assert len(names) == 5


def test_gif_is_kept_unchanged_under_an_anonymous_name():
    """GIF nemá EXIF a prekódovanie by zničilo animáciu, preto ostane bajt po bajte rovnaký, len s novým názvom."""
    original = make_image("GIF")

    result = prepare_offer_image_upload(SimpleUploadedFile("animacia.gif", original))

    assert result.read() == original
    assert ANONYMOUS_NAME.match(result.name)
    assert result.name.endswith(".gif")


def test_gif_under_another_extension_is_rejected():
    """GIF sa ponechá len vtedy, keď prípona aj obsah súhlasia; GIF premenovaný na `.jpg` sa odmietne."""
    with pytest.raises(ValidationError):
        prepare_offer_image_upload(SimpleUploadedFile("photo.jpg", make_image("GIF")))


@pytest.mark.parametrize("name", ["photo.jpg", "photo.gif", "photo.heic"])
def test_content_that_is_not_an_image_is_rejected(name):
    """Súbor, ktorý sa nedá dekódovať, sa neuloží v pôvodnej podobe pod žiadnou povolenou príponou."""
    with pytest.raises(ValidationError):
        prepare_offer_image_upload(
            SimpleUploadedFile(name, b"toto nie je obrazok" * 20)
        )


def test_heic_that_cannot_be_decoded_is_rejected_even_though_it_carries_gps():
    """Poškodený HEIC s GPS sa neuloží, lebo jeho polohu nie je možné odstrániť (strip vráti `None`)."""
    with pytest.raises(ValidationError):
        prepare_offer_image_upload(generate_corrupted_heic_with_gps())


def test_empty_input_is_returned_as_it_is():
    """Bez súboru nie je čo upravovať (rovnaké správanie ako pri avatare)."""
    assert prepare_offer_image_upload(None) is None
