from django.contrib import admin

from ..models import OfferWatch, OfferWatchNotification


@admin.register(OfferWatch)
class OfferWatchAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "user",
        "slot",
        "subcategory",
        "is_seeking",
        "country_code",
        "district_code",
        "created_at",
    ]
    list_filter = ["is_seeking", "country_code", "created_at"]
    search_fields = [
        "user__username",
        "user__email",
        "category",
        "subcategory",
    ]
    ordering = ["-created_at", "-id"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(OfferWatchNotification)
class OfferWatchNotificationAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "user",
        "watch",
        "offer",
        "matched_at",
        "notified_at",
    ]
    list_filter = ["notified_at", "matched_at"]
    search_fields = [
        "user__username",
        "user__email",
        "offer__category",
        "offer__subcategory",
    ]
    ordering = ["-matched_at", "-id"]
    readonly_fields = ["matched_at"]
