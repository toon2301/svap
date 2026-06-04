from django.core.files.storage import default_storage

from .models import PortfolioImage


def delete_storage_keys(keys) -> None:
    for key in dict.fromkeys((key or "").strip() for key in keys):
        if not key:
            continue
        try:
            default_storage.delete(key)
        except Exception:
            pass


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
