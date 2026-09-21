/**
 * Tabuľka trás musí ostať ÚPLNÁ a zhodná so stránkami.
 *
 * Presne toto sa už raz nepodarilo: mapovanie adries si žilo vlastným
 * zoznamom, stránky pribúdali inde a po kroku späť sa zobrazoval modul
 * predošlej obrazovky. Strážny test preto prejde súbory stránok v
 * `app/dashboard`, vykreslí každú a porovná props, ktoré odovzdá `Dashboard`,
 * s tým, čo pre tú istú adresu dá tabuľka. Nová stránka bez položky v tabuľke
 * (alebo s inými props) tento test zhodí.
 */

import fs from 'fs';
import path from 'path';
import { render } from '@testing-library/react';
import { DASHBOARD_ROUTES, isSameDashboardPath, matchDashboardRoute } from './dashboardRoutes';
import { resolveDashboardRouteProps, dashboardModuleFromPath } from './dashboardMountRoute';

const capturedProps: Array<Record<string, unknown>> = [];

jest.mock('@/components/dashboard/Dashboard', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    capturedProps.push(props);
    return <div data-testid="dashboard" />;
  },
}));

const DASHBOARD_PAGES_DIR = path.join(process.cwd(), 'src', 'app', 'dashboard');

/** Hodnoty dynamických segmentov – zhodné s ukážkovými adresami v tabuľke. */
const PARAM_VALUES: Record<string, string> = {
  userId: 'jana',
  portfolioId: '5',
  postId: '7',
  offerId: '3',
};

/** Všetky `page.tsx` pod `app/dashboard`, ako kľúč priečinka (`''` = /dashboard). */
function dashboardPageKeys(dir = DASHBOARD_PAGES_DIR, prefix = ''): string[] {
  const keys: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      keys.push(...dashboardPageKeys(path.join(dir, entry.name), prefix ? `${prefix}/${entry.name}` : entry.name));
    } else if (entry.name === 'page.tsx') {
      keys.push(prefix);
    }
  }
  return keys;
}

function exampleUrlFor(pageKey: string): string {
  const segments = pageKey ? pageKey.split('/') : [];
  const filled = segments.map((segment) => {
    const dynamic = segment.match(/^\[(.+)\]$/);
    return dynamic ? PARAM_VALUES[dynamic[1]] ?? 'x' : segment;
  });
  return `/dashboard${filled.length ? `/${filled.join('/')}` : ''}`;
}

function paramsFor(pageKey: string): Record<string, string> {
  const params: Record<string, string> = {};
  for (const segment of pageKey ? pageKey.split('/') : []) {
    const dynamic = segment.match(/^\[(.+)\]$/);
    if (dynamic) params[dynamic[1]] = PARAM_VALUES[dynamic[1]] ?? 'x';
  }
  return params;
}

/** Props bez nedefinovaných hodnôt – stránka ich jednoducho neodovzdá. */
function definedProps(props: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(props).filter(([key, value]) => key !== 'initialUser' && value !== undefined),
  );
}

const PAGE_KEYS = dashboardPageKeys();

beforeEach(() => {
  capturedProps.length = 0;
});

describe('tabuľka pozná každú stránku dashboardu', () => {
  it('nájde aspoň toľko stránok, koľko ich projekt má', () => {
    expect(PAGE_KEYS.length).toBeGreaterThanOrEqual(30);
  });

  it.each(PAGE_KEYS)('%s má položku v tabuľke a rovnaké props', (pageKey) => {
    const entry = DASHBOARD_ROUTES.find((route) => route.page === pageKey);
    expect(entry).toBeDefined();

    const url = exampleUrlFor(pageKey);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pageModule = require(path.join(DASHBOARD_PAGES_DIR, pageKey, 'page.tsx'));
    const Page = pageModule.default as (props: {
      params: Record<string, string>;
      searchParams: Record<string, string>;
    }) => React.ReactElement;

    render(<Page params={paramsFor(pageKey)} searchParams={{}} />);

    expect(capturedProps).toHaveLength(1);
    expect(definedProps(capturedProps[0])).toEqual(definedProps(matchDashboardRoute(url) ?? {}));
  });
});

describe('obojsmernosť', () => {
  it.each(DASHBOARD_ROUTES.map((route) => [route.example, route]))(
    '%s sa vyrieši na tie isté props',
    (_url, route) => {
      const entry = route as (typeof DASHBOARD_ROUTES)[number];
      const props = matchDashboardRoute(entry.example);
      expect(props).not.toBeNull();

      // Mount: props zostavené z adresy sú pre tú istú adresu už nemenné.
      expect(resolveDashboardRouteProps(props!, entry.example)).toBe(props);
      // Popstate: ten istý modul.
      expect(dashboardModuleFromPath(entry.example)).toBe(props!.initialRoute);
    },
  );
});

describe('porovnanie ciest', () => {
  it('koncové lomítko je tá istá adresa', () => {
    // `skipTrailingSlashRedirect` ju nechá tak a vzory v tabuľke ju prijímajú,
    // takže porovnanie ho musí zniesť.
    expect(isSameDashboardPath('/dashboard/settings/', '/dashboard/settings')).toBe(true);
    expect(isSameDashboardPath('/dashboard/settings', '/dashboard/settings/')).toBe(true);
    expect(isSameDashboardPath('/dashboard/settings//', '/dashboard/settings')).toBe(true);
  });

  it('iné cesty ostávajú iné', () => {
    expect(isSameDashboardPath('/dashboard/settings/watches', '/dashboard/settings')).toBe(false);
    expect(isSameDashboardPath('/dashboard', '/dashboard/settings')).toBe(false);
  });

  it('koreň sa lomítkom nevymaže', () => {
    expect(isSameDashboardPath('/', '/')).toBe(true);
  });

  it('chýbajúca hodnota sa nerovná ničomu', () => {
    expect(isSameDashboardPath(null, '/dashboard')).toBe(false);
    expect(isSameDashboardPath('/dashboard', undefined)).toBe(false);
  });
});
