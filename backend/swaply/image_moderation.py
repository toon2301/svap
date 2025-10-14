import io
import json
import logging
import os
from typing import Dict
import sys

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
LIKELIHOOD_NAMES = ['UNKNOWN', 'VERY_UNLIKELY', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'VERY_LIKELY']


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
        # Debug: log which service account email sa použije
        try:
            if getattr(settings, 'SAFESEARCH_DEBUG_LOG', False):
                email = creds_json.get('client_email')
                logger.info(f"SafeSearch using service account: {email}")
        except Exception:
            pass
        credentials = service_account.Credentials.from_service_account_info(creds_json)
        client = vision.ImageAnnotatorClient(credentials=credentials)
    else:
        # Prefer explicit GOOGLE_APPLICATION_CREDENTIALS file if available,
        # aby sme sa vyhli nečakaným ADC (gcloud user creds)
        path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
        try:
            if path:
                norm = os.path.normpath(path.strip().strip('"\''))
                if os.path.exists(norm):
                    if getattr(settings, 'SAFESEARCH_DEBUG_LOG', False):
                        logger.info(f"SafeSearch using service account file: {norm}")
                    credentials = service_account.Credentials.from_service_account_file(norm)
                    # Log client_email z credentials, ak je dostupný
                    try:
                        info = json.loads(open(norm, 'r').read())
                        if getattr(settings, 'SAFESEARCH_DEBUG_LOG', False):
                            logger.info(f"SafeSearch service account email (file): {info.get('client_email')}")
                    except Exception:
                        pass
                    return vision.ImageAnnotatorClient(credentials=credentials)
        except Exception as e:
            if getattr(settings, 'SAFESEARCH_DEBUG_LOG', False):
                logger.warning(f"Falling back to ADC due to error with file creds: {e}")
        # Ak nie je k dispozícii env JSON ani súbor a je prísny režim, nepoužívaj ADC
        if getattr(settings, 'SAFESEARCH_STRICT_MODE', False):
            raise RuntimeError('Vision credentials not configured (no env JSON nor GOOGLE_APPLICATION_CREDENTIALS file)')
        # Fallback na ADC (len ak nie je STRICT_MODE)
        try:
            if getattr(settings, 'SAFESEARCH_DEBUG_LOG', False):
                logger.info("SafeSearch using ADC (default application credentials)")
        except Exception:
            pass
        client = vision.ImageAnnotatorClient()
    return client


def _violates_thresholds(safe_search_result, thresholds: Dict[str, str]) -> Dict[str, str]:
    """Compare result against thresholds. Returns offending categories dict or empty dict.

    Vision SDK returns integers 0..5 for likelihood fields. We compare ints directly.
    """
    result_map_ints = {
        'adult': getattr(safe_search_result, 'adult', 0),
        'violence': getattr(safe_search_result, 'violence', 0),
        'racy': getattr(safe_search_result, 'racy', 0),
    }

    offending = {}
    # Vyhodnot najprv 'adult' a 'violence' – pre tieto aplikuj prahy vždy
    for key in ('adult', 'violence'):
        min_level = thresholds.get(key)
        if min_level is None:
            continue
        actual_int = int(result_map_ints.get(key, 0) or 0)
        min_int = LIKELIHOOD_ORDER.get((min_level or 'UNKNOWN').upper(), 99)
        if actual_int >= min_int:
            name = LIKELIHOOD_NAMES[actual_int] if 0 <= actual_int < len(LIKELIHOOD_NAMES) else 'UNKNOWN'
            offending[key] = name

    # 'racy' sprav podľa politiky – umožni plavky, ak neprekračujú adult/violence
    racy_min_level = thresholds.get('racy')
    if racy_min_level is not None:
        actual_racy = int(result_map_ints.get('racy', 0) or 0)
        racy_min_int = LIKELIHOOD_ORDER.get((racy_min_level or 'UNKNOWN').upper(), 99)
        block_on_racy_alone = getattr(settings, 'SAFESEARCH_BLOCK_ON_RACY_WITHOUT_ADULT', False)
        # Blokuj racy iba ak je to vynútené, alebo ak už blokujú adult/violence
        if actual_racy >= racy_min_int and (block_on_racy_alone or 'adult' in offending or 'violence' in offending):
            name = LIKELIHOOD_NAMES[actual_racy] if 0 <= actual_racy < len(LIKELIHOOD_NAMES) else 'UNKNOWN'
            offending['racy'] = name
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
        if getattr(settings, 'SAFESEARCH_DEBUG_LOG', False):
            try:
                logger.info(
                    "SafeSearch raw: adult=%s violence=%s racy=%s thresholds=%s",
                    getattr(result, 'adult', None),
                    getattr(result, 'violence', None),
                    getattr(result, 'racy', None),
                    thresholds,
                )
            except Exception:
                pass
        offending = _violates_thresholds(result, thresholds)
        if offending:
            logger.info(f"Image rejected by SafeSearch: {offending}")
            raise ValidationError('Obrázok bol zamietnutý kvôli nevhodnému obsahu.')
    except ValidationError:
        # Re-raise ValidationError for content violations (always block)
        raise
    except Exception as e:
        # Fail-open vs fail-closed pre technické chyby: rešpektuj SAFESEARCH_FAIL_OPEN jednoznačne
        if getattr(settings, 'SAFESEARCH_FAIL_OPEN', True):
            logger.warning(f"SafeSearch check failed, allowing upload (fail-open): {e}")
            return
        logger.error(f"SafeSearch check failed, denying upload (fail-closed): {e}")
        message = 'Kontrola bezpečnosti obrázka zlyhala, skúste neskôr.'
        if getattr(settings, 'DEBUG', False) or getattr(settings, 'SAFESEARCH_DEBUG_LOG', False):
            try:
                message = f"{message} ({type(e).__name__}: {e})"
            except Exception:
                pass
        raise ValidationError(message)
    finally:
        try:
            if position is not None:
                file_obj.seek(position)
            else:
                file_obj.seek(0)
        except Exception:
            pass


