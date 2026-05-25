import type {
  EntitlementFeatureKey,
  EntitlementLimitKey,
  SubscriptionTier,
  User,
  UserEntitlements,
} from '@/types';

const FREE_TIER: SubscriptionTier = 'free';
const PREMIUM_TIER: SubscriptionTier = 'premium';

export const DEFAULT_USER_ENTITLEMENTS: UserEntitlements = {
  tier: FREE_TIER,
  is_premium: false,
  features: {
    can_use_verified_badge: false,
    can_use_priority_ranking: false,
  },
  limits: {
    max_active_cards: 3,
    monthly_boosts: 0,
  },
};

function isKnownTier(value: unknown): value is SubscriptionTier {
  return value === FREE_TIER || value === PREMIUM_TIER;
}

export function getUserTier(user: Pick<User, 'subscription_tier'> | null | undefined): SubscriptionTier {
  return isKnownTier(user?.subscription_tier) ? user.subscription_tier : FREE_TIER;
}

export function getUserEntitlements(
  user: Pick<User, 'subscription_tier' | 'entitlements'> | null | undefined,
): UserEntitlements {
  const fallbackTier = getUserTier(user);
  const entitlements = user?.entitlements;

  if (!entitlements || !isKnownTier(entitlements.tier)) {
    return {
      ...DEFAULT_USER_ENTITLEMENTS,
      tier: fallbackTier,
      is_premium: fallbackTier === PREMIUM_TIER,
      features: { ...DEFAULT_USER_ENTITLEMENTS.features },
      limits: { ...DEFAULT_USER_ENTITLEMENTS.limits },
    };
  }

  return {
    tier: fallbackTier,
    is_premium: fallbackTier === PREMIUM_TIER,
    features: {
      ...DEFAULT_USER_ENTITLEMENTS.features,
      ...(entitlements.features || {}),
    },
    limits: {
      ...DEFAULT_USER_ENTITLEMENTS.limits,
      ...(entitlements.limits || {}),
    },
  };
}

export function isPremiumUser(
  user: Pick<User, 'subscription_tier' | 'entitlements'> | null | undefined,
): boolean {
  return getUserEntitlements(user).is_premium;
}

export function hasEntitlementFeature(
  user: Pick<User, 'subscription_tier' | 'entitlements'> | null | undefined,
  featureKey: EntitlementFeatureKey,
): boolean {
  return getUserEntitlements(user).features[featureKey] === true;
}

export function getEntitlementLimit(
  user: Pick<User, 'subscription_tier' | 'entitlements'> | null | undefined,
  limitKey: EntitlementLimitKey,
  fallback = 0,
): number {
  const value = getUserEntitlements(user).limits[limitKey];
  return Number.isFinite(value) ? value : fallback;
}
