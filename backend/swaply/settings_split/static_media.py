from .env import os, BASE_DIR

# Static files (CSS, JavaScript, Images)
STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")

# Úložiská (Django 5.1+ pozná iba STORAGES; staré DEFAULT_FILE_STORAGE a STATICFILES_STORAGE ticho ignoruje).
# `settings_production.py` ich prepíše: médiá na S3 a statické súbory bez manifestu.
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"
    },
}

# Media files
MEDIA_URL = "/media/"
MEDIA_ROOT = os.path.join(BASE_DIR, "media")

# Default primary key field type
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
