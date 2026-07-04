from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from ..models import SkillRequest, SkillRequestTermination
from .base import ReportDescriptionPreviewMixin


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
