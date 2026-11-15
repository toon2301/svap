import assert from 'node:assert/strict';
import test from 'node:test';
import {
  NOTIFICATION_PREFERENCE_KEYS as KEYS, parseNotificationPreferences, withNotificationPreferenceRoundTrip,
  type NotificationPreferenceKey, type PreferenceReply, type PreferenceTransport,
} from '../support/notification-preferences-roundtrip';

const PRIVATE = 'SYNTHETIC_PRIVATE_PREFERENCES';
const initial = (): Record<NotificationPreferenceKey, boolean> => Object.fromEntries(
  KEYS.map((key, index) => [key, index % 2 === 0]),
) as Record<NotificationPreferenceKey, boolean>;

/** Výpisy testov obsahujú len počty a pevné výsledky; syntetické hodnoty nie sú účet. */
function harness(change?: (method: 'GET' | 'PATCH', ordinal: number, state: Record<NotificationPreferenceKey, boolean>) => PreferenceReply | null) {
  const original = initial();
  const state = { ...original };
  const calls: Array<{ method: 'GET' | 'PATCH'; fields: number }> = [];
  const reports: string[] = [];
  const transport: PreferenceTransport = async (method, values) => {
    calls.push({ method, fields: values ? Object.keys(values).length : 0 });
    if (method === 'PATCH') Object.assign(state, values);
    return change?.(method, calls.length, state) ?? { status: 200, data: { ...state } };
  };
  return { state, original, calls, reports, transport,
    run: (key: NotificationPreferenceKey = 'notify_likes', exercise = async (verify: () => Promise<void>) => verify()) =>
      withNotificationPreferenceRoundTrip(transport, key, exercise, status => { reports.push(status); }),
  };
}

/** Chyba smie obsahovať len vlastný pevný text, nie transport alebo odpoveď. */
async function rejectsSafely(run: () => Promise<unknown>, critical = false) {
  let caught: unknown;
  try { await run(); } catch (error) { caught = error; }
  assert.ok(caught instanceof Error);
  assert.ok(!caught.message.includes(PRIVATE));
  if (critical) assert.match(caught.message, /ZÁVAŽNÉ/);
}

test('parser vyberie sedem booleanov a neprečíta súkromné doplnkové polia', () => {
  const source = initial();
  Object.defineProperty(source, 'private', { get: () => { throw new Error(PRIVATE); } });
  assert.equal(Object.keys(parseNotificationPreferences(source)).length, 7);
  assert.equal(Object.isFrozen(parseNotificationPreferences(source)), true);
});

test('neplatné tvary, chýbajúce polia a hodnoty nedajú platný snímok ani súkromnú chybu', () => {
  const missing: Partial<Record<NotificationPreferenceKey, boolean>> = { ...initial() };
  delete missing.notify_likes;
  const throwing = { ...initial() };
  Object.defineProperty(throwing, 'notify_likes', { get: () => { throw new Error(PRIVATE); } });
  for (const value of [null, undefined, [], PRIVATE, 1, missing, { ...initial(), notify_likes: PRIVATE }, throwing]) {
    assert.throws(() => parseNotificationPreferences(value), error => error instanceof Error && !error.message.includes(PRIVATE));
  }
});

for (const key of KEYS) {
  test(`jedna zmena ${key} sa overí cez GET a všetkých sedem polí sa obnoví`, async () => {
    const h = harness();
    await h.run(key);
    assert.deepEqual(h.calls, [{ method: 'GET', fields: 0 }, { method: 'PATCH', fields: 1 },
      { method: 'GET', fields: 0 }, { method: 'PATCH', fields: 7 }, { method: 'GET', fields: 0 }]);
    assert.deepEqual(h.state, h.original);
    assert.deepEqual(h.reports, ['verified']);
  });
}

test('zlyhaný úvodný GET neposiela žiadny PATCH', async () => {
  const h = harness(() => ({ status: 401, data: { private: PRIVATE } }));
  await rejectsSafely(() => h.run());
  assert.equal(h.calls.length, 1);
});

test('neplatný úvodný snímok sa nesmie použiť na zápis alebo obnovu', async () => {
  for (const reply of [{ status: 200, data: { private: PRIVATE } }, { status: 0, data: null }]) {
    const h = harness(() => reply);
    await rejectsSafely(() => h.run());
    assert.deepEqual(h.calls, [{ method: 'GET', fields: 0 }]);
    assert.deepEqual(h.reports, []);
  }
});

test('neplatný kľúč ani nevyužitá skúška nevytvoria zápis', async () => {
  const h = harness();
  await rejectsSafely(() => h.run(PRIVATE as NotificationPreferenceKey));
  assert.equal(h.calls.length, 0);
  await rejectsSafely(() => h.run('notify_likes', async () => {}));
  assert.equal(h.calls.length, 1);
});

test('neúspešná alebo neplatná odpoveď zmeny obnoví stav, aj keď sa zápis mohol uložiť', async () => {
  for (const status of [400, 401, 403, 500, 0, Number.NaN]) {
    const h = harness((_method, ordinal) => ordinal === 2 ? { status, data: { private: PRIVATE } } : null);
    await rejectsSafely(() => h.run());
    assert.deepEqual(h.state, h.original);
    assert.deepEqual(h.reports, ['verified']);
    assert.equal(h.calls.filter(call => call.method === 'PATCH').length, 2);
  }
  const h = harness((_method, ordinal) => ordinal === 2 ? { status: 200, data: { private: PRIVATE } } : null);
  await rejectsSafely(() => h.run());
  assert.deepEqual(h.state, h.original);
});

test('zamietnutý transport po neistom PATCH neunikne do chyby a stále sa uprace', async () => {
  const h = harness((_method, ordinal) => { if (ordinal === 2) throw new Error(PRIVATE); return null; });
  await rejectsSafely(() => h.run());
  assert.deepEqual(h.state, h.original);
  assert.equal(h.calls.length, 4);
});

test('neuložená zmena a zmena cudzieho poľa sú skutočný pád, nie zelený výsledok', async () => {
  for (const mode of ['not-saved', 'other-field']) {
    const h = harness((_method, ordinal, state) => {
      if (ordinal === 2 && mode === 'other-field') state.push_notifications = !state.push_notifications;
      if (ordinal === 3 && mode === 'not-saved') return { status: 200, data: initial() };
      return null;
    });
    await rejectsSafely(() => h.run());
    assert.deepEqual(h.state, h.original);
  }
});

test('chyba tela po zmene a druhá zmena nesmú preskočiť finally', async () => {
  for (const second of [false, true]) {
    const h = harness();
    await rejectsSafely(() => h.run('notify_likes', async verify => {
      await verify();
      if (second) await verify();
      else throw new Error('SYNTHETIC_BODY_FAILURE');
    }));
    assert.deepEqual(h.state, h.original);
    assert.equal(h.calls.filter(call => call.method === 'PATCH').length, 2);
  }
});

test('chyba obnovovacieho PATCH musí padnúť nahlas a záverečný GET sa napriek nej vykoná', async () => {
  const h = harness((_method, ordinal) => ordinal === 4 ? { status: 500, data: { private: PRIVATE } } : null);
  await rejectsSafely(() => h.run(), true);
  assert.equal(h.calls.length, 5);
  assert.deepEqual(h.reports, ['failed']);
});

test('HTTP 200 pri ignorovanej obnove nestačí, ani keď PATCH tvrdí pôvodné hodnoty', async () => {
  for (const misleadingReply of [false, true]) {
    const h = harness((_method, ordinal, state) => {
      if (ordinal !== 4) return null;
      state.notify_likes = !initial().notify_likes;
      return { status: 200, data: misleadingReply ? initial() : { ...state } };
    });
    await rejectsSafely(() => h.run(), true);
    assert.equal(h.calls.length, 5);
    assert.deepEqual(h.reports, ['failed']);
  }
});

test('nezhoda alebo chyba záverečného GET nesmie byť potvrdený návrat', async () => {
  for (const kind of ['mismatch', 'status', 'shape', 'transport']) {
    const h = harness((_method, ordinal) => {
      if (ordinal !== 5) return null;
      if (kind === 'transport') throw new Error(PRIVATE);
      if (kind === 'status') return { status: 403, data: null };
      if (kind === 'shape') return { status: 200, data: { private: PRIVATE } };
      return { status: 200, data: { ...initial(), in_app_notifications: !initial().in_app_notifications } };
    });
    await rejectsSafely(() => h.run(), true);
    assert.deepEqual(h.reports, ['failed']);
  }
});

test('diagnostický callback nemôže prekryť úspešný návrat ani zlyhanie návratu', async () => {
  const h = harness();
  await withNotificationPreferenceRoundTrip(h.transport, 'notify_likes', verify => verify(), () => { throw new Error(PRIVATE); });
  assert.deepEqual(h.state, h.original);
  const failed = harness((_method, ordinal) => ordinal === 4 ? { status: 500, data: null } : null);
  await rejectsSafely(() => withNotificationPreferenceRoundTrip(failed.transport, 'notify_likes', verify => verify(),
    () => { throw new Error(PRIVATE); }), true);
});
