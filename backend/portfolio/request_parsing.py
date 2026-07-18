"""Strict request parsing helpers for portfolio endpoints."""


def parse_id_list(value):
    """Return positive integer IDs, rejecting coercion-prone values."""
    if not isinstance(value, list):
        return None

    parsed = []
    for raw_id in value:
        if isinstance(raw_id, bool):
            return None
        if isinstance(raw_id, int):
            item_id = raw_id
        elif isinstance(raw_id, str) and raw_id.isascii() and raw_id.isdigit():
            item_id = int(raw_id)
        else:
            return None
        if item_id < 1:
            return None
        parsed.append(item_id)
    return parsed
