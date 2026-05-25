import pytest
from django.contrib.auth import get_user_model

from accounts.models import SubscriptionTier
from accounts.services.entitlements import (
    get_entitlements_for_user,
    get_limit,
    get_user_tier,
    has_feature,
    is_premium,
)

User = get_user_model()


@pytest.mark.django_db
class TestEntitlements:
    def test_new_user_defaults_to_free_tier(self):
        user = User.objects.create_user(
            username="free-user",
            email="free@example.com",
            password="StrongPass123",
        )

        assert user.subscription_tier == SubscriptionTier.FREE
        assert get_user_tier(user) == SubscriptionTier.FREE
        assert is_premium(user) is False

    def test_premium_entitlements_are_derived_from_tier(self):
        user = User.objects.create_user(
            username="premium-user",
            email="premium@example.com",
            password="StrongPass123",
            subscription_tier=SubscriptionTier.PREMIUM,
        )

        entitlements = get_entitlements_for_user(user)

        assert entitlements["tier"] == SubscriptionTier.PREMIUM
        assert entitlements["is_premium"] is True
        assert has_feature(user, "can_use_verified_badge") is True
        assert has_feature(user, "can_use_priority_ranking") is True
        assert get_limit(user, "monthly_boosts") == 5

    def test_unknown_tier_falls_back_to_free(self):
        user = User(username="legacy-user", email="legacy@example.com")
        user.subscription_tier = "legacy"

        entitlements = get_entitlements_for_user(user)

        assert entitlements["tier"] == SubscriptionTier.FREE
        assert entitlements["is_premium"] is False
        assert has_feature(user, "can_use_verified_badge") is False
        assert get_limit(user, "max_active_cards") == 3
        assert get_limit(user, "unknown_limit", default=7) == 7
