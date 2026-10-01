/** Záložka vlastného profilu pri prvom zobrazení; záložka z adresy platí len pre vlastný profil. */

import type { User } from '@/types';
import { resolveInitialOwnProfileTab } from './ownProfileTab';

function makeUser(fields: { id: number; slug: string | null }): User {
  return {
    username: 'tester',
    email: 'tester@example.com',
    first_name: 'Test',
    last_name: 'User',
    user_type: 'individual',
    ...fields,
  } as User;
}

const me = makeUser({ id: 7, slug: 'jana-novak-1' });
const meWithoutSlug = makeUser({ id: 7, slug: null });

describe('stránky vlastného profilu (profile, portfolio-create, portfolio-detail)', () => {
  const OWN_PROFILE_ROUTES = ['profile', 'portfolio-create', 'portfolio-detail'];

  it.each(OWN_PROFILE_ROUTES)('%s: záložka zo stránky sa použije', (route) => {
    expect(resolveInitialOwnProfileTab(route, 'posts', me, undefined, undefined)).toBe('posts');
    expect(resolveInitialOwnProfileTab(route, 'tagged', me, undefined, undefined)).toBe('tagged');
  });

  it.each(OWN_PROFILE_ROUTES)('%s: bez záložky sa otvoria ponuky', (route) => {
    expect(resolveInitialOwnProfileTab(route, undefined, me, undefined, undefined)).toBe('offers');
  });

  it.each(OWN_PROFILE_ROUTES)('%s: identita z adresy sa nekontroluje', (route) => {
    expect(resolveInitialOwnProfileTab(route, 'portfolio', null, 'iny-slug', 99)).toBe('portfolio');
  });
});

describe('profil používateľa (user-profile)', () => {
  it('vlastný profil podľa slugu: záložka z adresy platí', () => {
    expect(resolveInitialOwnProfileTab('user-profile', 'posts', me, 'jana-novak-1', null)).toBe('posts');
  });

  it('slug z adresy sa porovnáva po orezaní medzier', () => {
    expect(resolveInitialOwnProfileTab('user-profile', 'posts', me, '  jana-novak-1 ', null)).toBe('posts');
  });

  it('vlastný profil podľa ID: záložka platí aj pri používateľovi bez slugu', () => {
    expect(resolveInitialOwnProfileTab('user-profile', 'portfolio', meWithoutSlug, null, 7)).toBe('portfolio');
  });

  it('ID stačí, aj keď slug z adresy nesedí', () => {
    expect(resolveInitialOwnProfileTab('user-profile', 'tagged', me, 'stary-slug', 7)).toBe('tagged');
  });

  it.each(['null', 'undefined'])('slug "%s" je platný slug, nie text chýbajúcej hodnoty', (text) => {
    const user = makeUser({ id: 7, slug: text });
    expect(resolveInitialOwnProfileTab('user-profile', 'posts', user, null, 99)).toBe('offers');
    expect(resolveInitialOwnProfileTab('user-profile', 'posts', user, undefined, 99)).toBe('offers');
    expect(resolveInitialOwnProfileTab('user-profile', 'posts', user, text, 99)).toBe('posts');
  });

  it('cudzí profil: záložka z adresy sa ignoruje', () => {
    expect(resolveInitialOwnProfileTab('user-profile', 'posts', me, 'iny-slug', 8)).toBe('offers');
    expect(resolveInitialOwnProfileTab('user-profile', 'posts', me, 'iny-slug', null)).toBe('offers');
    expect(resolveInitialOwnProfileTab('user-profile', 'posts', me, null, 8)).toBe('offers');
  });

  it.each([null, undefined])('bez prihláseného používateľa (%p) sa záložka ignoruje', (user) => {
    expect(resolveInitialOwnProfileTab('user-profile', 'posts', user, 'jana-novak-1', 7)).toBe('offers');
  });

  it('prázdny slug a chýbajúce ID nestačia na vlastný profil', () => {
    expect(resolveInitialOwnProfileTab('user-profile', 'posts', me, '', null)).toBe('offers');
    expect(resolveInitialOwnProfileTab('user-profile', 'posts', me, '   ', undefined)).toBe('offers');
    expect(resolveInitialOwnProfileTab('user-profile', 'posts', me, null, undefined)).toBe('offers');
  });

  it('používateľ bez slugu sa podľa slugu nezhoduje', () => {
    expect(resolveInitialOwnProfileTab('user-profile', 'posts', meWithoutSlug, 'jana-novak-1', 8)).toBe('offers');
  });

  it('bez záložky v adrese ostanú ponuky aj na vlastnom profile', () => {
    expect(resolveInitialOwnProfileTab('user-profile', undefined, me, 'jana-novak-1', 7)).toBe('offers');
  });
});

describe('ostatné stránky', () => {
  it.each([undefined, 'home', 'messages', 'feed-post-detail'])('%p: vždy ponuky', (route) => {
    expect(resolveInitialOwnProfileTab(route, 'posts', me, 'jana-novak-1', 7)).toBe('offers');
  });
});
