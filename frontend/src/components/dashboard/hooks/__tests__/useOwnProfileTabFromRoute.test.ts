/**
 * Záložka vlastného profilu z adresy.
 *
 * Efekt nastaví záložku z adresy len vtedy, keď adresa otvára VLASTNÝ profil
 * (zhoda podľa slugu alebo ID) a vlastný používateľ je už známy. Cudzí profil
 * a iné stránky záložku nemenia.
 */

import { renderHook } from '@testing-library/react';
import type { User } from '@/types';
import type { ProfileTab } from '../../modules/profile/profileTypes';
import { useOwnProfileTabFromRoute } from '../useOwnProfileTabFromRoute';

type HookInput = Parameters<typeof useOwnProfileTabFromRoute>[0];

const setOwnProfileTab = jest.fn();

beforeEach(() => {
  setOwnProfileTab.mockClear();
});

function makeUser(fields: { id: number; slug?: string | null }): User {
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

function makeInput(overrides: Partial<HookInput> = {}): HookInput {
  return {
    user: me,
    initialRoute: 'user-profile',
    initialProfileTab: 'posts',
    initialProfileSlug: 'jana-novak-1',
    initialViewedUserId: null,
    setOwnProfileTab,
    ...overrides,
  };
}

function mountHook(overrides: Partial<HookInput> = {}) {
  return renderHook((props: HookInput) => useOwnProfileTabFromRoute(props), {
    initialProps: makeInput(overrides),
  });
}

describe('vlastný profil: záložka z adresy sa nastaví', () => {
  it('podľa slugu', () => {
    mountHook();

    expect(setOwnProfileTab).toHaveBeenCalledTimes(1);
    expect(setOwnProfileTab).toHaveBeenCalledWith('posts');
  });

  it('slug z adresy sa porovnáva po orezaní medzier', () => {
    mountHook({ initialProfileSlug: '  jana-novak-1 ' });

    expect(setOwnProfileTab).toHaveBeenCalledWith('posts');
  });

  it('podľa ID, aj keď slug z adresy nesedí', () => {
    mountHook({ initialProfileSlug: 'stary-slug', initialViewedUserId: 7 });

    expect(setOwnProfileTab).toHaveBeenCalledWith('posts');
  });

  it('podľa ID, aj keď používateľ nemá slug', () => {
    mountHook({
      user: makeUser({ id: 7, slug: null }),
      initialProfileSlug: null,
      initialViewedUserId: 7,
    });

    expect(setOwnProfileTab).toHaveBeenCalledWith('posts');
  });

  it('ID 0 je hodnota (kontrola je na null, nie na pravdivosť)', () => {
    mountHook({
      user: makeUser({ id: 0, slug: null }),
      initialProfileSlug: null,
      initialViewedUserId: 0,
    });

    expect(setOwnProfileTab).toHaveBeenCalledWith('posts');
  });

  it.each<ProfileTab>(['offers', 'portfolio', 'posts', 'tagged'])('záložka %s', (tab) => {
    mountHook({ initialProfileTab: tab });

    expect(setOwnProfileTab).toHaveBeenCalledWith(tab);
  });
});

describe('záložka sa nenastaví', () => {
  const CASES: Array<[string, Partial<HookInput>]> = [
    ['cudzí profil (slug aj ID sa líšia)', { initialProfileSlug: 'peter-1', initialViewedUserId: 99 }],
    ['v adrese nie je slug ani ID', { initialProfileSlug: null, initialViewedUserId: null }],
    ['slug aj ID chýbajú úplne', { initialProfileSlug: undefined, initialViewedUserId: undefined }],
    ['slug z medzier a ID sa líši', { initialProfileSlug: '   ', initialViewedUserId: 99 }],
    ['používateľ ešte nie je známy (null)', { user: null }],
    ['používateľ ešte nie je známy (undefined)', { user: undefined }],
    ['adresa nenesie záložku', { initialProfileTab: undefined }],
    ['stránka nie je profil používateľa (profile)', { initialRoute: 'profile' }],
    ['stránka nie je profil používateľa (home)', { initialRoute: 'home' }],
    ['stránka nie je určená', { initialRoute: undefined }],
    [
      'používateľ bez slugu a ID z adresy sa líši',
      { user: makeUser({ id: 7, slug: null }), initialProfileSlug: 'jana-novak-1', initialViewedUserId: 99 },
    ],
  ];

  it.each(CASES)('%s', (_title, overrides) => {
    mountHook(overrides);

    expect(setOwnProfileTab).not.toHaveBeenCalled();
  });

  it.each(['null', 'undefined'])(
    'slug "%s" je platný slug, nie text chýbajúcej hodnoty',
    (text) => {
      const user = makeUser({ id: 7, slug: text });

      mountHook({ user, initialProfileSlug: null, initialViewedUserId: 99 });
      mountHook({ user, initialProfileSlug: undefined, initialViewedUserId: 99 });

      expect(setOwnProfileTab).not.toHaveBeenCalled();

      mountHook({ user, initialProfileSlug: text, initialViewedUserId: 99 });

      expect(setOwnProfileTab).toHaveBeenCalledTimes(1);
    },
  );
});

describe('opakované spúšťanie efektu', () => {
  it('rovnaké vstupy pri ďalšom vykreslení záložku znova nenastavujú', () => {
    const view = mountHook();
    expect(setOwnProfileTab).toHaveBeenCalledTimes(1);

    view.rerender(makeInput());
    view.rerender(makeInput());

    expect(setOwnProfileTab).toHaveBeenCalledTimes(1);
  });

  it('keď sa používateľ objaví až neskôr, záložka sa nastaví hneď po jeho príchode', () => {
    const view = mountHook({ user: null });
    expect(setOwnProfileTab).not.toHaveBeenCalled();

    view.rerender(makeInput({ user: me }));

    expect(setOwnProfileTab).toHaveBeenCalledTimes(1);
    expect(setOwnProfileTab).toHaveBeenCalledWith('posts');
  });

  const SINGLE_CHANGES: Array<[string, Partial<HookInput>, Partial<HookInput>]> = [
    ['používateľ', { user: null }, { user: me }],
    ['stránka', { initialRoute: 'home' }, { initialRoute: 'user-profile' }],
    ['záložka z adresy', { initialProfileTab: undefined }, { initialProfileTab: 'tagged' }],
    ['slug z adresy', { initialProfileSlug: 'peter-1' }, { initialProfileSlug: 'jana-novak-1' }],
    ['ID z adresy', { initialProfileSlug: 'peter-1', initialViewedUserId: 99 }, { initialViewedUserId: 7 }],
  ];

  it.each(SINGLE_CHANGES)('zmena vstupu „%s“ spustí efekt znova', (_title, before, after) => {
    const view = mountHook(before);
    expect(setOwnProfileTab).not.toHaveBeenCalled();

    view.rerender(makeInput({ ...before, ...after }));

    expect(setOwnProfileTab).toHaveBeenCalledTimes(1);
  });

  it('zmena záložky z adresy pri vlastnom profile nastaví novú záložku', () => {
    const view = mountHook({ initialProfileTab: 'posts' });

    view.rerender(makeInput({ initialProfileTab: 'portfolio' }));

    expect(setOwnProfileTab).toHaveBeenCalledTimes(2);
    expect(setOwnProfileTab).toHaveBeenLastCalledWith('portfolio');
  });

  it('odchod na inú stránku záložku nemení', () => {
    const view = mountHook();
    expect(setOwnProfileTab).toHaveBeenCalledTimes(1);

    view.rerender(makeInput({ initialRoute: 'home' }));

    expect(setOwnProfileTab).toHaveBeenCalledTimes(1);
  });

  it('nová identita objektu používateľa (aj s rovnakým obsahom) spustí efekt znova', () => {
    const view = mountHook();
    expect(setOwnProfileTab).toHaveBeenCalledTimes(1);

    view.rerender(makeInput({ user: { ...me } }));

    expect(setOwnProfileTab).toHaveBeenCalledTimes(2);
  });
});
