import {
  buildOfferReviewsPath,
  buildOfferReviewsReturnTo,
  getSafeDashboardReturnTo,
} from './offerReviewsRouting';

describe('offerReviewsRouting', () => {
  it('builds a return target for the current user profile', () => {
    expect(
      buildOfferReviewsReturnTo({
        offerId: 12,
        ownerIdentifier: 'ignored',
        isOwnProfile: true,
      }),
    ).toBe('/dashboard/profile?highlight=12&side=back');
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
