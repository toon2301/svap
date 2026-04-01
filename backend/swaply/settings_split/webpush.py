import os
from .env import env_bool


def _env_rollout_percent(name: str, default: int = 100) -> int:
    raw = os.getenv(name, str(default)).strip()
    try:
        value = int(raw)
    except (TypeError, ValueError):
        value = default
    return max(0, min(100, value))


WEB_PUSH_VAPID_PUBLIC_KEY = os.getenv("WEB_PUSH_VAPID_PUBLIC_KEY", "").strip()
WEB_PUSH_VAPID_PRIVATE_KEY = os.getenv("WEB_PUSH_VAPID_PRIVATE_KEY", "").strip()
WEB_PUSH_VAPID_SUBJECT = os.getenv("WEB_PUSH_VAPID_SUBJECT", "").strip()
WEB_PUSH_SUBSCRIPTION_ENCRYPTION_KEY = os.getenv(
    "WEB_PUSH_SUBSCRIPTION_ENCRYPTION_KEY", ""
).strip()
WEB_PUSH_MESSAGES_ENABLED = env_bool("WEB_PUSH_MESSAGES_ENABLED", True)
WEB_PUSH_MESSAGES_ROLLOUT_PERCENT = _env_rollout_percent(
    "WEB_PUSH_MESSAGES_ROLLOUT_PERCENT",
    100,
)
