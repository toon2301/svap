import { canonicalOwnProfilePath, isOwnProfileIdentifier } from '../ownProfileAddress';

describe('isOwnProfileIdentifier', () => {
  const user = { id: 7, slug: 'moj.slug' };

  it('pozná vlastný slug', () => {
    expect(isOwnProfileIdentifier(user, 'moj.slug', null)).toBe(true);
  });

  it.each(['7', '007', '0007'])('pozná vlastné číselné ID %s aj s úvodnými nulami', (identifier) => {
    expect(isOwnProfileIdentifier(user, identifier, Number(identifier))).toBe(true);
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

  describe.each(['7', '007', '0007'])('vlastné číselné ID %s', (identifier) => {
    it.each(['edit', 'account', 'privacy', 'language'])('zachová podstránku /%s pri výmene ID za slug', (subpage) => {
      expect(canonicalOwnProfilePath(slug, userId, `/dashboard/users/${identifier}/${subpage}`)).toBe(
        `/dashboard/users/moj.slug/${subpage}`,
      );
    });

    it('holé ID zmení na holý slug', () => {
      expect(canonicalOwnProfilePath(slug, userId, `/dashboard/users/${identifier}`)).toBe('/dashboard/users/moj.slug');
    });

    it('zvládne koncovú lomku', () => {
      expect(canonicalOwnProfilePath(slug, userId, `/dashboard/users/${identifier}/language/`)).toBe(
        '/dashboard/users/moj.slug/language',
      );
    });
  });

  it('podstránku vlastného slugu ponechá', () => {
    expect(canonicalOwnProfilePath(slug, userId, '/dashboard/users/moj.slug/privacy')).toBe(
      '/dashboard/users/moj.slug/privacy',
    );
  });

  it.each(['99', '099', '00099'])('cudzie ID %s podstránku nezíska', (identifier) => {
    expect(canonicalOwnProfilePath(slug, userId, `/dashboard/users/${identifier}/language`)).toBe('/dashboard/users/moj.slug');
  });

  it.each(['7.0', '7e0', '0x7', '+7', '-7', ' 7', '7abc', 'Infinity', 'NaN'])(
    'neprijme nepodporovaný číselný zápis %s ako vlastné ID',
    (identifier) => {
      expect(canonicalOwnProfilePath(slug, userId, `/dashboard/users/${identifier}/language`)).toBe('/dashboard/users/moj.slug');
    },
  );

  it('neznámu podstránku a hlbšiu cestu zahodí', () => {
    expect(canonicalOwnProfilePath(slug, userId, '/dashboard/users/7/posts')).toBe('/dashboard/users/moj.slug');
    expect(canonicalOwnProfilePath(slug, userId, '/dashboard/users/7/language/x')).toBe('/dashboard/users/moj.slug');
  });

  it('cesta mimo profilov vráti holý slug', () => {
    expect(canonicalOwnProfilePath(slug, userId, '/dashboard/settings/watches')).toBe('/dashboard/users/moj.slug');
  });
});
