"""
Realtime helpers (Django Channels).

Tento modul držíme malý a bezpečný:
- ak channel layer nie je dostupný, funkcie fail-open (nezhodia request).
"""

from asgiref.sync import async_to_sync


def notify_user(user_id: int, event: dict) -> None:
    """
    Pošli event cez WS do groupy pre používateľa.

    event je čistý dict, ktorý sa serializuje do JSON v consumerovi.
    """
    try:
        from channels.layers import get_channel_layer
    except Exception:
        return

    try:
        channel_layer = get_channel_layer()
        if not channel_layer:
            return
        async_to_sync(channel_layer.group_send)(
            f"user_{int(user_id)}",
            {"type": "notify", "event": event},
        )
    except Exception:
        # fail-open: notifikácia je best-effort, nech nespadne API request
        return
