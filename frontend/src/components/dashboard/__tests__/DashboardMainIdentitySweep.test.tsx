/**
 * `<main>` dostáva nový element pri KAŽDEJ zmene `activeModule` – overené
 * priamo cez `DashboardLayout` (nie len cez `useDashboardMainKey` v izolácii),
 * naprieč celým katalógom modulov, nielen okolo profilu a Nástenky.
 *
 * Kandidát B (namerané na iPhone cez ?debugscroll=1, 10/10 čistých vstupov
 * oproti 4/5 zlyhaniam bez neho) rieši triedu chýb „iOS si pamätá scroll
 * elementu, ktorý sa len prekreslil" – pre KAŽDÝ prechod, nielen ten pôvodne
 * nahlásený. `FeedExitScrollReset.test.tsx` dokazuje SPRÁVNE SPRÁVANIE scrollu
 * pre konkrétny scenár (celá appka, siete, ponuky); tento súbor dokazuje
 * UNIVERZÁLNOSŤ zapojenia – ľahký harness bez mockovania siete, priamo na
 * `DashboardLayout` (vzor z `DashboardLayout.feedHome.test.tsx`).
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DashboardLayout from '../DashboardLayout';
import OnboardingScrollLock from '../onboarding/OnboardingScrollLock';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/hooks', () => ({
  useIsMobile: () => false,
  useIsMobileState: () => ({ isMobile: false, isResolved: true }),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fallback?: string) => fallback ?? _k }),
}));

// Viditeľnosť tutoriálu riadi test – zámok scrollu má zostať zapnutý aj po
// výmene `<main>` (viď posledný `describe` nižšie).
let mockOnboardingOverlayVisible = true;
jest.mock('../onboarding/DesktopOnboardingContext', () => ({
  useOptionalDesktopOnboarding: () => ({ isOverlayVisible: mockOnboardingOverlayVisible }),
}));
jest.mock('../onboarding/MobileOnboardingContext', () => ({
  useOptionalMobileOnboarding: () => null,
}));

jest.mock('../Sidebar', () => ({ __esModule: true, default: () => <nav /> }));
jest.mock('../RightSidebar', () => ({ __esModule: true, default: () => <aside /> }));
jest.mock('../MobileTopNav', () => ({ __esModule: true, default: () => null }));
jest.mock('../MobileTopBar', () => ({ __esModule: true, default: () => null }));
jest.mock('../modules/bug-report/BugReportDialogHost', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../modules/offer-watch/mobile/OfferWatchSettingsMobileHost', () => ({
  __esModule: true,
  default: () => null,
}));
// Ladiaci pásik (?debugscroll=1) je bez príznaku no-op, ale nech sa nepletie
// do počítania mountov <main>.
jest.mock('../debug/ScrollDebugPanel', () => ({ __esModule: true, default: () => null }));

const noop = () => {};

type LayoutOverrides = {
  activeModule: string;
  activeRightItem?: string;
  isRightSidebarOpen?: boolean;
};

/** Element `DashboardLayout` s minimálnymi no-op props – mení sa len to, čo test skúma. */
function layoutFor({ activeModule, activeRightItem = '', isRightSidebarOpen = false }: LayoutOverrides) {
  return (
    <DashboardLayout
      activeModule={activeModule}
      activeRightItem={activeRightItem}
      isRightSidebarOpen={isRightSidebarOpen}
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

function dashboardMain(): HTMLElement {
  const main = document.querySelector<HTMLElement>('[data-dashboard-main]');
  if (!main) throw new Error('chýba <main data-dashboard-main>');
  return main;
}

// Reprezentatívny prierez katalógu z `ModuleRouter.tsx` – hlavné obrazovky
// (Nástenka, profil, vyhľadávanie, správy, upozornenia, žiadosti, obľúbené,
// štatistiky, sledované, nastavenia, cudzí profil) aj jedna vnorená (ponuky).
// Posledný prvok je zámerne rovnaký NÁZOV ako prvý (`home`) – dokazuje, že aj
// návrat na ten istý modul dostane čerstvý element, nie ten prvý späť.
const MODULES = [
  'home',
  'profile',
  'search',
  'messages',
  'notifications',
  'requests',
  'favorites',
  'statistics',
  'watches',
  'settings',
  'user-profile',
  'skills-offer',
  'home',
] as const;

describe('<main> dostáva nový element pri zmene modulu (naprieč celým katalógom)', () => {
  it.each(MODULES.slice(1).map((module, index) => [MODULES[index], module] as const))(
    '%s → %s: iný element `<main>`, starý sa odpojí',
    (from, to) => {
      const { rerender } = render(layoutFor({ activeModule: from }));
      const before = dashboardMain();

      rerender(layoutFor({ activeModule: to }));

      const after = dashboardMain();
      expect(after).not.toBe(before);
      expect(before.isConnected).toBe(false);
      expect(screen.getByTestId('module-content')).toHaveTextContent(to);
    },
  );

  it('reťaz celým katalógom: žiadne dva vstupy nezdieľajú element, ani ten istý názov modulu', () => {
    const { rerender } = render(layoutFor({ activeModule: MODULES[0] }));
    let previous = dashboardMain();
    const seen = new Set<Element>([previous]);

    for (const moduleName of MODULES.slice(1)) {
      rerender(layoutFor({ activeModule: moduleName }));
      const current = dashboardMain();
      expect(current).not.toBe(previous);
      expect(seen.has(current)).toBe(false);
      seen.add(current);
      previous = current;
    }
    expect(seen.size).toBe(MODULES.length);
  });

  it('zmena INÝCH props (pravý panel) bez zmeny modulu nevytvorí nový element', () => {
    const { rerender } = render(layoutFor({ activeModule: 'profile', isRightSidebarOpen: false }));
    const before = dashboardMain();

    rerender(layoutFor({ activeModule: 'profile', activeRightItem: 'edit-profile', isRightSidebarOpen: true }));

    expect(dashboardMain()).toBe(before);
  });

  it('viacero prekreslení toho istého modulu medzi dvoma zmenami nevytvára ďalšie elementy', () => {
    const { rerender } = render(layoutFor({ activeModule: 'home' }));
    rerender(layoutFor({ activeModule: 'profile' }));
    const afterChange = dashboardMain();

    for (let i = 0; i < 4; i += 1) rerender(layoutFor({ activeModule: 'profile' }));

    expect(dashboardMain()).toBe(afterChange);
  });

  it('StrictMode: dvojitý render v deve nevytvorí extra element navyše', () => {
    const { rerender } = render(<React.StrictMode>{layoutFor({ activeModule: 'home' })}</React.StrictMode>);
    const before = dashboardMain();

    rerender(<React.StrictMode>{layoutFor({ activeModule: 'home' })}</React.StrictMode>);
    expect(dashboardMain()).toBe(before);

    rerender(<React.StrictMode>{layoutFor({ activeModule: 'profile' })}</React.StrictMode>);
    expect(dashboardMain()).not.toBe(before);
  });
});

describe('zámok scrollu tutoriálu sleduje aktuálny <main> (viditeľnosť tutoriálu sa pri zmene modulu nemení)', () => {
  /** Tutoriál posúva krok aj modul v jednom kroku – zámok zostáva zapnutý, efekt sa nespustí znova. */
  function layoutWithScrollLock(activeModule: string) {
    return (
      <>
        {layoutFor({ activeModule })}
        <OnboardingScrollLock />
      </>
    );
  }

  async function flushMutationObservers() {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  beforeEach(() => {
    mockOnboardingOverlayVisible = true;
  });

  it('po každej výmene <main> je zamknutý ten AKTUÁLNY a starý sa uvoľní – naprieč celým katalógom', async () => {
    const { rerender } = render(layoutWithScrollLock(MODULES[0]));
    let previous = dashboardMain();
    expect(previous.style.overflowY).toBe('hidden');

    for (const moduleName of MODULES.slice(1)) {
      rerender(layoutWithScrollLock(moduleName));
      await flushMutationObservers();

      const current = dashboardMain();
      expect(current).not.toBe(previous);
      expect(previous.isConnected).toBe(false);
      expect(current.style.overflowY).toBe('hidden');
      previous = current;
    }
  });

  it('po skončení tutoriálu sa scroll aktuálneho <main> vráti (žiadne zaseknuté overflow: hidden)', async () => {
    const { rerender } = render(layoutWithScrollLock('home'));
    rerender(layoutWithScrollLock('profile'));
    await flushMutationObservers();
    expect(dashboardMain().style.overflowY).toBe('hidden');

    mockOnboardingOverlayVisible = false;
    rerender(layoutWithScrollLock('profile'));

    expect(dashboardMain().style.overflowY).toBe('');
  });
});
