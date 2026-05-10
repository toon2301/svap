from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from accounts.realtime import notify_user as _default_notify_user


def notify_user(user_id: int, event: Mapping[str, Any]) -> None:
    try:
        from . import views as views_module

        current_notify_user = getattr(views_module, "notify_user", _default_notify_user)
    except Exception:
        current_notify_user = _default_notify_user

    if current_notify_user is notify_user:
        current_notify_user = _default_notify_user

    current_notify_user(user_id, event)


