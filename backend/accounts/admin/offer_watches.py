from django.contrib import admin

from ..models import OfferWatch, OfferWatchMatchOutbox, OfferWatchNotification


@admin.register(OfferWatch)
class OfferWatchAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "user",
        "slot",
        "subcategory",
        "is_seeking",
        "country_code",
        "district_code",
        "price_currency",
        "created_at",
    ]
    list_filter = ["is_seeking", "country_code", "created_at"]
    search_fields = [
        "user__username",
        "user__email",
        "category",
        "subcategory",
    ]
    # Bez autocomplete vykreslí admin pri FK na usera <select> so VSETKYMI
    # pouzivatelmi – neunosne pri raste tabulky. UserAdmin ma search_fields,
    # takze widget ma podla coho hladat.
    autocomplete_fields = ["user"]
    ordering = ["-created_at", "-id"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(OfferWatchNotification)
class OfferWatchNotificationAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "user",
        "watch",
        "offer",
        "matched_at",
        "processed_at",
        "notified_at",
    ]
    list_filter = ["processed_at", "notified_at", "matched_at"]
    search_fields = [
        "user__username",
        "user__email",
        "offer__category",
        "offer__subcategory",
    ]
    autocomplete_fields = ["user", "watch", "offer"]
    ordering = ["-matched_at", "-id"]
    readonly_fields = ["matched_at", "processed_at", "notified_at"]


@admin.register(OfferWatchMatchOutbox)
class OfferWatchMatchOutboxAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "offer",
        "attempt_count",
        "claimed_at",
        "last_attempt_at",
        "created_at",
    ]
    list_filter = ["claimed_at", "created_at"]
    search_fields = [
        "offer__user__username",
        "offer__user__email",
        "offer__category",
        "offer__subcategory",
    ]
    autocomplete_fields = ["offer"]
    ordering = ["id"]
    readonly_fields = [
        "offer",
        "attempt_count",
        "claimed_at",
        "last_attempt_at",
        "created_at",
    ]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        """Záznam je fronta pre spracovanie, nie história na upratovanie.

        Zmazaním by sa stratil kandidát, ktorý ``process_offer_watch_matches_task``
        ešte nespracovala – vrátane tých, čo čakajú na zotavenie po zlyhaní.
        """
        return False
