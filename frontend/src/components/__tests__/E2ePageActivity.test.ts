/**
 * Dôkazy o páde E2E testu (nález 217): špecy hľadania majú vypnuté trace, screenshot aj video kvôli súkromiu, takže po páde
 * zostával len jeden riadok chyby. Teraz sa pri páde vypíše blok s požiadavkami, časmi a stavom stránky.
 *
 * Blok smie obsahovať len to, čo osobné údaje nenesie: cesty bez slugov a ID, názvy parametrov bez hodnôt, počty a časy.
 * E2E špecy Jest nespúšťa, no čisté pomôcky na zostavenie bloku (`page-activity-format.ts`) nezávisia od Playwrightu, preto sa
 * dajú overiť tu, vrátane toho, že do výstupu nepreniknú hodnoty z adries.
 *
 * @jest-environment node
 */
import fs from 'fs';
import path from 'path';
import {
  formatEvidence,
  normalizePath,
  queryNames,
  shortError,
  type ActivityEntry,
  type EvidenceInput,
  type PageSnapshot,
} from '../../../e2e/support/page-activity-format';

const SNAPSHOT: PageSnapshot = {
  readyState: 'complete',
  domContentLoadedMs: 640,
  loadMs: 1180,
  loadingMarkers: 0,
  scrollTop: 1330,
  scrollHeight: 2175,
  clientHeight: 900,
  panelAriaHidden: 'true',
  viewerReady: true,
  active: 'BUTTON data-sidebar-nav-item=watches',
};

function entry(overrides: Partial<ActivityEntry> = {}): ActivityEntry {
  return {
    method: 'GET', path: '/api/auth/me/', query: '', startedAt: 312, durationMs: 58, status: 200, failure: null, ...overrides,
  };
}

function input(overrides: Partial<EvidenceInput> = {}): EvidenceInput {
  return {
    title: 'search-panel-return.spec.ts › users: browser Back', project: 'webkit-desktop', elapsedMs: 23_400,
    url: '/search [q(2),tab]', entries: [entry()], pageErrors: [], consoleErrors: 0, snapshot: SNAPSHOT, ...overrides,
  };
}

describe('normalizePath', () => {
  it('ponechá cesty API a stránok bez identifikátorov', () => {
    expect(normalizePath('/api/auth/search/global/')).toBe('/api/auth/search/global/');
    expect(normalizePath('/search')).toBe('/search');
    expect(normalizePath('/')).toBe('/');
  });

  it('nahradí slug alebo ID za segmentmi users a profile', () => {
    expect(normalizePath('/dashboard/users/boris')).toBe('/dashboard/users/:id');
    expect(normalizePath('/dashboard/users/boris/language')).toBe('/dashboard/users/:id/language');
    expect(normalizePath('/api/auth/profiles/eva/')).toBe('/api/auth/profiles/:id/');
  });

  it('nahradí slugy s bodkou, adresy s @ a číselné segmenty aj mimo známych rodičov', () => {
    expect(normalizePath('/api/auth/dashboard/x/eva.alfa/')).toBe('/api/auth/dashboard/x/:id/');
    expect(normalizePath('/api/auth/lookup/eva@test.sk/')).toBe('/api/auth/lookup/:id/');
    expect(normalizePath('/api/auth/offers/123/')).toBe('/api/auth/offers/:n/');
  });
});

describe('queryNames', () => {
  it('vypíše zoradené jedinečné názvy parametrov bez hodnôt', () => {
    expect(queryNames('?users_page=1&tab=users&users_page=2&include_offers=true')).toBe('include_offers,tab,users_page');
  });

  it('hľadaný výraz uvedie len dĺžkou', () => {
    expect(queryNames('?q=Boris+Beta&tab=all')).toBe('q(10),tab');
    expect(queryNames('')).toBe('');
  });
});

describe('shortError', () => {
  it('zlúči zalomenia a skráti dlhý text', () => {
    expect(shortError('Chyba\n  na   riadku')).toBe('Chyba na riadku');
    const long = shortError('x'.repeat(500));
    expect(long.length).toBeLessThanOrEqual(121);
    expect(long.endsWith('…')).toBe(true);
  });
});

describe('formatEvidence', () => {
  it('obsahuje hlavičku, stav stránky a požiadavky s časmi a stavmi', () => {
    const text = formatEvidence(input({
      entries: [
        entry(),
        entry({ path: '/api/auth/search/global/', query: 'q(2),tab', startedAt: 330, durationMs: 141 }),
        entry({ method: 'GET', path: '/dashboard/users/:id', query: '_rsc', startedAt: 9000, durationMs: null, status: null }),
        entry({ path: '/api/auth/dashboard/search/', startedAt: 9100, durationMs: 15_000, status: null, failure: 'net::ERR_TIMED_OUT' }),
      ],
    }));
    expect(text).toContain('[E2E-EVIDENCE] search-panel-return.spec.ts › users: browser Back | webkit-desktop | 23.4 s');
    expect(text).toContain('url: /search [q(2),tab]');
    expect(text).toContain('readyState=complete viewerReady=true loadingMarkers=0 panelAriaHidden=true');
    expect(text).toContain('domContentLoaded=640 load=1180');
    expect(text).toContain('scrollTop=1330 scrollHeight=2175 clientHeight=900');
    expect(text).toContain('active element: BUTTON data-sidebar-nav-item=watches');
    expect(text).toMatch(/312\s+GET\s+\/api\/auth\/me\/\s+200\s+58 ms/);
    expect(text).toMatch(/330\s+GET\s+\/api\/auth\/search\/global\/ \[q\(2\),tab\]\s+200\s+141 ms/);
    expect(text).toMatch(/9000\s+GET\s+\/dashboard\/users\/:id \[_rsc\]\s+pending\s+…/);
    expect(text).toMatch(/FAILED\(net::ERR_TIMED_OUT\)\s+15000 ms/);
  });

  it('pri zavretej stránke uvedie, že stav nie je dostupný, a požiadavky vypíše aj tak', () => {
    const text = formatEvidence(input({ snapshot: null }));
    expect(text).toContain('page state: unavailable');
    expect(text).toContain('/api/auth/me/');
  });

  it('bez požiadaviek napíše none', () => {
    expect(formatEvidence(input({ entries: [] }))).toContain('  none');
  });

  it('pri veľa požiadavkách ponechá posledných 40 a ohlási, koľko starších vynechal', () => {
    const many = Array.from({ length: 55 }, (_, index) => entry({ startedAt: index, path: `/api/auth/step/${index}` }));
    const text = formatEvidence(input({ entries: many }));
    expect(text).toContain('15 older omitted');
    expect(text).not.toContain('/api/auth/step/14');
    expect(text).toContain('/api/auth/step/15');
    expect(text).toContain('/api/auth/step/54');
  });

  it('uvedie chyby stránky skrátené a počet chýb konzoly bez ich textu', () => {
    const text = formatEvidence(input({
      pageErrors: ['TypeError: x is undefined', 'Error: '.concat('y'.repeat(400))], consoleErrors: 3,
    }));
    expect(text).toContain('page errors: 2 (TypeError: x is undefined | Error: yyy');
    expect(text).toContain('console errors: 3');
  });

  it('nepustí do výstupu hodnoty z adries ani slugy, ak sa najprv prepustia cez normalizePath a queryNames', () => {
    const url = new URL('https://example.test/api/auth/dashboard/users/boris.beta/?q=tajny-vyraz&email=boris%40test.sk&tab=users');
    const text = formatEvidence(input({
      url: `${normalizePath('/dashboard/users/boris.beta')} [${queryNames(url.search)}]`,
      entries: [entry({ path: normalizePath(url.pathname), query: queryNames(url.search) })],
    }));
    for (const secret of ['boris', 'tajny', 'test.sk', 'beta']) expect(text).not.toContain(secret);
    expect(text).toContain('q(11)');
  });
});

describe('page-activity-format.ts', () => {
  it('nesmie za behu importovať Playwright, aby ho Jest vedel načítať', () => {
    const source = fs.readFileSync(path.join(__dirname, '../../../e2e/support/page-activity-format.ts'), 'utf8');
    expect(source).not.toMatch(/from\s+['"]@playwright\/test['"]/);
    expect(source).not.toMatch(/require\(['"]@playwright\/test['"]\)/);
  });
});
