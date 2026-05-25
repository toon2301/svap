import {
  getEntitlementLimit,
  getUserEntitlements,
  getUserTier,
  hasEntitlementFeature,
  isPremiumUser,
} from '../entitlements';

describe('entitlement helpers', () => {
  it('falls back to free entitlements when user data is missing', () => {
    expect(getUserTier(null)).toBe('free');
    expect(isPremiumUser(null)).toBe(false);
    expect(hasEntitlementFeature(null, 'can_use_verified_badge')).toBe(false);
    expect(getEntitlementLimit(null, 'max_active_cards')).toBe(3);
  });

  it('reads premium state from backend-provided entitlements', () => {
    const user = {
      subscription_tier: 'premium' as const,
      entitlements: {
        tier: 'premium' as const,
        is_premium: true,
        features: {
          can_use_verified_badge: true,
          can_use_priority_ranking: true,
        },
        limits: {
          max_active_cards: 10,
          monthly_boosts: 5,
        },
      },
    };

    expect(getUserTier(user)).toBe('premium');
    expect(isPremiumUser(user)).toBe(true);
    expect(hasEntitlementFeature(user, 'can_use_priority_ranking')).toBe(true);
    expect(getEntitlementLimit(user, 'monthly_boosts')).toBe(5);
  });

  it('normalizes inconsistent or missing entitlement payloads safely', () => {
    const user = {
      subscription_tier: 'premium' as const,
      entitlements: undefined,
    };

    expect(getUserEntitlements(user)).toMatchObject({
      tier: 'premium',
      is_premium: true,
    });
    expect(getEntitlementLimit(user, 'max_active_cards')).toBe(3);
  });
});
