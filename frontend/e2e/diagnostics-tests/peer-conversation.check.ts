import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  formatPeerConversationCounts,
  readPeerConversationInBrowser,
  reportPeerConversationCounts,
} from '../support/peer-conversation-diagnostics';

const privateSlug = 'NEVYPISOVAT_SUKROMNY_SLUG';
const privateName = 'NEVYPISOVAT_SUKROMNE_MENO';
const privateId = 987654321;
const matching = { id: privateId, other_user: { slug: privateSlug, display_name: ` ${privateName} ` } };
const counts = { firstPage: 4, slugMatches: 1, deletedMatches: 0, namedMatches: 1, nameMatches: 1 };

/** Odpoveď je výhradne syntetická; helper nesmie vykonať druhé sieťové volanie. */
async function inspect(data: unknown, status = 200) {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async (url, options) => {
    calls += 1;
    assert.equal(url, '/api/auth/messaging/conversations/');
    assert.deepEqual(options, { credentials: 'include' });
    return { ok: status >= 200 && status < 300, status, json: async () => data } as Response;
  }) as typeof fetch;
  try {
    return await readPeerConversationInBrowser(privateSlug);
  } finally {
    globalThis.fetch = original;
    assert.equal(calls, 1);
  }
}

test('pole aj stránkovaná odpoveď zachovajú pôvodnú zhodu a iba spočítajú diagnostiku', async () => {
  const items = [matching, { id: 2 }, { is_group: true, name: 'iné' }, { other_user: null }];
  for (const data of [items, { results: items, next: '/NEOTVARAT_DRUHU_STRANKU' }]) {
    const snapshot = await inspect(data);
    assert.deepEqual(snapshot.counts, counts);
    assert.deepEqual(snapshot.peer, { id: privateId, displayName: privateName, sameTitle: 1 });
  }
});

test('chýbajúca zhoda sa nestane preskočeným ani úspešným testom', async () => {
  for (const data of [null, {}, [], { results: [] }, [{ other_user: { slug: 'iný' } }]]) {
    const snapshot = await inspect(data);
    assert.equal(snapshot.peer, null);
    assert.ok(snapshot.counts);
    assert.equal(snapshot.counts.slugMatches, 0);
    assert.equal(snapshot.counts.nameMatches, 0);
  }
});

test('odstránenie a chýbajúce meno zostanú odlíšené len počtami', async () => {
  const snapshot = await inspect([
    { ...matching, other_user: { ...matching.other_user, is_deleted: true } },
    { ...matching, other_user: { slug: privateSlug, display_name: '   ' } },
    { is_group: true, other_user: matching.other_user },
  ]);
  assert.equal(snapshot.peer, null);
  assert.deepEqual(snapshot.counts, { firstPage: 3, slugMatches: 2, deletedMatches: 1, namedMatches: 0, nameMatches: 0 });
});

test('pôvodný prvý aktívny kandidát sa nenahradí neskoršou zhodou s menom', async () => {
  const snapshot = await inspect([{ ...matching, other_user: { slug: privateSlug } }, matching]);
  assert.equal(snapshot.peer, null);
  assert.ok(snapshot.counts);
  assert.equal(snapshot.counts.namedMatches, 1);
  assert.equal(snapshot.counts.nameMatches, 0);
});

test('zhoda mena zahŕňa iné priame aj skupinové riadky, nie odstráneného používateľa', async () => {
  const snapshot = await inspect([
    matching,
    { is_group: true, name: privateName },
    { other_user: { display_name: privateName, slug: 'iný' } },
    { other_user: { display_name: privateName, is_deleted: true } },
  ]);
  assert.equal(snapshot.peer?.sameTitle, 3);
  assert.ok(snapshot.counts);
  assert.equal(snapshot.counts.nameMatches, 3);
});

test('chybné neskoršie dáta diagnostiky nemenia pôvodné odmietnutie kandidáta bez ID', async () => {
  const snapshot = await inspect([{ other_user: matching.other_user }, null]);
  assert.equal(snapshot.peer, null);
  assert.equal(snapshot.counts, null);
  assert.equal(formatPeerConversationCounts(snapshot.counts), '[E2E-PEER] counts=unavailable');
});

test('HTTP chyba ostáva chybou prípravy, bez čítania alebo vypísania odpovede', async () => {
  for (const status of [401, 403, 404, 500]) {
    await assert.rejects(inspect({ privateName, privateSlug }, status), {
      message: `Príprava: zoznam konverzácií vrátil HTTP ${status}.`,
    });
  }
});

test('formát obsahuje iba päť explicitných celočíselných polí', () => {
  assert.equal(formatPeerConversationCounts(counts),
    '[E2E-PEER] firstPage=4 slugMatches=1 deletedMatches=0 namedMatches=1 nameMatches=1');
  assert.equal(formatPeerConversationCounts({ ...counts, firstPage: 0 }),
    '[E2E-PEER] firstPage=0 slugMatches=1 deletedMatches=0 namedMatches=1 nameMatches=1');
});

test('neplatné počty sa neprevedú na text ani sa nevypíšu', () => {
  for (const key of Object.keys(counts)) {
    for (const invalid of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, privateSlug, null, undefined]) {
      assert.equal(formatPeerConversationCounts({ ...counts, [key]: invalid }), '[E2E-PEER] counts=unavailable');
    }
  }
  for (const invalid of [null, undefined, [], false, privateName, {}]) {
    assert.equal(formatPeerConversationCounts(invalid), '[E2E-PEER] counts=unavailable');
  }
});

test('nadbytočné súkromné polia sa ani nečítajú, výpis aj príloha ostanú anonymné', async () => {
  const output: string[] = [];
  const original = console.log;
  console.log = (value: string) => { output.push(value); };
  const value = Object.defineProperty({ ...counts }, 'private', {
    get: () => { throw new Error('NESMIE_CITAT_SUKROMNE_POLE'); },
  });
  try {
    await reportPeerConversationCounts(value, { attach: async (name, options) => {
      assert.equal(name, 'peer-conversation-counts');
      assert.equal(options?.contentType, 'text/plain');
      output.push(String(options?.body));
    } });
    assert.equal(output.length, 2);
    assert.equal(output[0], formatPeerConversationCounts(counts));
    assert.equal(output[0], output[1]);
    for (const secret of [privateSlug, privateName, String(privateId)]) {
      assert.ok(!output.join('\n').includes(secret));
    }
    assert.ok(!formatPeerConversationCounts({ ...counts, slug: privateSlug, name: privateName, id: privateId })
      .includes('NEVYPISOVAT'));
  } finally {
    console.log = original;
  }
});

test('chyba odčítania alebo prílohy diagnostiky nezakryje pôvodné zlyhanie', async () => {
  const original = console.log;
  console.log = () => undefined;
  try {
    await reportPeerConversationCounts(Object.defineProperty({}, 'firstPage', {
      get: () => { throw new Error(privateName); },
    }), { attach: async () => { throw new Error(privateSlug); } });
    const failure = new Error('POVODNY_PAD');
    await assert.rejects(async () => {
      try { throw failure; } finally {
        await reportPeerConversationCounts(counts, { attach: async () => { throw new Error(privateName); } });
      }
    }, (error) => error === failure);
  } finally {
    console.log = original;
  }
});

test('špec zachová tvrdé podmienky prípravy aj profilové asercie, bez nového retry alebo skip', () => {
  const spec = fs.readFileSync(path.join(__dirname, '../messages-peer-profile.spec.ts'), 'utf8').replace(/\r\n/g, '\n');
  assert.ok(spec.includes('if (!peer) {\n    throw new Error('));
  assert.ok(spec.includes('if (peer.sameTitle > 1) {\n    throw new Error('));
  assert.ok(spec.includes("page.getByRole('tablist', { name: 'Sekcie profilu' })"));
  assert.ok(spec.includes('isPeerProfilePath(page)'));
  assert.equal((spec.match(/test\.skip\(/g) ?? []).length, 2);
  assert.ok(!/test\.(?:fail|fixme)|retries\s*:|waitForTimeout|\.repeatEach/.test(spec));
  assert.ok(spec.includes("from './support/diagnostic-test'"));
});
