from typing import Any

from rest_framework import serializers

from accounts.models import UserProfile

# Kategórie upozornení (nález 321): názvy polí UserProfile, ktoré každú kategóriu
# zapínajú a vypínajú.
NOTIFICATION_CATEGORY_FIELDS: tuple[str, ...] = (
    "notify_likes",
    "notify_comment_likes",
    "notify_comments",
    "notify_tags_and_shares",
    "notify_skill_requests",
)

# Všetky voľby upozornení v poradí odpovede: dva hlavné vypínače a päť kategórií.
NOTIFICATION_PREFERENCE_FIELDS: tuple[str, ...] = (
    "in_app_notifications",
    "push_notifications",
    *NOTIFICATION_CATEGORY_FIELDS,
)


def get_or_create_user_profile(user):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    return profile


def _notification_preferences(profile) -> dict[str, bool]:
    """Všetkých sedem volieb upozornení z profilu ako slovník názov → zapnuté."""
    return {
        name: bool(getattr(profile, name)) for name in NOTIFICATION_PREFERENCE_FIELDS
    }


def get_notification_preferences(user) -> dict[str, bool]:
    """Vráti všetkých sedem volieb upozornení používateľa."""
    profile = get_or_create_user_profile(user)
    return _notification_preferences(profile)


def update_notification_preferences(
    user, **preferences: bool | None
) -> dict[str, bool]:
    """
    Uloží zadané voľby upozornení a vráti všetkých sedem aktuálnych hodnôt.

    Prijme ľubovoľnú podmnožinu z NOTIFICATION_PREFERENCE_FIELDS (ako pomenované
    argumenty); voľba s hodnotou None sa nemení. Neznámy názov vyvolá TypeError, aby
    sa preklep pri volaní zo služby nestratil ticho.
    """
    unknown = sorted(set(preferences) - set(NOTIFICATION_PREFERENCE_FIELDS))
    if unknown:
        raise TypeError(f"Neznáme voľby upozornení: {', '.join(unknown)}")

    profile = get_or_create_user_profile(user)
    update_fields: list[str] = []

    for name in NOTIFICATION_PREFERENCE_FIELDS:
        value = preferences.get(name)
        if value is not None:
            setattr(profile, name, bool(value))
            update_fields.append(name)

    if update_fields:
        profile.save(update_fields=[*update_fields, "updated_at"])

    return get_notification_preferences(user)


def _validated_notification_values(notifications: dict[str, Any]) -> dict[str, bool]:
    """
    Overí prítomné voľby upozornení rovnako ako `push/preferences/` (pravdivostný typ DRF).

    Pravdivostné reťazce ("true", "false", "1", "0") sa prevedú podľa významu, nie ako
    neprázdny text. Neplatná hodnota (aj None) vyvolá ValidationError so všetkými chybami
    naraz a nič sa neuloží. Neznáme kľúče sa ignorujú.
    """
    values: dict[str, bool] = {}
    errors: dict[str, Any] = {}
    for name in NOTIFICATION_PREFERENCE_FIELDS:
        if name not in notifications:
            continue
        try:
            values[name] = serializers.BooleanField().run_validation(
                notifications[name]
            )
        except serializers.ValidationError as exc:
            errors[name] = exc.detail
    if errors:
        raise serializers.ValidationError({"notifications": errors})
    return values


def build_dashboard_settings_payload(user) -> dict[str, Any]:
    """Zostaví nastavenia rozhrania; `notifications` nesie sedem volieb upozornení."""
    profile = get_or_create_user_profile(user)
    notifications = _notification_preferences(profile)
    return {
        "notifications": notifications,
        "privacy": {
            "profile_visibility": "public" if user.is_public else "private",
            "show_email": bool(profile.show_email),
            "show_phone": bool(profile.show_phone),
        },
        "security": {
            "two_factor_auth": bool(profile.mfa_enabled),
        },
        "general": {
            "language": "sk",
            "timezone": "Europe/Bratislava",
            "theme": "light",
        },
    }


def apply_dashboard_settings_patch(user, payload: dict[str, Any]) -> dict[str, Any]:
    """
    Uloží zmeny nastavení rozhrania a vráti nové nastavenia.

    V bloku `notifications` sa uložia len prítomné z siedmich volieb upozornení; iné
    kľúče sa ticho ignorujú (ako doteraz, na rozdiel od `push/preferences/`).
    Hodnota voľby upozornení, ktorá nie je pravdivostná, vyvolá ValidationError (400
    cez spoločný spracovateľ chýb) a nič sa neuloží.
    """
    normalized_payload = payload if isinstance(payload, dict) else {}
    profile = get_or_create_user_profile(user)
    profile_update_fields: list[str] = []
    user_update_fields: list[str] = []

    notifications = normalized_payload.get("notifications")
    if isinstance(notifications, dict):
        for name, value in _validated_notification_values(notifications).items():
            setattr(profile, name, value)
            profile_update_fields.append(name)

    privacy = normalized_payload.get("privacy")
    if isinstance(privacy, dict):
        if "show_email" in privacy:
            profile.show_email = bool(privacy["show_email"])
            profile_update_fields.append("show_email")
        if "show_phone" in privacy:
            profile.show_phone = bool(privacy["show_phone"])
            profile_update_fields.append("show_phone")
        if "profile_visibility" in privacy:
            profile_visibility = str(privacy["profile_visibility"]).strip().lower()
            if profile_visibility in {"public", "private"}:
                user.is_public = profile_visibility == "public"
                user_update_fields.append("is_public")

    if profile_update_fields:
        profile.save(update_fields=[*sorted(set(profile_update_fields)), "updated_at"])
    if user_update_fields:
        user.save(update_fields=[*sorted(set(user_update_fields)), "updated_at"])

    return build_dashboard_settings_payload(user)
