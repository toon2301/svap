from typing import Any

from accounts.models import UserProfile


def get_or_create_user_profile(user):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    return profile


def get_notification_preferences(user) -> dict[str, bool]:
    profile = get_or_create_user_profile(user)
    return {
        "email_notifications": bool(profile.email_notifications),
        "push_notifications": bool(profile.push_notifications),
    }


def update_notification_preferences(
    user,
    *,
    email_notifications: bool | None = None,
    push_notifications: bool | None = None,
) -> dict[str, bool]:
    profile = get_or_create_user_profile(user)
    update_fields: list[str] = []

    if email_notifications is not None:
        profile.email_notifications = bool(email_notifications)
        update_fields.append("email_notifications")
    if push_notifications is not None:
        profile.push_notifications = bool(push_notifications)
        update_fields.append("push_notifications")

    if update_fields:
        profile.save(update_fields=[*update_fields, "updated_at"])

    return get_notification_preferences(user)


def build_dashboard_settings_payload(user) -> dict[str, Any]:
    profile = get_or_create_user_profile(user)
    notifications = {
        "email_notifications": bool(profile.email_notifications),
        "push_notifications": bool(profile.push_notifications),
    }
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
    normalized_payload = payload if isinstance(payload, dict) else {}
    profile = get_or_create_user_profile(user)
    profile_update_fields: list[str] = []
    user_update_fields: list[str] = []

    notifications = normalized_payload.get("notifications")
    if isinstance(notifications, dict):
        if "email_notifications" in notifications:
            profile.email_notifications = bool(notifications["email_notifications"])
            profile_update_fields.append("email_notifications")
        if "push_notifications" in notifications:
            profile.push_notifications = bool(notifications["push_notifications"])
            profile_update_fields.append("push_notifications")

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
