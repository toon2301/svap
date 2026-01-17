from .env import os
from .security import DEBUG
from .env import env_bool

# SafeSearch (Google Cloud Vision) settings
SAFESEARCH_ENABLED = env_bool('SAFESEARCH_ENABLED', False)
SAFESEARCH_TIMEOUT = int(os.getenv('SAFESEARCH_TIMEOUT', '5'))
SAFESEARCH_FAIL_OPEN = env_bool('SAFESEARCH_FAIL_OPEN', True)
SAFESEARCH_SKIP_IN_TESTS = env_bool('SAFESEARCH_SKIP_IN_TESTS', True)
SAFESEARCH_ENFORCE_IN_DEBUG = env_bool('SAFESEARCH_ENFORCE_IN_DEBUG', False)
SAFESEARCH_STRICT_MODE = env_bool('SAFESEARCH_STRICT_MODE', False)
SAFESEARCH_DEBUG_LOG = env_bool('SAFESEARCH_DEBUG_LOG', DEBUG)

# Policy: ako vyhodnocovať racy vs adult
# Ak False: racy samotné nikdy neblokuje (iba adult/violence). To umožní plavky,
# ale stále zablokuje nahotu (adult=VERY_LIKELY).
SAFESEARCH_BLOCK_ON_RACY_WITHOUT_ADULT = env_bool('SAFESEARCH_BLOCK_ON_RACY_WITHOUT_ADULT', False)

# Thresholds: POSSIBLE < LIKELY < VERY_LIKELY
# Default sprísnený pre ADULT, aby zachytil nahotu aj pri LIKELY
SAFESEARCH_MIN_ADULT = os.getenv('SAFESEARCH_MIN_ADULT', 'LIKELY')
SAFESEARCH_MIN_VIOLENCE = os.getenv('SAFESEARCH_MIN_VIOLENCE', 'LIKELY')
SAFESEARCH_MIN_RACY = os.getenv('SAFESEARCH_MIN_RACY', 'LIKELY')

# Credentials – preferuj JSON v env; ak je zadaný, ignoruj ADC
GCP_VISION_SERVICE_ACCOUNT_JSON = os.getenv('GCP_VISION_SERVICE_ACCOUNT_JSON')

# Fallback - načítaj z súboru ak JSON nie je v env
if not GCP_VISION_SERVICE_ACCOUNT_JSON:
    credentials_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
    if credentials_path:
        # Odstráň prípadné úvodzovky a normalizuj cestu (Windows kompatibilita)
        try:
            credentials_path = credentials_path.strip().strip('"\'')
        except Exception:
            pass
        try:
            import os as _os
            credentials_path = _os.path.normpath(credentials_path)
        except Exception:
            pass
        if os.path.exists(credentials_path):
            try:
                with open(credentials_path, 'r') as f:
                    GCP_VISION_SERVICE_ACCOUNT_JSON = f.read()
            except Exception as e:
                print(f"Failed to load Google credentials from {credentials_path}: {e}")

# Obrázky – konfigurovateľné limity a prípony
IMAGE_MAX_SIZE_MB = int(os.getenv('IMAGE_MAX_SIZE_MB', '5'))
ALLOWED_IMAGE_EXTENSIONS = os.getenv(
    'ALLOWED_IMAGE_EXTENSIONS',
    '.jpg,.jpeg,.png,.gif,.webp,.heic,.heif'
).split(',')


