"""Odstránenie metadát z animovaného PNG a WebP bez straty snímok (nález 282).

`strip_image_metadata` ukladá PNG aj WebP ako jedinú snímku, takže by sa animácia stratila. `strip_animated_image_metadata`
preto z kontajnera odstráni len metadáta (EXIF s polohou GPS, XMP, textové chunky, neznáme chunky aj údaje za koncom
súboru) a snímky s ich časovaním nechá bajt po bajte.
"""

import io
import zlib

import pytest
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image, ImageCms

from swaply import animated_image_metadata
from swaply.animated_image_metadata import strip_animated_image_metadata
from swaply.test.image_samples import (
    ANIMATION_LOOP,
    ANIMATION_SECRET_MARKERS,
    NOT_AN_IMAGE,
    animation_of,
    make_animated_image,
    make_image,
)

GPS_IFD = 0x8825
#: Bajt s príznakmi v chunku VP8X: 12 B hlavička RIFF + 8 B hlavička chunku.
WEBP_FLAGS_OFFSET = 20
WEBP_ANIMATION_FLAG = 0x02
WEBP_EXIF_AND_XMP_FLAGS = 0x08 | 0x04
#: Chunky PNG, ktoré nesú metadáta a v súbore po úprave byť nesmú.
PNG_METADATA_CHUNKS = {b"eXIf", b"tEXt", b"iTXt"}
TRAILING_DATA = b"TrailingPrivateData"


def png_chunks(data: bytes) -> list[bytes]:
    """Typy chunkov PNG v poradí, v akom sú v súbore (po IEND)."""
    kinds, position = [], 8
    while position + 12 <= len(data):
        length = int.from_bytes(data[position : position + 4], "big")
        kinds.append(data[position + 4 : position + 8])
        position += 12 + length
        if kinds[-1] == b"IEND":
            break
    return kinds


def webp_chunks(data: bytes) -> list[bytes]:
    """Typy chunkov RIFF vo WebP v poradí, v akom sú v súbore (po koniec RIFF)."""
    kinds, position = [], 12
    end = 8 + int.from_bytes(data[4:8], "little")
    while position + 8 <= end:
        size = int.from_bytes(data[position + 4 : position + 8], "little")
        kinds.append(data[position : position + 4])
        position += 8 + size + size % 2
    return kinds


def png_chunk(kind: bytes, payload: bytes = b"") -> bytes:
    """Chunk PNG so správnym CRC."""
    crc = zlib.crc32(kind + payload).to_bytes(4, "big")
    return len(payload).to_bytes(4, "big") + kind + payload + crc


def with_png_chunk(data: bytes, chunk: bytes) -> bytes:
    """PNG s chunkom vloženým tesne pred IEND."""
    iend = png_chunk(b"IEND")
    assert data.endswith(iend)
    return data[: -len(iend)] + chunk + iend


def with_png_chunks_after_header(data: bytes, chunks: list[bytes]) -> bytes:
    """PNG s chunkmi vloženými hneď za hlavičku IHDR (podpis 8 B + IHDR 25 B)."""
    after_header = 8 + 25
    assert data[12:16] == b"IHDR"
    return data[:after_header] + b"".join(chunks) + data[after_header:]


def webp_chunk(kind: bytes, payload: bytes) -> bytes:
    """Chunk RIFF vo WebP (nepárna veľkosť dostane výplňový bajt)."""
    padding = b"\x00" * (len(payload) % 2)
    return kind + len(payload).to_bytes(4, "little") + payload + padding


def with_webp_chunk(data: bytes, chunk: bytes) -> bytes:
    """WebP s chunkom vloženým za hlavičku VP8X a s opravenou veľkosťou RIFF."""
    after_vp8x = 12 + 8 + 10
    body = data[8:after_vp8x] + chunk + data[after_vp8x:]
    return b"RIFF" + len(body).to_bytes(4, "little") + body


def with_broken_first_frame(data: bytes) -> bytes:
    """PNG s poškodenou hlavičkou dát prvej snímky (chunk IDAT), takže sa nedá dekódovať."""
    position = data.index(b"IDAT") + 4
    return data[:position] + bytes([data[position] ^ 0xFF]) + data[position + 1 :]


def upload(data: bytes, name: str = "photo.bin") -> SimpleUploadedFile:
    """Nahraný súbor s danými bajtmi."""
    return SimpleUploadedFile(name, data)


def test_animated_webp_keeps_every_frame_and_loses_the_metadata():
    """Animovaný WebP si zachová všetky snímky, ich trvanie aj počet opakovaní; EXIF s polohou GPS a XMP zmiznú."""
    source = make_animated_image("WEBP", with_metadata=True)
    with Image.open(io.BytesIO(source)) as original:
        assert original.getexif().get_ifd(GPS_IFD), "vstup musí obsahovať GPS"

    result = strip_animated_image_metadata(upload(source), filename="anon")

    assert isinstance(result, ContentFile)
    assert result.name == "anon.webp"
    cleaned = result.read()
    assert animation_of(cleaned) == animation_of(source)
    kinds = webp_chunks(cleaned)
    assert b"EXIF" not in kinds
    assert b"XMP " not in kinds
    assert kinds[0] == b"VP8X"
    assert kinds.count(b"ANMF") == 3
    flags = cleaned[WEBP_FLAGS_OFFSET]
    assert flags & WEBP_ANIMATION_FLAG
    assert not flags & WEBP_EXIF_AND_XMP_FLAGS
    assert int.from_bytes(cleaned[4:8], "little") + 8 == len(cleaned)
    assert not any(marker in cleaned for marker in ANIMATION_SECRET_MARKERS)
    with Image.open(io.BytesIO(cleaned)) as image:
        assert image.info["loop"] == ANIMATION_LOOP
        assert "exif" not in image.info
        assert "xmp" not in image.info


def test_animated_png_keeps_every_frame_and_loses_the_metadata():
    """Animovaný PNG si zachová všetky snímky, ich trvanie aj počet opakovaní; eXIf, tEXt a iTXt zmiznú."""
    source = make_animated_image("PNG", with_metadata=True)
    assert PNG_METADATA_CHUNKS <= set(
        png_chunks(source)
    ), "vstup musí obsahovať metadáta"

    result = strip_animated_image_metadata(upload(source), filename="anon")

    assert isinstance(result, ContentFile)
    assert result.name == "anon.png"
    cleaned = result.read()
    assert animation_of(cleaned) == animation_of(source)
    expected = [kind for kind in png_chunks(source) if kind not in PNG_METADATA_CHUNKS]
    assert png_chunks(cleaned) == expected
    assert not any(marker in cleaned for marker in ANIMATION_SECRET_MARKERS)
    with Image.open(io.BytesIO(cleaned)) as image:
        assert image.info["loop"] == ANIMATION_LOOP
        assert "exif" not in image.info
        assert not image.getexif().get_ifd(GPS_IFD)


@pytest.mark.parametrize(
    ("fmt", "profile_chunk"), [("WEBP", b"ICCP"), ("PNG", b"iCCP")]
)
def test_the_colour_profile_is_kept(fmt, profile_chunk):
    """Farebný profil patrí k zobrazeniu obrázka, nie k metadátam, takže ostane (inak by sa farby zmenili)."""
    profile = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()
    frames = [Image.new("RGB", (24, 16), color) for color in ((255, 0, 0), (0, 0, 255))]
    buffer = io.BytesIO()
    frames[0].save(
        buffer,
        format=fmt,
        save_all=True,
        append_images=frames[1:],
        duration=100,
        icc_profile=profile,
    )
    source = buffer.getvalue()

    cleaned = strip_animated_image_metadata(upload(source)).read()

    chunks = webp_chunks(cleaned) if fmt == "WEBP" else png_chunks(cleaned)
    assert profile_chunk in chunks
    with Image.open(io.BytesIO(cleaned)) as image:
        assert image.info["icc_profile"] == profile
        assert image.n_frames == 2


def test_a_kept_webp_chunk_with_an_odd_size_keeps_its_padding():
    """Zachovaný chunk s nepárnou veľkosťou (tu farebný profil) dostane výplňový bajt, takže RIFF ostane platný."""
    frames = [Image.new("RGB", (24, 16), color) for color in ((255, 0, 0), (0, 0, 255))]
    buffer = io.BytesIO()
    frames[0].save(
        buffer,
        format="WEBP",
        save_all=True,
        append_images=frames[1:],
        duration=100,
        lossless=True,
        icc_profile=b"x" * 101,
    )
    source = buffer.getvalue()

    cleaned = strip_animated_image_metadata(upload(source)).read()

    assert webp_chunks(cleaned) == webp_chunks(source)
    assert int.from_bytes(cleaned[4:8], "little") + 8 == len(cleaned)
    assert animation_of(cleaned) == animation_of(source)


def test_the_display_chunks_of_an_animated_png_are_kept():
    """Chunky, ktoré určujú zobrazenie snímok (paleta, priehľadnosť, farby, rozmer pixelu), ostanú všetky."""
    clean = make_animated_image("PNG")
    display_chunks = [
        png_chunk(b"sRGB", b"\x00"),
        png_chunk(b"gAMA", (45455).to_bytes(4, "big")),
        png_chunk(b"cHRM", bytes(32)),
        png_chunk(b"cICP", bytes([1, 13, 0, 1])),
        png_chunk(b"sBIT", bytes([8, 8, 8])),
        png_chunk(b"PLTE", bytes(6)),
        png_chunk(b"tRNS", bytes(6)),
        png_chunk(b"bKGD", bytes(6)),
        png_chunk(b"pHYs", bytes(9)),
    ]
    source = with_png_chunks_after_header(clean, display_chunks)

    cleaned = strip_animated_image_metadata(upload(source)).read()

    assert png_chunks(cleaned) == png_chunks(source)
    assert animation_of(cleaned) == animation_of(clean)


def test_the_name_defaults_to_the_upload_name_with_the_suffix_of_the_real_format():
    """Prípona výsledku vychádza zo skutočného formátu, nie z prípony nahraného súboru."""
    result = strip_animated_image_metadata(
        upload(make_animated_image("WEBP"), "photo.PNG")
    )

    assert result.name == "photo.webp"


@pytest.mark.parametrize(
    "data",
    [
        pytest.param(make_image("PNG"), id="PNG s jednou snímkou"),
        pytest.param(make_image("WEBP"), id="WebP s jednou snímkou"),
        pytest.param(make_image("JPEG"), id="JPEG"),
        pytest.param(make_image("MPO"), id="MPO"),
        pytest.param(make_image("HEIC"), id="HEIC"),
        pytest.param(make_image("GIF"), id="GIF"),
        pytest.param(NOT_AN_IMAGE, id="nie je obrázok"),
        pytest.param(b"", id="prázdny súbor"),
    ],
)
def test_everything_but_animated_png_and_webp_is_left_to_the_regular_path(data):
    """Statické obrázky a iné formáty sa tu nespracujú (`None`): ostávajú na bežnom prekódovaní."""
    assert strip_animated_image_metadata(upload(data)) is None


def test_an_animated_gif_is_left_alone():
    """Animovaný GIF tu nie je na rade (nemá EXIF); volajúci ho ponechá nezmenený."""
    frames = [Image.new("RGB", (24, 16), color) for color in ((255, 0, 0), (0, 255, 0))]
    buffer = io.BytesIO()
    frames[0].save(buffer, "GIF", save_all=True, append_images=frames[1:])

    assert strip_animated_image_metadata(upload(buffer.getvalue())) is None


def test_no_upload_is_ignored():
    """Bez súboru sa nič nerobí."""
    assert strip_animated_image_metadata(None) is None


@pytest.mark.parametrize("fmt", ["WEBP", "PNG"])
def test_a_truncated_animation_is_not_cleaned(fmt):
    """Skrátený súbor sa nedá spoľahlivo očistiť (`None`), takže ho spracuje bežná cesta alebo sa odmietne."""
    source = make_animated_image(fmt, with_metadata=True)

    assert strip_animated_image_metadata(upload(source[:-40])) is None


@pytest.mark.parametrize("fmt", ["WEBP", "PNG"])
def test_data_after_the_end_of_the_image_is_dropped(fmt):
    """Čo je v súbore za koncom obrázka (za IEND, za koncom RIFF), sa nepreberá."""
    clean = make_animated_image(fmt)

    cleaned = strip_animated_image_metadata(upload(clean + TRAILING_DATA)).read()

    assert TRAILING_DATA not in cleaned
    assert animation_of(cleaned) == animation_of(clean)


def test_an_unknown_ancillary_png_chunk_is_dropped():
    """Neznámy nepovinný chunk PNG (tu súkromný `prVt`) môže niesť čokoľvek, preto sa zahodí."""
    clean = make_animated_image("PNG")
    source = with_png_chunk(clean, png_chunk(b"prVt", b"PrivateNote"))

    cleaned = strip_animated_image_metadata(upload(source)).read()

    assert b"prVt" in png_chunks(source)
    assert b"prVt" not in png_chunks(cleaned)
    assert animation_of(cleaned) == animation_of(clean)


def test_an_unknown_critical_png_chunk_rejects_the_file():
    """Neznámy povinný chunk sa nedá bezpečne zahodiť (bez neho by sa obrázok zobrazil zle), preto sa súbor nečistí."""
    source = with_png_chunk(make_animated_image("PNG"), png_chunk(b"XYZW", b"x"))

    assert strip_animated_image_metadata(upload(source)) is None


def test_an_unknown_webp_chunk_with_an_odd_size_is_dropped():
    """Neznámy chunk WebP sa zahodí aj s výplňovým bajtom (nepárna veľkosť) a zvyšok súboru ostane platný."""
    clean = make_animated_image("WEBP")
    source = with_webp_chunk(clean, webp_chunk(b"JUNK", b"PrivateNote"))

    cleaned = strip_animated_image_metadata(upload(source)).read()

    assert b"JUNK" in webp_chunks(source)
    assert b"JUNK" not in webp_chunks(cleaned)
    assert animation_of(cleaned) == animation_of(clean)
    assert int.from_bytes(cleaned[4:8], "little") + 8 == len(cleaned)


@pytest.mark.parametrize("name", ["animation.png", "photo.jpg"])
def test_the_upload_is_left_at_the_start(name):
    """Po spracovaní ostáva kurzor súboru na začiatku, aby ho mohol čítať ďalší krok."""
    data = make_animated_image("PNG") if name.endswith(".png") else make_image("JPEG")
    file = upload(data, name)
    file.seek(7)

    strip_animated_image_metadata(file)

    assert file.tell() == 0


@pytest.mark.parametrize(
    "broken",
    [
        pytest.param(lambda: make_image("PNG", size=(24, 16)), id="stratená animácia"),
        pytest.param(lambda: make_animated_image("WEBP"), id="iný formát"),
        pytest.param(
            lambda: make_animated_image("PNG", size=(10, 10)), id="iný rozmer"
        ),
        pytest.param(
            lambda: with_broken_first_frame(make_animated_image("PNG")),
            id="poškodená prvá snímka",
        ),
    ],
)
def test_a_result_that_does_not_keep_the_animation_is_rejected(monkeypatch, broken):
    """Výsledok sa pred vrátením overí (formát, počet snímok, rozmer, dekódovanie); inak je to `None`."""
    monkeypatch.setattr(
        animated_image_metadata, "_png_without_metadata", lambda data: broken()
    )

    assert (
        strip_animated_image_metadata(upload(make_animated_image("PNG"), "a.png"))
        is None
    )
