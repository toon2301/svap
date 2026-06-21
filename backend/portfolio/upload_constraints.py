from django.conf import settings


def allowed_image_extensions() -> list[str]:
    return [
        ext.strip().lower()
        for ext in getattr(
            settings,
            "ALLOWED_IMAGE_EXTENSIONS",
            [".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif"],
        )
    ]


def max_image_bytes() -> int:
    try:
        max_mb = int(getattr(settings, "IMAGE_MAX_SIZE_MB", 5))
    except Exception:
        max_mb = 5
    return max_mb * 1024 * 1024
