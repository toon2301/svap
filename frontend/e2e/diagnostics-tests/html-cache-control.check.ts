import assert from 'node:assert/strict';
import test from 'node:test';
import { assertHtmlNoStore, hasNoStoreDirective } from '../support/html-cache-control';

const URL = 'https://diagnostic.invalid/dashboard';

/** Napodobenina sprístupňuje len metadáta dokumentu, nie telo, cookies ani iné hlavičky. */
function documentResponse(options: {
  cache?: string | null; mime?: string | null; url?: string; status?: number;
  method?: string; navigation?: boolean; resourceType?: string; worker?: boolean;
} = {}) {
  const headersRead: string[] = [];
  return {
    headersRead,
    response: {
      status: () => options.status ?? 200,
      url: () => options.url ?? URL,
      headerValue: async (name: string) => {
        headersRead.push(name);
        return name === 'cache-control'
          ? ('cache' in options ? options.cache ?? null : 'private, no-cache, no-store, max-age=0, must-revalidate')
          : ('mime' in options ? options.mime ?? null : 'text/html; charset=utf-8');
      },
      fromServiceWorker: () => options.worker ?? false,
      request: () => ({
        method: () => options.method ?? 'GET',
        resourceType: () => options.resourceType ?? 'document',
        isNavigationRequest: () => options.navigation ?? true,
      }),
    },
  };
}

test('no-store sa prijme samostatne aj medzi inými direktívami', () => {
  for (const value of ['no-store', ' NO-STORE ', 'private,no-store,max-age=0', '\tno-store\t',
    'private, no-cache, no-store, max-age=0, must-revalidate', 'no-store, no-store']) {
    assert.equal(hasNoStoreDirective(value), true);
  }
});

test('no-cache, max-age=0, hodnoty či podobné názvy nenahrádzajú no-store', () => {
  for (const value of [null, '', ' ', 'no-cache', 'max-age=0, must-revalidate', 'x-no-store',
    'no-store-extra', 'no-store=true', 'private="no-store"', '"no-store"']) {
    assert.equal(hasNoStoreDirective(value), false);
  }
});

test('čiarky a escapované úvodzovky v hodnote nevytvoria falošnú direktívu', () => {
  assert.equal(hasNoStoreDirective('extension="private,no-store,other", public'), false);
  assert.equal(hasNoStoreDirective('extension="a\\\",no-store,b", public'), false);
  assert.equal(hasNoStoreDirective('extension="a\\\\", no-store'), true);
  assert.equal(hasNoStoreDirective('extension="a,b", no-store'), true);
});

test('poškodené úvodzovky a vložené riadky sa odmietnu', () => {
  for (const value of ['no-store, extension="unfinished', 'extension="unfinished\\',
    'no-store\r\nprivate', 'no-store\n']) {
    assert.equal(hasNoStoreDirective(value), false);
  }
});

test('platný HTML dokument číta iba dve dohodnuté hlavičky', async () => {
  const fixture = documentResponse();
  await assertHtmlNoStore(fixture.response, URL);
  assert.deepEqual(fixture.headersRead.sort(), ['cache-control', 'content-type']);
  await assertHtmlNoStore(documentResponse({ mime: 'TEXT/HTML' }).response, URL);
});

test('chýbajúca alebo nesprávna politika spôsobí skutočný pád', async () => {
  for (const cache of [null, '', 'no-cache', 'public, max-age=31536000', 'extension="a,no-store,b"']) {
    await assert.rejects(assertHtmlNoStore(documentResponse({ cache }).response, URL), { code: 'ERR_ASSERTION' });
  }
});

test('API, chybová odpoveď ani odpoveď service workera nesmú prejsť ako HTML', async () => {
  for (const options of [
    { mime: 'application/json' }, { mime: null }, { mime: 'text/html-other' }, { status: 500 },
    { method: 'POST' }, { navigation: false }, { resourceType: 'fetch' }, { worker: true },
  ]) await assert.rejects(assertHtmlNoStore(documentResponse(options).response, URL), { code: 'ERR_ASSERTION' });
});

test('presmerovanie na iný dokument ani neplatná adresa nezakryjú chybu', async () => {
  for (const url of ['https://other.invalid/dashboard', 'https://diagnostic.invalid/', 'invalid']) {
    await assert.rejects(assertHtmlNoStore(documentResponse({ url }).response, URL), { code: 'ERR_ASSERTION' });
  }
  await assert.rejects(assertHtmlNoStore(documentResponse().response, 'invalid'), { code: 'ERR_ASSERTION' });
  await assert.rejects(assertHtmlNoStore(null, URL), { code: 'ERR_ASSERTION' });
});

test('chyba nevypíše hodnotu hlavičky ani adresu odpovede', async () => {
  const marker = 'DO_NOT_PUBLISH';
  await assert.rejects(assertHtmlNoStore(documentResponse({
    cache: `extension="${marker},no-store,other"`, url: `https://diagnostic.invalid/${marker}`,
  }).response, URL), (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.ok(!error.message.includes(marker));
    assert.ok(!error.message.includes('extension='));
    assert.ok(!error.message.includes('https://'));
    return true;
  });
});
