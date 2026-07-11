"""
Django admin pre accounts (rozdelené z pôvodného admin.py kvôli dĺžke).

Import submodulov spustí ich `@admin.register(...)` dekorátory, takže Django
autodiscovery (`accounts.admin`) zaregistruje všetky ModelAdmin triedy rovnako
ako predtým. Poradie importov nie je podstatné (registrácie sú nezávislé).
"""

from django.contrib import admin

from . import (  # noqa: F401 — importované kvôli vedľajšiemu efektu (registrácia)
    profile_likes,
    reports,
    reviews,
    skill_requests,
    skills,
    users,
    webpush,
)

admin.site.site_header = "Swaply Admin"
admin.site.site_title = "Swaply Admin"
admin.site.index_title = "Sprava Swaply"
