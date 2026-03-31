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
