import os

from .env import sys, env_bool
from .security import DEBUG

# Počet DÔVERYHODNÝCH reverzných proxy medzi klientom a Djangom.
# Klientovu IP berieme z X-Forwarded-For na pozícii (TRUSTED_PROXY_HOPS) sprava –
# tieto položky pridáva výhradne naša infraštruktúra, takže ich klient nevie
# sfalšovať (leftmost položky áno). 0 = ignoruj XFF a použi REMOTE_ADDR
# (bezpečný default pre lokál/testy bez proxy). Produkcia hodnotu prepisuje.
try:
    TRUSTED_PROXY_HOPS = max(0, int(os.getenv("TRUSTED_PROXY_HOPS", "0")))
except (TypeError, ValueError):
    TRUSTED_PROXY_HOPS = 0

# Rate limiting toggles
# V testoch vypneme rate limiting
RATE_LIMITING_ENABLED = env_bool("RATE_LIMITING_ENABLED", True) and not (
    "test" in sys.argv or "pytest" in sys.modules
)
RATE_LIMIT_DISABLED = env_bool("RATE_LIMIT_DISABLED", False) or (
    "test" in sys.argv or "pytest" in sys.modules
)

# Výnimky/override pre lokálny vývoj (DEBUG)
if DEBUG:
    # Povoliť registráciu bez rate limitu v lokále
    RATE_LIMIT_ALLOW_PATHS = ["/api/auth/register/"]
    # Zvýšiť limity pre register ak by allow_paths neboli uplatnené
    RATE_LIMIT_OVERRIDES = {
        "register": {
            "max_attempts": 100,
            "window_minutes": 1,
            "block_minutes": 1,
        }
    }
