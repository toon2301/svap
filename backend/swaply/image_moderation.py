import io
import json
import logging
import os
from typing import Dict

from django.conf import settings
from django.core.exceptions import ValidationError

logger = logging.getLogger('swaply')


LIKELIHOOD_ORDER = {
    'UNKNOWN': 0,
    'VERY_UNLIKELY': 1,
    'UNLIKELY': 2,
    'POSSIBLE': 3,
    'LIKELY': 4,
    'VERY_LIKELY': 5,
}


def _load_credentials():
    """Load Google Vision credentials, preferring JSON in env for Railway.
    Returns a dict or None to let default ADC kick in (GOOGLE_APPLICATION_CREDENTIALS).
    """
    json_env = getattr(settings, 'GCP_VISION_SERVICE_ACCOUNT_JSON', None)
    if json_env:
        try:
            return json.loads(json_env)
        except Exception as e:
            logger.error(f"Invalid GCP_VISION_SERVICE_ACCOUNT_JSON: {e}")
            raise
    return None


def _get_client():
    # Lazy import to avoid mandatory dependency in contexts where it's not needed
    from google.cloud import vision
    from google.oauth2 import service_account

    creds_json = _load_credentials()
    if creds_json:
        credentials = service_account.Credentials.from_service_account_info(creds_json)
        client = vision.ImageAnnotatorClient(credentials=credentials)
    else:
        # Falls back to GOOGLE_APPLICATION_CREDENTIALS or default env-based ADC
        client = vision.ImageAnnotatorClient()
    return client


def _violates_thresholds(safe_search_result, thresholds: Dict[str, str]) -> Dict[str, str]:
    """Compare result against thresholds. Returns offending categories dict or empty dict."""
    result_map = {
        'adult': safe_search_result.adult.name,
        'violence': safe_search_result.violence.name,
        'racy': safe_search_result.racy.name,
        # 'spoof': safe_search_result.spoof.name,
        # 'medical': safe_search_result.medical.name,
    }

    offending = {}
    for key, min_level in thresholds.items():
        actual = result_map.get(key, 'UNKNOWN')
        if LIKELIHOOD_ORDER.get(actual, 0) >= LIKELIHOOD_ORDER.get(min_level, 99):
            offending[key] = actual
    return offending


def check_image_safety(file_obj) -> None:
    """Run SafeSearch on file-like object. Raises ValidationError if content violates thresholds.

    Respects settings:
    - SAFESEARCH_ENABLED
    - SAFESEARCH_TIMEOUT (not directly supported by SDK; network timeout is global)
    - SAFESEARCH_FAIL_OPEN
    - SAFESEARCH_MIN_* thresholds
    """
    if not getattr(settings, 'SAFESEARCH_ENABLED', True):
        return

    # Read bytes; reset cursor after
    position = file_obj.tell() if hasattr(file_obj, 'tell') else None
    content = file_obj.read()
    try:
        from google.cloud import vision

        image = vision.Image(content=content)
        client = _get_client()
        response = client.safe_search_detection(image=image)

        if response.error.message:
            raise RuntimeError(response.error.message)

        thresholds = {
            'adult': getattr(settings, 'SAFESEARCH_MIN_ADULT', 'POSSIBLE'),
            'violence': getattr(settings, 'SAFESEARCH_MIN_VIOLENCE', 'LIKELY'),
            'racy': getattr(settings, 'SAFESEARCH_MIN_RACY', 'LIKELY'),
        }
        result = response.safe_search_annotation
        offending = _violates_thresholds(result, thresholds)
        if offending:
            logger.info(f"Image rejected by SafeSearch: {offending}")
            raise ValidationError('Obrázok bol zamietnutý kvôli nevhodnému obsahu.')
    except Exception as e:
        # Fail-open vs fail-closed
        if getattr(settings, 'SAFESEARCH_FAIL_OPEN', True):
            logger.warning(f"SafeSearch check failed, allowing upload (fail-open): {e}")
        else:
            logger.error(f"SafeSearch check failed, denying upload (fail-closed): {e}")
            raise ValidationError('Kontrola bezpečnosti obrázka zlyhala, skúste neskôr.')
    finally:
        try:
            if position is not None:
                file_obj.seek(position)
            else:
                file_obj.seek(0)
        except Exception:
            pass


