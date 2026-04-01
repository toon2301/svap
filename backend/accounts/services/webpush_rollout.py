from __future__ import annotations

from django.conf import settings


def is_message_push_enabled() -> bool:
    return bool(getattr(settings, "WEB_PUSH_MESSAGES_ENABLED", True))


def get_message_push_rollout_percent() -> int:
    value = getattr(settings, "WEB_PUSH_MESSAGES_ROLLOUT_PERCENT", 100)
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = 100
    return max(0, min(100, parsed))


def is_user_in_message_push_rollout(user_id: int) -> bool:
    rollout_percent = get_message_push_rollout_percent()
    if rollout_percent <= 0:
        return False
    if rollout_percent >= 100:
        return True
    stable_bucket = int(user_id) % 100
    return stable_bucket < rollout_percent


def filter_message_push_rollout_user_ids(user_ids) -> tuple[int, ...]:
    filtered: list[int] = []
    for user_id in user_ids or []:
        try:
            parsed = int(user_id)
        except (TypeError, ValueError):
            continue
        if parsed > 0 and is_user_in_message_push_rollout(parsed):
            filtered.append(parsed)
    return tuple(sorted(set(filtered)))
