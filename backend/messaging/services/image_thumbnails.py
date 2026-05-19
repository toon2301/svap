from __future__ import annotations

import io
from typing import TYPE_CHECKING

from django.core.files.base import ContentFile

if TYPE_CHECKING:
    from ..models import Message


MESSAGE_THUMBNAIL_MAX_SIDE = 512
MESSAGE_THUMBNAIL_QUALITY = 82


def _register_heif_support() -> None:
    """Enable HEIC/HEIF decoding when the optional pillow-heif package is available."""
    try:
        from pillow_heif import register_heif_opener

        register_heif_opener()
    except Exception:
        return


def _normalize_image_mode(image):
    """Return an image mode that Pillow can reliably encode as WebP."""
    if image.mode in ("RGBA", "LA"):
        return image
    if image.mode == "P" and "transparency" in image.info:
        return image.convert("RGBA")
    if image.mode != "RGB":
        return image.convert("RGB")
    return image


def build_message_thumbnail(image_field) -> ContentFile | None:
    """Build a small WebP preview for a validated message image."""
    if not image_field:
        return None

    _register_heif_support()
    try:
        from PIL import Image, ImageOps

        image_field.open("rb")
        image_file = image_field.file
        image_file.seek(0)
        with Image.open(image_file) as source:
            image = ImageOps.exif_transpose(source)
            image.thumbnail((MESSAGE_THUMBNAIL_MAX_SIDE, MESSAGE_THUMBNAIL_MAX_SIDE))
            image = _normalize_image_mode(image)

            output = io.BytesIO()
            image.save(output, format="WEBP", quality=MESSAGE_THUMBNAIL_QUALITY, method=6)
            output.seek(0)
            return ContentFile(output.read(), name="thumbnail.webp")
    except Exception:
        return None
    finally:
        try:
            image_field.close()
        except Exception:
            pass


def attach_message_thumbnail(message: "Message") -> None:
    """Attach a generated thumbnail to a message, falling back silently on failure."""
    if not message.image or message.image_thumbnail:
        return

    thumbnail = build_message_thumbnail(message.image)
    if thumbnail is None:
        return

    message.image_thumbnail.save(thumbnail.name, thumbnail, save=False)
    type(message).objects.filter(id=message.id).update(
        image_thumbnail=message.image_thumbnail.name,
    )
