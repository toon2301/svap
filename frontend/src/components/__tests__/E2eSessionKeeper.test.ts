/**
 * Strážca prihlásenia pre E2E testy (nález 202): počas dlhého behu obnovuje prihlásenie a prepisuje súbor, z ktorého
 * štartujú testy, takže po 15 minútach nezačnú všetky s neplatným prihlásením.
 *
 * E2E špecy Jest nespúšťa, no pomocné moduly strážcu nezávisia od prehliadača, preto sa dajú overiť tu: časovač,
 * atomický zápis súboru, správanie pri zlyhaní a samotná obnova proti zástupnému serveru, ktorý kontroluje to isté ako
 * backend (CSRF hlavička, pôvod požiadavky, platný refresh token).
 *
 * @jest-environment node
 */
import fs from 'fs';
import http from 'http';
import type { AddressInfo } from 'net';
import os from 'os';
import path from 'path';
import { REFRESH_PATH, buildRefreshHeaders } from '../../../e2e/support/refreshRequest';
import {
  startSessionKeeper,
  writeFileAtomically,
  type StoredBrowserState,
} from '../../../e2e/support/sessionKeeper';

const FAST = 15;

/**
 * `refreshStorageState` používa Playwright, ktorý sa na Node 18 (tak beží CI) pri načítaní sám ukončí a zhodil by celý Jest.
 * Načíta sa preto až v teste a len tam, kde to Node dovolí (testy proti zástupnému serveru). Pravidlá požiadavky sú v
 * `refreshRequest.ts` bez Playwrightu, takže ich overuje aj CI.
 */
const PLAYWRIGHT_SUPPORTED = Number(process.versions.node.split('.')[0]) >= 20;
const describeWithPlaywright = PLAYWRIGHT_SUPPORTED ? describe : describe.skip;

async function loadRefreshStorageState() {
  return (await import('../../../e2e/support/refreshStorageState')).refreshStorageState;
}

function state(marker: string): StoredBrowserState {
  return { cookies: [{ name: 'access_token', value: marker }], origins: [] };
}

/** Počká, kým `condition` platí (alebo vyprší čas): časovače a súborový systém sú skutočné, len rýchle. */
async function until(condition: () => boolean, timeoutMs = 3000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error('časový limit čakania na podmienku');
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('strážca prihlásenia', () => {
  let directory: string;
  let file: string;
  const keepers: Array<{ stop(): Promise<void> }> = [];

  const read = () => JSON.parse(fs.readFileSync(file, 'utf8')) as StoredBrowserState;
  const marker = () => (read().cookies[0] as { value: string }).value;
  const start = (options: Parameters<typeof startSessionKeeper>[0]) => {
    const keeper = startSessionKeeper(options);
    keepers.push(keeper);
    return keeper;
  };

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'session-keeper-'));
    file = path.join(directory, 'user.json');
    fs.writeFileSync(file, JSON.stringify(state('login')));
  });

  afterEach(async () => {
    await Promise.all(keepers.splice(0).map((keeper) => keeper.stop()));
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it('prepíše súbor novým prihlásením pri každom intervale, nie skôr', async () => {
    let calls = 0;
    start({
      storageStatePath: file,
      intervalMs: 60,
      refresh: async () => state(`obnova-${++calls}`),
    });

    await pause(25);
    expect(marker()).toBe('login');
    expect(calls).toBe(0);

    await until(() => calls >= 1 && marker() === 'obnova-1');
    await until(() => marker() === 'obnova-2');
  });

  it('pri zlyhaní nechá starý súbor, upozorní bez tajných údajov a nabudúce to skúsi znova', async () => {
    const warnings: string[] = [];
    let calls = 0;
    start({
      storageStatePath: file,
      intervalMs: FAST,
      warn: (message) => warnings.push(message),
      refresh: async () => {
        calls += 1;
        if (calls === 1) throw new Error('HTTP 401\nrefresh_token=SECRET-VALUE\n' + 'x'.repeat(500));
        return state('obnova');
      },
    });

    await until(() => warnings.length === 1);
    expect(marker()).toBe('login');
    expect(warnings[0]).toContain('HTTP 401');
    expect(warnings[0]).toContain('1. pokus');
    expect(warnings[0]).not.toContain('SECRET-VALUE');
    expect(warnings[0].length).toBeLessThan(400);

    await until(() => marker() === 'obnova');
    expect(warnings).toHaveLength(1);
  });

  it('nespúšťa novú obnovu, kým predchádzajúca ešte beží', async () => {
    let active = 0;
    let maxActive = 0;
    let calls = 0;
    start({
      storageStatePath: file,
      intervalMs: FAST,
      refresh: async () => {
        calls += 1;
        active += 1;
        maxActive = Math.max(maxActive, active);
        await pause(80);
        active -= 1;
        return state(`obnova-${calls}`);
      },
    });

    await until(() => calls >= 2);
    expect(maxActive).toBe(1);
  });

  it('po zastavení už neobnovuje', async () => {
    let calls = 0;
    const keeper = start({
      storageStatePath: file,
      intervalMs: FAST,
      refresh: async () => state(`obnova-${++calls}`),
    });
    await until(() => calls >= 1);
    await keeper.stop();
    await pause(40);
    const callsAfterStop = calls;

    await pause(80);
    expect(calls).toBe(callsAfterStop);
  });

  it('stop() počká na rozbehnutú obnovu, takže po ňom nezostane rozpísaný súbor', async () => {
    let refreshing = false;
    const keeper = start({
      storageStatePath: file,
      intervalMs: FAST,
      refresh: async () => {
        refreshing = true;
        await pause(120);
        return state('dokoncena');
      },
    });
    await until(() => refreshing);

    await keeper.stop();

    expect(marker()).toBe('dokoncena');
    expect(fs.readdirSync(directory).filter((name) => name.endsWith('.tmp'))).toEqual([]);
  });

  it('zlyhanie zápisu (cieľ je priečinok) je len varovanie a nenechá po sebe dočasný súbor', async () => {
    const warnings: string[] = [];
    const target = path.join(directory, 'je-priecinok');
    fs.mkdirSync(target);
    start({
      storageStatePath: target,
      intervalMs: FAST,
      warn: (message) => warnings.push(message),
      refresh: async () => state('obnova'),
    });

    await until(() => warnings.length >= 1);
    expect(fs.readdirSync(directory).filter((name) => name.endsWith('.tmp'))).toEqual([]);
  });
});

describe('zápis súboru s prihlásením', () => {
  let directory: string;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'session-write-'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it('zapisuje cez dočasný súbor v tom istom priečinku a po sebe ho nenecháva', async () => {
    const target = path.join(directory, 'user.json');
    const rename = jest.spyOn(fs.promises, 'rename');

    await writeFileAtomically(target, '{"a":1}');

    expect(rename).toHaveBeenCalledTimes(1);
    const [from, to] = rename.mock.calls[0];
    expect(path.dirname(String(from))).toBe(directory);
    expect(String(from) === target).toBe(false);
    expect(to).toBe(target);
    expect(fs.readFileSync(target, 'utf8')).toBe('{"a":1}');
    expect(fs.readdirSync(directory)).toEqual(['user.json']);
  });

  it('súbor s prihlásením je čitateľný len pre vlastníka (POSIX)', async () => {
    if (process.platform === 'win32') return;
    const target = path.join(directory, 'user.json');

    await writeFileAtomically(target, '{}');

    expect(fs.statSync(target).mode & 0o077).toBe(0);
  });

  it('keď Windows nepustí prepísať súbor (EPERM), skúsi to znova', async () => {
    const target = path.join(directory, 'user.json');
    const realRename = fs.promises.rename.bind(fs.promises);
    let attempts = 0;
    jest.spyOn(fs.promises, 'rename').mockImplementation(async (from, to) => {
      attempts += 1;
      if (attempts <= 2) throw Object.assign(new Error('operation not permitted'), { code: 'EPERM' });
      return realRename(from, to);
    });

    await writeFileAtomically(target, '{"ok":true}');

    expect(attempts).toBe(3);
    expect(fs.readFileSync(target, 'utf8')).toBe('{"ok":true}');
  });

  it('keď zápis dočasného súboru zlyhá uprostred, čiastočný súbor sa odstráni', async () => {
    const target = path.join(directory, 'user.json');
    const realWriteFile = fs.promises.writeFile.bind(fs.promises);
    jest.spyOn(fs.promises, 'writeFile').mockImplementation(async (file, _data, options) => {
      await realWriteFile(file, 'čiastočný obsah', options);
      throw Object.assign(new Error('no space left on device'), { code: 'ENOSPC' });
    });

    await expect(writeFileAtomically(target, '{"a":1}')).rejects.toThrow('no space left');

    expect(fs.readdirSync(directory)).toEqual([]);
  });

  it('inú chybu než zámok súboru nezopakuje, dočasný súbor odstráni a chybu vráti', async () => {
    const target = path.join(directory, 'user.json');
    jest
      .spyOn(fs.promises, 'rename')
      .mockRejectedValue(Object.assign(new Error('disk full'), { code: 'ENOSPC' }));

    await expect(writeFileAtomically(target, '{}')).rejects.toThrow('disk full');

    expect(fs.readdirSync(directory)).toEqual([]);
  });
});

describe('hlavičky obnovy prihlásenia (bez prehliadača)', () => {
  it('posiela CSRF token, pôvod a odkazujúcu stránku podľa adresy aplikácie', () => {
    expect(buildRefreshHeaders('https://app.example.test/dashboard?x=1', 'csrf-abc')).toEqual({
      Origin: 'https://app.example.test',
      Referer: 'https://app.example.test/',
      'X-CSRFToken': 'csrf-abc',
    });
  });

  it('bez cookie csrftoken CSRF hlavičku nevymýšľa', () => {
    expect(buildRefreshHeaders('http://localhost:3914')).toEqual({
      Origin: 'http://localhost:3914',
      Referer: 'http://localhost:3914/',
    });
  });

  it('obnova mieri na rovnakú cestu ako appka', () => {
    expect(REFRESH_PATH).toBe('/api/token/refresh/');
  });
});

describeWithPlaywright('obnova prihlásenia proti zástupnému serveru', () => {
  let server: http.Server;
  let baseURL: string;
  let directory: string;
  let seen: Array<{ origin?: string; referer?: string; csrf?: string }>;
  let respond: (request: http.IncomingMessage, response: http.ServerResponse) => void;

  /** Správa sa ako backend: vyžaduje CSRF hlavičku zhodnú s cookie, pôvod požiadavky a platný refresh token. */
  const backend = (request: http.IncomingMessage, response: http.ServerResponse) => {
    const cookies = Object.fromEntries(
      String(request.headers.cookie ?? '')
        .split('; ')
        .filter(Boolean)
        .map((pair) => pair.split('=') as [string, string]),
    );
    seen.push({
      origin: request.headers.origin as string | undefined,
      referer: request.headers.referer as string | undefined,
      csrf: request.headers['x-csrftoken'] as string | undefined,
    });
    const originOk = request.headers.origin === baseURL && request.headers.referer === `${baseURL}/`;
    const csrfOk = Boolean(cookies.csrftoken) && request.headers['x-csrftoken'] === cookies.csrftoken;
    if (request.method !== 'POST' || request.url !== '/api/token/refresh/' || !originOk || !csrfOk) {
      response.writeHead(403, { 'Content-Type': 'application/json' });
      response.end('{"detail":"CSRF token missing","refresh_token":"SECRET-BODY"}');
      return;
    }
    if (cookies.refresh_token !== 'refresh-1') {
      response.writeHead(401, { 'Content-Type': 'application/json' });
      response.end('{"detail":"Token is blacklisted","refresh_token":"SECRET-BODY"}');
      return;
    }
    response.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': ['access_token=access-2; Path=/; HttpOnly', 'refresh_token=refresh-2; Path=/api; HttpOnly'],
    });
    response.end('{"status":"ok"}');
  };

  const writeStored = (cookies: Array<{ name: string; value: string; path: string }>) => {
    const file = path.join(directory, 'user.json');
    fs.writeFileSync(
      file,
      JSON.stringify({
        cookies: cookies.map((cookie) => ({
          ...cookie,
          domain: '127.0.0.1',
          expires: -1,
          httpOnly: true,
          secure: false,
          sameSite: 'Lax',
        })),
        origins: [{ origin: baseURL, localStorage: [{ name: 'appLocale', value: 'sk' }] }],
      }),
    );
    return file;
  };

  beforeAll(async () => {
    server = http.createServer((request, response) => respond(request, response));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'session-refresh-'));
    seen = [];
    respond = backend;
  });

  afterEach(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it('pošle CSRF hlavičku, pôvod požiadavky a cookies a vráti stav s novými tokenmi', async () => {
    const stored = writeStored([
      { name: 'csrftoken', value: 'csrf-abc', path: '/' },
      { name: 'access_token', value: 'access-1', path: '/' },
      { name: 'refresh_token', value: 'refresh-1', path: '/api' },
    ]);

    const refreshStorageState = await loadRefreshStorageState();
    const result = (await refreshStorageState({ baseURL, storageStatePath: stored })) as {
      cookies: Array<{ name: string; value: string }>;
      origins: Array<{ localStorage: Array<{ name: string; value: string }> }>;
    };

    expect(seen).toEqual([{ origin: baseURL, referer: `${baseURL}/`, csrf: 'csrf-abc' }]);
    const byName = Object.fromEntries(result.cookies.map((cookie) => [cookie.name, cookie.value]));
    expect(byName).toMatchObject({ csrftoken: 'csrf-abc', access_token: 'access-2', refresh_token: 'refresh-2' });
    expect(result.origins[0].localStorage).toEqual([{ name: 'appLocale', value: 'sk' }]);
  });

  it('keď server obnovu odmietne, chyba nesie len stavový kód a nie telo odpovede', async () => {
    const stored = writeStored([
      { name: 'csrftoken', value: 'csrf-abc', path: '/' },
      { name: 'refresh_token', value: 'refresh-0-zablokovany', path: '/api' },
    ]);

    const refreshStorageState = await loadRefreshStorageState();
    const failure = await refreshStorageState({ baseURL, storageStatePath: stored }).then(
      () => null,
      (error: Error) => error,
    );

    expect(failure).not.toBeNull();
    expect(failure!.message).toBe('HTTP 401');
    expect(failure!.message).not.toContain('SECRET-BODY');
  });

  it('bez cookie csrftoken server požiadavku odmietne a obnova zlyhá (nepredstiera úspech)', async () => {
    const stored = writeStored([{ name: 'refresh_token', value: 'refresh-1', path: '/api' }]);

    const refreshStorageState = await loadRefreshStorageState();
    await expect(refreshStorageState({ baseURL, storageStatePath: stored })).rejects.toThrow('HTTP 403');
  });
});
