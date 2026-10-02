/**
 * Hodnoty pre mobilnú hlavičku, onboarding a rozloženie dashboardu.
 *
 * Funkcia je čistá (dostane stav, vráti hodnoty), takže sa dá overiť bez
 * vykreslenia: každá hodnota zvlášť a presné odovzdanie vstupov onboardingu.
 */

import type { User } from '@/types';
import { isMobileOnboardingBlockedByUi } from '../onboarding/mobileOnboardingScene';
import type { MessagingUserBrief } from '../modules/messages/types';
import { getDashboardRenderValues } from './dashboardRenderValues';

jest.mock('../onboarding/mobileOnboardingScene', () => {
  const actual = jest.requireActual<typeof import('../onboarding/mobileOnboardingScene')>(
    '../onboarding/mobileOnboardingScene',
  );
  return {
    ...actual,
    isMobileOnboardingBlockedByUi: jest.fn(actual.isMobileOnboardingBlockedByUi),
  };
});

const mockedBlockedByUi = isMobileOnboardingBlockedByUi as jest.Mock;

type Input = Parameters<typeof getDashboardRenderValues>[0];

const t = jest.fn((key: string, fallback?: string) => fallback ?? key);

beforeEach(() => {
  t.mockClear();
  mockedBlockedByUi.mockClear();
});

function makeUser(fields: Partial<User> = {}): User {
  return {
    id: 1,
    username: '',
    email: 'tester@example.com',
    first_name: '',
    last_name: '',
    user_type: 'individual',
    ...fields,
  } as User;
}

function makePeer(fields: Partial<MessagingUserBrief> = {}): MessagingUserBrief {
  return { id: 5, display_name: 'Peter Horváth', ...fields };
}

function compute(overrides: Partial<Input> = {}) {
  return getDashboardRenderValues({
    authUser: null,
    user: null,
    t,
    mobileMessagePeer: null,
    mobileMessageGroup: null,
    activeModule: 'home',
    activeRightItem: '',
    isRightSidebarOpen: false,
    isMobileMenuOpen: false,
    isNotificationsPanelOpen: false,
    isMobileOfferDetailOpen: false,
    selectedConversationId: null,
    targetUserIdFromMessagesQuery: null,
    ...overrides,
  });
}

describe('názov účtu v mobilnej hlavičke', () => {
  it('meno a priezvisko sa spoja medzerou', () => {
    const authUser = makeUser({ first_name: 'Jana', last_name: 'Nováková' });
    expect(compute({ authUser }).mobileAccountName).toBe('Jana Nováková');
  });

  const PARTIAL_NAMES: Array<[string, Partial<User>, string]> = [
    ['len meno', { first_name: 'Jana', last_name: '' }, 'Jana'],
    ['len priezvisko', { first_name: '', last_name: 'Nováková' }, 'Nováková'],
    ['medzery okolo mena sa orežú', { first_name: '  Jana ', last_name: '' }, 'Jana'],
  ];

  it.each(PARTIAL_NAMES)('%s', (_title, fields, expected) => {
    expect(compute({ authUser: makeUser(fields) }).mobileAccountName).toBe(expected);
  });

  it('bez mena sa použije názov firmy (orezaný)', () => {
    const authUser = makeUser({ company_name: '  Firma s.r.o. ', username: 'firma' });
    expect(compute({ authUser }).mobileAccountName).toBe('Firma s.r.o.');
  });

  it('bez mena a firmy sa použije používateľské meno (orezané)', () => {
    const authUser = makeUser({ username: '  jana_n ' });
    expect(compute({ authUser }).mobileAccountName).toBe('jana_n');
  });

  it('medzery namiesto mena sa berú ako prázdne a ide sa na ďalší zdroj', () => {
    const authUser = makeUser({ first_name: '   ', last_name: '', company_name: 'Firma' });
    expect(compute({ authUser }).mobileAccountName).toBe('Firma');
  });

  it('bez ničoho sa použije preklad s predvoleným textom "Profil"', () => {
    expect(compute({ authUser: makeUser() }).mobileAccountName).toBe('Profil');
    expect(t).toHaveBeenCalledWith('navigation.profile', 'Profil');
  });

  it('bez účtu vôbec (authUser aj user chýbajú) tiež "Profil"', () => {
    expect(compute().mobileAccountName).toBe('Profil');
  });

  it('authUser má prednosť pred user', () => {
    const authUser = makeUser({ first_name: 'Jana' });
    const user = makeUser({ first_name: 'Peter' });
    expect(compute({ authUser, user }).mobileAccountName).toBe('Jana');
  });

  it('bez authUser (počas štartu) sa použije user', () => {
    const user = makeUser({ first_name: 'Peter' });
    expect(compute({ authUser: null, user }).mobileAccountName).toBe('Peter');
  });

  it('authUser bez mena sa nenahrádza user-om (náhrada je len pri chýbajúcom authUser)', () => {
    const user = makeUser({ first_name: 'Peter' });
    expect(compute({ authUser: makeUser(), user }).mobileAccountName).toBe('Profil');
  });

  it('preklad sa nevolá, keď je meno známe', () => {
    compute({ authUser: makeUser({ first_name: 'Jana' }) });
    expect(t).not.toHaveBeenCalled();
  });
});

describe('identifikátor protistrany konverzácie', () => {
  const CASES: Array<[string, Partial<MessagingUserBrief>, string | null]> = [
    ['slug', { slug: 'peter-horvath-2' }, 'peter-horvath-2'],
    ['slug sa orezáva', { slug: '  peter-horvath-2 ' }, 'peter-horvath-2'],
    ['slug má prednosť pred ID', { id: 5, slug: 'peter' }, 'peter'],
    ['bez slugu ide ID ako text', { slug: null }, '5'],
    ['prázdny slug: ID', { slug: '' }, '5'],
    ['slug z medzier: ID', { slug: '   ' }, '5'],
    ['slug chýba úplne: ID', {}, '5'],
    ['ID 0 je platné číslo', { id: 0, slug: null }, '0'],
    ['zmazaný účet nemá identifikátor ani so slugom', { slug: 'peter', is_deleted: true }, null],
    ['zmazaný účet nemá identifikátor ani s ID', { slug: null, is_deleted: true }, null],
    ['is_deleted false je bežný účet', { slug: 'peter', is_deleted: false }, 'peter'],
    ['ID, ktoré nie je číslo (poškodené dáta), sa nepoužije', { id: '5' as unknown as number, slug: null }, null],
  ];

  it.each(CASES)('%s', (_title, fields, expected) => {
    expect(compute({ mobileMessagePeer: makePeer(fields) }).mobileMessagePeerIdentifier).toBe(
      expected,
    );
  });

  it('bez protistrany je identifikátor null', () => {
    expect(compute().mobileMessagePeerIdentifier).toBeNull();
  });
});

describe('názov konverzácie v mobilnej hlavičke', () => {
  it('názov skupiny má prednosť pred protistranou', () => {
    const values = compute({
      mobileMessageGroup: { name: 'Tím Svaply' },
      mobileMessagePeer: makePeer(),
    });
    expect(values.mobileMessageTitle).toBe('Tím Svaply');
  });

  it('prázdny názov skupiny sa preskočí a použije sa meno protistrany', () => {
    const values = compute({
      mobileMessageGroup: { name: '' },
      mobileMessagePeer: makePeer({ display_name: 'Peter Horváth' }),
    });
    expect(values.mobileMessageTitle).toBe('Peter Horváth');
  });

  it('bez skupiny je to meno protistrany (orezané)', () => {
    const values = compute({ mobileMessagePeer: makePeer({ display_name: '  Peter Horváth ' }) });
    expect(values.mobileMessageTitle).toBe('Peter Horváth');
  });

  it('zmazaný účet sa pomenuje cez preklad "Zmazaný používateľ"', () => {
    const values = compute({ mobileMessagePeer: makePeer({ is_deleted: true }) });
    expect(values.mobileMessageTitle).toBe('Zmazaný používateľ');
    expect(t).toHaveBeenCalledWith('messages.deletedUser', 'Zmazaný používateľ');
  });

  it('protistrana bez mena sa pomenuje cez preklad "Používateľ"', () => {
    const values = compute({ mobileMessagePeer: makePeer({ display_name: '  ' }) });
    expect(values.mobileMessageTitle).toBe('Používateľ');
    expect(t).toHaveBeenCalledWith('messages.unknownUser', 'Používateľ');
  });

  it('bez skupiny aj protistrany nie je žiadny názov', () => {
    expect(compute().mobileMessageTitle).toBeUndefined();
  });
});

describe('avatar v hlavičke konverzácie', () => {
  const AVATAR = 'https://cdn.example.com/avatars/peter.png';

  it('bez skupiny je to avatar protistrany', () => {
    const values = compute({ mobileMessagePeer: makePeer({ avatar_url: AVATAR }) });
    expect(values.mobileMessageAvatarUrl).toBe(AVATAR);
  });

  it('pri skupine sa avatar protistrany nepoužije', () => {
    const values = compute({
      mobileMessageGroup: { name: 'Tím Svaply' },
      mobileMessagePeer: makePeer({ avatar_url: AVATAR }),
    });
    expect(values.mobileMessageAvatarUrl).toBeNull();
  });

  it.each([[undefined], [null]])('protistrana bez avataru (%s) dá null', (avatar_url) => {
    const values = compute({ mobileMessagePeer: makePeer({ avatar_url }) });
    expect(values.mobileMessageAvatarUrl).toBeNull();
  });

  it('prázdny text avataru sa zachová (nepovažuje sa za chýbajúci)', () => {
    const values = compute({ mobileMessagePeer: makePeer({ avatar_url: '' }) });
    expect(values.mobileMessageAvatarUrl).toBe('');
  });

  it('bez protistrany je avatar null', () => {
    expect(compute().mobileMessageAvatarUrl).toBeNull();
  });
});

describe('režim úpravy profilu', () => {
  const EDITING: Partial<Input> = {
    activeModule: 'profile',
    activeRightItem: 'edit-profile',
    isRightSidebarOpen: true,
  };

  it('je zapnutý len pri module profil, položke edit-profile a otvorenom pravom paneli', () => {
    expect(compute(EDITING).isProfileEditMode).toBe(true);
  });

  it.each([
    ['iný modul', { activeModule: 'user-profile' }],
    ['iná položka pravého panela', { activeRightItem: 'settings' }],
    ['zatvorený pravý panel', { isRightSidebarOpen: false }],
  ])('je vypnutý: %s', (_title, change) => {
    expect(compute({ ...EDITING, ...change }).isProfileEditMode).toBe(false);
  });
});

describe('otvorená konverzácia v správach', () => {
  const CASES: Array<[string, Partial<Input>, boolean]> = [
    ['ID konverzácie', { selectedConversationId: 7 }, true],
    ['ID používateľa z adresy', { targetUserIdFromMessagesQuery: 9 }, true],
    ['obe ID', { selectedConversationId: 7, targetUserIdFromMessagesQuery: 9 }, true],
    ['žiadne ID', {}, false],
    ['ID 0 je hodnota (kontrola je na null, nie na pravdivosť)', { selectedConversationId: 0 }, true],
    ['ID používateľa 0 je tiež hodnota', { targetUserIdFromMessagesQuery: 0 }, true],
  ];

  it.each(CASES)('modul správy, %s', (_title, ids, expected) => {
    expect(compute({ activeModule: 'messages', ...ids }).isMobileMessageConversationOpen).toBe(
      expected,
    );
  });

  it.each(['home', 'profile', 'search', 'requests'])(
    'v module %s nie je konverzácia otvorená ani s ID v adrese',
    (activeModule) => {
      const values = compute({
        activeModule,
        selectedConversationId: 7,
        targetUserIdFromMessagesQuery: 9,
      });
      expect(values.isMobileMessageConversationOpen).toBe(false);
    },
  );
});

describe('horná lišta detailu ponuky', () => {
  it.each([
    ['profile', true],
    ['user-profile', true],
    ['home', false],
    ['messages', false],
    ['portfolio-detail', false],
  ])('detail otvorený, modul %s: %s', (activeModule, expected) => {
    const values = compute({ activeModule, isMobileOfferDetailOpen: true });
    expect(values.showMobileOfferDetailTopBar).toBe(expected);
  });

  it.each(['profile', 'user-profile'])('zatvorený detail na module %s: bez lišty', (activeModule) => {
    const values = compute({ activeModule, isMobileOfferDetailOpen: false });
    expect(values.showMobileOfferDetailTopBar).toBe(false);
  });
});

describe('blokovanie mobilného onboardingu', () => {
  it.each([
    ['len pravý panel', { isRightSidebarOpen: true }],
    ['len mobilné menu', { isMobileMenuOpen: true }],
    ['len panel upozornení', { isNotificationsPanelOpen: true }],
  ])('každý príznak ide na svoje miesto: %s', (_title, flags) => {
    compute({ activeModule: 'profile', activeRightItem: 'notifications', ...flags });

    expect(mockedBlockedByUi).toHaveBeenCalledTimes(1);
    expect(mockedBlockedByUi).toHaveBeenCalledWith({
      activeModule: 'profile',
      activeRightItem: 'notifications',
      isRightSidebarOpen: false,
      isMobileMenuOpen: false,
      isNotificationsPanelOpen: false,
      isMessageConversationOpen: false,
      ...flags,
    });
  });

  it.each([
    ['ID konverzácie', { selectedConversationId: 7 }],
    ['ID používateľa z adresy', { targetUserIdFromMessagesQuery: 9 }],
  ])('odvodená otvorená konverzácia (%s) sa odovzdá ako isMessageConversationOpen', (_title, ids) => {
    compute({ activeModule: 'messages', ...ids });

    expect(mockedBlockedByUi).toHaveBeenCalledWith(
      expect.objectContaining({ activeModule: 'messages', isMessageConversationOpen: true }),
    );
  });

  const CASES: Array<[string, Partial<Input>, boolean]> = [
    ['bežný domov', {}, false],
    ['otvorené mobilné menu', { isMobileMenuOpen: true }, true],
    ['otvorený panel upozornení', { isNotificationsPanelOpen: true }, true],
    ['otvorená konverzácia v správach', { activeModule: 'messages', selectedConversationId: 7 }, true],
    [
      'otvorená konverzácia len cez ID používateľa z adresy',
      { activeModule: 'messages', targetUserIdFromMessagesQuery: 9 },
      true,
    ],
    ['správy bez konverzácie', { activeModule: 'messages' }, false],
    ['modul nastavení', { activeModule: 'settings' }, true],
    [
      'pravý panel s inou položkou ako edit-profile',
      { isRightSidebarOpen: true, activeRightItem: 'settings' },
      true,
    ],
    [
      'pravý panel s položkou edit-profile',
      { isRightSidebarOpen: true, activeRightItem: 'edit-profile' },
      false,
    ],
  ];

  it.each(CASES)('%s', (_title, change, expected) => {
    expect(compute(change).isMobileOnboardingBlocked).toBe(expected);
  });
});

describe('výsledok', () => {
  it('vracia presne osem hodnôt', () => {
    expect(Object.keys(compute()).sort()).toEqual([
      'isMobileMessageConversationOpen',
      'isMobileOnboardingBlocked',
      'isProfileEditMode',
      'mobileAccountName',
      'mobileMessageAvatarUrl',
      'mobileMessagePeerIdentifier',
      'mobileMessageTitle',
      'showMobileOfferDetailTopBar',
    ]);
  });

  it('je čistý: nemení vstupy a rovnaký vstup dá rovnaký výsledok', () => {
    const input: Partial<Input> = {
      authUser: Object.freeze(makeUser({ first_name: 'Jana' })),
      mobileMessagePeer: Object.freeze(makePeer({ slug: 'peter' })),
      mobileMessageGroup: Object.freeze({ name: 'Tím Svaply' }),
      activeModule: 'messages',
      selectedConversationId: 7,
    };

    expect(compute(input)).toEqual(compute(input));
  });
});
