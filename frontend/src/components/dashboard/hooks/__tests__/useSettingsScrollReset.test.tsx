/**
 * Nastavenia sa otvárajú od vrchu.
 *
 * Dashboard scrolluje v jedinom `<main data-dashboard-main>` a všetky sekcie
 * Nastavení – desktopové aj mobilné – sa vykresľujú doň. Bez nulovania si
 * vezmú pozíciu obrazovky, z ktorej sa do nich vošlo (typicky odscrollovaná
 * Nástenka), a držia ju aj medzi sekciami.
 */

import { renderHook } from '@testing-library/react';
import { useSettingsScrollReset } from '../useSettingsScrollReset';

function mountMain(scrollTop: number): HTMLElement {
  const main = document.createElement('div');
  main.setAttribute('data-dashboard-main', '');
  main.scrollTop = scrollTop;
  document.body.appendChild(main);
  return main;
}

type Screen = { module: string; rightItem: string; sidebarOpen: boolean };

function renderScreen(initial: Screen) {
  return renderHook(
    ({ module, rightItem, sidebarOpen }: Screen) =>
      useSettingsScrollReset(module, rightItem, sidebarOpen),
    { initialProps: initial },
  );
}

const HOME: Screen = { module: 'home', rightItem: '', sidebarOpen: false };

afterEach(() => {
  document.body.innerHTML = '';
});

describe('vstup do Nastavení', () => {
  it('desktop: prvá obrazovka sa otvorí od vrchu', () => {
    const main = mountMain(1200);
    const { rerender } = renderScreen(HOME);
    expect(main.scrollTop).toBe(1200);

    rerender({ module: 'settings', rightItem: 'edit-profile', sidebarOpen: true });

    expect(main.scrollTop).toBe(0);
  });

  it.each([
    'notification-settings',
    'account-settings',
    'blocked-users',
    'language',
    'account-type',
    'privacy',
  ])('mobil: sekcia %s sa otvorí od vrchu', (moduleId) => {
    const main = mountMain(900);
    const { rerender } = renderScreen(HOME);

    rerender({ module: moduleId, rightItem: '', sidebarOpen: false });

    expect(main.scrollTop).toBe(0);
  });
});

describe('prepínanie medzi sekciami', () => {
  it('desktop: každá ďalšia sekcia začína od vrchu', () => {
    const main = mountMain(0);
    const { rerender } = renderScreen({
      module: 'settings',
      rightItem: 'edit-profile',
      sidebarOpen: true,
    });

    main.scrollTop = 800;
    rerender({ module: 'settings', rightItem: 'notifications', sidebarOpen: true });
    expect(main.scrollTop).toBe(0);

    main.scrollTop = 640;
    rerender({ module: 'settings', rightItem: 'offer-watches', sidebarOpen: true });
    expect(main.scrollTop).toBe(0);
  });

  it('scroll vnútri tej istej sekcie ostáva, kde je', () => {
    const main = mountMain(0);
    const { rerender } = renderScreen({
      module: 'settings',
      rightItem: 'notifications',
      sidebarOpen: true,
    });

    // Používateľ si sekciu odscrolluje; prekreslenie ho nemá ťahať na vrch.
    main.scrollTop = 450;
    rerender({ module: 'settings', rightItem: 'notifications', sidebarOpen: true });

    expect(main.scrollTop).toBe(450);
  });
});

describe('mimo Nastavení sa nedeje nič', () => {
  it.each(['home', 'profile', 'user-profile', 'feed-post-detail', 'messages'])(
    'modul %s si scroll drží',
    (moduleId) => {
      const main = mountMain(1500);
      const { rerender } = renderScreen(HOME);

      rerender({ module: moduleId, rightItem: '', sidebarOpen: false });

      expect(main.scrollTop).toBe(1500);
    },
  );

  it('odchod z Nastavení nechá obnovu na cieľovej obrazovke', () => {
    const main = mountMain(0);
    const { rerender } = renderScreen({
      module: 'settings',
      rightItem: 'notifications',
      sidebarOpen: true,
    });

    // Návrat na Nástenku: pozíciu obnovuje feed, tento hook do nej nesmie siahať.
    main.scrollTop = 1100;
    rerender(HOME);

    expect(main.scrollTop).toBe(1100);
  });

  it('úprava vlastného profilu mimo Nastavení scroll nemení', () => {
    const main = mountMain(700);
    const { rerender } = renderScreen(HOME);

    // Pravý panel s úpravou profilu otvorený PRIAMO z profilu – nie je to
    // vstup do Nastavení, takže sa správanie nemení.
    rerender({ module: 'profile', rightItem: 'edit-profile', sidebarOpen: true });

    expect(main.scrollTop).toBe(700);
  });
});

describe('chýbajúci kontajner', () => {
  it('bez `main` sa nič nerozbije', () => {
    const { rerender } = renderScreen(HOME);

    expect(() =>
      rerender({ module: 'settings', rightItem: 'edit-profile', sidebarOpen: true }),
    ).not.toThrow();
  });
});
