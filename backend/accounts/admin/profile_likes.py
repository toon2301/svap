from django.contrib import admin

from ..models import ProfileLike


@admin.register(ProfileLike)
class ProfileLikeAdmin(admin.ModelAdmin):
    """Admin interface for profile likes."""

    list_display = ["id", "profile_user", "user", "created_at"]
    list_filter = ["created_at"]
    search_fields = [
        "profile_user__username",
        "profile_user__email",
        "user__username",
        "user__email",
    ]
    ordering = ["-created_at", "-id"]
    readonly_fields = ["created_at"]
