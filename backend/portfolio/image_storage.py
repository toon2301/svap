import logging

import boto3
from django.conf import settings
from django.core.files.storage import default_storage

from .models import PortfolioImage

logger = logging.getLogger(__name__)

# Poradie polí = fallback priorita (large padá na approved_key pre staršie
# záznamy). Jediný zdroj pravdy pre variant→S3 kľúč mapovanie – používa ho
# serializer (existencia variantu) aj proxy view (výber kľúča na servírovanie),
# aby sa nemohli rozísť.
PORTFOLIO_VARIANT_KEY_FIELDS = {
    "thumbnail": ("thumbnail_key",),
    "medium": ("medium_key",),
    "large": ("large_key", "approved_key"),
}
PORTFOLIO_IMAGE_VARIANTS = (*PORTFOLIO_VARIANT_KEY_FIELDS, "original")


def get_s3_client():
    return boto3.client(
        "s3",
        aws_access_key_id=getattr(settings, "AWS_ACCESS_KEY_ID", None),
        aws_secret_access_key=getattr(settings, "AWS_SECRET_ACCESS_KEY", None),
        region_name=getattr(settings, "AWS_S3_REGION_NAME", None),
    )


def variant_storage_key(image: PortfolioImage, variant: str) -> str:
    """Storage kľúč pre daný variant ('' ak variant neexistuje)."""
    if variant == "original":
        return (getattr(getattr(image, "image", None), "name", "") or "").strip()
    for field in PORTFOLIO_VARIANT_KEY_FIELDS.get(variant, ()):
        key = (getattr(image, field, "") or "").strip()
        if key:
            return key
    return ""


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
