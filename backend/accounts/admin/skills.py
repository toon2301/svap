from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from ..models import OfferedSkill, OfferedSkillImage, OfferedSkillLike


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


@admin.register(OfferedSkillLike)
class OfferedSkillLikeAdmin(admin.ModelAdmin):
    """Admin interface for offer likes."""

    list_display = ["id", "offer", "user", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["offer__id", "user__username", "user__email"]
    ordering = ["-created_at", "-id"]
    readonly_fields = ["created_at"]
