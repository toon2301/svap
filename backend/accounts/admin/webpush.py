from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from ..models import WebPushSubscription


@admin.register(WebPushSubscription)
class WebPushSubscriptionAdmin(admin.ModelAdmin):
    """Admin interface for stored web push subscriptions."""

    list_display = [
        "id",
        "user",
        "is_active",
        "failure_count",
        "last_seen_at",
        "updated_at",
    ]
    list_filter = ["is_active", "created_at", "updated_at"]
    search_fields = ["user__username", "user__email", "endpoint_hash", "device_label"]
    ordering = ["-updated_at"]
    readonly_fields = [
        "endpoint_hash",
        "endpoint_encrypted",
        "p256dh_encrypted",
        "auth_encrypted",
        "created_at",
        "updated_at",
        "last_seen_at",
        "last_success_at",
        "last_failure_at",
    ]

    fieldsets = (
        (_("Pouzivatel"), {"fields": ("user", "device_label", "user_agent")}),
        (
            _("Subscription"),
            {
                "fields": (
                    "endpoint_hash",
                    "endpoint_encrypted",
                    "p256dh_encrypted",
                    "auth_encrypted",
                    "is_active",
                    "failure_count",
                )
            },
        ),
        (
            _("Dolezite datumy"),
            {
                "fields": (
                    "last_seen_at",
                    "last_success_at",
                    "last_failure_at",
                    "created_at",
                    "updated_at",
                ),
                "classes": ("collapse",),
            },
        ),
    )
