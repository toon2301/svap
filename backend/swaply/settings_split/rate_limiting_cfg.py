from .env import sys, env_bool
from .security import DEBUG

# Rate limiting toggles
# V testoch vypneme rate limiting
RATE_LIMITING_ENABLED = env_bool('RATE_LIMITING_ENABLED', True) and not ('test' in sys.argv or 'pytest' in sys.modules)
RATE_LIMIT_DISABLED = env_bool('RATE_LIMIT_DISABLED', False) or ('test' in sys.argv or 'pytest' in sys.modules)

# Výnimky/override pre lokálny vývoj (DEBUG)
if DEBUG:
    # Povoliť registráciu bez rate limitu v lokále
    RATE_LIMIT_ALLOW_PATHS = ['/api/auth/register/']
    # Zvýšiť limity pre register ak by allow_paths neboli uplatnené
    RATE_LIMIT_OVERRIDES = {
        'register': {
            'max_attempts': 100,
            'window_minutes': 1,
            'block_minutes': 1,
        }
    }


