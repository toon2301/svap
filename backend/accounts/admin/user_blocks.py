from django.contrib import admin

from ..models import UserBlock


@admin.register(UserBlock)
class UserBlockAdmin(admin.ModelAdmin):
    """Admin overview of directional user blocks."""

    list_display = ["id", "blocker", "blocked_user", "created_at"]
    list_filter = ["created_at"]
    list_select_related = ["blocker", "blocked_user"]
    search_fields = [
        "blocker__username",
        "blocker__email",
        "blocked_user__username",
        "blocked_user__email",
    ]
    ordering = ["-created_at", "-id"]
    readonly_fields = ["created_at"]
