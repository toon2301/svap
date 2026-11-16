import {
  NOTIFICATION_PREFERENCE_KEYS as KEYS, parseNotificationPreferences, readNotificationPreferences,
  requireSamePreferences, restoreNotificationPreferences,
  type PreferenceTransport,
} from './notification-preferences-roundtrip';

export type CategoryChange = {
  readonly target: boolean;
  arm: () => void;
  verifyPersisted: () => Promise<void>;
  matchesRestore: (payload: unknown) => boolean;
};
type Cleanup = { report?: (state: 'verified' | 'failed') => void; verifyWriteSafety?: () => void | Promise<void> };

/**
 * UI mení jedinú kategóriu, tento helper neposiela prvý PATCH. Všetkých sedem
 * hodnôt obnovuje až po ukončení fixture use, teda aj po páde alebo timeoute tela.
 */
export async function withNotificationCategoryChange(
  transport: PreferenceTransport,
  exercise: (change: CategoryChange) => Promise<void>,
  cleanup: Cleanup = {},
): Promise<void> {
  const original = await readNotificationPreferences(transport);
  if (!original.in_app_notifications) {
    throw new Error('Podmienka 337 nie je splnená: upozornenia v aplikácii musia byť zapnuté. Nič sa nezapína ani nemení.');
  }
  const changed = { ...original, notify_likes: !original.notify_likes };
  let armed = false;
  const change: CategoryChange = {
    target: changed.notify_likes,
    arm: () => {
      if (armed) throw new Error('UI skúška smie vykonať iba jeden pokus o zmenu.');
      armed = true;
    },
    verifyPersisted: async () => {
      if (!armed) throw new Error('Overenie musí nasledovať až po UI pokuse.');
      requireSamePreferences(await readNotificationPreferences(transport), changed);
    },
    matchesRestore: payload => {
      try {
        if (!payload || typeof payload !== 'object' || Object.keys(payload).length !== KEYS.length) return false;
        const candidate = parseNotificationPreferences(payload);
        return KEYS.every(key => candidate[key] === original[key]);
      } catch { return false; }
    },
  };
  try {
    try { await exercise(change); } catch { throw new Error('UI fáza skúšky kategórie sa nedokončila.'); }
    if (!armed) throw new Error('Skúška nevykonala UI zmenu kategórie.');
  } finally {
    if (armed) await restoreNotificationPreferences(transport, original, cleanup.report, cleanup.verifyWriteSafety);
  }
}
