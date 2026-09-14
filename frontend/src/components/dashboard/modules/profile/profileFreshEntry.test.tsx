/**
 * Nový vstup do profilu vs. pokračovanie v už otvorenom.
 *
 * Programový vstup (preklik, notifikácia, „Profil" v navigácii) má profil
 * otvoriť od vrchu a na Ponukách. F5 ani krok späť/dopredu to spustiť NESMÚ –
 * tam sa obnovuje to, čo si používateľ vybral. Príznak patrí CIEĽOVÉMU
 * profilu, takže nemôže „preskočiť" na iný.
 */

import { act, renderHook } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('./preloadAvatar', () => ({
  preloadProfileAvatar: jest.fn(),
}));

import {
  markProfileFreshEntry,
  profileEntryTargetFromIdentifier,
  resetProfileFreshEntry,
  takeProfileFreshEntry,
} from './profileFreshEntry';
import { useProfileFreshEntry } from './useProfileFreshEntry';
import { invalidateUserProfileCache, primeUserSlugId } from './profileUserCache';
import { openUserProfile } from '../feed/feedProfileNavigation';
import { useDashboardNavigation } from '../../hooks/useDashboardNavigation';

const OWN = { id: 1, slug: 'me' };

function mountDashboardMain(scrollTop: number): HTMLElement {
  const main = document.createElement('main');
  main.setAttribute('data-dashboard-main', '');
  main.scrollTop = scrollTop;
  document.body.appendChild(main);
  return main;
}

function renderNavigation(user: unknown = OWN) {
  const dashboardState = {
    activeModule: 'home',
    setActiveModule: jest.fn(),
    setIsRightSidebarOpen: jest.fn(),
    setActiveRightItem: jest.fn(),
    setIsMobileMenuOpen: jest.fn(),
    setIsNotificationsPanelOpen: jest.fn(),
    openDesktopSettings: jest.fn(),
    closeDesktopSettings: jest.fn(),
    handleModuleChange: jest.fn(),
  } as never;
  return renderHook(() =>
    useDashboardNavigation({
      user: user as never,
      dashboardState,
      setIsSearchOpen: jest.fn(),
      setViewedUserId: jest.fn(),
      setViewedUserSlug: jest.fn(),
      setViewedUserSummary: jest.fn(),
      setHighlightedSkillId: jest.fn(),
      highlightTimeoutRef: { current: null },
    }),
  ).result;
}

beforeEach(() => {
  resetProfileFreshEntry();
  [OWN.id, 21, 42, 43].forEach(invalidateUserProfileCache);
  document.querySelectorAll('[data-dashboard-main]').forEach((node) => node.remove());
  window.history.replaceState(null, '', '/dashboard');
});

afterEach(() => resetProfileFreshEntry());

describe('kto príznak nastavuje', () => {
  it('leaves it to the dashboard handler instead of the click helper', () => {
    const received: unknown[] = [];
    const listener = (event: Event) => received.push((event as CustomEvent).detail);
    window.addEventListener('goToUserProfile', listener);
    try {
      act(() => openUserProfile({ id: 21, slug: 'peter' }));
    } finally {
      window.removeEventListener('goToUserProfile', listener);
    }

    // Klik len pošle event – príznak si označí jeho centrálny handler, takže
    // platí rovnako pre všetkých, čo tento event posielajú.
    expect(received).toEqual([{ identifier: 'peter' }]);
    expect(takeProfileFreshEntry({ slug: 'peter' })).toBe(false);
  });

  it('turns the event identifier into the target profile', () => {
    expect(profileEntryTargetFromIdentifier('77')).toEqual({ id: 77 });
    expect(profileEntryTargetFromIdentifier(' jana ')).toEqual({ slug: 'jana' });
  });

  it('is set by the “Profile” item in the navigation', () => {
    const navigation = renderNavigation();

    act(() => navigation.current.handleMainModuleChange('profile'));

    expect(takeProfileFreshEntry(OWN)).toBe(true);
  });

  it('is set by the mobile profile tap', () => {
    const navigation = renderNavigation();

    act(() => navigation.current.handleMobileProfileClick());

    expect(takeProfileFreshEntry(OWN)).toBe(true);
  });

  it('is not set when the profile switch does not happen', () => {
    // Bez načítaného používateľa sa na profil neprepne.
    const navigation = renderNavigation(null);

    act(() => navigation.current.handleMainModuleChange('profile'));

    expect(takeProfileFreshEntry(OWN)).toBe(false);
  });

  it('is not set by other sections', () => {
    const navigation = renderNavigation();

    act(() => navigation.current.handleMainModuleChange('home'));

    expect(takeProfileFreshEntry(OWN)).toBe(false);
  });

  it('is absent without a programmatic entry', () => {
    // F5 aj krok späť/dopredu – nikto príznak nenastavil.
    expect(takeProfileFreshEntry(OWN)).toBe(false);
  });
});

describe('príznak patrí cieľovému profilu', () => {
  it('matches a slug target against the id of the displayed profile', () => {
    // Profil sa zobrazí až po vyriešení slugu – vtedy už je v cache.
    primeUserSlugId('jana', 43);
    markProfileFreshEntry({ slug: 'jana' });

    expect(takeProfileFreshEntry({ id: 43 })).toBe(true);
  });

  it('is not consumed as a fresh entry by another profile and does not survive it', () => {
    primeUserSlugId('jana', 43);
    markProfileFreshEntry({ slug: 'jana' });

    expect(takeProfileFreshEntry({ id: 42 })).toBe(false);
    // Vstup do Jany sa neuskutočnil – príznak nesmie čakať na ďalšiu navigáciu.
    expect(takeProfileFreshEntry({ id: 43 })).toBe(false);
  });

  it('scenár z mapovania: click on the open profile, later Back/Forward to another', () => {
    primeUserSlugId('peter', 42);
    const main = mountDashboardMain(0);
    const { result, rerender } = renderHook(
      ({ id }: { id: number }) => useProfileFreshEntry(id),
      { initialProps: { id: 42 } },
    );

    // Preklik na autora v jeho vlastnej záložke Príspevky – profil už je otvorený.
    main.scrollTop = 500;
    act(() => markProfileFreshEntry(profileEntryTargetFromIdentifier('peter')));
    rerender({ id: 42 });
    // Žiadny efekt.
    expect(result.current).toBe(false);
    expect(main.scrollTop).toBe(500);

    // Neskôr krok späť/dopredu do iného profilu – ten sa NESMIE resetovať.
    main.scrollTop = 700;
    rerender({ id: 43 });
    expect(result.current).toBe(false);
    expect(main.scrollTop).toBe(700);
  });

  it('does not reset the same profile when history brings it back later', () => {
    primeUserSlugId('peter', 42);
    const main = mountDashboardMain(0);
    const first = renderHook(() => useProfileFreshEntry(42));

    // Preklik na už otvorený profil…
    act(() => markProfileFreshEntry({ slug: 'peter' }));
    first.unmount();

    // …a o chvíľu sa naň príde krokom späť z inej obrazovky.
    main.scrollTop = 600;
    const later = renderHook(() => useProfileFreshEntry(42));
    expect(later.result.current).toBe(false);
    expect(main.scrollTop).toBe(600);
  });
});

describe('useProfileFreshEntry', () => {
  it('scrolls to the top and reports a fresh entry', () => {
    const main = mountDashboardMain(1400);
    markProfileFreshEntry({ id: 21 });

    const { result } = renderHook(() => useProfileFreshEntry(21));

    // Presne pozorovaný scenár: odscrollovaná obrazovka, vstup do profilu →
    // profil sa otvorí od vrchu, nie prescrollovaný.
    expect(main.scrollTop).toBe(0);
    expect(result.current).toBe(true);
  });

  it('leaves the scroll alone on F5 or history navigation', () => {
    const main = mountDashboardMain(1400);

    // Žiadny programový vstup → žiadny príznak → nič sa nedeje.
    const { result } = renderHook(() => useProfileFreshEntry(21));

    expect(main.scrollTop).toBe(1400);
    expect(result.current).toBe(false);
  });

  it('fires again when the visitor moves to another profile', () => {
    const main = mountDashboardMain(0);
    markProfileFreshEntry({ id: 21 });
    const { result, rerender } = renderHook(
      ({ id }: { id: number }) => useProfileFreshEntry(id),
      { initialProps: { id: 21 } },
    );
    expect(result.current).toBe(true);

    // Z profilu na profil sa ide klientsky – modul sa neodmountuje. Vstup do
    // iného profilu, kým je prvý na obrazovke, sa nezahodí.
    main.scrollTop = 900;
    act(() => markProfileFreshEntry({ id: 42 }));
    rerender({ id: 42 });

    expect(main.scrollTop).toBe(0);
    expect(result.current).toBe(true);
  });

  it('does not fire on a re-render of the same profile', () => {
    const main = mountDashboardMain(0);
    markProfileFreshEntry({ id: 21 });
    const { result, rerender } = renderHook(
      ({ id }: { id: number }) => useProfileFreshEntry(id),
      { initialProps: { id: 21 } },
    );
    expect(result.current).toBe(true);

    // Bežné prekreslenie (načítali sa dáta) – používateľov scroll ostáva.
    main.scrollTop = 900;
    rerender({ id: 21 });

    expect(main.scrollTop).toBe(900);
  });

  it('recognizes the own profile by its slug', () => {
    const main = mountDashboardMain(800);
    // Preklik na vlastné meno ide cez `goToUserProfile` so slugom.
    markProfileFreshEntry(profileEntryTargetFromIdentifier('me'));

    const { result } = renderHook(() => useProfileFreshEntry(OWN.id, OWN.slug));

    expect(result.current).toBe(true);
    expect(main.scrollTop).toBe(0);
  });
});
