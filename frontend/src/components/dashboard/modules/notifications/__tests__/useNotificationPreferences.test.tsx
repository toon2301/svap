import { act, renderHook, waitFor } from '@testing-library/react';

import { api } from '@/lib/api';

import cs from '../../../../../../messages/cs.json';
import de from '../../../../../../messages/de.json';
import en from '../../../../../../messages/en.json';
import hu from '../../../../../../messages/hu.json';
import pl from '../../../../../../messages/pl.json';
import sk from '../../../../../../messages/sk.json';
import { useNotificationPreferences } from '../useNotificationPreferences';

jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  endpoints: {
    push: {
      preferences: '/auth/push/preferences/',
    },
  },
}));

/**
 * Hook `useNotificationPreferences` pre sedem volieb upozornení (nález 321, etapa 3a, a nález 319). Server vracia a
 * prijíma `in_app_notifications`, `push_notifications` a päť kategórií `notify_*`. Zmena jednej voľby pošle `PATCH` len
 * s jej kľúčom (server odmietne každý neznámy kľúč), zlyhanie vráti len túto hodnotu (nie celý objekt) a pri vypnutom
 * internete sa nič neodošle. Poradie zápisov tej istej voľby (fronta) pokrýva `useNotificationPreferences.writes.test.tsx`.
 */
type ServerState = {
  in_app_notifications: boolean;
  push_notifications: boolean;
  notify_likes: boolean;
  notify_comment_likes: boolean;
  notify_comments: boolean;
  notify_tags_and_shares: boolean;
  notify_skill_requests: boolean;
};

const SERVER_DEFAULT: ServerState = {
  in_app_notifications: true,
  push_notifications: true,
  notify_likes: true,
  notify_comment_likes: true,
  notify_comments: true,
  notify_tags_and_shares: true,
  notify_skill_requests: true,
};

/** Dvojice „názov voľby v hooku → kľúč servera“ pre všetkých sedem volieb. */
const OPTIONS = [
  ['inAppNotifications', 'in_app_notifications'],
  ['pushNotifications', 'push_notifications'],
  ['notifyLikes', 'notify_likes'],
  ['notifyCommentLikes', 'notify_comment_likes'],
  ['notifyComments', 'notify_comments'],
  ['notifyTagsAndShares', 'notify_tags_and_shares'],
  ['notifySkillRequests', 'notify_skill_requests'],
] as const;

type OptionKey = (typeof OPTIONS)[number][0];

/** Nastaví odpoveď `GET` s danými hodnotami voliteľne prepísanými. */
function mockLoad(overrides: Partial<ServerState> = {}) {
  jest.mocked(api.get).mockResolvedValue({ data: { ...SERVER_DEFAULT, ...overrides } });
}

type PatchCall = {
  body: Record<string, boolean>;
  respond: (data: Partial<ServerState>) => void;
  fail: (error: unknown) => void;
};

/** Každé volanie `PATCH` ostane rozpracované, kým ho test nedokončí (odpoveď alebo chyba). */
function mockManualPatch(): PatchCall[] {
  const calls: PatchCall[] = [];
  jest.mocked(api.patch).mockImplementation(
    (_url: string, body?: unknown) =>
      new Promise((resolve, reject) => {
        calls.push({
          body: body as Record<string, boolean>,
          respond: (data) => resolve({ data }),
          fail: reject,
        });
      }),
  );
  return calls;
}

/** `PATCH` sa vždy podarí a odpovie stavom servera po zmene (ako skutočný server, všetkých sedem hodnôt). */
function mockEchoPatch(initial: ServerState = SERVER_DEFAULT) {
  let state = { ...initial };
  jest.mocked(api.patch).mockImplementation(async (_url: string, body?: unknown) => {
    state = { ...state, ...(body as Partial<ServerState>) };
    return { data: { ...state } };
  });
}

async function renderLoaded(overrides: Partial<ServerState> = {}) {
  mockLoad(overrides);
  const view = renderHook(() => useNotificationPreferences());
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  return view;
}

let onLineSpy: jest.SpyInstance | null = null;

/** Nasimuluje vypnutý internet (`navigator.onLine === false`). */
function goOffline() {
  onLineSpy = jest.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  onLineSpy?.mockRestore();
  onLineSpy = null;
  jest.restoreAllMocks();
});

describe('useNotificationPreferences: načítanie siedmich volieb', () => {
  it('načíta všetkých sedem volieb zo servera, každú zo svojho kľúča', async () => {
    const { result } = await renderLoaded({
      in_app_notifications: false,
      push_notifications: true,
      notify_likes: false,
      notify_comment_likes: true,
      notify_comments: false,
      notify_tags_and_shares: true,
      notify_skill_requests: false,
    });

    expect(result.current.loadFailed).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.preferences).toEqual({
      inAppNotifications: false,
      pushNotifications: true,
      notifyLikes: false,
      notifyCommentLikes: true,
      notifyComments: false,
      notifyTagsAndShares: true,
      notifySkillRequests: false,
    });
  });

  it('chýbajúce kľúče v odpovedi: kategórie sú zapnuté (predvolené), Správy vypnuté', async () => {
    jest.mocked(api.get).mockResolvedValue({ data: { in_app_notifications: false } });
    const view = renderHook(() => useNotificationPreferences());
    await waitFor(() => expect(view.result.current.loading).toBe(false));

    expect(view.result.current.preferences).toEqual({
      inAppNotifications: false,
      pushNotifications: false,
      notifyLikes: true,
      notifyCommentLikes: true,
      notifyComments: true,
      notifyTagsAndShares: true,
      notifySkillRequests: true,
    });
  });

  it('zlyhanie načítania: loadFailed, preložený text chyby (nie napevno bez diakritiky) a predvolené hodnoty', async () => {
    jest.mocked(api.get).mockRejectedValue(new Error('network'));
    const view = renderHook(() => useNotificationPreferences());
    await waitFor(() => expect(view.result.current.loading).toBe(false));

    expect(view.result.current.loadFailed).toBe(true);
    expect(view.result.current.error).toBe(sk.notifications.preferencesLoadFailed);
    expect(view.result.current.error).toBe('Nastavenia upozornení sa nepodarilo načítať.');
    expect(view.result.current.preferences.notifyLikes).toBe(true);
  });
});

describe('useNotificationPreferences: zmena voľby', () => {
  it.each(OPTIONS)('zmena voľby %s pošle PATCH len s kľúčom %s a hodnota sa uloží', async (key, apiKey) => {
    mockEchoPatch();
    const { result } = await renderLoaded();

    let saved = false;
    await act(async () => {
      saved = await result.current.updatePreference(key, false);
    });

    expect(saved).toBe(true);
    expect(api.patch).toHaveBeenCalledTimes(1);
    expect(api.patch).toHaveBeenCalledWith('/auth/push/preferences/', { [apiKey]: false });
    expect(result.current.preferences[key]).toBe(false);
    OPTIONS.filter(([other]) => other !== key).forEach(([other]) => {
      expect(result.current.preferences[other]).toBe(true);
    });
    expect(result.current.isSaving(key)).toBe(false);
  });

  it('hodnota sa prepne hneď (pred odpoveďou servera) a isSaving platí len pre ukladanú voľbu', async () => {
    const calls = mockManualPatch();
    const { result } = await renderLoaded();

    act(() => {
      void result.current.updatePreference('notifyLikes', false);
    });

    expect(result.current.preferences.notifyLikes).toBe(false);
    expect(result.current.isSaving('notifyLikes')).toBe(true);
    expect(result.current.isSaving('notifyComments')).toBe(false);

    await act(async () => {
      calls[0].respond({ ...SERVER_DEFAULT, notify_likes: false });
    });

    expect(result.current.preferences.notifyLikes).toBe(false);
    expect(result.current.isSaving('notifyLikes')).toBe(false);
  });

  it('rovnaká hodnota, aká už je: žiadny PATCH', async () => {
    mockEchoPatch();
    const { result } = await renderLoaded();

    let saved = false;
    await act(async () => {
      saved = await result.current.updatePreference('notifyLikes', true);
    });

    expect(saved).toBe(true);
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('dvojité zavolanie rýchlo za sebou s rovnakou hodnotou (stlačenie aj kliknutie) pošle jeden PATCH', async () => {
    const calls = mockManualPatch();
    const { result } = await renderLoaded();

    act(() => {
      void result.current.updatePreference('notifyComments', false);
      void result.current.updatePreference('notifyComments', false);
    });

    expect(calls).toHaveLength(1);
    await act(async () => {
      calls[0].respond({ ...SERVER_DEFAULT, notify_comments: false });
    });
    expect(result.current.preferences.notifyComments).toBe(false);
  });
});

describe('useNotificationPreferences: voľby, ktoré nie sú načítané zo servera', () => {
  it('kým sa voľby načítavajú, zmena sa neposiela a vráti false (hodnoty sú zatiaľ len predvolené)', async () => {
    jest.mocked(api.get).mockReturnValue(new Promise(() => undefined));
    mockEchoPatch();
    const { result } = renderHook(() => useNotificationPreferences());

    let saved = true;
    await act(async () => {
      saved = await result.current.updatePreference('pushNotifications', true);
    });

    expect(saved).toBe(false);
    expect(result.current.loading).toBe(true);
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('po zlyhaní načítania sa zmena neposiela (predvolené hodnoty nie sú stav servera)', async () => {
    jest.mocked(api.get).mockRejectedValue(new Error('network'));
    mockEchoPatch();
    const view = renderHook(() => useNotificationPreferences());
    await waitFor(() => expect(view.result.current.loading).toBe(false));

    let saved = true;
    await act(async () => {
      saved = await view.result.current.updatePreference('notifyLikes', false);
    });

    expect(saved).toBe(false);
    expect(api.patch).not.toHaveBeenCalled();
    expect(view.result.current.preferences.notifyLikes).toBe(true);
  });
});

describe('useNotificationPreferences: zlyhanie vráti len zmenenú hodnotu', () => {
  it('zlyhanie jednej voľby ju vráti a nechá úspešne zmenenú inú voľbu (nie celý predchádzajúci objekt)', async () => {
    const calls = mockManualPatch();
    const { result } = await renderLoaded();
    const onError = jest.fn();

    act(() => {
      void result.current.updatePreference('notifyLikes', false, { onError });
      void result.current.updatePreference('notifyComments', false);
    });
    expect(result.current.preferences.notifyLikes).toBe(false);
    expect(result.current.preferences.notifyComments).toBe(false);

    await act(async () => {
      calls[1].respond({ ...SERVER_DEFAULT, notify_comments: false });
    });
    await act(async () => {
      calls[0].fail({ isAxiosError: true, message: 'Network Error' });
    });

    expect(result.current.preferences.notifyLikes).toBe(true);
    expect(result.current.preferences.notifyComments).toBe(false);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('úspešná odpoveď jednej voľby neprepíše rozpracovanú zmenu inej voľby (odpoveď nesie jej starú hodnotu)', async () => {
    const calls = mockManualPatch();
    const { result } = await renderLoaded();

    act(() => {
      void result.current.updatePreference('notifyLikes', false);
      void result.current.updatePreference('notifyComments', false);
    });

    await act(async () => {
      // Server pri tejto odpovedi ešte nepozná zmenu `notify_likes`, no nesie ju so starou hodnotou `true`.
      calls[1].respond({ ...SERVER_DEFAULT, notify_comments: false });
    });

    expect(result.current.preferences.notifyComments).toBe(false);
    expect(result.current.preferences.notifyLikes).toBe(false);
  });

  it('sieťová chyba bez odpovede servera dá preložený text, nie anglické „Network Error“', async () => {
    jest.mocked(api.patch).mockRejectedValue({ isAxiosError: true, message: 'Network Error' });
    const { result } = await renderLoaded();
    const onError = jest.fn();

    let saved = true;
    await act(async () => {
      saved = await result.current.updatePreference('notifyLikes', false, { onError });
    });

    expect(saved).toBe(false);
    expect(onError).toHaveBeenCalledWith('Nastavenia upozornení sa nepodarilo uložiť.');
    expect(result.current.preferences.notifyLikes).toBe(true);
  });

  it('chyba servera so správou: použije sa jej text', async () => {
    jest.mocked(api.patch).mockRejectedValue({ response: { data: { error: 'Neplatné údaje' } } });
    const { result } = await renderLoaded();
    const onError = jest.fn();

    await act(async () => {
      await result.current.updatePreference('notifyLikes', false, { onError });
    });

    expect(onError).toHaveBeenCalledWith('Neplatné údaje');
  });

  it('bez onError ide chyba uloženia do `error` (pod voľbou Správy) a pri ďalšej zmene sa zruší', async () => {
    jest.mocked(api.patch).mockRejectedValueOnce({ isAxiosError: true, message: 'Network Error' });
    mockEchoPatch();
    const { result } = await renderLoaded();

    await act(async () => {
      await result.current.updatePreference('pushNotifications', false);
    });
    expect(result.current.error).toBe('Nastavenia upozornení sa nepodarilo uložiť.');
    expect(result.current.preferences.pushNotifications).toBe(true);

    jest.mocked(api.patch).mockImplementation(async () => ({ data: { ...SERVER_DEFAULT, push_notifications: false } }));
    await act(async () => {
      await result.current.updatePreference('pushNotifications', false);
    });
    expect(result.current.error).toBeNull();
  });

  it('chyba s onError sa neukáže aj v `error` (nezdvojí sa)', async () => {
    jest.mocked(api.patch).mockRejectedValue({ isAxiosError: true, message: 'Network Error' });
    const { result } = await renderLoaded();

    await act(async () => {
      await result.current.updatePreference('notifyLikes', false, { onError: jest.fn() });
    });

    expect(result.current.error).toBeNull();
  });
});

describe('useNotificationPreferences: pri vypnutom internete (nález 319)', () => {
  it('PATCH sa neodošle, hodnota sa nezmení a chyba je preložená', async () => {
    mockEchoPatch();
    const { result } = await renderLoaded();
    goOffline();
    const onError = jest.fn();

    let saved = true;
    await act(async () => {
      saved = await result.current.updatePreference('notifyLikes', false, { onError });
    });

    expect(saved).toBe(false);
    expect(api.patch).not.toHaveBeenCalled();
    expect(result.current.preferences.notifyLikes).toBe(true);
    expect(result.current.isSaving('notifyLikes')).toBe(false);
    expect(onError).toHaveBeenCalledWith('Bez pripojenia na internet sa nastavenie nedá zmeniť.');
  });

  it('platí pre všetkých sedem volieb vrátane Správ a bez onError ide preložená chyba do `error`', async () => {
    mockEchoPatch();
    const { result } = await renderLoaded();
    goOffline();

    for (const [key] of OPTIONS) {
      await act(async () => {
        await result.current.updatePreference(key as OptionKey, false);
      });
      expect(result.current.preferences[key as OptionKey]).toBe(true);
    }

    expect(api.patch).not.toHaveBeenCalled();
    expect(result.current.error).toBe('Bez pripojenia na internet sa nastavenie nedá zmeniť.');
  });

  it('po obnovení pripojenia sa zmena odošle normálne', async () => {
    mockEchoPatch();
    const { result } = await renderLoaded();
    goOffline();
    await act(async () => {
      await result.current.updatePreference('notifyLikes', false);
    });
    onLineSpy?.mockRestore();
    onLineSpy = null;

    await act(async () => {
      await result.current.updatePreference('notifyLikes', false);
    });

    expect(api.patch).toHaveBeenCalledTimes(1);
    expect(result.current.preferences.notifyLikes).toBe(false);
  });
});

describe('useNotificationPreferences: preložené texty chýb', () => {
  const KEYS = [
    'preferencesLoadFailed',
    'preferencesSaveFailed',
    'preferencesOffline',
    'pushUnsupportedInsecure',
    'pushUnsupportedBrowser',
    'pushPermissionDenied',
    'pushPermissionNotGranted',
    'pushNotRegistered',
    'pushSyncFailed',
    'pushEnableFailed',
    'pushUnregisterFailed',
  ] as const;
  const OTHER_LANGUAGES = { cs, de, en, hu, pl };

  it.each(KEYS)('kľúč notifications.%s existuje vo všetkých šiestich jazykoch a ostatné sa líšia od slovenčiny', (key) => {
    const slovak = (sk.notifications as Record<string, string>)[key];
    expect(typeof slovak).toBe('string');
    expect(slovak.trim()).not.toBe('');
    Object.entries(OTHER_LANGUAGES).forEach(([language, messages]) => {
      const text = (messages.notifications as Record<string, string>)[key];
      expect(typeof text).toBe('string');
      expect(text.trim()).not.toBe('');
      expect({ language, same: text === slovak }).toEqual({ language, same: false });
    });
  });

  it('slovenské texty majú diakritiku (nie napevno bez diakritiky ako pôvodné texty)', () => {
    KEYS.forEach((key) => {
      expect((sk.notifications as Record<string, string>)[key]).toMatch(/[áäčďéíĺľňóôŕšťúýžÁČŠŽ]/);
    });
  });
});
