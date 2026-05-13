from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _

from .models import (
    OfferedSkill,
    OfferedSkillImage,
    OfferedSkillLike,
    PhotoReport,
    Review,
    ReviewLike,
    ReviewReport,
    SkillRequest,
    SkillRequestTermination,
    User,
    UserProfile,
    UserReport,
    UserType,
    WebPushSubscription,
)


class ReportDescriptionPreviewMixin:
    @admin.display(description=_("Popis"))
    def description_preview(self, obj):
        description = (obj.description or "").strip()
        if not description:
            return "-"
        return description if len(description) <= 80 else f"{description[:77]}..."


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin interface for the custom User model."""

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
        (_("Typ uctu"), {"fields": ("user_type", "company_name", "website")}),
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
        (_("Pouzivatel"), {"fields": ("user",)}),
        (_("Preferencie"), {"fields": ("preferred_communication",)}),
        (_("Notifikacie"), {"fields": ("email_notifications", "push_notifications")}),
        (_("Sukromie"), {"fields": ("show_email", "show_phone")}),
        (
            _("Dolezite datumy"),
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    readonly_fields = ["created_at", "updated_at"]


@admin.register(OfferedSkill)
class OfferedSkillAdmin(admin.ModelAdmin):
    """Admin interface for offered skills."""

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
        (_("Pouzivatel"), {"fields": ("user",)}),
        (_("Zrucnost"), {"fields": ("category", "subcategory", "description")}),
        (_("Praxe"), {"fields": ("experience_value", "experience_unit")}),
        (_("Tagy"), {"fields": ("tags",)}),
        (
            _("Dolezite datumy"),
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )


@admin.register(OfferedSkillImage)
class OfferedSkillImageAdmin(admin.ModelAdmin):
    """Admin interface for offer images."""

    list_display = ["id", "skill", "order", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["skill__user__username", "skill__category", "skill__subcategory"]
    ordering = ["skill", "order", "id"]
    readonly_fields = ["created_at"]


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
    readonly_fields = ["created_at", "updated_at"]

    fieldsets = (
        (_("Recenzent a ponuka"), {"fields": ("reviewer", "offer")}),
        (_("Hodnotenie"), {"fields": ("rating",)}),
        (_("Obsah recenzie"), {"fields": ("text", "pros", "cons")}),
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


@admin.register(OfferedSkillLike)
class OfferedSkillLikeAdmin(admin.ModelAdmin):
    """Admin interface for offer likes."""

    list_display = ["id", "offer", "user", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["offer__id", "user__username", "user__email"]
    ordering = ["-created_at", "-id"]
    readonly_fields = ["created_at"]


@admin.register(SkillRequest)
class SkillRequestAdmin(admin.ModelAdmin):
    """Admin interface for exchanges and their lifecycle state."""

    list_display = [
        "id",
        "status",
        "requester",
        "recipient",
        "offer",
        "termination_reason",
        "terminated_by",
        "terminated_at",
        "created_at",
    ]
    list_filter = ["status", "created_at", "updated_at"]
    list_select_related = [
        "requester",
        "recipient",
        "offer",
        "termination",
        "termination__terminated_by",
    ]
    search_fields = [
        "id",
        "requester__username",
        "requester__email",
        "recipient__username",
        "recipient__email",
        "offer__category",
        "offer__subcategory",
        "termination__reason",
        "termination__description",
    ]
    ordering = ["-updated_at", "-id"]
    readonly_fields = ["created_at", "updated_at"]

    @admin.display(description=_("Dovod ukoncenia"))
    def termination_reason(self, obj):
        termination = getattr(obj, "termination", None)
        return termination.reason if termination else "-"

    @admin.display(description=_("Ukoncil"))
    def terminated_by(self, obj):
        termination = getattr(obj, "termination", None)
        return termination.terminated_by if termination else "-"

    @admin.display(description=_("Ukoncene"))
    def terminated_at(self, obj):
        termination = getattr(obj, "termination", None)
        return termination.created_at if termination else None


@admin.register(SkillRequestTermination)
class SkillRequestTerminationAdmin(ReportDescriptionPreviewMixin, admin.ModelAdmin):
    """Admin interface for exchanges that ended early (no mutual completion)."""

    list_display = [
        "id",
        "skill_request",
        "terminated_by",
        "reason",
        "description_preview",
        "created_at",
    ]
    list_filter = ["reason", "created_at"]
    list_select_related = [
        "skill_request",
        "skill_request__requester",
        "skill_request__recipient",
        "skill_request__offer",
        "terminated_by",
    ]
    search_fields = [
        "reason",
        "description",
        "skill_request__id",
        "skill_request__requester__username",
        "skill_request__requester__email",
        "skill_request__recipient__username",
        "skill_request__recipient__email",
        "terminated_by__username",
        "terminated_by__email",
    ]
    ordering = ["-created_at", "-id"]
    readonly_fields = ["created_at"]


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


admin.site.site_header = "Swaply Admin"
admin.site.site_title = "Swaply Admin"
admin.site.index_title = "Sprava Swaply"
