/**
 * Výška vyhľadávacieho rozloženia na mobile a scroll okna.
 *
 * iOS Safari: `100vh` je vyššie než viditeľná plocha (s lištami), takže koreň s
 * `h-screen` robil z dokumentu scrollovateľnú plochu – okno sa posunulo (napr. o 40 px)
 * a obrazovka bola zhora odrezaná. Rovnako ako v `DashboardLayout` preto výška pod `lg`
 * sleduje viditeľnú plochu (`dvh`), od `lg` ostáva `100vh`; kde `dvh` neexistuje, platí
 * `h-screen`.
 *
 * Skutočnú výšku lišiet jsdom nepozná, preto test tvrdí triedy.
 *
 * Poistka: pri vykreslení sa okno vráti na začiatok, aj keby sa dokument posunul.
 */

import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

import { SearchLayout } from './SearchLayout';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ logout: jest.fn(), user: null }),
}));

jest.mock('@/components/dashboard/Sidebar', () => ({
  __esModule: true,
  default: () => <div data-testid="sidebar" />,
}));

jest.mock('@/components/dashboard/modules/SearchModule', () => ({
  __esModule: true,
  default: () => <div data-testid="search-module" />,
}));

jest.mock('@/components/dashboard/contexts/RequestsNotificationsContext', () => ({
  __esModule: true,
  RequestsNotificationsProvider: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

const DVH_CLASS = 'supports-[height:100dvh]:h-dvh';

const originalScrollY = Object.getOwnPropertyDescriptor(window, 'scrollY');
let windowScrollY = 0;
let scrollToSpy: jest.SpyInstance;

function layout() {
  return (
    <SearchLayout>
      <div data-testid="layout-child">Obsah</div>
    </SearchLayout>
  );
}

describe('SearchLayout: výška pod lg sleduje viditeľnú plochu', () => {
  it('koreň aj <main> majú rovnakú výšku: h-screen ako záloha, pod lg dvh, od lg znova 100vh', () => {
    const { container } = render(layout());

    const root = container.firstElementChild as HTMLElement;
    const main = root.querySelector('[data-dashboard-main]') as HTMLElement;

    for (const element of [root, main]) {
      expect(element).toHaveClass('h-screen', DVH_CLASS, 'lg:h-screen');
    }
  });

  it('desktopové bunky gridu ostávajú na 100vh (bez dvh)', () => {
    const { container } = render(layout());

    const desktopCells = container.querySelectorAll('.hidden.h-screen');

    expect(desktopCells).toHaveLength(2);
    desktopCells.forEach((cell) => {
      expect(cell).not.toHaveClass(DVH_CLASS);
    });
  });
});

describe('SearchLayout: poistka proti posunutému oknu', () => {
  beforeEach(() => {
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

  it('okno na začiatku: nič sa nescrolluje', () => {
    render(layout());

    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it('vykreslenie s odscrollovaným oknom ho vráti na začiatok', () => {
    windowScrollY = 40;

    render(layout());

    expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
    expect(window.scrollY).toBe(0);
  });

  it('prekreslenie okno nechá tak', () => {
    const { rerender } = render(layout());
    windowScrollY = 40;

    rerender(layout());

    expect(scrollToSpy).not.toHaveBeenCalled();
    expect(window.scrollY).toBe(40);
  });
});
