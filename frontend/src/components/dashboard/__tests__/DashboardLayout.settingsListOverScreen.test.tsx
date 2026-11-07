/**
 * Zoznam Nastavení na mobile (nález 276, časť Nastavenia): element `<main>`.
 *
 * Zoznam je panel, ktorý sa vsúva ZĽAVA ponad obrazovku (pri otvorení z profilu aj pri Späť zo sekcie). Pod ním stál
 * nový `<main>` so zástupnou stránkou modulu `settings`, takže sa pri vsúvaní panela obsah na pravej strane na okamih
 * vymenil za sivý text (preblik, zmerané v prehliadači). Teraz `DashboardLayout` pod panelom drží ten istý `<main>`
 * (obsah v ňom drží `ModuleRouter`, viď jeho test). Návrat na tú istú obrazovku element nevymení, iná obrazovka
 * dostane nový ako vždy, desktop sa nemení.
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import DashboardLayout from '../DashboardLayout';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));

// Test riadi, či ide o mobil.
let mockIsMobile = true;
jest.mock('@/hooks', () => ({
  useIsMobile: () => mockIsMobile,
  useIsMobileState: () => ({ isMobile: mockIsMobile, isResolved: true }),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fallback?: string) => fallback ?? _k }),
}));

jest.mock('../onboarding/DesktopOnboardingContext', () => ({
  useOptionalDesktopOnboarding: () => null,
}));
jest.mock('../onboarding/MobileOnboardingContext', () => ({
  useOptionalMobileOnboarding: () => null,
}));

jest.mock('../Sidebar', () => ({ __esModule: true, default: () => <nav /> }));
jest.mock('../RightSidebar', () => ({ __esModule: true, default: () => <aside /> }));
jest.mock('../MobileTopNav', () => ({ __esModule: true, default: () => null }));
jest.mock('../MobileTopBar', () => ({ __esModule: true, default: () => null }));
jest.mock('../modules/bug-report/BugReportDialogHost', () => ({ __esModule: true, default: () => null }));
jest.mock('../modules/offer-watch/mobile/OfferWatchSettingsMobileHost', () => ({
  __esModule: true,
  default: () => null,
}));

const noop = () => {};

/** `DashboardLayout` s minimálnymi no-op props a obsahom, ktorý zodpovedá modulu. */
function layoutFor(activeModule: string) {
  return (
    <DashboardLayout
      activeModule={activeModule}
      activeRightItem=""
      isRightSidebarOpen={false}
      isMobileMenuOpen={false}
      onModuleChange={noop}
      onLogout={noop}
      onRightSidebarClose={noop}
      onRightItemClick={noop}
      onMobileMenuOpen={noop}
      onMobileMenuClose={noop}
      onMobileBack={noop}
      onMobileProfileClick={noop}
      onSidebarLanguageClick={noop}
      onSidebarAccountTypeClick={noop}
      onSidebarAccountSettingsClick={noop}
    >
      <div data-testid="module-content">{activeModule}</div>
    </DashboardLayout>
  );
}

/** Aktuálny `<main>` dashboardu. */
function dashboardMain(): HTMLElement {
  const main = document.querySelector<HTMLElement>('[data-dashboard-main]');
  if (!main) throw new Error('chýba <main data-dashboard-main>');
  return main;
}

beforeEach(() => {
  mockIsMobile = true;
});

describe('DashboardLayout: zoznam Nastavení na mobile drží `<main>` obrazovky pod panelom', () => {
  it('profil → zoznam Nastavení: ostane ten istý element', () => {
    const { rerender } = render(layoutFor('profile'));
    const main = dashboardMain();

    rerender(layoutFor('settings'));

    expect(dashboardMain()).toBe(main);
    expect(main.isConnected).toBe(true);
  });

  it('profil → zoznam → zatvorenie: profil dostane ten istý element (modul sa nezmenil)', () => {
    const { rerender } = render(layoutFor('profile'));
    const main = dashboardMain();

    rerender(layoutFor('settings'));
    rerender(layoutFor('profile'));

    expect(dashboardMain()).toBe(main);
  });

  it('sekcia → Späť na zoznam: ostane ten istý element', () => {
    const { rerender } = render(layoutFor('language'));
    const main = dashboardMain();

    rerender(layoutFor('settings'));

    expect(dashboardMain()).toBe(main);
  });

  it('prekreslenie počas otvoreného zoznamu element nezmení', () => {
    const { rerender } = render(layoutFor('profile'));
    rerender(layoutFor('settings'));
    const main = dashboardMain();

    rerender(layoutFor('settings'));

    expect(dashboardMain()).toBe(main);
  });

  it('zoznam → iná sekcia: nový element a starý sa odpojí', () => {
    const { rerender } = render(layoutFor('profile'));
    const main = dashboardMain();

    rerender(layoutFor('settings'));
    rerender(layoutFor('language'));

    expect(dashboardMain()).not.toBe(main);
    expect(main.isConnected).toBe(false);
  });

  it('desktop sa nemení: modul `settings` dostane nový element', () => {
    mockIsMobile = false;
    const { rerender } = render(layoutFor('profile'));
    const main = dashboardMain();

    rerender(layoutFor('settings'));

    expect(dashboardMain()).not.toBe(main);
    expect(main.isConnected).toBe(false);
  });
});
