import assert from 'node:assert/strict';
import test from 'node:test';
import { withNotificationCategoryChange, type CategoryChange } from '../support/notification-category-roundtrip';
import { CategoryWriteAudit, categoryReplyCompleted } from '../support/notification-category-writes';
import { requireSingleCategoryRun } from '../support/notification-category-options';
import {
  NOTIFICATION_PREFERENCE_KEYS as KEYS, type NotificationPreferenceKey,
  type NotificationPreferences, type PreferenceTransport,
} from '../support/notification-preferences-roundtrip';

const PRIVATE = 'SYNTHETIC_PRIVATE_CATEGORY_NEVER_PRINT';
const initial = (likes = true): Record<NotificationPreferenceKey, boolean> => ({
  in_app_notifications: true, push_notifications: false, notify_likes: likes,
  notify_comment_likes: false, notify_comments: true, notify_tags_and_shares: false, notify_skill_requests: true,
});

test('repeat-each sa kontroluje už z CLI v rodičovi pred prihlásením', () => {
  for (const args of [[], ['test'], ['--repeat-each=1'], ['--repeat-each', '1']]) {
    assert.doesNotThrow(() => requireSingleCategoryRun(args));
  }
  for (const args of [['--repeat-each=0'], ['--repeat-each=2'], ['--repeat-each'],
    ['--repeat-each', '2'], ['--repeat-each=' + PRIVATE], ['--repeat-each=1', '--repeat-each=2']]) {
    assert.throws(() => requireSingleCategoryRun(args), error => error instanceof Error
      && error.message.includes('E2E_CATEGORY_REPEATS_REJECTED') && !error.message.includes(PRIVATE));
  }
});

/** Iba syntetický stav, UI sa od transportu úmyselne odlišuje. */
function harness(likes = true) {
  const original = initial(likes);
  const state = { ...original };
  const calls: Array<{ method: string; fields: number }> = [];
  const reports: string[] = [];
  let failRestore: 'none' | 'status' | 'shape' | 'ignored' | 'throw' = 'none';
  let failLastGet = false;
  let restored = false;
  const transport: PreferenceTransport = async (method, values) => {
    calls.push({ method, fields: values ? Object.keys(values).length : 0 });
    if (method === 'PATCH') {
      restored = true;
      if (failRestore === 'throw') throw new Error(PRIVATE);
      if (failRestore === 'status') return { status: 500, data: { private: PRIVATE } };
      if (failRestore !== 'ignored') Object.assign(state, values);
      if (failRestore === 'shape') return { status: 200, data: { private: PRIVATE } };
    }
    if (method === 'GET' && restored && failLastGet) return { status: 403, data: { private: PRIVATE } };
    return { status: 200, data: { ...state, private: PRIVATE } };
  };
  return { original, state, calls, reports, transport,
    setRestore: (mode: typeof failRestore) => { failRestore = mode; },
    setLastGetFailure: () => { failLastGet = true; },
    run: (body: (change: CategoryChange) => Promise<void>, safety?: () => void | Promise<void>) =>
      withNotificationCategoryChange(transport, body, { report: state => { reports.push(state); }, verifyWriteSafety: safety }),
  };
}

/** Neprenáša do TAP výpisu súkromný callback, odpoveď ani pôvodné boolean hodnoty. */
async function rejectsSafely(body: () => Promise<unknown>, critical = false): Promise<void> {
  let caught: unknown;
  try { await body(); } catch (error) { caught = error; }
  assert.ok(caught instanceof Error);
  assert.ok(!caught.message.includes(PRIVATE));
  if (critical) assert.match(caught.message, /ZÁVAŽNÉ/);
}

for (const likes of [true, false]) {
  test(`UI zmena z oboch stavov: pôvodný výber ${likes ? 'zapnuté' : 'vypnuté'}, dva GET a návrat siedmich`, async () => {
    const h = harness(likes);
    await h.run(async change => {
      assert.equal(change.target, !likes);
      change.arm();
      h.state.notify_likes = change.target; // Simulácia UI, helper nesmie poslať prvý PATCH.
      await change.verifyPersisted();
      await change.verifyPersisted();
    });
    assert.deepEqual(h.calls, [{ method: 'GET', fields: 0 }, { method: 'GET', fields: 0 },
      { method: 'GET', fields: 0 }, { method: 'PATCH', fields: 7 }, { method: 'GET', fields: 0 }]);
    assert.deepEqual(h.state, h.original);
    assert.deepEqual(h.reports, ['verified']);
  });
}

test('vypnuté upozornenia zablokujú telo a všetky zápisy, ani master sa neobnovuje PATCHom', async () => {
  const h = harness(); h.state.in_app_notifications = false;
  let exercised = false;
  await rejectsSafely(() => h.run(async () => { exercised = true; }));
  assert.equal(exercised, false);
  assert.deepEqual(h.calls, [{ method: 'GET', fields: 0 }]);
  assert.deepEqual(h.reports, []);
  assert.equal(h.state.in_app_notifications, false);
});

test('chybný úvodný GET alebo chýbajúci snímok neposiela žiadny PATCH', async () => {
  for (const data of [null, PRIVATE, { private: PRIVATE }]) {
    let calls = 0;
    await rejectsSafely(() => withNotificationCategoryChange(async () => {
      calls += 1; return { status: 200, data };
    }, async () => { throw new Error('Nesmie sa vykonať.'); }));
    assert.equal(calls, 1);
  }
});

test('nepoužitý alebo neozbrojený scenár nemá obnovovací zápis', async () => {
  for (const verifyFirst of [true, false]) {
    const h = harness();
    await rejectsSafely(() => h.run(async change => { if (verifyFirst) await change.verifyPersisted(); }));
    assert.deepEqual(h.calls, [{ method: 'GET', fields: 0 }]);
  }
});

test('pád po označení pokusu alebo druhé arm stále obnoví všetkých sedem', async () => {
  for (const double of [true, false]) {
    const h = harness();
    await rejectsSafely(() => h.run(async change => {
      change.arm(); h.state.notify_likes = change.target;
      if (double) change.arm();
      else throw new Error(PRIVATE);
    }));
    assert.deepEqual(h.state, h.original);
    assert.deepEqual(h.reports, ['verified']);
  }
});

test('GET vyžaduje jedinú zmenenú kategóriu a odhalí neuloženie aj zmenu iného poľa', async () => {
  for (const other of [true, false]) {
    const h = harness();
    await rejectsSafely(() => h.run(async change => {
      change.arm();
      if (other) { h.state.notify_likes = change.target; h.state.push_notifications = !h.state.push_notifications; }
      await change.verifyPersisted();
    }));
    assert.deepEqual(h.state, h.original);
  }
});

for (const mode of ['status', 'shape', 'ignored', 'throw'] as const) {
  test(`návrat ${mode} ostane kritický FAIL a vždy vykoná záverečný GET`, async () => {
    const h = harness(); h.setRestore(mode);
    await rejectsSafely(() => h.run(async change => { change.arm(); h.state.notify_likes = change.target; }), true);
    assert.equal(h.calls.at(-1)?.method, 'GET');
    assert.deepEqual(h.reports, ['failed']);
  });
}

test('chyba záverečného GET ani neistý zápis nemôžu byť potvrdený návrat', async () => {
  for (const network of [true, false]) {
    const h = harness(); if (!network) h.setLastGetFailure();
    await rejectsSafely(() => h.run(async change => { change.arm(); h.state.notify_likes = change.target; },
      () => { if (network) throw new Error(PRIVATE); }), true);
    assert.deepEqual(h.state, h.original);
    assert.deepEqual(h.reports, ['failed']);
  }
});

test('payload obnovy musí mať presne sedem pôvodných booleanov, bez čítania cudzích hodnôt', async () => {
  const h = harness();
  await h.run(async change => {
    assert.equal(change.matchesRestore(h.original), true);
    assert.equal(change.matchesRestore({ ...h.original, extra: PRIVATE }), false);
    assert.equal(change.matchesRestore({ ...h.original, notify_likes: !h.original.notify_likes }), false);
    const source = { ...h.original };
    Object.defineProperty(source, 'notify_likes', { get: () => { throw new Error(PRIVATE); } });
    assert.equal(change.matchesRestore(source), false);
    change.arm();
  });
});

test('asynchrónna chyba bezpečnostnej kontroly sa neoddelí od výsledku obnovy', async () => {
  const h = harness();
  await rejectsSafely(() => h.run(async change => { change.arm(); h.state.notify_likes = change.target; },
    async () => { throw new Error(PRIVATE); }), true);
  assert.deepEqual(h.state, h.original);
  assert.deepEqual(h.reports, ['failed']);
});

/** Jednoduchý kontrolný protokol auditora bez stránok, cookies alebo skutočného účtu. */
function auditor() {
  const original = initial();
  const change: CategoryChange = { target: false, arm: () => {}, verifyPersisted: async () => {},
    matchesRestore: value => Boolean(value && typeof value === 'object' && Object.keys(value).length === 7
      && KEYS.every(key => (value as NotificationPreferences)[key] === original[key])) };
  return { original, audit: new CategoryWriteAudit(change) };
}

test('audit povolí jeden UI kľúč a jeden sedempoložkový návrat, po seal už nič', () => {
  const { audit, original } = auditor(); const request = {};
  audit.arm(); assert.equal(audit.allow({ notify_likes: false }, request), true);
  audit.responded(request, true); audit.finished(request); audit.assertUIComplete(); audit.beginRestore();
  assert.equal(audit.allow(original, {}), true); audit.assertRestoreSafe(); audit.seal();
  assert.equal(audit.allow({ notify_likes: false }, {}), false);
});

test('audit odmietne predčasný, duplicitný, viackľúčový, nesprávny a neplatný UI payload', () => {
  const early = auditor(); assert.equal(early.audit.allow({ notify_likes: false }, {}), false);
  for (const payload of [null, [], PRIVATE, {}, { notify_likes: true }, { push_notifications: false },
    { notify_likes: false, push_notifications: true }]) {
    const { audit } = auditor(); audit.arm();
    assert.equal(audit.allow(payload, {}), false); assert.throws(() => audit.assertUIComplete());
  }
  const { audit } = auditor(); audit.arm(); const request = {};
  assert.equal(audit.allow({ notify_likes: false }, request), true); audit.responded(request, true); audit.finished(request);
  assert.equal(audit.allow({ notify_likes: false }, {}), false); assert.throws(() => audit.assertUIComplete());
});

test('neukončený alebo zlyhaný UI request znemožní potvrdenie obnovy aj po PATCH', () => {
  for (const failed of [true, false]) {
    const { audit, original } = auditor(); audit.arm(); const request = {};
    assert.equal(audit.allow({ notify_likes: false }, request), true);
    if (failed) audit.finished(request);
    audit.beginRestore(); assert.equal(audit.allow(original, {}), true);
    assert.throws(() => audit.assertRestoreSafe());
  }
});

test('HTTP odpoveď pred chybou dočítania tela už nie je neistý serverový zápis', () => {
  const { audit, original } = auditor(); audit.arm(); const request = {};
  assert.equal(audit.allow({ notify_likes: false }, request), true);
  audit.responded(request, true); audit.finished(request); audit.beginRestore();
  assert.equal(audit.allow(original, {}), true); audit.assertRestoreSafe();
});

test('gateway 5xx bez platnej aplikačnej hlavičky zostáva neistý aj po prijatí odpovede', () => {
  assert.equal(categoryReplyCompleted(200, undefined), true);
  assert.equal(categoryReplyCompleted(403, undefined), true);
  assert.equal(categoryReplyCompleted(500, '1'), true);
  for (const duration of [undefined, PRIVATE, '-1', '1.5']) assert.equal(categoryReplyCompleted(502, duration), false);
  assert.equal(categoryReplyCompleted(0, '1'), false);
  const { audit, original } = auditor(); audit.arm(); const request = {};
  assert.equal(audit.allow({ notify_likes: false }, request), true);
  audit.responded(request, false); audit.finished(request); audit.beginRestore();
  assert.equal(audit.allow(original, {}), true); assert.throws(() => audit.assertRestoreSafe());
});

test('žiadna odpoveď 3xx nepotvrdzuje dokončenie zápisu, ani s aplikačnou hlavičkou', () => {
  for (let status = 300; status < 400; status += 1) {
    assert.equal(categoryReplyCompleted(status, undefined), false);
    assert.equal(categoryReplyCompleted(status, '1'), false);
  }
  for (const status of [200, 299, 400, 499]) assert.equal(categoryReplyCompleted(status, undefined), true);
});

for (const status of [307, 308]) {
  test(`odpoveď ${status} nesmie povoliť potvrdenie návratu ani po odpovedi nesledovaného pokračovania`, () => {
    for (const duration of [undefined, '1']) {
      const { audit, original } = auditor(); const request = {}; const redirected = {};
      audit.arm(); assert.equal(audit.allow({ notify_likes: false }, request), true);
      audit.responded(request, categoryReplyCompleted(status, duration)); audit.finished(request);
      // Route nemusí vidieť pokračovanie presmerovania. Ani jeho odpoveď neodstráni neistotu.
      audit.responded(redirected, true); audit.finished(redirected);
      audit.beginRestore(); assert.equal(audit.allow(original, {}), true);
      assert.throws(() => audit.assertRestoreSafe());
      assert.match(audit.evidence(), /uncertain=true/);
    }
  });
}

test('neskorý nesprávny UI payload neblokuje samotný pokus vrátiť pôvodných sedem', () => {
  const { audit, original } = auditor(); audit.arm(); audit.beginRestore();
  assert.equal(audit.allow({ notify_likes: false }, {}), false);
  assert.equal(audit.allow(original, {}), true);
  assert.throws(() => audit.assertRestoreSafe());
});

test('ostatný zápis a duplicitný návrat sa odmietnu; správy chýb nenesú payload', () => {
  const { audit, original } = auditor(); audit.rejectOtherWrite(); audit.arm();
  assert.throws(() => audit.assertUIComplete(), error => error instanceof Error && !error.message.includes(PRIVATE));
  audit.beginRestore(); audit.rejectOtherWrite(); assert.equal(audit.allow(original, {}), true);
  assert.equal(audit.allow(original, {}), false);
  assert.throws(() => audit.assertRestoreSafe());
});
