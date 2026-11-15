/** Pevný kontrakt API; žiadne používateľské názvy ani hodnoty sa nevkladajú do chýb. */
export const NOTIFICATION_PREFERENCE_KEYS = [
  'in_app_notifications', 'push_notifications', 'notify_likes', 'notify_comment_likes',
  'notify_comments', 'notify_tags_and_shares', 'notify_skill_requests',
] as const;
export type NotificationPreferenceKey = typeof NOTIFICATION_PREFERENCE_KEYS[number];
export type NotificationPreferences = Readonly<Record<NotificationPreferenceKey, boolean>>;
export type PreferenceReply = { status: number; data: unknown };
export type PreferenceTransport = (
  method: 'GET' | 'PATCH', values?: Partial<NotificationPreferences>,
) => Promise<PreferenceReply>;

/** Vyberie iba sedem pravdivostných polí; iné polia ani ich hodnoty sa nečítajú. */
export function parseNotificationPreferences(data: unknown): NotificationPreferences {
  try {
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
    const result = {} as Record<NotificationPreferenceKey, boolean>;
    for (const key of NOTIFICATION_PREFERENCE_KEYS) {
      if (!Object.prototype.hasOwnProperty.call(data, key)) throw new Error();
      const value = (data as Record<string, unknown>)[key];
      if (typeof value !== 'boolean') throw new Error();
      result[key] = value;
    }
    return Object.freeze(result);
  } catch { throw new Error('API volieb nevrátilo sedem platných pravdivostných polí.'); }
}

/** Porovná súkromné hodnoty iba cez počet rozdielov; nikdy ich nevypisuje. */
function requireSamePreferences(actual: NotificationPreferences, expected: NotificationPreferences): void {
  const differences = NOTIFICATION_PREFERENCE_KEYS.filter(key => actual[key] !== expected[key]).length;
  if (differences) throw new Error(`Voľby nesedia; počet rozdielov: ${differences}.`);
}

/** Sieťové chyby a neplatné odpovede majú iba pevnú správu alebo bezpečný HTTP stav. */
async function checkedCall(transport: PreferenceTransport, method: 'GET' | 'PATCH', values?: Partial<NotificationPreferences>) {
  let reply: PreferenceReply;
  try { reply = await transport(method, values); } catch {
    throw new Error(`Volanie ${method} volieb sa nedokončilo.`);
  }
  if (reply?.status !== 200) {
    const status = typeof reply?.status === 'number' && Number.isInteger(reply.status)
      && reply.status >= 100 && reply.status <= 599 ? String(reply.status) : 'nezistiteľné';
    throw new Error(`Volanie ${method} volieb neuspelo; HTTP ${status}.`);
  }
  return parseNotificationPreferences(reply.data);
}

/** Pozorovateľ dostane len pevný stav; jeho chyba nesmie prekryť výsledok upratania. */
function reportCleanup(report: ((state: 'verified' | 'failed') => void) | undefined, state: 'verified' | 'failed'): void {
  try { report?.(state); } catch { /* Žiadna hodnota účtu ani surový text chyby. */ }
}

/**
 * Jedna zmena a kontrola cez GET. Finally obnoví všetkých sedem hodnôt aj po
 * neistej odpovedi PATCH a vždy skúsi záverečný GET. Volá sa z teardown fixture,
 * aby upratanie dostalo štandardný samostatný rozpočet aj po páde tela testu.
 */
export async function withNotificationPreferenceRoundTrip(
  transport: PreferenceTransport,
  key: NotificationPreferenceKey,
  exercise: (verifySingleChange: () => Promise<void>) => Promise<void>,
  report?: (state: 'verified' | 'failed') => void,
): Promise<void> {
  if (!NOTIFICATION_PREFERENCE_KEYS.includes(key)) throw new Error('Neplatný kľúč skúšky volieb.');
  const original = await checkedCall(transport, 'GET');
  const changed = { ...original, [key]: !original[key] };
  let attempted = false;
  const verifySingleChange = async () => {
    if (attempted) throw new Error('Skúška nesmie vykonať viac než jednu zmenu.');
    // Označenie musí predchádzať await: timeout PATCH nepreukazuje, že server nič nezmenil.
    attempted = true;
    const returned = await checkedCall(transport, 'PATCH', { [key]: changed[key] });
    requireSamePreferences(returned, changed);
    requireSamePreferences(await checkedCall(transport, 'GET'), changed);
  };
  try {
    await exercise(verifySingleChange);
    if (!attempted) throw new Error('Skúška nevykonala overenie zmeny voľby.');
  } finally {
    if (attempted) {
      let failures = 0;
      try { requireSamePreferences(await checkedCall(transport, 'PATCH', { ...original }), original); } catch { failures += 1; }
      try { requireSamePreferences(await checkedCall(transport, 'GET'), original); } catch { failures += 1; }
      reportCleanup(report, failures ? 'failed' : 'verified');
      if (failures) throw new Error(`ZÁVAŽNÉ: návrat siedmich volieb nebol potvrdený; neúspešné kontroly: ${failures}. Ďalší živý test nespúšťaj.`);
    }
  }
}
