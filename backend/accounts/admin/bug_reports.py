"""Admin workflow for user-submitted technical bug reports."""

from __future__ import annotations

from django.contrib import admin
from django.utils import timezone

from accounts.models import BugReport, BugReportStatus


@admin.register(BugReport)
class BugReportAdmin(admin.ModelAdmin):
    list_display = (
        "reference_display",
        "category",
        "reported_by",
        "status",
        "priority",
        "source_screen",
        "support_notified_at",
        "created_at",
    )
    list_filter = (
        "status",
        "priority",
        "category",
        "device_type",
        "support_notified_at",
        "created_at",
    )
    search_fields = (
        "reported_by__username",
        "reported_by__email",
        "title",
        "description",
    )
    ordering = ("-created_at", "-id")
    list_select_related = ("reported_by",)
    readonly_fields = (
        "public_id",
        "reported_by",
        "category",
        "title",
        "description",
        "reproduction_steps",
        "source_screen",
        "device_type",
        "locale",
        "app_version",
        "browser",
        "support_notified_at",
        "resolved_at",
        "created_at",
        "updated_at",
    )
    fieldsets = (
        (
            "Hlásenie",
            {
                "fields": (
                    "public_id",
                    "reported_by",
                    "category",
                    "title",
                    "description",
                    "reproduction_steps",
                )
            },
        ),
        (
            "Technický kontext",
            {
                "fields": (
                    "source_screen",
                    "device_type",
                    "locale",
                    "app_version",
                    "browser",
                )
            },
        ),
        (
            "Spracovanie",
            {
                "fields": (
                    "status",
                    "priority",
                    "internal_note",
                    "support_notified_at",
                    "resolved_at",
                )
            },
        ),
        ("Časy", {"fields": ("created_at", "updated_at")}),
    )

    @admin.display(description="Referencia", ordering="public_id")
    def reference_display(self, obj):
        return obj.reference

    def has_add_permission(self, request):
        return False

    def save_model(self, request, obj, form, change):
        resolved_statuses = {BugReportStatus.RESOLVED, BugReportStatus.CLOSED}
        if obj.status in resolved_statuses and obj.resolved_at is None:
            obj.resolved_at = timezone.now()
        elif obj.status not in resolved_statuses:
            obj.resolved_at = None
        super().save_model(request, obj, form, change)
