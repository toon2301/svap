/**
 * Výška dashboardu na mobile a scroll okna.
 *
 * iOS Safari: `100vh` je vyššie než viditeľná plocha (s lištami), takže koreň s
 * `h-screen` robil z dokumentu scrollovateľnú plochu – okno sa posunulo (napr. o 40 px)
 * a obrazovka bola zhora odrezaná. Pod `lg` preto výška sleduje viditeľnú plochu (`dvh`),
 * od `lg` ostáva `100vh`; kde `dvh` neexistuje, platí `h-screen`.
 *
 * Skutočnú výšku lišiet jsdom nepozná, preto test tvrdí triedy; overenie na iPhone
 * je cez `?debugscroll=1` (okno `wy` musí ostať 0).
 *
 * Poistka: pri výmene `<main>` sa okno vráti na začiatok, aj keby sa dokument posunul.
 */

import type { ComponentProps } from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

import DashboardLayout from '../DashboardLayout';

jest.mock('@/hooks', () => ({
  __esModule: true,
  useIsMobile: jest.fn(),
}));

jest.mock('../hooks/useMobileViewportHeight', () => ({
  __esModule: true,
  useMobileViewportHeight: jest.fn(),
}));

jest.mock('../Sidebar', () => ({
  __esModule: true,
  default: () => <div data-testid="sidebar" />,
}));

jest.mock('../RightSidebar', () => ({
  __esModule: true,
  default: () => <div data-testid="right-sidebar" />,
}));

jest.mock('../MobileTopNav', () => ({
  __esModule: true,
  default: () => <div data-testid="mobile-top-nav" />,
}));

jest.mock('../MobileTopBar', () => ({
  __esModule: true,
  default: () => <div data-testid="mobile-top-bar" />,
}));

const { useIsMobile } = jest.requireMock('@/hooks') as {
  useIsMobile: jest.Mock;
};

const { useMobileViewportHeight } = jest.requireMock('../hooks/useMobileViewportHeight') as {
  useMobileViewportHeight: jest.Mock;
};

const baseProps = {
  activeModule: 'home',
  activeRightItem: '',
  isRightSidebarOpen: false,
  isMobileMenuOpen: false,
  onModuleChange: jest.fn(),
  onLogout: jest.fn(),
  onRightSidebarClose: jest.fn(),
  onRightItemClick: jest.fn(),
  onMobileMenuOpen: jest.fn(),
  onMobileMenuClose: jest.fn(),
  onMobileBack: jest.fn(),
  onMobileProfileClick: jest.fn(),
  onSidebarLanguageClick: jest.fn(),
  onSidebarAccountTypeClick: jest.fn(),
  onSidebarAccountSettingsClick: jest.fn(),
};

const DVH_CLASS = 'supports-[height:100dvh]:h-dvh';

const originalScrollY = Object.getOwnPropertyDescriptor(window, 'scrollY');
let windowScrollY = 0;
let scrollToSpy: jest.SpyInstance;

function layout(overrides: Partial<ComponentProps<typeof DashboardLayout>> = {}) {
  return (
    <DashboardLayout {...baseProps} {...overrides}>
      <div data-testid="layout-child">Obsah</div>
    </DashboardLayout>
  );
}

describe('DashboardLayout: výška pod lg sleduje viditeľnú plochu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useIsMobile.mockReturnValue(true);
    useMobileViewportHeight.mockReturnValue(null);
  });

  it('koreň aj <main> majú rovnakú výšku: h-screen ako záloha, pod lg dvh, od lg znova 100vh', () => {
    const { container } = render(layout());

    const root = container.firstElementChild as HTMLElement;
    const main = root.querySelector('[data-dashboard-main]') as HTMLElement;

    for (const element of [root, main]) {
      expect(element).toHaveClass('h-screen', DVH_CLASS, 'lg:h-screen');
    }
  });

  it('desktopové bunky gridu ostávajú na 100vh (bez dvh)', () => {
    const { container } = render(layout({ isRightSidebarOpen: true, activeRightItem: 'language' }));

    const desktopCells = container.querySelectorAll('.hidden.h-screen');

    expect(desktopCells.length).toBeGreaterThanOrEqual(3);
    desktopCells.forEach((cell) => {
      expect(cell).not.toHaveClass(DVH_CLASS);
    });
  });
});

describe('DashboardLayout: poistka proti posunutému oknu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useIsMobile.mockReturnValue(true);
    useMobileViewportHeight.mockReturnValue(null);
    windowScrollY = 0;
    Object.defineProperty(window, 'scrollY', { configurable: true, get: () => windowScrollY });
    scrollToSpy = jest.spyOn(window, 'scrollTo').mockImplementation((_x: unknown, y?: unknown) => {
      windowScrollY = typeof y === 'number' ? y : 0;
    });
  });

  afterEach(() => {
    scrollToSpy.mockRestore();
    if (originalScrollY) Object.defineProperty(window, 'scrollY', originalScrollY);
  });

  it('okno na začiatku: nič sa nescrolluje ani pri zmene modulu', () => {
    const { rerender } = render(layout());

    rerender(layout({ activeModule: 'profile' }));

    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it('prvé vykreslenie s odscrollovaným oknom ho vráti na začiatok', () => {
    windowScrollY = 40;

    render(layout());

    expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
    expect(window.scrollY).toBe(0);
  });

  it('zmena modulu s odscrollovaným oknom ho vráti na začiatok', () => {
    const { rerender } = render(layout());
    windowScrollY = 40;

    rerender(layout({ activeModule: 'profile' }));

    expect(scrollToSpy).toHaveBeenCalledTimes(1);
    expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
    expect(window.scrollY).toBe(0);
  });

  it.each([
    ['mobilná', true],
    ['desktopová', false],
  ])('%s úprava profilu je nová obrazovka: okno sa vráti na začiatok aj pri nej', (_viewport, isMobile) => {
    useIsMobile.mockReturnValue(isMobile);
    const { rerender } = render(layout({ activeModule: 'profile' }));
    windowScrollY = 40;

    rerender(layout({ activeModule: 'profile', isRightSidebarOpen: true, activeRightItem: 'edit-profile' }));

    expect(scrollToSpy).toHaveBeenCalledTimes(1);
    expect(window.scrollY).toBe(0);
  });

  it('prekreslenie toho istého modulu okno nechá tak', () => {
    const { rerender } = render(layout());
    windowScrollY = 40;

    rerender(layout());
    rerender(layout({ isMobileMenuOpen: true }));

    expect(scrollToSpy).not.toHaveBeenCalled();
    expect(window.scrollY).toBe(40);
  });
});
