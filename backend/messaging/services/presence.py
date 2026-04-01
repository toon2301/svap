from __future__ import annotations

from time import time

from django.core.cache import cache

MESSAGE_PRESENCE_CACHE_PREFIX = "msg_presence"
MESSAGE_PRESENCE_TTL_SECONDS = 75
MESSAGE_PRESENCE_FRESH_SECONDS = 35


def _normalize_positive_ids(values) -> tuple[int, ...]:
    normalized: list[int] = []
    for value in values or []:
        try:
            parsed = int(value)
        except (TypeError, ValueError):
            continue
        if parsed > 0:
            normalized.append(parsed)
    return tuple(sorted(set(normalized)))


def _presence_cache_key(user_id: int) -> str:
    return f"{MESSAGE_PRESENCE_CACHE_PREFIX}:{int(user_id)}"


def store_message_presence(
    *,
    user_id: int,
    visible: bool,
    active_conversation_id: int | None,
) -> dict[str, int | bool | None]:
    payload = {
        "visible": bool(visible),
        "active_conversation_id": int(active_conversation_id)
        if bool(visible) and active_conversation_id is not None
        else None,
        "seen_at": int(time()),
    }
    cache.set(
        _presence_cache_key(user_id),
        payload,
        timeout=MESSAGE_PRESENCE_TTL_SECONDS,
    )
    return payload


def get_message_presence_for_users(*, user_ids) -> dict[int, dict[str, int | bool | None]]:
    normalized_user_ids = _normalize_positive_ids(user_ids)
    if not normalized_user_ids:
        return {}

    keys_by_user_id = {
        user_id: _presence_cache_key(user_id) for user_id in normalized_user_ids
    }
    cached = cache.get_many(keys_by_user_id.values())
    result: dict[int, dict[str, int | bool | None]] = {}

    for user_id, cache_key in keys_by_user_id.items():
        value = cached.get(cache_key)
        if isinstance(value, dict):
            result[user_id] = value

    return result


def get_suppressed_message_push_recipient_ids(
    *,
    user_ids,
    conversation_id: int,
) -> tuple[int, ...]:
    normalized_user_ids = _normalize_positive_ids(user_ids)
    if not normalized_user_ids:
        return ()

    now = int(time())
    suppressed: list[int] = []
    presence_by_user_id = get_message_presence_for_users(user_ids=normalized_user_ids)

    for user_id in normalized_user_ids:
        payload = presence_by_user_id.get(user_id)
        if not isinstance(payload, dict):
            continue

        if payload.get("visible") is not True:
            continue

        if payload.get("active_conversation_id") != int(conversation_id):
            continue

        seen_at = payload.get("seen_at")
        if not isinstance(seen_at, int):
            continue

        if now - seen_at > MESSAGE_PRESENCE_FRESH_SECONDS:
            continue

        suppressed.append(user_id)

    return tuple(suppressed)
