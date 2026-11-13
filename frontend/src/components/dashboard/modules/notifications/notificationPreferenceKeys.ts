/**
 * Voľby upozornení, ktoré server vracia a prijíma na `GET`/`PATCH /api/auth/push/preferences/` (nález 321, etapa 3a):
 * hlavný vypínač (`in_app_notifications`), Správy (`push_notifications`) a päť kategórií `notify_*`.
 */
export interface NotificationPreferencesState {
  /** Upozornenia v aplikácii; hlavný vypínač „Vypnúť všetko“ je jeho opak. */
  inAppNotifications: boolean;
  /** Push upozornenia na správy. */
  pushNotifications: boolean;
  notifyLikes: boolean;
  notifyCommentLikes: boolean;
  notifyComments: boolean;
  notifyTagsAndShares: boolean;
  notifySkillRequests: boolean;
}

/** Názov jednej voľby v stave rozhrania. */
export type NotificationPreferenceKey = keyof NotificationPreferencesState;

/**
 * Kľúče servera pre jednotlivé voľby. `PATCH` smie niesť presne jeden z nich: server odmietne každý neznámy kľúč
 * (400) a v takom prípade neuloží nič.
 */
export const PREFERENCE_API_KEYS = {
  inAppNotifications: 'in_app_notifications',
  pushNotifications: 'push_notifications',
  notifyLikes: 'notify_likes',
  notifyCommentLikes: 'notify_comment_likes',
  notifyComments: 'notify_comments',
  notifyTagsAndShares: 'notify_tags_and_shares',
  notifySkillRequests: 'notify_skill_requests',
} as const satisfies Record<NotificationPreferenceKey, string>;

type PreferenceApiKey = (typeof PREFERENCE_API_KEYS)[NotificationPreferenceKey];

/** Tvar odpovede aj tela `PATCH` servera: ľubovoľná podmnožina siedmich kľúčov. */
export type NotificationPreferencesApiPayload = Partial<Record<PreferenceApiKey, boolean>>;

/** Hodnoty, kým sa nenačíta odpoveď servera alebo ak v nej voľba chýba: kategórie aj hlavné upozornenia zapnuté, Správy nie. */
export const DEFAULT_PREFERENCES: NotificationPreferencesState = {
  inAppNotifications: true,
  pushNotifications: false,
  notifyLikes: true,
  notifyCommentLikes: true,
  notifyComments: true,
  notifyTagsAndShares: true,
  notifySkillRequests: true,
};

/** Odpoveď servera na stav rozhrania; chýbajúcu alebo nepravdivostnú hodnotu nahradí predvolenou. */
export function mapApiPayloadToState(
  payload?: NotificationPreferencesApiPayload | null,
): NotificationPreferencesState {
  const state = { ...DEFAULT_PREFERENCES };
  (Object.keys(PREFERENCE_API_KEYS) as NotificationPreferenceKey[]).forEach((key) => {
    const value = payload?.[PREFERENCE_API_KEYS[key]];
    if (typeof value === 'boolean') {
      state[key] = value;
    }
  });
  return state;
}

/** Telo `PATCH` pre jednu voľbu: práve jeden kľúč servera. */
export function mapStatePatchToApiPatch(
  key: NotificationPreferenceKey,
  value: boolean,
): NotificationPreferencesApiPayload {
  return { [PREFERENCE_API_KEYS[key]]: value };
}
