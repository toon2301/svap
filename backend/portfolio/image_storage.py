import logging

from django.core.files.storage import default_storage

from .models import PortfolioImage

logger = logging.getLogger(__name__)


def delete_storage_keys(keys) -> None:
    for key in dict.fromkeys((key or "").strip() for key in keys):
        if not key:
            continue
        try:
            default_storage.delete(key)
        except Exception as exc:
            logger.exception(
                "Failed to delete portfolio image storage key",
                extra={"storage_key": key, "error": str(exc)},
            )


def image_storage_keys(image: PortfolioImage) -> list[str]:
    image_name = getattr(getattr(image, "image", None), "name", "") or ""
    return [
        image.pending_key,
        image.thumbnail_key,
        image.medium_key,
        image.large_key,
        image.approved_key,
        image_name,
    ]
