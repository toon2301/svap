from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from ..models import Review, ReviewLike


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    """Admin interface for reviews."""

    list_display = ["id", "reviewer", "offer", "rating", "created_at"]
    list_filter = ["rating", "created_at"]
    search_fields = [
        "reviewer__username",
        "reviewer__email",
        "offer__category",
        "offer__subcategory",
        "text",
    ]
    ordering = ["-created_at"]
    readonly_fields = [
        "created_at",
        "updated_at",
        "owner_response",
        "owner_responded_at",
    ]

    fieldsets = (
        (_("Recenzent a ponuka"), {"fields": ("reviewer", "offer")}),
        (_("Hodnotenie"), {"fields": ("rating",)}),
        (_("Obsah recenzie"), {"fields": ("text", "pros", "cons")}),
        (
            _("Odpoveď vlastníka"),
            {"fields": ("owner_response", "owner_responded_at")},
        ),
        (
            _("Dolezite datumy"),
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )


@admin.register(ReviewLike)
class ReviewLikeAdmin(admin.ModelAdmin):
    """Admin interface for review likes."""

    list_display = ["id", "review", "user", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["review__id", "user__username", "user__email"]
    ordering = ["-created_at", "-id"]
    readonly_fields = ["created_at"]
