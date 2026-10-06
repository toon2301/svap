/**
 * Partner a skupina otvorenej konverzácie pre hornú lištu mobilných Správ.
 *
 * Hook drží stav `mobileMessagePeer` / `mobileMessageGroup` a dopĺňa ho efektom:
 * mimo modulu Správy ho vynuluje, pri cieľovom používateľovi (`?targetUserId`)
 * otvorí konverzáciu s ním, inak podľa ID konverzácie hľadá v zozname konverzácií
 * a potom v žiadostiach o správu. Odpoveď, ktorá príde po zmene vstupov alebo po
 * odchode zo Správ, sa zahodí.
 */

import { act, renderHook, type RenderHookResult } from '@testing-library/react';
import type { ConversationListItem, MessagingUserBrief } from '../../modules/messages/types';
import { useMobileMessagePeer } from '../useMobileMessagePeer';

const mockOpenConversation = jest.fn();
const mockListConversations = jest.fn();
const mockListMessageRequests = jest.fn();
jest.mock('../../modules/messages/messagingApi', () => ({
  openConversation: (...args: unknown[]) => mockOpenConversation(...args),
  listConversations: (...args: unknown[]) => mockListConversations(...args),
  listMessageRequests: (...args: unknown[]) => mockListMessageRequests(...args),
}));

type HookInput = Parameters<typeof useMobileMessagePeer>[0];
type Mounted = RenderHookResult<ReturnType<typeof useMobileMessagePeer>, HookInput>;

const FALLBACK_GROUP_NAME = 'messages.unknownGroup=Skupina';
const translate = jest.fn((key: string, fallback?: string) => `${key}=${fallback}`);

const anna = (over: Partial<MessagingUserBrief> = {}): MessagingUserBrief => ({
  id: 42,
  display_name: 'Anna Nováková',
  slug: 'anna',
  avatar_url: 'https://cdn.example/anna.png',
  ...over,
});

const boris = (over: Partial<MessagingUserBrief> = {}): MessagingUserBrief => ({
  id: 43,
  display_name: 'Boris Kováč',
  slug: 'boris',
  avatar_url: 'https://cdn.example/boris.png',
  ...over,
});

const conversation = (over: Partial<ConversationListItem> = {}): ConversationListItem => ({
  id: 7,
  other_user: anna(),
  last_message_preview: null,
  last_message_at: null,
  last_read_at: null,
  has_unread: false,
  updated_at: '2024-01-01T00:00:00Z',
  ...over,
});

const group = (over: Partial<ConversationListItem> = {}): ConversationListItem =>
  conversation({
    id: 9,
    other_user: null,
    is_group: true,
    name: 'Kolegovia',
    avatar_members: [anna(), boris()],
    ...over,
  });

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function makeInput(overrides: Partial<HookInput> = {}): HookInput {
  return {
    activeModule: 'messages',
    selectedConversationId: null,
    targetUserIdFromMessagesQuery: null,
    t: translate,
    ...overrides,
  };
}

/** Načítanie je reťaz viacerých `await`ov: celé musí prebehnúť vnútri `act`. */
const settle = (action?: () => void) =>
  act(async () => {
    action?.();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });

async function mountHook(overrides: Partial<HookInput> = {}): Promise<Mounted> {
  let mounted!: Mounted;
  await settle(() => {
    mounted = renderHook((props: HookInput) => useMobileMessagePeer(props), {
      initialProps: makeInput(overrides),
    });
  });
  return mounted;
}

/** Nové vstupy sú vždy úplné: predvolené hodnoty plus `overrides`. */
const update = (mounted: Mounted, overrides: Partial<HookInput>) =>
  settle(() => mounted.rerender(makeInput(overrides)));

const peerOf = (mounted: Mounted) => mounted.result.current.mobileMessagePeer;
const groupOf = (mounted: Mounted) => mounted.result.current.mobileMessageGroup;

beforeEach(() => {
  mockOpenConversation.mockReset().mockReturnValue(new Promise(() => {}));
  mockListConversations.mockReset().mockReturnValue(new Promise(() => {}));
  mockListMessageRequests.mockReset().mockReturnValue(new Promise(() => {}));
  translate.mockClear();
});

describe('východiskový stav', () => {
  it('bez konverzácie nie je ani partner, ani skupina a API sa nevolá', async () => {
    const mounted = await mountHook();

    expect(peerOf(mounted)).toBeNull();
    expect(groupOf(mounted)).toBeNull();
    expect(mockOpenConversation).not.toHaveBeenCalled();
    expect(mockListConversations).not.toHaveBeenCalled();
    expect(mockListMessageRequests).not.toHaveBeenCalled();
  });

  it('vracia presne partnera a skupinu', async () => {
    const mounted = await mountHook();

    expect(Object.keys(mounted.result.current).sort()).toEqual([
      'mobileMessageGroup',
      'mobileMessagePeer',
    ]);
  });
});

describe('mimo modulu Správy', () => {
  it.each([
    'home',
    'profile',
    'user-profile',
    'search',
    'settings',
    'notifications',
    'requests',
    '',
    'Messages',
    'messages ',
  ])(
    'modul „%s“: API sa nevolá, ani keď je v adrese konverzácia aj cieľový používateľ',
    async (activeModule) => {
      const mounted = await mountHook({
        activeModule,
        selectedConversationId: 7,
        targetUserIdFromMessagesQuery: 42,
      });

      expect(mockOpenConversation).not.toHaveBeenCalled();
      expect(mockListConversations).not.toHaveBeenCalled();
      expect(mockListMessageRequests).not.toHaveBeenCalled();
      expect(peerOf(mounted)).toBeNull();
      expect(groupOf(mounted)).toBeNull();
    },
  );

  it('odchod zo Správ zruší načítaného partnera', async () => {
    mockOpenConversation.mockResolvedValue(conversation({ other_user: anna() }));
    const mounted = await mountHook({ targetUserIdFromMessagesQuery: 42 });
    expect(peerOf(mounted)).toEqual(anna());

    await update(mounted, { activeModule: 'home', targetUserIdFromMessagesQuery: 42 });

    expect(peerOf(mounted)).toBeNull();
    expect(groupOf(mounted)).toBeNull();
    expect(mockOpenConversation).toHaveBeenCalledTimes(1);
  });

  it('odchod zo Správ zruší aj načítanú skupinu', async () => {
    mockListConversations.mockResolvedValue([group()]);
    const mounted = await mountHook({ selectedConversationId: 9 });
    expect(groupOf(mounted)?.name).toBe('Kolegovia');

    await update(mounted, { activeModule: 'home', selectedConversationId: 9 });

    expect(peerOf(mounted)).toBeNull();
    expect(groupOf(mounted)).toBeNull();
    expect(mockListConversations).toHaveBeenCalledTimes(1);
  });

  it('neskorá odpoveď otvorenia po odchode zo Správ partnera nevráti', async () => {
    const opening = deferred<ConversationListItem>();
    mockOpenConversation.mockReturnValue(opening.promise);
    const mounted = await mountHook({ targetUserIdFromMessagesQuery: 42 });

    await update(mounted, { activeModule: 'home', targetUserIdFromMessagesQuery: 42 });
    await settle(() => opening.resolve(conversation({ other_user: anna() })));

    expect(peerOf(mounted)).toBeNull();
    expect(groupOf(mounted)).toBeNull();
  });

  it('neskorá odpoveď zoznamu po odchode zo Správ skupinu nevráti a žiadosti sa nevolajú', async () => {
    const listing = deferred<ConversationListItem[]>();
    mockListConversations.mockReturnValue(listing.promise);
    const mounted = await mountHook({ selectedConversationId: 9 });

    await update(mounted, { activeModule: 'home', selectedConversationId: 9 });
    await settle(() => listing.resolve([group()]));

    expect(peerOf(mounted)).toBeNull();
    expect(groupOf(mounted)).toBeNull();
    expect(mockListMessageRequests).not.toHaveBeenCalled();
  });

  it('návrat do Správ načíta partnera znova', async () => {
    mockOpenConversation.mockResolvedValue(conversation({ other_user: anna() }));
    const mounted = await mountHook({ targetUserIdFromMessagesQuery: 42 });

    await update(mounted, { activeModule: 'home', targetUserIdFromMessagesQuery: 42 });
    expect(peerOf(mounted)).toBeNull();

    await update(mounted, { activeModule: 'messages', targetUserIdFromMessagesQuery: 42 });

    expect(mockOpenConversation).toHaveBeenCalledTimes(2);
    expect(peerOf(mounted)).toEqual(anna());
  });
});

describe('partner z cieľového používateľa (?targetUserId)', () => {
  it('kým sa konverzácia neotvorí, nič neukáže; potom partner z other_user a žiadna skupina', async () => {
    const opening = deferred<ConversationListItem>();
    mockOpenConversation.mockReturnValue(opening.promise);

    const mounted = await mountHook({ targetUserIdFromMessagesQuery: 42 });

    expect(mockOpenConversation).toHaveBeenCalledTimes(1);
    expect(mockOpenConversation).toHaveBeenCalledWith(42);
    expect(mockListConversations).not.toHaveBeenCalled();
    expect(mockListMessageRequests).not.toHaveBeenCalled();
    expect(peerOf(mounted)).toBeNull();
    expect(groupOf(mounted)).toBeNull();

    await settle(() => opening.resolve(conversation({ other_user: anna() })));

    expect(peerOf(mounted)).toEqual(anna());
    expect(groupOf(mounted)).toBeNull();
  });

  it.each([[null], [undefined]])(
    'otvorená konverzácia s other_user %s nemá partnera',
    async (otherUser) => {
      mockOpenConversation.mockResolvedValue({ ...conversation(), other_user: otherUser });

      const mounted = await mountHook({ targetUserIdFromMessagesQuery: 42 });

      expect(mockOpenConversation).toHaveBeenCalledTimes(1);
      expect(peerOf(mounted)).toBeNull();
      expect(groupOf(mounted)).toBeNull();
    },
  );

  it('berie sa len other_user: skupinové polia výsledku sa ignorujú', async () => {
    mockOpenConversation.mockResolvedValue(group({ other_user: anna() }));

    const mounted = await mountHook({ targetUserIdFromMessagesQuery: 42 });

    expect(peerOf(mounted)).toEqual(anna());
    expect(groupOf(mounted)).toBeNull();
  });

  it('zlyhanie otvorenia nechá partnera aj skupinu prázdne', async () => {
    mockOpenConversation.mockRejectedValue(new Error('sieť'));

    const mounted = await mountHook({ targetUserIdFromMessagesQuery: 42 });

    expect(mockOpenConversation).toHaveBeenCalledTimes(1);
    expect(peerOf(mounted)).toBeNull();
    expect(groupOf(mounted)).toBeNull();
  });

  it('zlyhanie otvorenia zruší predošlého partnera', async () => {
    mockOpenConversation
      .mockResolvedValueOnce(conversation({ other_user: anna() }))
      .mockRejectedValueOnce(new Error('sieť'));
    const mounted = await mountHook({ targetUserIdFromMessagesQuery: 42 });
    expect(peerOf(mounted)).toEqual(anna());

    await update(mounted, { targetUserIdFromMessagesQuery: 43 });

    expect(mockOpenConversation).toHaveBeenCalledTimes(2);
    expect(peerOf(mounted)).toBeNull();
    expect(groupOf(mounted)).toBeNull();
  });

  it('zlyhanie otvorenia zruší predošlú skupinu', async () => {
    mockListConversations.mockResolvedValue([group()]);
    mockOpenConversation.mockRejectedValue(new Error('sieť'));
    const mounted = await mountHook({ selectedConversationId: 9 });
    expect(groupOf(mounted)).not.toBeNull();

    await update(mounted, { targetUserIdFromMessagesQuery: 43 });

    expect(peerOf(mounted)).toBeNull();
    expect(groupOf(mounted)).toBeNull();
  });

  it('úspešné otvorenie nahradí predošlú skupinu partnerom', async () => {
    mockListConversations.mockResolvedValue([group()]);
    mockOpenConversation.mockResolvedValue(conversation({ other_user: boris() }));
    const mounted = await mountHook({ selectedConversationId: 9 });
    expect(groupOf(mounted)).not.toBeNull();

    await update(mounted, { targetUserIdFromMessagesQuery: 43 });

    expect(peerOf(mounted)).toEqual(boris());
    expect(groupOf(mounted)).toBeNull();
  });

  it('zmena cieľa otvorí konverzáciu s novým používateľom', async () => {
    mockOpenConversation
      .mockResolvedValueOnce(conversation({ other_user: anna() }))
      .mockResolvedValueOnce(conversation({ other_user: boris() }));
    const mounted = await mountHook({ targetUserIdFromMessagesQuery: 42 });
    expect(peerOf(mounted)).toEqual(anna());

    await update(mounted, { targetUserIdFromMessagesQuery: 43 });

    expect(mockOpenConversation).toHaveBeenNthCalledWith(1, 42);
    expect(mockOpenConversation).toHaveBeenNthCalledWith(2, 43);
    expect(peerOf(mounted)).toEqual(boris());
  });

  it('cieľový používateľ má prednosť pred ID konverzácie', async () => {
    mockOpenConversation.mockResolvedValue(conversation({ other_user: boris() }));

    const mounted = await mountHook({
      targetUserIdFromMessagesQuery: 43,
      selectedConversationId: 7,
    });

    expect(mockOpenConversation).toHaveBeenCalledWith(43);
    expect(mockListConversations).not.toHaveBeenCalled();
    expect(mockListMessageRequests).not.toHaveBeenCalled();
    expect(peerOf(mounted)).toEqual(boris());
  });

  it('ID 0 je hodnota (kontrola je na null, nie na pravdivosť)', async () => {
    mockOpenConversation.mockResolvedValue(conversation({ other_user: anna() }));

    await mountHook({ targetUserIdFromMessagesQuery: 0 });

    expect(mockOpenConversation).toHaveBeenCalledTimes(1);
    expect(mockOpenConversation).toHaveBeenCalledWith(0);
  });

  it.each([[NaN], [Infinity], [-Infinity]])(
    'neplatný cieľ %s sa ignoruje a ide sa podľa ID konverzácie',
    async (target) => {
      mockListConversations.mockResolvedValue([conversation({ id: 7, other_user: boris() })]);

      const mounted = await mountHook({
        targetUserIdFromMessagesQuery: target,
        selectedConversationId: 7,
      });

      expect(mockOpenConversation).not.toHaveBeenCalled();
      expect(mockListConversations).toHaveBeenCalledTimes(1);
      expect(peerOf(mounted)).toEqual(boris());
    },
  );

  it.each([[NaN], [Infinity], [-Infinity]])(
    'neplatný cieľ %s bez ID konverzácie: API sa nevolá a nič sa neukáže',
    async (target) => {
      const mounted = await mountHook({ targetUserIdFromMessagesQuery: target });

      expect(mockOpenConversation).not.toHaveBeenCalled();
      expect(mockListConversations).not.toHaveBeenCalled();
      expect(mockListMessageRequests).not.toHaveBeenCalled();
      expect(peerOf(mounted)).toBeNull();
      expect(groupOf(mounted)).toBeNull();
    },
  );

  it('po zmene cieľa sa stará úspešná odpoveď zahodí', async () => {
    const first = deferred<ConversationListItem>();
    const second = deferred<ConversationListItem>();
    mockOpenConversation.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const mounted = await mountHook({ targetUserIdFromMessagesQuery: 42 });
    await update(mounted, { targetUserIdFromMessagesQuery: 43 });

    await settle(() => second.resolve(conversation({ other_user: boris() })));
    expect(peerOf(mounted)).toEqual(boris());

    await settle(() => first.resolve(conversation({ other_user: anna() })));
    expect(peerOf(mounted)).toEqual(boris());
    expect(groupOf(mounted)).toBeNull();
  });

  it('stará odpoveď, ktorá príde skôr ako nová, sa zahodí tiež', async () => {
    const first = deferred<ConversationListItem>();
    const second = deferred<ConversationListItem>();
    mockOpenConversation.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const mounted = await mountHook({ targetUserIdFromMessagesQuery: 42 });
    await update(mounted, { targetUserIdFromMessagesQuery: 43 });

    await settle(() => first.resolve(conversation({ other_user: anna() })));
    expect(peerOf(mounted)).toBeNull();

    await settle(() => second.resolve(conversation({ other_user: boris() })));
    expect(peerOf(mounted)).toEqual(boris());
  });

  it('po zmene cieľa sa zlyhanie starého otvorenia zahodí', async () => {
    const first = deferred<ConversationListItem>();
    const second = deferred<ConversationListItem>();
    mockOpenConversation.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const mounted = await mountHook({ targetUserIdFromMessagesQuery: 42 });
    await update(mounted, { targetUserIdFromMessagesQuery: 43 });
    await settle(() => second.resolve(conversation({ other_user: boris() })));
    expect(peerOf(mounted)).toEqual(boris());

    await settle(() => first.reject(new Error('sieť')));

    expect(peerOf(mounted)).toEqual(boris());
    expect(groupOf(mounted)).toBeNull();
  });

  it('neskorá odpoveď zoznamu pre starú konverzáciu sa po prechode na cieľového používateľa zahodí', async () => {
    const listing = deferred<ConversationListItem[]>();
    mockListConversations.mockReturnValue(listing.promise);
    mockOpenConversation.mockResolvedValue(conversation({ other_user: boris() }));
    const mounted = await mountHook({ selectedConversationId: 7 });

    await update(mounted, { targetUserIdFromMessagesQuery: 43 });
    expect(peerOf(mounted)).toEqual(boris());

    await settle(() => listing.resolve([conversation({ id: 7, other_user: anna() })]));

    expect(peerOf(mounted)).toEqual(boris());
    expect(groupOf(mounted)).toBeNull();
  });
});

describe('partner z ID konverzácie', () => {
  it('nájde ho v zozname konverzácií a žiadosti nevolá', async () => {
    mockListConversations.mockResolvedValue([
      conversation({ id: 6, other_user: boris() }),
      conversation({ id: 7, other_user: anna() }),
    ]);

    const mounted = await mountHook({ selectedConversationId: 7 });

    expect(mockListConversations).toHaveBeenCalledTimes(1);
    expect(mockListConversations).toHaveBeenCalledWith();
    expect(mockListMessageRequests).not.toHaveBeenCalled();
    expect(mockOpenConversation).not.toHaveBeenCalled();
    expect(peerOf(mounted)).toEqual(anna());
    expect(groupOf(mounted)).toBeNull();
  });

  it('keď v zozname nie je, nájde ho medzi žiadosťami o správu', async () => {
    mockListConversations.mockResolvedValue([conversation({ id: 6, other_user: boris() })]);
    mockListMessageRequests.mockResolvedValue([conversation({ id: 7, other_user: anna() })]);

    const mounted = await mountHook({ selectedConversationId: 7 });

    expect(mockListConversations).toHaveBeenCalledTimes(1);
    expect(mockListMessageRequests).toHaveBeenCalledTimes(1);
    expect(mockListMessageRequests).toHaveBeenCalledWith();
    expect(peerOf(mounted)).toEqual(anna());
    expect(groupOf(mounted)).toBeNull();
  });

  it('konverzáciu, ktorú nenájde nikde, ukáže bez partnera aj skupiny', async () => {
    mockListConversations.mockResolvedValue([conversation({ id: 6, other_user: boris() })]);
    mockListMessageRequests.mockResolvedValue([conversation({ id: 8, other_user: boris() })]);

    const mounted = await mountHook({ selectedConversationId: 7 });

    expect(mockListConversations).toHaveBeenCalledTimes(1);
    expect(mockListMessageRequests).toHaveBeenCalledTimes(1);
    expect(peerOf(mounted)).toBeNull();
    expect(groupOf(mounted)).toBeNull();
  });

  it('konverzáciu nenájdenú nikde ukáže bez partnera aj vtedy, keď bol predtým načítaný iný', async () => {
    mockListConversations.mockResolvedValue([conversation({ id: 6, other_user: anna() })]);
    mockListMessageRequests.mockResolvedValue([]);
    const mounted = await mountHook({ selectedConversationId: 6 });
    expect(peerOf(mounted)).toEqual(anna());

    await update(mounted, { selectedConversationId: 7 });

    expect(peerOf(mounted)).toBeNull();
    expect(groupOf(mounted)).toBeNull();
  });

  it.each([[null], [undefined]])(
    'nájdená konverzácia s other_user %s zruší predošlého partnera',
    async (otherUser) => {
      mockListConversations.mockResolvedValue([
        conversation({ id: 7, other_user: anna() }),
        { ...conversation({ id: 8 }), other_user: otherUser },
      ]);
      const mounted = await mountHook({ selectedConversationId: 7 });
      expect(peerOf(mounted)).toEqual(anna());

      await update(mounted, { selectedConversationId: 8 });

      expect(peerOf(mounted)).toBeNull();
      expect(groupOf(mounted)).toBeNull();
    },
  );

  it('konverzácia s is_group: false je jednotlivec', async () => {
    mockListConversations.mockResolvedValue([
      conversation({ id: 7, other_user: anna(), is_group: false, name: 'Ignorovaný názov' }),
    ]);

    const mounted = await mountHook({ selectedConversationId: 7 });

    expect(peerOf(mounted)).toEqual(anna());
    expect(groupOf(mounted)).toBeNull();
  });

  it('zmena ID konverzácie načíta novú konverzáciu', async () => {
    mockListConversations.mockResolvedValue([
      conversation({ id: 7, other_user: anna() }),
      conversation({ id: 8, other_user: boris() }),
    ]);
    const mounted = await mountHook({ selectedConversationId: 7 });
    expect(peerOf(mounted)).toEqual(anna());

    await update(mounted, { selectedConversationId: 8 });

    expect(mockListConversations).toHaveBeenCalledTimes(2);
    expect(peerOf(mounted)).toEqual(boris());
  });

  it('bez ID konverzácie nevolá API a nič neukáže', async () => {
    const mounted = await mountHook({ selectedConversationId: null });

    expect(mockListConversations).not.toHaveBeenCalled();
    expect(mockListMessageRequests).not.toHaveBeenCalled();
    expect(mockOpenConversation).not.toHaveBeenCalled();
    expect(peerOf(mounted)).toBeNull();
    expect(groupOf(mounted)).toBeNull();
  });

  it.each([[NaN], [Infinity], [-Infinity]])(
    'neplatné ID konverzácie %s: API sa nevolá a nič sa neukáže',
    async (conversationId) => {
      const mounted = await mountHook({ selectedConversationId: conversationId });

      expect(mockListConversations).not.toHaveBeenCalled();
      expect(mockListMessageRequests).not.toHaveBeenCalled();
      expect(peerOf(mounted)).toBeNull();
      expect(groupOf(mounted)).toBeNull();
    },
  );

  it('návrat na zoznam Správ (bez konverzácie) zruší partnera a API nevolá znova', async () => {
    mockListConversations.mockResolvedValue([conversation({ id: 7, other_user: anna() })]);
    const mounted = await mountHook({ selectedConversationId: 7 });
    expect(peerOf(mounted)).toEqual(anna());

    await update(mounted, { selectedConversationId: null });

    expect(peerOf(mounted)).toBeNull();
    expect(groupOf(mounted)).toBeNull();
    expect(mockListConversations).toHaveBeenCalledTimes(1);
  });

  it('návrat na zoznam Správ (bez konverzácie) zruší skupinu a API nevolá znova', async () => {
    mockListConversations.mockResolvedValue([group()]);
    const mounted = await mountHook({ selectedConversationId: 9 });
    expect(groupOf(mounted)).not.toBeNull();

    await update(mounted, { selectedConversationId: null });

    expect(peerOf(mounted)).toBeNull();
    expect(groupOf(mounted)).toBeNull();
    expect(mockListConversations).toHaveBeenCalledTimes(1);
  });

  it('prechod na cieľového používateľa z ID konverzácie vymení partnera', async () => {
    mockListConversations.mockResolvedValue([conversation({ id: 7, other_user: anna() })]);
    mockOpenConversation.mockResolvedValue(conversation({ other_user: boris() }));
    const mounted = await mountHook({ selectedConversationId: 7 });
    expect(peerOf(mounted)).toEqual(anna());

    await update(mounted, { selectedConversationId: 7, targetUserIdFromMessagesQuery: 43 });

    expect(peerOf(mounted)).toEqual(boris());
    expect(groupOf(mounted)).toBeNull();
  });
});

describe('skupinová konverzácia', () => {
  it('ukáže názov skupiny a jej členov, partner je prázdny', async () => {
    mockListConversations.mockResolvedValue([group()]);

    const mounted = await mountHook({ selectedConversationId: 9 });

    expect(peerOf(mounted)).toBeNull();
    expect(groupOf(mounted)).toEqual({ name: 'Kolegovia', avatarMembers: [anna(), boris()] });
    expect(translate).not.toHaveBeenCalled();
  });

  it.each<[string, string | null | undefined, string]>([
    ['názov sa berie tak, ako je', 'Kolegovia', 'Kolegovia'],
    ['názov sa orezáva o medzery', '  Kolegovia  ', 'Kolegovia'],
    ['prázdny názov má preklad „Skupina“', '', FALLBACK_GROUP_NAME],
    ['názov z medzier má preklad „Skupina“', '   ', FALLBACK_GROUP_NAME],
    ['chýbajúci názov má preklad „Skupina“', undefined, FALLBACK_GROUP_NAME],
    ['názov null má preklad „Skupina“', null, FALLBACK_GROUP_NAME],
  ])('%s', async (_title, name, expectedName) => {
    mockListConversations.mockResolvedValue([{ ...group(), name }]);

    const mounted = await mountHook({ selectedConversationId: 9 });

    expect(groupOf(mounted)?.name).toBe(expectedName);
  });

  it('náhradný názov si pýta preklad s kľúčom messages.unknownGroup a textom „Skupina“', async () => {
    mockListConversations.mockResolvedValue([group({ name: '' })]);

    await mountHook({ selectedConversationId: 9 });

    expect(translate).toHaveBeenCalledTimes(1);
    expect(translate).toHaveBeenCalledWith('messages.unknownGroup', 'Skupina');
  });

  it.each([[undefined], [[]]])(
    'skupina so zoznamom členov %p má prázdny zoznam členov',
    async (avatarMembers) => {
      mockListConversations.mockResolvedValue([{ ...group(), avatar_members: avatarMembers }]);

      const mounted = await mountHook({ selectedConversationId: 9 });

      expect(groupOf(mounted)).toEqual({ name: 'Kolegovia', avatarMembers: [] });
    },
  );

  it('skupina ignoruje other_user (partner ostáva prázdny)', async () => {
    mockListConversations.mockResolvedValue([group({ other_user: anna() })]);

    const mounted = await mountHook({ selectedConversationId: 9 });

    expect(peerOf(mounted)).toBeNull();
    expect(groupOf(mounted)?.name).toBe('Kolegovia');
  });

  it('skupinu nájde aj medzi žiadosťami o správu', async () => {
    mockListConversations.mockResolvedValue([conversation({ id: 6, other_user: boris() })]);
    mockListMessageRequests.mockResolvedValue([group({ name: 'Žiadosť o skupinu' })]);

    const mounted = await mountHook({ selectedConversationId: 9 });

    expect(mockListMessageRequests).toHaveBeenCalledTimes(1);
    expect(peerOf(mounted)).toBeNull();
    expect(groupOf(mounted)).toEqual({
      name: 'Žiadosť o skupinu',
      avatarMembers: [anna(), boris()],
    });
  });

  it('prechod zo skupiny na jednotlivca skupinu zruší a naopak', async () => {
    mockListConversations.mockResolvedValue([
      group(),
      conversation({ id: 7, other_user: anna() }),
    ]);
    const mounted = await mountHook({ selectedConversationId: 9 });
    expect(groupOf(mounted)).not.toBeNull();
    expect(peerOf(mounted)).toBeNull();

    await update(mounted, { selectedConversationId: 7 });
    expect(peerOf(mounted)).toEqual(anna());
    expect(groupOf(mounted)).toBeNull();

    await update(mounted, { selectedConversationId: 9 });
    expect(peerOf(mounted)).toBeNull();
    expect(groupOf(mounted)).not.toBeNull();
  });

  it('zmena funkcie t znova načíta skupinu a prepíše jej preklad', async () => {
    mockListConversations.mockResolvedValue([group({ name: '' })]);
    const translateSk = jest.fn((key: string, fallback?: string) => `sk:${key}:${fallback}`);
    const translateEn = jest.fn((key: string, fallback?: string) => `en:${key}:${fallback}`);
    const mounted = await mountHook({ selectedConversationId: 9, t: translateSk });
    expect(groupOf(mounted)?.name).toBe('sk:messages.unknownGroup:Skupina');

    await update(mounted, { selectedConversationId: 9, t: translateEn });

    expect(mockListConversations).toHaveBeenCalledTimes(2);
    expect(groupOf(mounted)?.name).toBe('en:messages.unknownGroup:Skupina');
  });
});

describe('zlyhanie načítania konverzácie', () => {
  it.each([[new Error('sieť')], ['chyba'], [undefined], [null]])(
    'zlyhanie zoznamu (%p) nechá partnera aj skupinu prázdne a žiadosti sa nevolajú',
    async (reason) => {
      mockListConversations.mockRejectedValue(reason);

      const mounted = await mountHook({ selectedConversationId: 7 });

      expect(mockListConversations).toHaveBeenCalledTimes(1);
      expect(mockListMessageRequests).not.toHaveBeenCalled();
      expect(peerOf(mounted)).toBeNull();
      expect(groupOf(mounted)).toBeNull();
    },
  );

  it.each([[new Error('sieť')], ['chyba'], [undefined], [null]])(
    'zlyhanie žiadostí (%p) nechá partnera aj skupinu prázdne',
    async (reason) => {
      mockListConversations.mockResolvedValue([]);
      mockListMessageRequests.mockRejectedValue(reason);

      const mounted = await mountHook({ selectedConversationId: 7 });

      expect(mockListMessageRequests).toHaveBeenCalledTimes(1);
      expect(peerOf(mounted)).toBeNull();
      expect(groupOf(mounted)).toBeNull();
    },
  );

  it('zlyhanie zruší predošlého partnera', async () => {
    mockListConversations
      .mockResolvedValueOnce([conversation({ id: 7, other_user: anna() })])
      .mockRejectedValueOnce(new Error('sieť'));
    const mounted = await mountHook({ selectedConversationId: 7 });
    expect(peerOf(mounted)).toEqual(anna());

    await update(mounted, { selectedConversationId: 8 });

    expect(peerOf(mounted)).toBeNull();
    expect(groupOf(mounted)).toBeNull();
  });

  it('zlyhanie zruší predošlú skupinu', async () => {
    mockListConversations
      .mockResolvedValueOnce([group()])
      .mockRejectedValueOnce(new Error('sieť'));
    const mounted = await mountHook({ selectedConversationId: 9 });
    expect(groupOf(mounted)).not.toBeNull();

    await update(mounted, { selectedConversationId: 7 });

    expect(peerOf(mounted)).toBeNull();
    expect(groupOf(mounted)).toBeNull();
  });
});

describe('zrušené načítanie konverzácie', () => {
  it('po zmene konverzácie sa odpoveď zoznamu pre starú zahodí', async () => {
    const first = deferred<ConversationListItem[]>();
    mockListConversations
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce([conversation({ id: 8, other_user: boris() })]);
    const mounted = await mountHook({ selectedConversationId: 7 });
    await update(mounted, { selectedConversationId: 8 });
    expect(peerOf(mounted)).toEqual(boris());

    await settle(() => first.resolve([conversation({ id: 7, other_user: anna() })]));

    expect(peerOf(mounted)).toEqual(boris());
    expect(groupOf(mounted)).toBeNull();
  });

  it('po zmene konverzácie sa stará odpoveď zoznamu so skupinou zahodí', async () => {
    const first = deferred<ConversationListItem[]>();
    mockListConversations
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce([conversation({ id: 8, other_user: boris() })]);
    const mounted = await mountHook({ selectedConversationId: 9 });
    await update(mounted, { selectedConversationId: 8 });

    await settle(() => first.resolve([group()]));

    expect(peerOf(mounted)).toEqual(boris());
    expect(groupOf(mounted)).toBeNull();
  });

  it('po zmene konverzácie sa zo starej odpovede zoznamu nevolajú žiadosti', async () => {
    const first = deferred<ConversationListItem[]>();
    mockListConversations.mockReturnValueOnce(first.promise);
    const mounted = await mountHook({ selectedConversationId: 7 });
    await update(mounted, { selectedConversationId: null });

    await settle(() => first.resolve([]));

    expect(mockListMessageRequests).not.toHaveBeenCalled();
    expect(peerOf(mounted)).toBeNull();
    expect(groupOf(mounted)).toBeNull();
  });

  it('po zmene konverzácie sa odpoveď žiadostí pre starú zahodí', async () => {
    const pendingRequests = deferred<ConversationListItem[]>();
    mockListConversations
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([conversation({ id: 8, other_user: boris() })]);
    mockListMessageRequests.mockReturnValueOnce(pendingRequests.promise);
    const mounted = await mountHook({ selectedConversationId: 7 });
    expect(mockListMessageRequests).toHaveBeenCalledTimes(1);
    await update(mounted, { selectedConversationId: 8 });
    expect(peerOf(mounted)).toEqual(boris());

    await settle(() => pendingRequests.resolve([conversation({ id: 7, other_user: anna() })]));

    expect(peerOf(mounted)).toEqual(boris());
    expect(groupOf(mounted)).toBeNull();
  });

  it('po zmene konverzácie sa stará odpoveď žiadostí so skupinou zahodí', async () => {
    const pendingRequests = deferred<ConversationListItem[]>();
    mockListConversations
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([conversation({ id: 8, other_user: boris() })]);
    mockListMessageRequests.mockReturnValueOnce(pendingRequests.promise);
    const mounted = await mountHook({ selectedConversationId: 9 });
    await update(mounted, { selectedConversationId: 8 });

    await settle(() => pendingRequests.resolve([group()]));

    expect(peerOf(mounted)).toEqual(boris());
    expect(groupOf(mounted)).toBeNull();
  });

  it('po zmene konverzácie sa zlyhanie starého načítania zoznamu zahodí', async () => {
    const first = deferred<ConversationListItem[]>();
    mockListConversations
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce([conversation({ id: 8, other_user: boris() })]);
    const mounted = await mountHook({ selectedConversationId: 7 });
    await update(mounted, { selectedConversationId: 8 });
    expect(peerOf(mounted)).toEqual(boris());

    await settle(() => first.reject(new Error('sieť')));

    expect(peerOf(mounted)).toEqual(boris());
    expect(groupOf(mounted)).toBeNull();
  });

  it('po zmene konverzácie sa zlyhanie starého načítania žiadostí zahodí', async () => {
    const pendingRequests = deferred<ConversationListItem[]>();
    mockListConversations
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([conversation({ id: 8, other_user: boris() })]);
    mockListMessageRequests.mockReturnValueOnce(pendingRequests.promise);
    const mounted = await mountHook({ selectedConversationId: 7 });
    await update(mounted, { selectedConversationId: 8 });
    expect(peerOf(mounted)).toEqual(boris());

    await settle(() => pendingRequests.reject(new Error('sieť')));

    expect(peerOf(mounted)).toEqual(boris());
    expect(groupOf(mounted)).toBeNull();
  });
});

describe('rovnaké vstupy', () => {
  it('prekreslenie s rovnakými vstupmi cieľového používateľa nenačíta konverzáciu znova', async () => {
    mockOpenConversation.mockResolvedValue(conversation({ other_user: anna() }));
    const mounted = await mountHook({ targetUserIdFromMessagesQuery: 42 });

    await update(mounted, { targetUserIdFromMessagesQuery: 42 });
    await update(mounted, { targetUserIdFromMessagesQuery: 42 });

    expect(mockOpenConversation).toHaveBeenCalledTimes(1);
    expect(peerOf(mounted)).toEqual(anna());
  });

  it('prekreslenie s rovnakým ID konverzácie nenačíta zoznam znova', async () => {
    mockListConversations.mockResolvedValue([conversation({ id: 7, other_user: anna() })]);
    const mounted = await mountHook({ selectedConversationId: 7 });

    await update(mounted, { selectedConversationId: 7 });
    await update(mounted, { selectedConversationId: 7 });

    expect(mockListConversations).toHaveBeenCalledTimes(1);
    expect(peerOf(mounted)).toEqual(anna());
  });
});
