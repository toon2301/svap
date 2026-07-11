from django.contrib import admin

from .models import PortfolioItemLike


@admin.register(PortfolioItemLike)
class PortfolioItemLikeAdmin(admin.ModelAdmin):
    """Admin interface for portfolio likes."""

    list_display = ["id", "item", "user", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["item__id", "item__title", "user__username", "user__email"]
    ordering = ["-created_at", "-id"]
    readonly_fields = ["created_at"]
