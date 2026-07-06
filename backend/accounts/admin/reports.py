from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from ..models import PhotoReport, ReviewReport, UserReport
from .base import ReportDescriptionPreviewMixin


@admin.register(ReviewReport)
class ReviewReportAdmin(ReportDescriptionPreviewMixin, admin.ModelAdmin):
    """Admin interface for review reports."""

    list_display = [
        "id",
        "review",
        "reported_by",
        "reason",
        "description_preview",
        "is_resolved",
        "created_at",
    ]
    list_filter = ["is_resolved", "created_at"]
    search_fields = [
        "reason",
        "description",
        "review__id",
        "reported_by__username",
        "reported_by__email",
    ]
    ordering = ["-created_at"]
    readonly_fields = ["created_at"]

    fieldsets = (
        (_("Recenzia a nahlasil"), {"fields": ("review", "reported_by")}),
        (_("Nahlasenie"), {"fields": ("reason", "description")}),
        (_("Stav"), {"fields": ("is_resolved",)}),
        (_("Dolezite datumy"), {"fields": ("created_at",), "classes": ("collapse",)}),
    )


@admin.register(PhotoReport)
class PhotoReportAdmin(ReportDescriptionPreviewMixin, admin.ModelAdmin):
    """Admin interface for photo reports."""

    list_display = [
        "id",
        "reported_photo",
        "reported_by",
        "reason",
        "description_preview",
        "is_resolved",
        "created_at",
    ]
    list_filter = ["is_resolved", "created_at"]
    list_select_related = [
        "offer_image__skill__user",
        "reported_user",
        "reported_by",
    ]
    search_fields = [
        "reason",
        "description",
        "offer_image__id",
        "offer_image__skill__category",
        "offer_image__skill__subcategory",
        "offer_image__skill__user__username",
        "offer_image__skill__user__email",
        "reported_user__username",
        "reported_user__email",
        "reported_avatar_name",
        "reported_by__username",
        "reported_by__email",
    ]
    ordering = ["-created_at"]
    readonly_fields = ["created_at"]

    @admin.display(description=_("Nahlasena fotka"))
    def reported_photo(self, obj):
        if obj.offer_image_id:
            return obj.offer_image
        if obj.reported_user_id:
            return f"Avatar: {obj.reported_user} ({obj.reported_avatar_name})"
        return "-"

    fieldsets = (
        (
            _("Nahlasena fotka"),
            {"fields": ("offer_image", "reported_user", "reported_avatar_name")},
        ),
        (_("Nahlasenie"), {"fields": ("reported_by", "reason", "description")}),
        (_("Stav"), {"fields": ("is_resolved",)}),
        (_("Dolezite datumy"), {"fields": ("created_at",), "classes": ("collapse",)}),
    )


@admin.register(UserReport)
class UserReportAdmin(ReportDescriptionPreviewMixin, admin.ModelAdmin):
    """Admin interface for user reports."""

    list_display = [
        "id",
        "reported_user",
        "reported_by",
        "reason",
        "description_preview",
        "is_resolved",
        "created_at",
    ]
    list_filter = ["is_resolved", "created_at"]
    search_fields = [
        "reason",
        "description",
        "reported_user__username",
        "reported_user__email",
        "reported_by__username",
        "reported_by__email",
    ]
    ordering = ["-created_at"]
    readonly_fields = ["created_at"]

    fieldsets = (
        (_("Pouzivatelia"), {"fields": ("reported_user", "reported_by")}),
        (_("Nahlasenie"), {"fields": ("reason", "description")}),
        (_("Stav"), {"fields": ("is_resolved",)}),
        (_("Dolezite datumy"), {"fields": ("created_at",), "classes": ("collapse",)}),
    )
