import { act, renderHook, waitFor } from '@testing-library/react';

import { api } from '@/lib/api';

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
 * Zápisy tej istej voľby sa serializujú (PR 258, nálezy Codexu a CodeRabbitu): kým beží zápis voľby, ďalšia zmena tej
 * istej voľby čaká a odošle sa až po ňom, takže návrat po chybe vychádza z hodnoty, ktorú server skutočne potvrdil.
 * Predtým sa odoslali dva súbežné `PATCH` a keď prvý uložil `false` a druhý (`true`) zlyhal, obrazovka sa vrátila na
 * pôvodné `true`, hoci server už mal `false`. Zmeny rôznych volieb sa nezdržiavajú. Čakajúce zmeny sa zlučujú: odošle sa
 * len najnovšia, a to len ak sa líši od potvrdenej hodnoty.
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

type PatchCall = {
  body: Record<string, boolean>;
  respond: () => void;
  fail: () => void;
};

/**
 * Každé volanie `PATCH` ostane rozpracované, kým ho test nedokončí. Odpoveď nesie stav servera po zápise, tak ako ju
 * vracia skutočný server (všetkých sedem hodnôt).
 */
function mockManualPatch(): PatchCall[] {
  const calls: PatchCall[] = [];
  let server = { ...SERVER_DEFAULT };
  jest.mocked(api.patch).mockImplementation(
    (_url: string, body?: unknown) =>
      new Promise((resolve, reject) => {
        calls.push({
          body: body as Record<string, boolean>,
          respond: () => {
            server = { ...server, ...(body as Partial<ServerState>) };
            resolve({ data: { ...server } });
          },
          fail: () => reject({ isAxiosError: true, message: 'Network Error' }),
        });
      }),
  );
  return calls;
}

async function renderLoaded() {
  jest.mocked(api.get).mockResolvedValue({ data: { ...SERVER_DEFAULT } });
  const view = renderHook(() => useNotificationPreferences());
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  return view;
}

/** Vykoná zmenu voľby v rámci `act` a vráti sľub s jej výsledkom (bez čakania na dokončenie zápisu). */
function change(
  view: Awaited<ReturnType<typeof renderLoaded>>,
  key: Parameters<ReturnType<typeof useNotificationPreferences>['updatePreference']>[0],
  value: boolean,
  options?: Parameters<ReturnType<typeof useNotificationPreferences>['updatePreference']>[2],
): Promise<boolean> {
  let outcome!: Promise<boolean>;
  act(() => {
    outcome = view.result.current.updatePreference(key, value, options);
  });
  return outcome;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('useNotificationPreferences: zápisy tej istej voľby sa serializujú', () => {
  it('druhá zmena tej istej voľby sa neodošle súbežne, ale až po dokončení prvej', async () => {
    const calls = mockManualPatch();
    const view = await renderLoaded();

    void change(view, 'notifyLikes', false);
    void change(view, 'notifyLikes', true);

    // Zobrazená je najnovšia hodnota, no na server zatiaľ odišla len prvá zmena.
    expect(view.result.current.preferences.notifyLikes).toBe(true);
    expect(view.result.current.isSaving('notifyLikes')).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].body).toEqual({ notify_likes: false });

    await act(async () => {
      calls[0].respond();
    });

    expect(calls).toHaveLength(2);
    expect(calls[1].body).toEqual({ notify_likes: true });
    expect(view.result.current.preferences.notifyLikes).toBe(true);
    expect(view.result.current.isSaving('notifyLikes')).toBe(true);

    await act(async () => {
      calls[1].respond();
    });

    expect(view.result.current.preferences.notifyLikes).toBe(true);
    expect(view.result.current.isSaving('notifyLikes')).toBe(false);
    expect(calls).toHaveLength(2);
  });

  it('prvý zápis uspeje a druhý zlyhá: obrazovka sa vráti na hodnotu uloženú na serveri, nie na pôvodnú', async () => {
    const calls = mockManualPatch();
    const view = await renderLoaded();
    const onError = jest.fn();

    void change(view, 'notifyLikes', false);
    void change(view, 'notifyLikes', true, { onError });
    await act(async () => {
      calls[0].respond();
    });
    expect(calls).toHaveLength(2);
    await act(async () => {
      calls[1].fail();
    });

    // Server má po prvom zápise `false`; návrat na pôvodné `true` by obrazovku rozišiel s uloženým stavom.
    expect(view.result.current.preferences.notifyLikes).toBe(false);
    expect(view.result.current.isSaving('notifyLikes')).toBe(false);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith('Nastavenia upozornení sa nepodarilo uložiť.');
  });

  it('po úspešnom prvom zápise a zlyhanom druhom ostáva potvrdená hodnota aj pre ďalšiu zmenu (nie je to no-op voči zobrazenej)', async () => {
    const calls = mockManualPatch();
    const view = await renderLoaded();

    void change(view, 'notifyLikes', false);
    void change(view, 'notifyLikes', true);
    await act(async () => {
      calls[0].respond();
    });
    await act(async () => {
      calls[1].fail();
    });
    expect(view.result.current.preferences.notifyLikes).toBe(false);

    // Zmena späť na `true` sa teraz musí odoslať: server má `false`.
    void change(view, 'notifyLikes', true);

    expect(calls).toHaveLength(3);
    expect(calls[2].body).toEqual({ notify_likes: true });
  });

  it('prvý zápis zlyhá a používateľ medzitým vrátil pôvodnú hodnotu: nič sa neodošle a chyba sa nehlási', async () => {
    const calls = mockManualPatch();
    const view = await renderLoaded();
    const onError = jest.fn();

    void change(view, 'notifyLikes', false, { onError });
    void change(view, 'notifyLikes', true);
    await act(async () => {
      calls[0].fail();
    });

    // Server má stále pôvodné `true`, čo je presne to, čo používateľ chcel: čakajúca zmena je zbytočná.
    expect(calls).toHaveLength(1);
    expect(view.result.current.preferences.notifyLikes).toBe(true);
    expect(view.result.current.isSaving('notifyLikes')).toBe(false);
    expect(onError).not.toHaveBeenCalled();
  });

  it('tri rýchle zmeny (false, true, false): odošle sa len prvá a ostatné sa zlúčia, lebo server už má poslednú hodnotu', async () => {
    const calls = mockManualPatch();
    const view = await renderLoaded();

    const first = change(view, 'notifyLikes', false);
    const second = change(view, 'notifyLikes', true);
    const third = change(view, 'notifyLikes', false);
    expect(calls).toHaveLength(1);
    await act(async () => {
      calls[0].respond();
    });

    expect(calls).toHaveLength(1);
    expect(view.result.current.preferences.notifyLikes).toBe(false);
    expect(view.result.current.isSaving('notifyLikes')).toBe(false);
    // Výsledok: prvý a posledný zápis sú uložené, nahradená prostredná zmena sa neodoslala.
    await expect(first).resolves.toBe(true);
    await expect(second).resolves.toBe(false);
    await expect(third).resolves.toBe(true);
  });

  it('prvý zápis zlyhá pri čakajúcej odlišnej zmene: odošle sa posledný úmysel používateľa a chyba prvého sa nehlási', async () => {
    const calls = mockManualPatch();
    const view = await renderLoaded();
    const onError = jest.fn();

    void change(view, 'notifyLikes', false, { onError });
    void change(view, 'notifyLikes', true);
    void change(view, 'notifyLikes', false);
    await act(async () => {
      calls[0].fail();
    });

    // Prostredná zmena sa preskočí a odošle sa posledná (`false`); zobrazená hodnota sa počas toho nemení.
    expect(calls).toHaveLength(2);
    expect(calls[1].body).toEqual({ notify_likes: false });
    expect(view.result.current.preferences.notifyLikes).toBe(false);
    expect(onError).not.toHaveBeenCalled();

    await act(async () => {
      calls[1].respond();
    });

    expect(view.result.current.preferences.notifyLikes).toBe(false);
    expect(view.result.current.isSaving('notifyLikes')).toBe(false);
    expect(onError).not.toHaveBeenCalled();
  });

  it('rovnaká zmena, ktorá už čaká vo fronte, sa nezaradí znova a vráti ten istý výsledok', async () => {
    const calls = mockManualPatch();
    const view = await renderLoaded();

    void change(view, 'notifyLikes', false);
    const queued = change(view, 'notifyLikes', true);
    const duplicate = change(view, 'notifyLikes', true);
    await act(async () => {
      calls[0].respond();
    });
    await act(async () => {
      calls[1].respond();
    });

    expect(calls).toHaveLength(2);
    await expect(queued).resolves.toBe(true);
    await expect(duplicate).resolves.toBe(true);
  });

  it('zmeny rôznych volieb sa nezdržiavajú: každá ide hneď vlastným PATCH', async () => {
    const calls = mockManualPatch();
    const view = await renderLoaded();

    void change(view, 'notifyLikes', false);
    void change(view, 'notifyComments', false);
    void change(view, 'inAppNotifications', false);

    expect(calls.map((call) => call.body)).toEqual([
      { notify_likes: false },
      { notify_comments: false },
      { in_app_notifications: false },
    ]);
  });

  it('zlyhanie zápisu jednej voľby nezdrží ani nevráti frontu inej voľby', async () => {
    const calls = mockManualPatch();
    const view = await renderLoaded();

    void change(view, 'notifyLikes', false);
    void change(view, 'notifyLikes', true);
    void change(view, 'notifyComments', false);
    await act(async () => {
      calls[1].respond();
    });
    await act(async () => {
      calls[0].fail();
    });

    expect(view.result.current.preferences.notifyComments).toBe(false);
    expect(view.result.current.preferences.notifyLikes).toBe(true);
  });
});
