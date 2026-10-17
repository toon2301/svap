/**
 * Vstup do Správ cez `router.push`, keď Dashboard už stojí na stránke Správ.
 *
 * Hook zosúladí modul s adresou, keď router prejde na `/dashboard/messages…` a obrazovka je na
 * inom module (napr. profil otvorený z hlavičky konverzácie). Rozhoduje zmena adresy v routeri,
 * nie zmena modulu, a prepína sa len pri zhode adresy v routeri aj v prehliadači.
 */

import { renderHook } from '@testing-library/react';
import { useRouterMessagesModuleSync } from '../useRouterMessagesModuleSync';

type Input = Parameters<typeof useRouterMessagesModuleSync>[0];

const MESSAGES = '/dashboard/messages';
const PROFILE = '/dashboard/users/test-c01-w93-15';

let calls: string[] = [];
const record = (name: string) =>
  jest.fn((...args: unknown[]) => {
    calls.push(`${name}(${args.map((arg) => JSON.stringify(arg)).join(', ')})`);
  });

function makeInput(overrides: Partial<Input> = {}): Input {
  return {
    pathname: PROFILE,
    searchString: '',
    activeModule: 'user-profile',
    setActiveModule: record('setActiveModule'),
    setIsRightSidebarOpen: record('setIsRightSidebarOpen'),
    setActiveRightItem: record('setActiveRightItem'),
    setIsMobileMenuOpen: record('setIsMobileMenuOpen'),
    setViewedUserId: record('setViewedUserId'),
    setViewedUserSlug: record('setViewedUserSlug'),
    setViewedUserSummary: record('setViewedUserSummary'),
    ...overrides,
  };
}

/** Adresa v prehliadači (nezávislá od toho, čo hlási router). */
const setBrowserUrl = (url: string) => window.history.replaceState(null, '', url);

function mount(overrides: Partial<Input> = {}) {
  return renderHook((props: Input) => useRouterMessagesModuleSync(props), {
    initialProps: makeInput(overrides),
  });
}

const rerenderWith = (mounted: ReturnType<typeof mount>, overrides: Partial<Input>) =>
  mounted.rerender(makeInput(overrides));

beforeEach(() => {
  calls = [];
  window.localStorage.clear();
  setBrowserUrl(PROFILE);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('router prejde na Správy z iného modulu', () => {
  it('prepne modul na Správy a zruší stav profilu a bočných panelov', () => {
    const mounted = mount();

    setBrowserUrl(`${MESSAGES}?targetUserId=139`);
    rerenderWith(mounted, { pathname: MESSAGES, searchString: 'targetUserId=139' });

    expect(calls).toEqual([
      'setActiveModule("messages")',
      'setViewedUserId(null)',
      'setViewedUserSlug(null)',
      'setViewedUserSummary(null)',
      'setIsRightSidebarOpen(false)',
      'setActiveRightItem("")',
      'setIsMobileMenuOpen(false)',
    ]);
  });

  it('zapíše aktívny modul do úložiska ako ostatné prepnutia', () => {
    const mounted = mount();

    setBrowserUrl(MESSAGES);
    rerenderWith(mounted, { pathname: MESSAGES });

    expect(window.localStorage.getItem('activeModule')).toBe('messages');
  });

  it.each(['profile', 'user-profile', 'home', 'requests', 'favorites', 'settings'])(
    'prepne aj z modulu „%s“',
    (activeModule) => {
      const mounted = mount({ activeModule });

      setBrowserUrl(`${MESSAGES}?conversationId=9`);
      rerenderWith(mounted, {
        activeModule,
        pathname: MESSAGES,
        searchString: 'conversationId=9',
      });

      expect(calls[0]).toBe('setActiveModule("messages")');
    },
  );

  it('prepne aj pri zmene len query na tej istej ceste Správ (druhé „Poslať správu“)', () => {
    setBrowserUrl(`${MESSAGES}?conversationId=1`);
    const mounted = mount({
      pathname: MESSAGES,
      searchString: 'conversationId=1',
      activeModule: 'user-profile',
    });
    calls = [];

    setBrowserUrl(`${MESSAGES}?targetUserId=139`);
    rerenderWith(mounted, {
      pathname: MESSAGES,
      searchString: 'targetUserId=139',
      activeModule: 'user-profile',
    });

    expect(calls[0]).toBe('setActiveModule("messages")');
  });

  it('nevolá pushState ani replaceState (adresu už zapísal router)', () => {
    const pushState = jest.spyOn(window.history, 'pushState');
    const replaceState = jest.spyOn(window.history, 'replaceState');
    const mounted = mount();
    replaceState.mockClear();

    setBrowserUrl(MESSAGES);
    replaceState.mockClear();
    rerenderWith(mounted, { pathname: MESSAGES });

    expect(pushState).not.toHaveBeenCalled();
    expect(replaceState).not.toHaveBeenCalled();
  });

  it('nespadne, keď je úložisko zamknuté, a modul aj tak prepne', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const mounted = mount();

    setBrowserUrl(MESSAGES);
    expect(() => rerenderWith(mounted, { pathname: MESSAGES })).not.toThrow();

    expect(calls[0]).toBe('setActiveModule("messages")');
  });
});

describe('kedy sa nič nemá stať', () => {
  it('modul už sú Správy', () => {
    const mounted = mount({ activeModule: 'messages' });

    setBrowserUrl(MESSAGES);
    rerenderWith(mounted, { pathname: MESSAGES, activeModule: 'messages' });

    expect(calls).toEqual([]);
  });

  it('router ide na inú obrazovku než Správy', () => {
    const mounted = mount({ pathname: MESSAGES, activeModule: 'messages' });

    setBrowserUrl('/dashboard/users/jana');
    rerenderWith(mounted, { pathname: '/dashboard/users/jana', activeModule: 'user-profile' });

    expect(calls).toEqual([]);
  });

  it('router už ukazuje Správy, ale adresa v prehliadači ešte nie', () => {
    const mounted = mount();

    // Router mení svoj stav skôr, než zapíše adresu.
    rerenderWith(mounted, { pathname: MESSAGES });

    expect(calls).toEqual([]);
  });

  it('adresa v prehliadači ukazuje Správy, ale router ešte nie (po pushState)', () => {
    const mounted = mount({ pathname: MESSAGES, activeModule: 'messages' });

    // Po `goToUserProfile`: modul je už profil, router ešte hlási Správy.
    setBrowserUrl(PROFILE);
    rerenderWith(mounted, { pathname: MESSAGES, activeModule: 'user-profile' });

    expect(calls).toEqual([]);
  });

  it('modul sa zmenil, ale adresa v routeri nie (profil otvorený z konverzácie ostane)', () => {
    setBrowserUrl(MESSAGES);
    const mounted = mount({ pathname: MESSAGES, activeModule: 'messages' });

    setBrowserUrl(PROFILE);
    rerenderWith(mounted, { pathname: MESSAGES, activeModule: 'user-profile' });
    rerenderWith(mounted, { pathname: MESSAGES, activeModule: 'user-profile' });

    expect(calls).toEqual([]);
  });

  it('modul zmenený bez zmeny adresy (obe ukazujú Správy) sa nevráti späť', () => {
    setBrowserUrl(`${MESSAGES}?conversationId=1`);
    const mounted = mount({
      pathname: MESSAGES,
      searchString: 'conversationId=1',
      activeModule: 'messages',
    });

    // Napr. obrazovku zmení stav (onboarding, ponuka) a adresa ostane na Správach.
    rerenderWith(mounted, {
      pathname: MESSAGES,
      searchString: 'conversationId=1',
      activeModule: 'home',
    });

    expect(calls).toEqual([]);
  });

  it('rovnaká adresa po prekreslení sa nespracuje znova', () => {
    const mounted = mount();
    setBrowserUrl(MESSAGES);
    rerenderWith(mounted, { pathname: MESSAGES });
    calls = [];

    rerenderWith(mounted, { pathname: MESSAGES });

    expect(calls).toEqual([]);
  });

  it.each([null, undefined, ''])('chýbajúci pathname %j nič nespraví', (pathname) => {
    const mounted = mount();

    setBrowserUrl(MESSAGES);
    rerenderWith(mounted, { pathname });

    expect(calls).toEqual([]);
  });
});

describe('ďalší vstup do Správ po návrate na iný modul', () => {
  it('prepne znova pri ďalšej zmene adresy', () => {
    const mounted = mount();
    setBrowserUrl(`${MESSAGES}?targetUserId=139`);
    rerenderWith(mounted, { pathname: MESSAGES, searchString: 'targetUserId=139' });
    calls = [];

    // Používateľ otvorí profil a z neho znova správy (iná query).
    setBrowserUrl(PROFILE);
    rerenderWith(mounted, { pathname: PROFILE, activeModule: 'user-profile' });
    setBrowserUrl(`${MESSAGES}?targetUserId=140`);
    rerenderWith(mounted, {
      pathname: MESSAGES,
      searchString: 'targetUserId=140',
      activeModule: 'user-profile',
    });

    expect(calls[0]).toBe('setActiveModule("messages")');
  });

  it('modul prepnutý navigáciou (Správy v menu) hook nepreruší', () => {
    const mounted = mount({ pathname: '/dashboard', activeModule: 'home' });

    // Menu: `pushState` na Správy a súčasne `setActiveModule('messages')` v tom istom renderi.
    setBrowserUrl(MESSAGES);
    rerenderWith(mounted, { pathname: MESSAGES, activeModule: 'messages' });

    expect(calls).toEqual([]);
  });
});
