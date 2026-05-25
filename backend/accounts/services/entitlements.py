from __future__ import annotations

from copy import deepcopy
from typing import Any

from accounts.models import SubscriptionTier

FeatureKey = str
LimitKey = str

DEFAULT_TIER = SubscriptionTier.FREE

ENTITLEMENT_CONFIG: dict[str, dict[str, dict[str, Any]]] = {
    SubscriptionTier.FREE: {
        "features": {
            "can_use_verified_badge": False,
            "can_use_priority_ranking": False,
        },
        "limits": {
            # Mirrors the current per-section card limit. This config is not enforced yet.
            "max_active_cards": 3,
            "monthly_boosts": 0,
        },
    },
    SubscriptionTier.PREMIUM: {
        "features": {
            "can_use_verified_badge": True,
            "can_use_priority_ranking": True,
        },
        "limits": {
            "max_active_cards": 10,
            "monthly_boosts": 5,
        },
    },
}


def get_user_tier(user) -> str:
    tier = str(getattr(user, "subscription_tier", None) or DEFAULT_TIER).strip()
    if tier in ENTITLEMENT_CONFIG:
        return tier
    return DEFAULT_TIER


def is_premium(user) -> bool:
    return get_user_tier(user) == SubscriptionTier.PREMIUM


def get_entitlements_for_user(user) -> dict[str, Any]:
    tier = get_user_tier(user)
    config = deepcopy(ENTITLEMENT_CONFIG[tier])

    return {
        "tier": tier,
        "is_premium": tier == SubscriptionTier.PREMIUM,
        "features": config["features"],
        "limits": config["limits"],
    }


def has_feature(user, feature_key: FeatureKey) -> bool:
    entitlements = get_entitlements_for_user(user)
    return bool(entitlements["features"].get(feature_key, False))


def get_limit(user, limit_key: LimitKey, default: int | None = None) -> int | None:
    entitlements = get_entitlements_for_user(user)
    value = entitlements["limits"].get(limit_key, default)
    return value if type(value) is int else default
