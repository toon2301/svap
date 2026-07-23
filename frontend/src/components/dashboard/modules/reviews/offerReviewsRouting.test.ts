import {
  buildOfferReviewsPath,
  buildOfferReviewsReturnTo,
  getSafeDashboardReturnTo,
} from './offerReviewsRouting';

describe('offerReviewsRouting', () => {
  it('returns to the top of the own profile (no highlighted offer)', () => {
    expect(
      buildOfferReviewsReturnTo({
        offerId: 12,
        ownerIdentifier: 'ignored',
        isOwnProfile: true,
      }),
    ).toBe('/dashboard/profile');
  });

  it('builds a return target for a foreign profile', () => {
    expect(
      buildOfferReviewsReturnTo({
        offerId: 12,
        ownerIdentifier: 'anton chudjak',
        isOwnProfile: false,
      }),
    ).toBe('/dashboard/users/anton%20chudjak?offer=12&side=back');
  });

  it('adds only a safe return target to the reviews URL', () => {
    expect(
      buildOfferReviewsPath(12, {
        returnTo: '/dashboard/users/anton?offer=12&side=back',
      }),
    ).toBe(
      '/dashboard/offers/12/reviews?returnTo=%2Fdashboard%2Fusers%2Fanton%3Foffer%3D12%26side%3Dback',
    );
  });

  it('rejects external or malformed return targets', () => {
    expect(getSafeDashboardReturnTo('https://evil.example/dashboard')).toBeNull();
    expect(getSafeDashboardReturnTo('//evil.example/dashboard')).toBeNull();
    expect(getSafeDashboardReturnTo('/dashboard-users/anton')).toBeNull();
  });
});
