from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "accounts"

    def ready(self):
        from . import signals  # noqa: F401

        # Startup kontrola: upozorni ak produkcia beží na InMemoryChannelLayer
        # (WS notifikácie by sa pri split HTTP/WS deploymente nedoručili).
        try:
            from swaply.channel_layer_check import warn_if_insecure_channel_layer

            warn_if_insecure_channel_layer()
        except Exception:
            # Kontrola je best-effort; nikdy nesmie zhodiť štart appky.
            pass
