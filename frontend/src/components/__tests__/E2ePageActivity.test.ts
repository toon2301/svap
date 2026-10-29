/**
 * Dôkazy o páde E2E testu (nález 217): špecy hľadania majú vypnuté trace, screenshot aj video kvôli súkromiu, takže po páde
 * zostával len jeden riadok chyby. Teraz sa pri páde vypíše blok s požiadavkami, časmi a stavom stránky.
 *
 * Blok smie obsahovať len to, čo osobné údaje nenesie: cesty bez slugov a ID, názvy parametrov bez hodnôt, počty a časy.
 * Z chyby stránky sa vypíše len druh (napr. `TypeError`), nikdy text správy: ten môže obsahovať kus spracúvaných údajov
 * (`JSON.parse` vloží do správy časť vstupu). Zlyhanie siete a aktívny prvok sa nevypisujú „očistené“, ale len ako druh
 * alebo hodnota z pevného zoznamu, takže IP adresa, názov servera ani slug z atribútu sa do bloku nedostanú.
 * E2E špecy Jest nespúšťa, no čisté pomôcky na zostavenie bloku (`page-activity-format.ts`) nezávisia od Playwrightu, preto sa
 * dajú overiť tu, vrátane toho, že do výstupu nepreniknú hodnoty z adries.
 *
 * @jest-environment node
 */
import fs from 'fs';
import path from 'path';
import {
  describeActive,
  errorKind,
  failureKind,
  formatEvidence,
  normalizePath,
  queryNames,
  type ActiveElement,
  type ActivityEntry,
  type EvidenceInput,
  type PageSnapshot,
} from '../../../e2e/support/page-activity-format';

const WATCHES_NAV: ActiveElement = { tag: 'BUTTON', role: null, type: null, navItem: 'watches', onboarding: null };

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
  active: WATCHES_NAV,
};

/** Záznam jednej požiadavky s predvolenými hodnotami; test prepíše len to, čo skúma. */
function entry(overrides: Partial<ActivityEntry> = {}): ActivityEntry {
  return {
    method: 'GET', path: '/api/auth/me/', query: '', startedAt: 312, durationMs: 58, status: 200, failure: null, ...overrides,
  };
}

/** Vstup pre `formatEvidence` s jednou požiadavkou a snímkou stránky; test prepíše len to, čo skúma. */
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

  it('nahradí všetko za odkazom na obnovu hesla a za overením e-mailu, aj keď ide o obyčajné písmená', () => {
    expect(normalizePath('/reset-password/MQ/cbxwhp-tajnytoken')).toBe('/reset-password/:id/:id');
    expect(normalizePath('/api/auth/password-reset/MQ/cbxwhp-tajnytoken/')).toBe('/api/auth/password-reset/:id/:id/');
    expect(normalizePath('/api/auth/password-reset-verify/MQ/cbxwhp-tajnytoken/')).toBe('/api/auth/password-reset-verify/:id/:id/');
    expect(normalizePath('/api/auth/check-email/boris/')).toBe('/api/auth/check-email/:id/');
  });

  it('žiadosť o obnovu hesla bez údajov v ceste ponechá', () => {
    expect(normalizePath('/api/auth/password-reset/')).toBe('/api/auth/password-reset/');
    expect(normalizePath('/reset-password')).toBe('/reset-password');
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

describe('errorKind', () => {
  it('vráti druh štandardnej chyby, aj keď dostane celú správu', () => {
    expect(errorKind('TypeError')).toBe('TypeError');
    expect(errorKind('SyntaxError: Unexpected token')).toBe('SyntaxError');
    expect(errorKind('  RangeError : x')).toBe('RangeError');
  });

  it('neznámy názov alebo prázdny text vypíše ako Error', () => {
    expect(errorKind('ValidationError: heslo=tajne')).toBe('Error');
    expect(errorKind('')).toBe('Error');
    expect(errorKind('boris@test.sk')).toBe('Error');
  });

  it('nikdy nevráti text správy', () => {
    const message = 'SyntaxError: Unexpected token \'b\', "boris@test.sk,tajne" is not valid JSON';
    const kind = errorKind(message);
    expect(kind).toBe('SyntaxError');
    for (const secret of ['boris', 'tajne', 'JSON', 'token']) expect(kind).not.toContain(secret);
  });
});

describe('failureKind', () => {
  it('ponechá kód Chromia, ktorý tvoria len veľké písmená, číslice a podčiarkovník', () => {
    expect(failureKind('net::ERR_TIMED_OUT')).toBe('net::ERR_TIMED_OUT');
    expect(failureKind('net::ERR_HTTP2_PROTOCOL_ERROR')).toBe('net::ERR_HTTP2_PROTOCOL_ERROR');
    expect(failureKind('net::ERR_ABORTED')).toBe('net::ERR_ABORTED');
  });

  it('vetu z iného prehliadača zmení na druh a nič z jej textu neprepíše', () => {
    expect(failureKind('The request timed out.')).toBe('timeout');
    expect(failureKind('cancelled')).toBe('cancelled');
    expect(failureKind('The network connection was lost.')).toBe('connection-lost');
    expect(failureKind('The Internet connection appears to be offline.')).toBe('offline');
    expect(failureKind('A server with the specified hostname could not be found.')).toBe('dns');
    expect(failureKind('Could not connect to the server.')).toBe('unreachable');
    expect(failureKind('The certificate for this server is invalid.')).toBe('tls');
  });

  it('IP adresu, názov servera, e-mail ani krátky identifikátor z textu nikdy nevypíše', () => {
    expect(failureKind('Failed to connect to 192.168.1.2')).toBe('failed');
    expect(failureKind('Could not connect to 192.168.1.2')).toBe('unreachable');
    expect(failureKind('Failed to fetch https://svaply.example/api/auth/me/?token=abc')).toBe('failed');
    expect(failureKind('boris@test.sk')).toBe('failed');
    expect(failureKind('railway.app')).toBe('failed');
    expect(failureKind('boris')).toBe('failed');
    expect(failureKind('profile-boris')).toBe('failed');
    expect(failureKind('eva.alfa')).toBe('failed');
    expect(failureKind('x'.repeat(61))).toBe('failed');
  });

  it('kód Chromia s pripojeným textom alebo malými písmenami neprejde', () => {
    expect(failureKind('net::ERR_TIMED_OUT 10.0.0.1')).toBe('failed');
    expect(failureKind('net::ERR_timed_out')).toBe('failed');
    expect(failureKind('net::ERR_' + 'A'.repeat(51))).toBe('failed');
  });

  it('vetu s názvom servera v certifikáte zmení na druh bez názvu servera', () => {
    const sentence = 'The certificate for this server is invalid. You might be connecting to a server that is pretending to be '
      + '“boris.svaply.example”, which could put your confidential information at risk.';
    expect(failureKind(sentence)).toBe('tls');
    for (const secret of ['boris', 'svaply', 'example', 'confidential']) expect(failureKind(sentence)).not.toContain(secret);
  });

  it('prázdny text alebo null je unknown', () => {
    expect(failureKind(null)).toBe('unknown');
    expect(failureKind('   ')).toBe('unknown');
  });
});

describe('describeActive', () => {
  it('bez prvku vypíše none', () => {
    expect(describeActive(null)).toBe('none');
  });

  it('ponechá značku a povolené hodnoty atribútov', () => {
    expect(describeActive(WATCHES_NAV)).toBe('BUTTON data-sidebar-nav-item=watches');
    expect(describeActive({ tag: 'INPUT', role: null, type: 'text', navItem: null, onboarding: 'search-input' }))
      .toBe('INPUT type=text data-onboarding=search-input');
    expect(describeActive({ tag: 'DIV', role: 'button', type: null, navItem: null, onboarding: null })).toBe('DIV role=button');
    expect(describeActive({ tag: 'svg', role: null, type: null, navItem: null, onboarding: null })).toBe('SVG');
  });

  it('hodnotu mimo zoznamu vypíše ako other, aj keď je to obyčajný slug písaný písmenami', () => {
    expect(describeActive({ tag: 'BUTTON', role: 'profile-boris', type: null, navItem: 'profile-boris', onboarding: 'profile-boris' }))
      .toBe('BUTTON role=other data-sidebar-nav-item=other data-onboarding=other');
    expect(describeActive({ tag: 'INPUT', role: null, type: 'boris@test.sk', navItem: null, onboarding: null })).toBe('INPUT type=other');
    expect(describeActive({ tag: 'DIV', role: null, type: null, navItem: 'message-image-trigger-4821', onboarding: null }))
      .toBe('DIV data-sidebar-nav-item=other');
  });

  it('vlastný prvok (značka mimo zoznamu) vypíše ako OTHER bez jeho názvu', () => {
    expect(describeActive({ tag: 'PROFILE-BORIS-CARD', role: null, type: null, navItem: null, onboarding: null })).toBe('OTHER');
  });

  it('prázdne a chýbajúce hodnoty vynechá', () => {
    expect(describeActive({ tag: 'BUTTON', role: '', type: null, navItem: '', onboarding: null })).toBe('BUTTON');
    const missing = { tag: 'BUTTON' } as unknown as ActiveElement;
    expect(describeActive(missing)).toBe('BUTTON');
  });

  it('nikdy nevráti nič z neznámej hodnoty', () => {
    const text = describeActive({
      tag: 'a-boris', role: 'boris-role', type: 'boris-type', navItem: 'boris-nav', onboarding: 'boris-onboarding',
    });
    expect(text).toBe('OTHER role=other type=other data-sidebar-nav-item=other data-onboarding=other');
    expect(text).not.toMatch(/boris/i);
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

  it('z chýb stránky vypíše len druh, nikdy text správy, a počet chýb konzoly bez ich textu', () => {
    const text = formatEvidence(input({
      pageErrors: [
        'TypeError',
        'SyntaxError: Unexpected token \'b\', "boris@test.sk,tajne" is not valid JSON',
        'Error: '.concat('yyyy'.repeat(100)),
        'ValidationError: heslo=tajne',
      ],
      consoleErrors: 3,
    }));
    expect(text).toContain('page errors: 4 (TypeError, SyntaxError, Error)');
    expect(text).toContain('console errors: 3');
    for (const secret of ['boris', 'tajne', 'heslo', 'yyyy', 'JSON', 'Unexpected']) expect(text).not.toContain(secret);
  });

  it('zlyhanie siete a aktívny prvok prejdú pevnými zoznamami, takže IP, adresa, e-mail ani slug nepreniknú do výstupu', () => {
    const text = formatEvidence(input({
      entries: [
        entry({ status: null, durationMs: 15_000, failure: 'Failed to fetch https://svaply.example/api/auth/me/?token=abc' }),
        entry({ status: null, durationMs: 15_000, failure: 'Failed to connect to 192.168.1.2' }),
        entry({ status: null, durationMs: 15_000, failure: 'profile-boris' }),
      ],
      snapshot: {
        ...SNAPSHOT,
        active: { tag: 'BUTTON', role: 'boris@test.sk', type: null, navItem: 'profile-boris', onboarding: 'profile-4821' },
      },
    }));
    expect(text.match(/FAILED\(failed\)/g)).toHaveLength(3);
    expect(text).toContain('active element: BUTTON role=other data-sidebar-nav-item=other data-onboarding=other');
    for (const secret of ['svaply.example', 'token=abc', '192.168', '4821', 'boris', 'test.sk']) expect(text).not.toContain(secret);
  });

  it('stav stránky z prehliadača prejde len pevnými hodnotami', () => {
    const text = formatEvidence(input({ snapshot: { ...SNAPSHOT, readyState: 'boris-state', panelAriaHidden: 'boris@test.sk' } }));
    expect(text).toContain('readyState=other');
    expect(text).toContain('panelAriaHidden=other');
    expect(text).not.toContain('boris');
    expect(formatEvidence(input({ snapshot: { ...SNAPSHOT, panelAriaHidden: null } }))).toContain('panelAriaHidden=n/a');
    expect(formatEvidence(input({ snapshot: { ...SNAPSHOT, panelAriaHidden: 'false' } }))).toContain('panelAriaHidden=false');
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
