from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from .models import User, UserProfile, UserType, OfferedSkill, OfferedSkillImage, Review, ReviewReport, UserReport


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin rozhranie pre User model"""

    list_display = [
        "username",
        "email",
        "user_type",
        "is_verified",
        "is_active",
        "created_at",
    ]
    list_filter = [
        "user_type",
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
            _("Osobné informácie"),
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
        (_("Typ účtu"), {"fields": ("user_type", "company_name", "website")}),
        (
            _("Sociálne siete"),
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
            _("Dôležité dátumy"),
            {
                "fields": ("last_login", "date_joined", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
        (
            _("Oprávnenia"),
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
    """Admin rozhranie pre UserProfile model"""

    list_display = [
        "user",
        "preferred_communication",
        "email_notifications",
        "created_at",
    ]
    list_filter = [
        "preferred_communication",
        "email_notifications",
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
        (_("Používateľ"), {"fields": ("user",)}),
        (_("Preferencie"), {"fields": ("preferred_communication",)}),
        (_("Notifikácie"), {"fields": ("email_notifications", "push_notifications")}),
        (_("Súkromie"), {"fields": ("show_email", "show_phone")}),
        (
            _("Dôležité dátumy"),
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    readonly_fields = ["created_at", "updated_at"]


@admin.register(OfferedSkill)
class OfferedSkillAdmin(admin.ModelAdmin):
    """Admin rozhranie pre OfferedSkill model"""

    list_display = ["user", "category", "subcategory", "created_at"]
    list_filter = ["category", "created_at"]
    search_fields = [
        "user__username",
        "user__email",
        "category",
        "subcategory",
        "description",
    ]
    ordering = ["-created_at"]
    readonly_fields = ["created_at", "updated_at"]

    fieldsets = (
        (_("Používateľ"), {"fields": ("user",)}),
        (_("Zručnosť"), {"fields": ("category", "subcategory", "description")}),
        (_("Praxe"), {"fields": ("experience_value", "experience_unit")}),
        (_("Tagy"), {"fields": ("tags",)}),
        (
            _("Dôležité dátumy"),
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )


@admin.register(OfferedSkillImage)
class OfferedSkillImageAdmin(admin.ModelAdmin):
    """Admin pre obrázky ponúk"""

    list_display = ["id", "skill", "order", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["skill__user__username", "skill__category", "skill__subcategory"]
    ordering = ["skill", "order", "id"]
    readonly_fields = ["created_at"]


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    """Admin rozhranie pre Review model"""

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
    readonly_fields = ["created_at", "updated_at"]

    fieldsets = (
        (_("Recenzent a ponuka"), {"fields": ("reviewer", "offer")}),
        (_("Hodnotenie"), {"fields": ("rating",)}),
        (_("Obsah recenzie"), {"fields": ("text", "pros", "cons")}),
        (
            _("Dôležité dátumy"),
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )


@admin.register(ReviewReport)
class ReviewReportAdmin(admin.ModelAdmin):
    """Admin rozhranie pre ReviewReport model"""

    list_display = ["id", "review", "reported_by", "reason", "is_resolved", "created_at"]
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
        (_("Recenzia a nahlásil"), {"fields": ("review", "reported_by")}),
        (_("Nahlásenie"), {"fields": ("reason", "description")}),
        (_("Stav"), {"fields": ("is_resolved",)}),
        (_("Dôležité dátumy"), {"fields": ("created_at",), "classes": ("collapse",)}),
    )


@admin.register(UserReport)
class UserReportAdmin(admin.ModelAdmin):
    """Admin rozhranie pre UserReport model"""

    list_display = ["id", "reported_user", "reported_by", "reason", "is_resolved", "created_at"]
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
        (_("Používatelia"), {"fields": ("reported_user", "reported_by")}),
        (_("Nahlásenie"), {"fields": ("reason", "description")}),
        (_("Stav"), {"fields": ("is_resolved",)}),
        (_("Dôležité dátumy"), {"fields": ("created_at",), "classes": ("collapse",)}),
    )


# Vlastné nastavenia admin rozhrania
admin.site.site_header = "Swaply Admin"
admin.site.site_title = "Swaply Admin"
admin.site.index_title = "Správa Swaply"
