from __future__ import annotations

# Priamy re-export realtime notify_user pre messaging views.
# Views volajú `notification_dispatch.notify_user(...)` (cez modul, nie cez
# naviazaný názov), takže testy vedia patchnúť jediný cieľ
# `messaging.api.notification_dispatch.notify_user` a zachytiť práve messaging
# dispatch volania.
from accounts.realtime import notify_user

__all__ = ["notify_user"]
