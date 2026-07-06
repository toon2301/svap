from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _

from ..models import User, UserProfile


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin interface for the custom User model."""

    list_display = [
        "username",
        "email",
        "user_type",
        "subscription_tier",
        "is_verified",
        "is_active",
        "created_at",
    ]
    list_filter = [
        "user_type",
        "subscription_tier",
        "is_verified",
        "is_active",
        "is_staff",
        "is_superuser",
        "created_at",
    ]
    search_fields = ["username", "email", "company_name"]
    ordering = ["-created_at"]

    fieldsets = (
        (None, {"fields": ("username", "password")}),
        (
            _("Osobne informacie"),
            {
                "fields": (
                    "first_name",
                    "last_name",
                    "email",
                    "phone",
                    "bio",
                    "avatar",
                    "location",
                )
            },
        ),
        (
            _("Typ uctu"),
            {"fields": ("user_type", "subscription_tier", "company_name", "website")},
        ),
        (
            _("Socialne siete"),
            {"fields": ("linkedin", "facebook", "instagram"), "classes": ("collapse",)},
        ),
        (
            _("Nastavenia"),
            {
                "fields": (
                    "is_verified",
                    "is_public",
                    "name_modified_by_user",
                    "is_active",
                    "is_staff",
                    "is_superuser",
                )
            },
        ),
        (
            _("Dolezite datumy"),
            {
                "fields": ("last_login", "date_joined", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
        (
            _("Opravnenia"),
            {"fields": ("groups", "user_permissions"), "classes": ("collapse",)},
        ),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("username", "email", "password1", "password2", "user_type"),
            },
        ),
    )

    readonly_fields = ["created_at", "updated_at", "date_joined", "last_login"]


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    """Admin interface for UserProfile."""

    list_display = [
        "user",
        "preferred_communication",
        "in_app_notifications",
        "created_at",
    ]
    list_filter = [
        "preferred_communication",
        "in_app_notifications",
        "push_notifications",
        "created_at",
    ]
    search_fields = [
        "user__username",
        "user__email",
        "user__first_name",
        "user__last_name",
    ]
    ordering = ["-created_at"]

    fieldsets = (
        (_("Pouzivatel"), {"fields": ("user",)}),
        (_("Preferencie"), {"fields": ("preferred_communication",)}),
        (_("Notifikacie"), {"fields": ("in_app_notifications", "push_notifications")}),
        (_("Sukromie"), {"fields": ("show_email", "show_phone")}),
        (
            _("Dolezite datumy"),
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    readonly_fields = ["created_at", "updated_at"]
