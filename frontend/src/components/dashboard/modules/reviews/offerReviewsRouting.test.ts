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

  it('builds a plain return target for a foreign profile', () => {
    expect(
      buildOfferReviewsReturnTo({
        offerId: 12,
        ownerIdentifier: 'anton chudjak',
        isOwnProfile: false,
      }),
    ).toBe('/dashboard/users/anton%20chudjak');
  });

  it('does not highlight, scroll to or flip the offer on the foreign profile', () => {
    // Záložný odkaz po F5 / z novej karty: `offer` by zvýraznil a prescrolloval kartu a `side=back`
    // by ju otočil (na mobile otvoril spodný panel). Návrat z recenzií má vrátiť obyčajný profil.
    const target = buildOfferReviewsReturnTo({
      offerId: 12,
      ownerIdentifier: 'anton',
      isOwnProfile: false,
    });

    expect(target).toBe('/dashboard/users/anton');
    expect(target).not.toContain('?');
    expect(target).not.toMatch(/offer|side|highlight/);
  });

  it('keeps a numeric owner identifier as the profile address', () => {
    expect(
      buildOfferReviewsReturnTo({ offerId: '12', ownerIdentifier: 99, isOwnProfile: false }),
    ).toBe('/dashboard/users/99');
  });

  it.each([
    ['offerId 0', 0],
    ['záporné offerId', -3],
    ['desatinné offerId', 1.5],
    ['text namiesto offerId', 'abc'],
    ['prázdne offerId', null],
    ['chýbajúce offerId', undefined],
  ] as Array<[string, number | string | null | undefined]>)(
    'has no return target for an invalid offer (%s), for the own and the foreign profile',
    (_title, offerId) => {
      expect(buildOfferReviewsReturnTo({ offerId, ownerIdentifier: 'anton', isOwnProfile: false })).toBeNull();
      expect(buildOfferReviewsReturnTo({ offerId, ownerIdentifier: 'anton', isOwnProfile: true })).toBeNull();
    },
  );

  it.each([
    ['chýbajúci vlastník', undefined],
    ['null', null],
    ['prázdny reťazec', ''],
    ['samé medzery', '   '],
  ] as Array<[string, string | number | null | undefined]>)(
    'has no return target for a foreign profile without an owner (%s)',
    (_title, ownerIdentifier) => {
      expect(buildOfferReviewsReturnTo({ offerId: 12, ownerIdentifier, isOwnProfile: false })).toBeNull();
    },
  );

  it('adds only a safe return target to the reviews URL', () => {
    expect(
      buildOfferReviewsPath(12, {
        returnTo: '/dashboard/users/anton',
      }),
    ).toBe('/dashboard/offers/12/reviews?returnTo=%2Fdashboard%2Fusers%2Fanton');
  });

  it('rejects external or malformed return targets', () => {
    expect(getSafeDashboardReturnTo('https://evil.example/dashboard')).toBeNull();
    expect(getSafeDashboardReturnTo('//evil.example/dashboard')).toBeNull();
    expect(getSafeDashboardReturnTo('/dashboard-users/anton')).toBeNull();
  });
});
