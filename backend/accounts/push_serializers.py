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
    email_notifications = serializers.BooleanField(required=False)
    push_notifications = serializers.BooleanField(required=False)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError(
                "At least one notification preference must be provided."
            )
        return attrs
