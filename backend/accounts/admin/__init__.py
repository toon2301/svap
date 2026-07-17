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
    user_blocks,
    users,
    webpush,
)

admin.site.site_header = "Svaply Admin"
admin.site.site_title = "Svaply Admin"
admin.site.index_title = "Sprava Svaply"
