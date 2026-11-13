"""
Tabuľka typ upozornenia → kategória, ktorú môže používateľ vypnúť (nález 321).

Každý typ z NotificationType je buď v NOTIFICATION_TYPE_CATEGORY (patrí do kategórie,
ktorú zapína a vypína pole `notify_*` v UserProfile), alebo v
ALWAYS_ON_NOTIFICATION_TYPES (nemá vlastný prepínač a chodí vždy). Poistný test v
accounts/test/test_notification_categories.py zlyhá pri každom type, ktorý nie je
zaradený, aby po novom type nezostalo upozornenie bez rozhodnutia.

Hlavný vypínač `in_app_notifications` je nezávislý a rieši sa v notification_core.

Počiatočná žiadosť o zručnosť (`SKILL_REQUEST`) patrí do kategórie `notify_skill_requests`, no nejde cez
create_notification: create_skill_request_notification ju vytvorí vždy (žiadosť sa doručí a je v Žiadostiach), pri vypnutej
kategórii alebo hlavnom vypínači však už prečítanú, takže sa nepočíta do odznaku (nález 330, R39 (b)).

LEAF modul: importuje len modely, takže ho notification_core môže bezpečne importovať.
"""

from __future__ import annotations

from accounts.models import NotificationType

# Typy bez vlastného prepínača: zhoda sledovania a pozvánka do skupiny.
ALWAYS_ON_NOTIFICATION_TYPES: frozenset[str] = frozenset(
    {
        NotificationType.OFFER_WATCH_MATCH,
        NotificationType.GROUP_INVITATION,
    }
)

# Typ upozornenia → pole UserProfile, ktoré jeho kategóriu zapína a vypína.
NOTIFICATION_TYPE_CATEGORY: dict[str, str] = {
    # Páči sa mi to
    NotificationType.OFFER_LIKED: "notify_likes",
    NotificationType.PORTFOLIO_LIKED: "notify_likes",
    NotificationType.PROFILE_LIKED: "notify_likes",
    NotificationType.FEED_POST_LIKED: "notify_likes",
    # Páči sa mi to pre komentáre (aj lajky odpovedí na komentáre a lajky recenzií)
    NotificationType.FEED_POST_COMMENT_LIKED: "notify_comment_likes",
    NotificationType.REVIEW_LIKED: "notify_comment_likes",
    # Komentáre
    NotificationType.FEED_POST_COMMENTED: "notify_comments",
    NotificationType.FEED_POST_COMMENT_REPLIED: "notify_comments",
    NotificationType.REVIEW_CREATED: "notify_comments",
    NotificationType.REVIEW_REPLY_CREATED: "notify_comments",
    # Označenia a zdieľania
    NotificationType.FEED_POST_TAGGED: "notify_tags_and_shares",
    NotificationType.FEED_POST_SHARED: "notify_tags_and_shares",
    # Žiadosť o zručnosť (aj počiatočná žiadosť: tá nejde cez create_notification, pri vypnutej
    # kategórii ju create_skill_request_notification vytvorí ako prečítanú, pozri modul vyššie)
    NotificationType.SKILL_REQUEST: "notify_skill_requests",
    NotificationType.SKILL_REQUEST_ACCEPTED: "notify_skill_requests",
    NotificationType.SKILL_REQUEST_REJECTED: "notify_skill_requests",
    NotificationType.SKILL_REQUEST_COMPLETION_REQUESTED: "notify_skill_requests",
    NotificationType.SKILL_REQUEST_COMPLETED: "notify_skill_requests",
    NotificationType.SKILL_REQUEST_TERMINATED: "notify_skill_requests",
    NotificationType.SKILL_REQUEST_CANCELLED: "notify_skill_requests",
}


def notification_category_field(notif_type: str) -> str | None:
    """
    Vráti názov poľa UserProfile, ktoré zapína kategóriu daného typu upozornenia.

    None znamená, že typ nemá vlastný prepínač a chodí vždy (aj typ, ktorý tabuľka
    nepozná; úplnosť tabuľky stráži poistný test).
    """
    return NOTIFICATION_TYPE_CATEGORY.get(notif_type)


def is_notification_category_enabled(user, notif_type: str) -> bool:
    """
    Vráti, či má používateľ zapnutú kategóriu, do ktorej typ upozornenia patrí.

    Typ bez kategórie chodí vždy. Ak profil chýba alebo sa jeho čítanie nepodarí,
    kategória sa berie ako zapnutá (rovnako ako pri hlavnom vypínači): upozornenie sa
    nemá ticho stratiť kvôli chybe čítania. Profil sa číta cez `user.profile`, ktorý
    Django po prvom čítaní drží na inštancii, takže hlavný vypínač a kategória
    spolu spravia jediný dopyt.
    """
    field = notification_category_field(notif_type)
    if field is None:
        return True
    try:
        profile = getattr(user, "profile", None)
        if profile is None:
            return True
        return bool(getattr(profile, field))
    except Exception:
        return True
