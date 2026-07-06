from django.contrib import admin
from django.utils.translation import gettext_lazy as _


class ReportDescriptionPreviewMixin:
    @admin.display(description=_("Popis"))
    def description_preview(self, obj):
        description = (obj.description or "").strip()
        if not description:
            return "-"
        return description if len(description) <= 80 else f"{description[:77]}..."
