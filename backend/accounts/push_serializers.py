from collections.abc import Mapping

from rest_framework import serializers


class WebPushSubscriptionKeysSerializer(serializers.Serializer):
    p256dh = serializers.CharField(max_length=4096)
    auth = serializers.CharField(max_length=1024)


class WebPushSubscriptionPayloadSerializer(serializers.Serializer):
    endpoint = serializers.CharField(max_length=4096)
    keys = WebPushSubscriptionKeysSerializer()

    def validate_endpoint(self, value):
        normalized = (value or "").strip()
        if not normalized.startswith("https://"):
            raise serializers.ValidationError("Push endpoint musí používať HTTPS.")
        return normalized


class WebPushSubscriptionCreateSerializer(serializers.Serializer):
    subscription = WebPushSubscriptionPayloadSerializer()
    device_label = serializers.CharField(
        max_length=120,
        required=False,
        allow_blank=True,
    )


class WebPushSubscriptionDeleteSerializer(serializers.Serializer):
    endpoint = serializers.CharField(max_length=4096)

    def validate_endpoint(self, value):
        normalized = (value or "").strip()
        if not normalized.startswith("https://"):
            raise serializers.ValidationError("Push endpoint musí používať HTTPS.")
        return normalized


class PushPreferencesSerializer(serializers.Serializer):
    """
    Čiastočná zmena volieb upozornení: dva hlavné vypínače a päť kategórií (nález 321).

    Všetky polia sú voliteľné, požiadavka môže niesť ľubovoľnú podmnožinu. Názvy
    kategórií sú rovnaké ako polia UserProfile (pozri NOTIFICATION_CATEGORY_FIELDS).
    """

    in_app_notifications = serializers.BooleanField(required=False)
    push_notifications = serializers.BooleanField(required=False)
    notify_likes = serializers.BooleanField(required=False)
    notify_comment_likes = serializers.BooleanField(required=False)
    notify_comments = serializers.BooleanField(required=False)
    notify_tags_and_shares = serializers.BooleanField(required=False)
    notify_skill_requests = serializers.BooleanField(required=False)

    def to_internal_value(self, data):
        """
        Odmietne každý kľúč, ktorý nie je voľbou upozornení, aj keď je v požiadavke
        popri známom kľúči.

        DRF neznáme kľúče ticho zahodí, takže preklep v názve kategórie by skončil
        odpoveďou 200 bez zmeny. Chyba je pri každom neznámom kľúči osobitne.
        """
        if isinstance(data, Mapping):
            unknown = sorted(str(key) for key in data if key not in self.fields)
            if unknown:
                raise serializers.ValidationError(
                    {key: ["Neznámy kľúč nastavenia upozornení."] for key in unknown}
                )
        return super().to_internal_value(data)

    def validate(self, attrs):
        """Vyžaduje aspoň jednu voľbu: prázdna požiadavka nič nemení."""
        if not attrs:
            raise serializers.ValidationError(
                "At least one notification preference must be provided."
            )
        return attrs
