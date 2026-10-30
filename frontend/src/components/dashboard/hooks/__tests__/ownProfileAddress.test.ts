import { canonicalOwnProfilePath, isOwnProfileIdentifier } from '../ownProfileAddress';

describe('isOwnProfileIdentifier', () => {
  const user = { id: 7, slug: 'moj.slug' };

  it('pozná vlastný slug', () => {
    expect(isOwnProfileIdentifier(user, 'moj.slug', null)).toBe(true);
  });

  it('pozná vlastné číselné ID', () => {
    expect(isOwnProfileIdentifier(user, '7', 7)).toBe(true);
  });

  it('odmietne cudzí slug aj cudzie ID', () => {
    expect(isOwnProfileIdentifier(user, 'iny.slug', null)).toBe(false);
    expect(isOwnProfileIdentifier(user, '99', 99)).toBe(false);
  });

  it('bez ID v adrese sa zhoduje len slug', () => {
    expect(isOwnProfileIdentifier(user, undefined, undefined)).toBe(false);
    expect(isOwnProfileIdentifier(user, null, null)).toBe(false);
  });

  it('pri profile bez slugu rozhoduje len ID a prázdny slug nič nezhodí dokopy', () => {
    const withoutSlug = { id: 7, slug: null };

    expect(isOwnProfileIdentifier(withoutSlug, '', null)).toBe(false);
    expect(isOwnProfileIdentifier(withoutSlug, null, null)).toBe(false);
    expect(isOwnProfileIdentifier(withoutSlug, '7', 7)).toBe(true);
  });
});

describe('canonicalOwnProfilePath', () => {
  const slug = 'moj.slug';
  const userId = 7;

  it.each(['edit', 'account', 'privacy', 'language'])('zachová podstránku /%s pri výmene ID za slug', (subpage) => {
    expect(canonicalOwnProfilePath(slug, userId, `/dashboard/users/7/${subpage}`)).toBe(
      `/dashboard/users/moj.slug/${subpage}`,
    );
  });

  it('holé ID zmení na holý slug', () => {
    expect(canonicalOwnProfilePath(slug, userId, '/dashboard/users/7')).toBe('/dashboard/users/moj.slug');
  });

  it('zvládne koncovú lomku', () => {
    expect(canonicalOwnProfilePath(slug, userId, '/dashboard/users/7/language/')).toBe(
      '/dashboard/users/moj.slug/language',
    );
  });

  it('podstránku vlastného slugu ponechá', () => {
    expect(canonicalOwnProfilePath(slug, userId, '/dashboard/users/moj.slug/privacy')).toBe(
      '/dashboard/users/moj.slug/privacy',
    );
  });

  it('cudzie ID podstránku nezíska', () => {
    expect(canonicalOwnProfilePath(slug, userId, '/dashboard/users/99/language')).toBe('/dashboard/users/moj.slug');
  });

  it('neznámu podstránku a hlbšiu cestu zahodí', () => {
    expect(canonicalOwnProfilePath(slug, userId, '/dashboard/users/7/posts')).toBe('/dashboard/users/moj.slug');
    expect(canonicalOwnProfilePath(slug, userId, '/dashboard/users/7/language/x')).toBe('/dashboard/users/moj.slug');
  });

  it('cesta mimo profilov vráti holý slug', () => {
    expect(canonicalOwnProfilePath(slug, userId, '/dashboard/settings/watches')).toBe('/dashboard/users/moj.slug');
  });
});
