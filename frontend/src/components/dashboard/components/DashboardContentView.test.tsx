/**
 * Vykreslenie dashboardu: providery, rozloženie, modály a okno príspevku nad celou appkou.
 *
 * Komponent nemá vlastnú logiku ani stav, len skladá strom z podriadených komponentov a podáva im hodnoty
 * zo svojich vstupov: väčšinu priamo (pod rovnakým alebo dohodnutým názvom), niektoré odvodzuje (alebo,
 * konečné číslo, výber obsluhy podľa modulu) a niektoré časti kreslí len podľa modulu alebo stavu. Všetky
 * podriadené komponenty sú tu záznamníky, ktoré zapíšu props a vykreslia značku, potomkov a prvky podané cez
 * props (sloty rozloženia), takže sa dá overiť aj vnorenie. Každá hodnota na vstupe je jedinečná (funkcie a
 * objekty majú vlastnú identitu, texty a čísla sa líšia); booleovské vstupy sa overujú v desiatich variantoch tak,
 * aby pre každé dva vstupy existoval variant s opačnými hodnotami a každý vstup nadobudol obe hodnoty, takže
 * zámena dvoch props alebo pevná hodnota by test zlomila. Skutočný dashboard je pokrytý v
 * `DashboardContent.renderShell.test.tsx` a ostatných sadách DashboardContent.
 */

import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import DashboardContentView, { type DashboardContentViewProps } from './DashboardContentView';

type Recorded = { name: string; props: Record<string, unknown> };
let mockRecorded: Recorded[] = [];

/** Atrapa podriadeného komponentu: zapíše props a vykreslí značku, sloty a potomkov. */
const mockStub = (
  name: string,
  props: Record<string, unknown> & { children?: ReactNode },
  slots: string[] = [],
) => {
  mockRecorded.push({ name, props });
  return (
    <div data-mock={name}>
      {slots.map((slot) => (
        <div key={slot} data-slot={slot}>
          {props[slot] as ReactNode}
        </div>
      ))}
      {props.children}
    </div>
  );
};

jest.mock('../contexts/RequestsNotificationsContext', () => ({
  RequestsNotificationsProvider: (props: Record<string, unknown>) => mockStub('RequestsNotificationsProvider', props),
}));
jest.mock('../contexts/FeedPostOverlayContext', () => ({
  FeedPostOverlayProvider: (props: Record<string, unknown>) => mockStub('FeedPostOverlayProvider', props),
}));
jest.mock('../onboarding/DesktopOnboardingContext', () => ({
  DesktopOnboardingProvider: (props: Record<string, unknown>) => mockStub('DesktopOnboardingProvider', props),
}));
jest.mock('../onboarding/MobileOnboardingContext', () => ({
  MobileOnboardingProvider: (props: Record<string, unknown>) => mockStub('MobileOnboardingProvider', props),
}));
jest.mock('../DashboardLayout', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) =>
    mockStub('DashboardLayout', props, ['searchOverlay', 'notificationsOverlay', 'desktopRightRail']),
}));
jest.mock('../modules/SearchModule', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => mockStub('SearchModule', props),
}));
jest.mock('../modules/notifications/NotificationsFeed', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => mockStub('NotificationsFeed', props),
}));
jest.mock('../modules/messages/MessagesDesktopRail', () => ({
  MessagesDesktopRail: (props: Record<string, unknown>) => mockStub('MessagesDesktopRail', props),
}));
jest.mock('../onboarding/OnboardingScrollLock', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => mockStub('OnboardingScrollLock', props),
}));
jest.mock('../onboarding/MobileOnboardingOverlay', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => mockStub('MobileOnboardingOverlay', props),
}));
jest.mock('../onboarding/DesktopOnboardingOverlay', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => mockStub('DesktopOnboardingOverlay', props),
}));
jest.mock('../DashboardModals', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => mockStub('DashboardModals', props),
}));
jest.mock('../modules/skills/DeleteSkillConfirmModal', () => ({
  DeleteSkillConfirmModal: (props: Record<string, unknown>) => mockStub('DeleteSkillConfirmModal', props),
}));
jest.mock('../modules/feed/FeedPostDetailOverlay', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => mockStub('FeedPostDetailOverlay', props),
}));

/** Funkcia s vlastnou identitou (dve rôzne nikdy nie sú rovnaké). */
const fn = (name: string) => Object.assign(() => undefined, { sentinel: name });

const VARIANTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * Booleovský vstup s poradovým číslom `index`: vo variantoch 0-4 je pravda, keď je v čísle nastavený bit `variant`,
 * vo variantoch 5-9 je to naopak. Každé dve čísla sa líšia aspoň v jednom bite, takže pre každé dva vstupy existuje
 * variant s opačnými hodnotami, a každý vstup nadobudne obe hodnoty.
 */
const flagFor = (index: number, variant: number): boolean => {
  const bit = ((index >> (variant % 5)) & 1) === 1;
  return variant < 5 ? bit : !bit;
};

/** Skúšobný modul podaný ako obsah rozloženia. */
const MODULE_CONTENT = <div data-testid="module-content" />;

/** Všetky vstupy komponentu; `variant` mení len booleovské vstupy. */
const makeProps = (variant = 0): DashboardContentViewProps => {
  const flag = (index: number) => flagFor(index, variant);
  return {
    t: fn('t'),
    selectedConversationId: 104,
    dashboardState: { handleUserUpdate: fn('dashboardState.handleUserUpdate') },
    isSearchOpen: flag(1),
    isNotificationsPanelOpen: flag(2),
    userProfile: { viewedUserNotFound: flag(15), viewedUserLoadError: flag(16) },
    navigation: {
      handleEditProfileClick: fn('handleEditProfileClick'),
      handleRightSidebarClose: fn('handleRightSidebarClose'),
      handleSidebarLanguageClick: fn('handleSidebarLanguageClick'),
      handleSidebarAccountTypeClick: fn('handleSidebarAccountTypeClick'),
      handleSidebarAccountSettingsClick: fn('handleSidebarAccountSettingsClick'),
      handleSidebarPrivacyClick: fn('handleSidebarPrivacyClick'),
      handleSearchClose: fn('handleSearchClose'),
      handleViewUserProfileFromSearch: fn('handleViewUserProfileFromSearch'),
      handleViewUserSkillFromSearch: fn('handleViewUserSkillFromSearch'),
    },
    user: {
      id: 1,
      slug: 'testuser',
      desktop_onboarding: { sentinel: 'desktop' },
      mobile_onboarding: { sentinel: 'mobile' },
    },
    activeModule: 'modul-aktivny',
    activeRightItem: 'pravy-prvok',
    isRightSidebarOpen: flag(3),
    accountType: 'business',
    handleRightItemClick: fn('handleRightItemClick'),
    handleLogout: fn('handleLogout'),
    handleMobileBack: fn('handleMobileBack'),
    setAccountType: fn('setAccountType'),
    isAccountTypeModalOpen: flag(4),
    setIsAccountTypeModalOpen: fn('setIsAccountTypeModalOpen'),
    isPersonalAccountModalOpen: flag(5),
    setIsPersonalAccountModalOpen: fn('setIsPersonalAccountModalOpen'),
    showMobileSettingsList: flag(6),
    selectedSkillsCategory: { id: 3, subcategory: 'podkategoria' },
    setSelectedSkillsCategory: fn('setSelectedSkillsCategory'),
    standardCategories: [{ id: 1 }],
    setStandardCategories: fn('setStandardCategories'),
    customCategories: [{ id: 2 }],
    setCustomCategories: fn('setCustomCategories'),
    isSkillsCategoryModalOpen: flag(7),
    setIsSkillsCategoryModalOpen: fn('setIsSkillsCategoryModalOpen'),
    isSkillDescriptionModalOpen: flag(8),
    setIsSkillDescriptionModalOpen: fn('setIsSkillDescriptionModalOpen'),
    isAddCustomCategoryModalOpen: flag(9),
    setIsAddCustomCategoryModalOpen: fn('setIsAddCustomCategoryModalOpen'),
    editingCustomCategoryIndex: 6,
    setEditingCustomCategoryIndex: fn('setEditingCustomCategoryIndex'),
    editingStandardCategoryIndex: 7,
    setEditingStandardCategoryIndex: fn('setEditingStandardCategoryIndex'),
    toLocalSkill: fn('toLocalSkill'),
    applySkillUpdate: fn('applySkillUpdate'),
    loadSkills: fn('loadSkills'),
    fetchSkillDetail: fn('fetchSkillDetail'),
    handleRemoveSkillImage: fn('handleRemoveSkillImage'),
    removeStandardCategory: fn('removeStandardCategory'),
    removeCustomCategory: fn('removeCustomCategory'),
    handleDashboardModuleChange: fn('handleDashboardModuleChange'),
    mobileAccountSettingsView: 'privacy',
    handleAccountSettingsMobileBack: fn('handleAccountSettingsMobileBack'),
    handleMobileSettingsOpen: fn('handleMobileSettingsOpen'),
    handleMobileSettingsClose: fn('handleMobileSettingsClose'),
    handleMobileProfileOpen: fn('handleMobileProfileOpen'),
    handleSidebarSearchClick: fn('handleSidebarSearchClick'),
    handleSidebarNotificationsClick: fn('handleSidebarNotificationsClick'),
    handleSkillsModeToggle: fn('handleSkillsModeToggle'),
    handleOnboardingSearchOpen: fn('handleOnboardingSearchOpen'),
    handleDesktopOnboardingSearchOpen: fn('handleDesktopOnboardingSearchOpen'),
    handleDesktopOnboardingSearchClose: fn('handleDesktopOnboardingSearchClose'),
    handleOnboardingRequestsOpen: fn('handleOnboardingRequestsOpen'),
    handleDesktopOnboardingRequestsOpen: fn('handleDesktopOnboardingRequestsOpen'),
    handleOnboardingMessagesOpen: fn('handleOnboardingMessagesOpen'),
    handleOnboardingHomeOpen: fn('handleOnboardingHomeOpen'),
    handleDesktopOnboardingProfileOpen: fn('handleDesktopOnboardingProfileOpen'),
    handleOnboardingSkillCreated: fn('handleOnboardingSkillCreated'),
    handleMobileOnboardingSkillCreatedHandlerSet: fn('handleMobileOnboardingSkillCreatedHandlerSet'),
    handleDesktopOnboardingSkillCreatedHandlerSet: fn('handleDesktopOnboardingSkillCreatedHandlerSet'),
    feedOverlayTarget: null,
    handleFeedOverlayTargetChange: fn('handleFeedOverlayTargetChange'),
    handleNotificationsPanelClose: fn('handleNotificationsPanelClose'),
    handleNotificationNavigate: fn('handleNotificationNavigate'),
    handleOfferReviewsBack: fn('handleOfferReviewsBack'),
    handleSkillsDescribeMobileBack: fn('handleSkillsDescribeMobileBack'),
    handleSkillsCategoryBack: fn('handleSkillsCategoryBack'),
    handleMobileMessagesBack: fn('handleMobileMessagesBack'),
    handleSkillSave: fn('handleSkillSave'),
    pendingDeleteOffer: null,
    setPendingDeleteOffer: fn('setPendingDeleteOffer'),
    isDeletingOwnProfileOffer: flag(10),
    handleConfirmDeleteOwnProfileOffer: fn('handleConfirmDeleteOwnProfileOffer'),
    handlePortfolioDetailBack: fn('handlePortfolioDetailBack'),
    mobileMessageGroup: null,
    moduleContent: MODULE_CONTENT,
    mobileAccountName: 'Meno Účtu',
    mobileMessagePeerIdentifier: 'partner-slug',
    mobileMessageTitle: 'Partner Správ',
    mobileMessageAvatarUrl: 'https://example.test/avatar.png',
    isProfileEditMode: flag(11),
    isMobileMessageConversationOpen: flag(12),
    showMobileOfferDetailTopBar: flag(13),
    isMobileOnboardingBlocked: flag(14),
  } as unknown as DashboardContentViewProps;
};

/** Hodnota z vnorenej cesty vstupov, napr. `navigation.handleSearchClose`. */
const read = (source: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((value, key) => (value as Record<string, unknown>)[key], source);

const propsOf = (name: string): Record<string, unknown> => {
  const found = mockRecorded.filter((entry) => entry.name === name);
  if (found.length === 0) throw new Error('komponent ' + name + ' sa nevykreslil');
  return found[found.length - 1].props;
};
const countOf = (name: string) => mockRecorded.filter((entry) => entry.name === name).length;

const renderView = (overrides: Partial<DashboardContentViewProps> = {}, variant = 0) => {
  const props = { ...makeProps(variant), ...overrides };
  const view = render(<DashboardContentView {...props} />);
  return { props, ...view };
};

/** Vnorenie značiek (komponenty, sloty a obsah modulu) ako odsadený zoznam. */
const outline = (root: Element, depth = 0): string[] =>
  Array.from(root.children).flatMap((child) => {
    const label =
      child.getAttribute('data-mock') ??
      (child.getAttribute('data-slot') ? '[' + child.getAttribute('data-slot') + ']' : child.getAttribute('data-testid'));
    return label ? ['  '.repeat(depth) + label, ...outline(child, depth + 1)] : outline(child, depth);
  });

beforeEach(() => {
  mockRecorded = [];
});

describe('štruktúra stromu', () => {
  it('bez okna príspevku a mimo Správ: providery, rozloženie s obsahom, tri vrstvy sprievodcu a modály', () => {
    const { container } = renderView();

    expect(outline(container)).toEqual([
      'RequestsNotificationsProvider',
      '  FeedPostOverlayProvider',
      '    DesktopOnboardingProvider',
      '      MobileOnboardingProvider',
      '        DashboardLayout',
      '          [searchOverlay]',
      '            SearchModule',
      '          [notificationsOverlay]',
      '            NotificationsFeed',
      '          [desktopRightRail]',
      '          module-content',
      '        OnboardingScrollLock',
      '        MobileOnboardingOverlay',
      '        DesktopOnboardingOverlay',
      '    DashboardModals',
      '    DeleteSkillConfirmModal',
    ]);
  });

  it('v Správach pribudne pravý stĺpec a s cieľom okna aj okno príspevku (poslednou súčasťou v rovnakom providerovi)', () => {
    const { container } = renderView({
      activeModule: 'messages',
      feedOverlayTarget: { postId: 5, highlightCommentId: 8 },
    } as Partial<DashboardContentViewProps>);

    expect(outline(container)).toEqual([
      'RequestsNotificationsProvider',
      '  FeedPostOverlayProvider',
      '    DesktopOnboardingProvider',
      '      MobileOnboardingProvider',
      '        DashboardLayout',
      '          [searchOverlay]',
      '            SearchModule',
      '          [notificationsOverlay]',
      '            NotificationsFeed',
      '          [desktopRightRail]',
      '            MessagesDesktopRail',
      '          module-content',
      '        OnboardingScrollLock',
      '        MobileOnboardingOverlay',
      '        DesktopOnboardingOverlay',
      '    DashboardModals',
      '    DeleteSkillConfirmModal',
      '    FeedPostDetailOverlay',
    ]);
  });

  it('každý podriadený komponent sa vykreslí presne raz', () => {
    renderView({ activeModule: 'messages', feedOverlayTarget: { postId: 5 } } as Partial<DashboardContentViewProps>);

    [
      'RequestsNotificationsProvider',
      'FeedPostOverlayProvider',
      'DesktopOnboardingProvider',
      'MobileOnboardingProvider',
      'DashboardLayout',
      'SearchModule',
      'NotificationsFeed',
      'MessagesDesktopRail',
      'OnboardingScrollLock',
      'MobileOnboardingOverlay',
      'DesktopOnboardingOverlay',
      'DashboardModals',
      'DeleteSkillConfirmModal',
      'FeedPostDetailOverlay',
    ].forEach((name) => expect(countOf(name)).toBe(1));
  });

  it('komponenty bez props nedostanú nič', () => {
    renderView();

    expect(propsOf('OnboardingScrollLock')).toEqual({});
    expect(propsOf('MobileOnboardingOverlay')).toEqual({});
    expect(propsOf('DesktopOnboardingOverlay')).toEqual({});
  });
});

describe.each(VARIANTS)('podávanie hodnôt podriadeným komponentom (variant %s)', (variant) => {
  /** [prop podriadeného komponentu, cesta vo vstupoch] */
  type Row = [string, string];

  const LAYOUT: Row[] = [
    ['activeModule', 'activeModule'],
    ['activeRightItem', 'activeRightItem'],
    ['isRightSidebarOpen', 'isRightSidebarOpen'],
    ['isMobileMenuOpen', 'showMobileSettingsList'],
    ['onModuleChange', 'handleDashboardModuleChange'],
    ['onLogout', 'handleLogout'],
    ['onRightSidebarClose', 'navigation.handleRightSidebarClose'],
    ['onRightItemClick', 'handleRightItemClick'],
    ['onMobileMenuOpen', 'handleMobileSettingsOpen'],
    ['onMobileMenuClose', 'handleMobileSettingsClose'],
    ['onMobileProfileClick', 'handleMobileProfileOpen'],
    ['onSkillsModeToggle', 'handleSkillsModeToggle'],
    ['onSidebarLanguageClick', 'navigation.handleSidebarLanguageClick'],
    ['onSidebarAccountTypeClick', 'navigation.handleSidebarAccountTypeClick'],
    ['onSidebarAccountSettingsClick', 'navigation.handleSidebarAccountSettingsClick'],
    ['onSidebarPrivacyClick', 'navigation.handleSidebarPrivacyClick'],
    ['isSearchOpen', 'isSearchOpen'],
    ['isNotificationsPanelOpen', 'isNotificationsPanelOpen'],
    ['onSidebarSearchClick', 'handleSidebarSearchClick'],
    ['onSidebarNotificationsClick', 'handleSidebarNotificationsClick'],
    ['onSearchClose', 'navigation.handleSearchClose'],
    ['onNotificationsPanelClose', 'handleNotificationsPanelClose'],
    ['mobileAccountName', 'mobileAccountName'],
    ['mobileMessagePeerName', 'mobileMessageTitle'],
    ['mobileMessagePeerAvatarUrl', 'mobileMessageAvatarUrl'],
    ['isMobileMessageConversationOpen', 'isMobileMessageConversationOpen'],
    ['onMobileMessagesBack', 'handleMobileMessagesBack'],
    ['isMobileOfferDetailOpen', 'showMobileOfferDetailTopBar'],
    ['currentUser', 'user'],
    ['mobileAccountSettingsView', 'mobileAccountSettingsView'],
  ];

  const DESKTOP_ONBOARDING: Row[] = [
    ['activeModule', 'activeModule'],
    ['isSearchOpen', 'isSearchOpen'],
    ['isProfileEditMode', 'isProfileEditMode'],
    ['isRightSidebarOpen', 'isRightSidebarOpen'],
    ['isNotificationsPanelOpen', 'isNotificationsPanelOpen'],
    ['isMobileMenuOpen', 'showMobileSettingsList'],
    ['onOpenHome', 'handleOnboardingHomeOpen'],
    ['onOpenProfile', 'handleDesktopOnboardingProfileOpen'],
    ['onOpenEditProfile', 'navigation.handleEditProfileClick'],
    ['onOpenSearch', 'handleDesktopOnboardingSearchOpen'],
    ['onCloseSearch', 'handleDesktopOnboardingSearchClose'],
    ['onOpenRequests', 'handleDesktopOnboardingRequestsOpen'],
    ['onOpenMessages', 'handleOnboardingMessagesOpen'],
    ['onSkillCreatedHandlerSet', 'handleDesktopOnboardingSkillCreatedHandlerSet'],
    ['serverState', 'user.desktop_onboarding'],
  ];

  const MOBILE_ONBOARDING: Row[] = [
    ['activeModule', 'activeModule'],
    ['isProfileEditMode', 'isProfileEditMode'],
    ['isBlockedByUi', 'isMobileOnboardingBlocked'],
    ['onOpenHome', 'handleOnboardingHomeOpen'],
    ['onOpenProfile', 'handleMobileProfileOpen'],
    ['onOpenEditProfile', 'navigation.handleEditProfileClick'],
    ['onOpenSearch', 'handleOnboardingSearchOpen'],
    ['onOpenRequests', 'handleOnboardingRequestsOpen'],
    ['onOpenMessages', 'handleOnboardingMessagesOpen'],
    ['onSkillCreatedHandlerSet', 'handleMobileOnboardingSkillCreatedHandlerSet'],
    ['serverState', 'user.mobile_onboarding'],
    ['userId', 'user.id'],
  ];

  const MODALS: Row[] = [
    ['accountType', 'accountType'],
    ['setAccountType', 'setAccountType'],
    ['isAccountTypeModalOpen', 'isAccountTypeModalOpen'],
    ['setIsAccountTypeModalOpen', 'setIsAccountTypeModalOpen'],
    ['isPersonalAccountModalOpen', 'isPersonalAccountModalOpen'],
    ['setIsPersonalAccountModalOpen', 'setIsPersonalAccountModalOpen'],
    ['user', 'user'],
    ['onUserUpdate', 'dashboardState.handleUserUpdate'],
    ['activeModule', 'activeModule'],
    ['t', 't'],
    ['onCreatedSkillSaved', 'handleOnboardingSkillCreated'],
  ];

  const SKILLS_STATE = [
    'selectedSkillsCategory',
    'setSelectedSkillsCategory',
    'standardCategories',
    'setStandardCategories',
    'customCategories',
    'setCustomCategories',
    'isSkillsCategoryModalOpen',
    'setIsSkillsCategoryModalOpen',
    'isSkillDescriptionModalOpen',
    'setIsSkillDescriptionModalOpen',
    'isAddCustomCategoryModalOpen',
    'setIsAddCustomCategoryModalOpen',
    'editingCustomCategoryIndex',
    'setEditingCustomCategoryIndex',
    'editingStandardCategoryIndex',
    'setEditingStandardCategoryIndex',
    'toLocalSkill',
    'applySkillUpdate',
    'loadSkills',
    'fetchSkillDetail',
    'handleRemoveSkillImage',
    'removeStandardCategory',
    'removeCustomCategory',
  ];

  const check = (component: string, rows: Row[]) => {
    const props = makeProps(variant);
    render(<DashboardContentView {...props} />);
    const received = propsOf(component);
    rows.forEach(([prop, path]) => {
      expect([component + '.' + prop, received[prop]]).toEqual([component + '.' + prop, read(props, path)]);
      expect(received[prop]).toBe(read(props, path));
    });
  };

  it('DashboardLayout dostane 30 priamo podaných hodnôt z dohodnutých vstupov', () => {
    expect(LAYOUT).toHaveLength(30);
    check('DashboardLayout', LAYOUT);
  });

  it('DesktopOnboardingProvider dostane 15 hodnôt z dohodnutých vstupov', () => {
    expect(DESKTOP_ONBOARDING).toHaveLength(15);
    check('DesktopOnboardingProvider', DESKTOP_ONBOARDING);
  });

  it('MobileOnboardingProvider dostane 12 hodnôt z dohodnutých vstupov', () => {
    expect(MOBILE_ONBOARDING).toHaveLength(12);
    check('MobileOnboardingProvider', MOBILE_ONBOARDING);
  });

  it('DashboardModals dostane 11 priamo podaných hodnôt a 23 hodnôt v skillsState', () => {
    expect(MODALS).toHaveLength(11);
    check('DashboardModals', MODALS);

    const props = makeProps(variant);
    render(<DashboardContentView {...props} />);
    const skillsState = propsOf('DashboardModals').skillsState as Record<string, unknown>;
    expect(Object.keys(skillsState).sort()).toEqual([...SKILLS_STATE].sort());
    SKILLS_STATE.forEach((key) => {
      expect(skillsState[key]).toBe((props as unknown as Record<string, unknown>)[key]);
    });
  });
});

describe('presné sady props', () => {
  const keysOf = (name: string) =>
    Object.keys(propsOf(name))
      .filter((key) => key !== 'children')
      .sort();

  it('DashboardLayout má 40 props (30 priamych a 10 odvodených alebo kreslených podľa modulu)', () => {
    renderView();

    expect(keysOf('DashboardLayout')).toEqual(
      [
        'activeModule', 'activeRightItem', 'isRightSidebarOpen', 'isMobileMenuOpen', 'onModuleChange', 'onLogout',
        'onRightSidebarClose', 'onRightItemClick', 'onMobileMenuOpen', 'onMobileMenuClose', 'onMobileProfileClick',
        'onSkillsModeToggle', 'onSidebarLanguageClick', 'onSidebarAccountTypeClick', 'onSidebarAccountSettingsClick',
        'onSidebarPrivacyClick', 'isSearchOpen', 'isNotificationsPanelOpen', 'onSidebarSearchClick',
        'onSidebarNotificationsClick', 'onSearchClose', 'onNotificationsPanelClose', 'mobileAccountName',
        'mobileMessagePeerName', 'mobileMessagePeerAvatarUrl', 'isMobileMessageConversationOpen',
        'onMobileMessagesBack', 'isMobileOfferDetailOpen', 'currentUser', 'mobileAccountSettingsView',
        'viewedUserNotFound', 'onMobileBack', 'searchOverlay', 'notificationsOverlay', 'desktopRightRail',
        'subcategory', 'onSkillSaveClick', 'mobileMessagePeerAvatarMembers', 'mobileMessagePeerIsGroup',
        'mobileMessagePeerIdentifier',
      ].sort(),
    );
    expect(keysOf('DashboardLayout')).toHaveLength(40);
  });

  it('providery dostanú presne dohodnuté sady (2, 1, 15 a 12 props)', () => {
    renderView();

    expect(keysOf('RequestsNotificationsProvider')).toEqual(['acknowledgeMessagesBadge', 'acknowledgeNotificationsBadge']);
    expect(keysOf('FeedPostOverlayProvider')).toEqual(['onTargetChange']);
    expect(keysOf('DesktopOnboardingProvider')).toHaveLength(15);
    expect(keysOf('MobileOnboardingProvider')).toHaveLength(12);
  });

  it('DashboardModals má 12 props a skillsState 23 kľúčov', () => {
    renderView();

    expect(keysOf('DashboardModals')).toHaveLength(12);
    expect(Object.keys(propsOf('DashboardModals').skillsState as object)).toHaveLength(23);
  });

  it('prekrytia dostanú presne dohodnuté sady (SearchModule 6, NotificationsFeed 2, MessagesDesktopRail 2)', () => {
    renderView({ activeModule: 'messages' });

    expect(keysOf('SearchModule')).toEqual(['isActive', 'isOverlay', 'onClose', 'onSkillClick', 'onUserClick', 'user']);
    expect(keysOf('NotificationsFeed')).toEqual(['onNavigate', 'variant']);
    expect(keysOf('MessagesDesktopRail')).toEqual(['currentUserId', 'selectedConversationId']);
  });
});

describe('odznaky nových položiek (RequestsNotificationsProvider)', () => {
  it.each([
    ['notifications', false, true],
    ['notifications', true, true],
    ['home', true, true],
    ['home', false, false],
    ['messages', false, false],
  ])('modul %s a otvorený panel upozornení %s: potvrdzuje odznak upozornení %s', (activeModule, panelOpen, expected) => {
    renderView({ activeModule, isNotificationsPanelOpen: panelOpen });

    expect(propsOf('RequestsNotificationsProvider').acknowledgeNotificationsBadge).toBe(expected);
  });

  it.each([
    ['messages', true],
    ['home', false],
    ['notifications', false],
  ])('modul %s potvrdzuje odznak správ: %s', (activeModule, expected) => {
    renderView({ activeModule });

    expect(propsOf('RequestsNotificationsProvider').acknowledgeMessagesBadge).toBe(expected);
  });

  it('otvorený panel upozornení nepotvrdzuje odznak správ', () => {
    renderView({ activeModule: 'home', isNotificationsPanelOpen: true });

    expect(propsOf('RequestsNotificationsProvider').acknowledgeMessagesBadge).toBe(false);
  });

  it('okno príspevku dostane od providera obsluhu zmeny cieľa', () => {
    const { props } = renderView();

    expect(propsOf('FeedPostOverlayProvider').onTargetChange).toBe(props.handleFeedOverlayTargetChange);
  });
});

describe('sprievodcovia: stav zo servera', () => {
  it('desktopový sprievodca dostane stav z používateľa, chýbajúci nahradí null', () => {
    renderView({ user: { id: 1 } } as Partial<DashboardContentViewProps>);

    expect(propsOf('DesktopOnboardingProvider').serverState).toBeNull();
  });

  it('mobilný sprievodca dostane stav z používateľa, chýbajúci nahradí null', () => {
    renderView({ user: { id: 1 } } as Partial<DashboardContentViewProps>);

    expect(propsOf('MobileOnboardingProvider').serverState).toBeNull();
  });

  it('mobilný sprievodca dostane ID používateľa, chýbajúce nahradí null', () => {
    renderView({ user: { slug: 'bez-id' } } as Partial<DashboardContentViewProps>);

    expect(propsOf('MobileOnboardingProvider').userId).toBeNull();
  });

  it('stav zo servera pre oboch sprievodcov je každý zo svojho poľa používateľa', () => {
    const desktop = { sentinel: 'desktop-stav' };
    const mobile = { sentinel: 'mobile-stav' };
    renderView({
      user: { id: 9, desktop_onboarding: desktop, mobile_onboarding: mobile },
    } as unknown as Partial<DashboardContentViewProps>);

    expect(propsOf('DesktopOnboardingProvider').serverState).toBe(desktop);
    expect(propsOf('MobileOnboardingProvider').serverState).toBe(mobile);
    expect(propsOf('MobileOnboardingProvider').userId).toBe(9);
  });
});

describe('DashboardLayout: obsluha tlačidla späť na mobile (onMobileBack)', () => {
  const handlerNames = {
    skillsCategory: 'handleSkillsCategoryBack',
    skillsDescribe: 'handleSkillsDescribeMobileBack',
    offerReviews: 'handleOfferReviewsBack',
    portfolioDetail: 'handlePortfolioDetailBack',
    accountSettings: 'handleAccountSettingsMobileBack',
    fallback: 'handleMobileBack',
  } as const;

  it.each([
    ['výber kategórie', 'skills-select-category', 'iny-prvok', 'skillsCategory'],
    ['popis zručnosti', 'skills-describe', 'iny-prvok', 'skillsDescribe'],
    ['recenzie ponuky', 'offer-reviews', 'iny-prvok', 'offerReviews'],
    ['detail portfólia', 'portfolio-detail', 'iny-prvok', 'portfolioDetail'],
    ['nastavenia účtu ako modul', 'account-settings', 'iny-prvok', 'accountSettings'],
    ['nastavenia účtu ako pravá položka', 'home', 'account-settings', 'accountSettings'],
    ['iný modul a iná pravá položka', 'home', 'iny-prvok', 'fallback'],
    ['popis zručnosti má prednosť pred pravou položkou nastavení účtu', 'skills-describe', 'account-settings', 'skillsDescribe'],
    ['recenzie majú prednosť pred pravou položkou nastavení účtu', 'offer-reviews', 'account-settings', 'offerReviews'],
    ['výber kategórie má prednosť pred pravou položkou nastavení účtu', 'skills-select-category', 'account-settings', 'skillsCategory'],
    ['detail portfólia má prednosť pred pravou položkou nastavení účtu', 'portfolio-detail', 'account-settings', 'portfolioDetail'],
  ])('%s', (_title, activeModule, activeRightItem, expected) => {
    const { props } = renderView({ activeModule, activeRightItem });

    const name = handlerNames[expected as keyof typeof handlerNames];
    expect(propsOf('DashboardLayout').onMobileBack).toBe((props as unknown as Record<string, unknown>)[name]);
  });
});

describe('DashboardLayout: nedostupný profil (viewedUserNotFound)', () => {
  it.each([
    [false, false, false],
    [true, false, true],
    [false, true, true],
    [true, true, true],
  ])('neexistuje %s, chyba načítania %s: nedostupný %s', (notFound, loadError, expected) => {
    renderView({
      userProfile: { viewedUserNotFound: notFound, viewedUserLoadError: loadError },
    } as Partial<DashboardContentViewProps>);

    expect(propsOf('DashboardLayout').viewedUserNotFound).toBe(expected);
  });
});

describe('DashboardLayout: popis zručnosti (subcategory a onSkillSaveClick)', () => {
  it('pri popise zručnosti dostane podkategóriu a obsluhu uloženia', () => {
    const { props } = renderView({ activeModule: 'skills-describe' });

    expect(propsOf('DashboardLayout').subcategory).toBe('podkategoria');
    expect(propsOf('DashboardLayout').onSkillSaveClick).toBe(props.handleSkillSave);
  });

  it('pri popise zručnosti bez vybranej kategórie je podkategória nedefinovaná, obsluha uloženia ostáva', () => {
    const { props } = renderView({
      activeModule: 'skills-describe',
      selectedSkillsCategory: null,
    } as Partial<DashboardContentViewProps>);

    expect(propsOf('DashboardLayout').subcategory).toBeUndefined();
    expect(propsOf('DashboardLayout').onSkillSaveClick).toBe(props.handleSkillSave);
  });

  it.each([['home'], ['skills-offer'], ['profile']])('v module %s nie je podkategória ani obsluha uloženia', (activeModule) => {
    renderView({ activeModule });

    expect(propsOf('DashboardLayout').subcategory).toBeNull();
    expect(propsOf('DashboardLayout').onSkillSaveClick).toBeUndefined();
  });
});

describe('DashboardLayout: hlavička mobilných Správ', () => {
  it('bez skupiny: prázdny zoznam členov, nie skupina a identifikátor partnera', () => {
    renderView({ mobileMessageGroup: null } as Partial<DashboardContentViewProps>);

    expect(propsOf('DashboardLayout').mobileMessagePeerAvatarMembers).toEqual([]);
    expect(propsOf('DashboardLayout').mobileMessagePeerIsGroup).toBe(false);
    expect(propsOf('DashboardLayout').mobileMessagePeerIdentifier).toBe('partner-slug');
  });

  it('so skupinou: jej členovia, skupina a bez identifikátora partnera', () => {
    const avatarMembers = [{ id: 1 }, { id: 2 }];
    renderView({ mobileMessageGroup: { name: 'Skupina', avatarMembers } } as Partial<DashboardContentViewProps>);

    expect(propsOf('DashboardLayout').mobileMessagePeerAvatarMembers).toBe(avatarMembers);
    expect(propsOf('DashboardLayout').mobileMessagePeerIsGroup).toBe(true);
    expect(propsOf('DashboardLayout').mobileMessagePeerIdentifier).toBeNull();
  });

  it('skupina bez členov dá prázdny zoznam', () => {
    renderView({ mobileMessageGroup: { name: 'Skupina' } } as Partial<DashboardContentViewProps>);

    expect(propsOf('DashboardLayout').mobileMessagePeerAvatarMembers).toEqual([]);
    expect(propsOf('DashboardLayout').mobileMessagePeerIsGroup).toBe(true);
  });

  it('identifikátor partnera sa bez skupiny podá tak, ako prišiel (aj null)', () => {
    renderView({ mobileMessagePeerIdentifier: null } as Partial<DashboardContentViewProps>);

    expect(propsOf('DashboardLayout').mobileMessagePeerIdentifier).toBeNull();
  });
});

describe('DashboardLayout: obsah a prekrytia', () => {
  it('obsah modulu sa vykreslí ako potomok rozloženia', () => {
    const { getByTestId } = renderView();

    expect(propsOf('DashboardLayout').children).toBe(MODULE_CONTENT);
    expect(getByTestId('module-content').parentElement?.getAttribute('data-mock')).toBe('DashboardLayout');
  });

  it('panel hľadania: SearchModule v obale s kotvou sprievodcu a so šiestimi props', () => {
    const { props, container } = renderView();

    const slot = container.querySelector('[data-slot="searchOverlay"]') as HTMLElement;
    const wrapper = slot.firstElementChild as HTMLElement;
    expect(wrapper.getAttribute('data-desktop-onboarding')).toBe('search-panel');
    expect(wrapper.className).toBe('h-full');
    expect(wrapper.firstElementChild?.getAttribute('data-mock')).toBe('SearchModule');
    const search = propsOf('SearchModule');
    expect(search.user).toBe(props.user);
    expect(search.onUserClick).toBe(props.navigation.handleViewUserProfileFromSearch);
    expect(search.onSkillClick).toBe(props.navigation.handleViewUserSkillFromSearch);
    expect(search.isOverlay).toBe(true);
    expect(search.onClose).toBe(props.navigation.handleSearchClose);
  });

  it.each(VARIANTS)('panel hľadania je aktívny podľa stavu hľadania (variant %s)', (variant) => {
    const { props } = renderView({}, variant);

    expect(propsOf('SearchModule').isActive).toBe(props.isSearchOpen);
  });

  it('panel upozornení: NotificationsFeed v režime panela s obsluhou prechodu', () => {
    const { props } = renderView();

    expect(propsOf('NotificationsFeed').variant).toBe('panel');
    expect(propsOf('NotificationsFeed').onNavigate).toBe(props.handleNotificationNavigate);
  });

  it('mimo Správ je pravý stĺpec prázdny', () => {
    const { container } = renderView({ activeModule: 'home' });

    const slot = container.querySelector('[data-slot="desktopRightRail"]') as HTMLElement;
    expect(slot.innerHTML).toBe('');
    expect(countOf('MessagesDesktopRail')).toBe(0);
    expect(propsOf('DashboardLayout').desktopRightRail).toBeNull();
  });

  it('v Správach dostane pravý stĺpec ID používateľa a vybranú konverzáciu', () => {
    const { props } = renderView({ activeModule: 'messages' });

    expect(propsOf('MessagesDesktopRail').currentUserId).toBe((props.user as unknown as { id: number }).id);
    expect(propsOf('MessagesDesktopRail').selectedConversationId).toBe(104);
  });

  it.each([
    ['celé číslo', 8, 8],
    ['nula', 0, 0],
    ['záporné číslo', -3, -3],
    ['desatinné číslo', 1.5, 1.5],
    ['null', null, null],
    ['NaN', NaN, null],
    ['Infinity', Infinity, null],
    ['-Infinity', -Infinity, null],
  ])('v Správach: vybraná konverzácia %s', (_title, given, expected) => {
    renderView({ activeModule: 'messages', selectedConversationId: given });

    expect(propsOf('MessagesDesktopRail').selectedConversationId).toBe(expected);
  });
});

describe('okno mazania ponuky (DeleteSkillConfirmModal)', () => {
  it.each([
    ['bez ponuky na zmazanie', null, false],
    ['s ponukou na zmazanie', { id: 5 }, true],
  ])('%s: otvorené %s', (_title, pendingDeleteOffer, expected) => {
    renderView({ pendingDeleteOffer } as Partial<DashboardContentViewProps>);

    expect(propsOf('DeleteSkillConfirmModal').open).toBe(expected);
  });

  it('potvrdenie a stav mazania idú zo vstupov', () => {
    const { props } = renderView({ isDeletingOwnProfileOffer: true });

    expect(propsOf('DeleteSkillConfirmModal').onConfirm).toBe(props.handleConfirmDeleteOwnProfileOffer);
    expect(propsOf('DeleteSkillConfirmModal').isDeleting).toBe(true);
  });

  it('stav mazania nepravda sa podá ako nepravda', () => {
    renderView({ isDeletingOwnProfileOffer: false });

    expect(propsOf('DeleteSkillConfirmModal').isDeleting).toBe(false);
  });

  it('zatvorenie mimo mazania zruší ponuku na zmazanie', () => {
    const setPendingDeleteOffer = jest.fn();
    renderView({
      pendingDeleteOffer: { id: 5 },
      isDeletingOwnProfileOffer: false,
      setPendingDeleteOffer,
    } as unknown as Partial<DashboardContentViewProps>);

    (propsOf('DeleteSkillConfirmModal').onClose as () => void)();

    expect(setPendingDeleteOffer).toHaveBeenCalledTimes(1);
    expect(setPendingDeleteOffer).toHaveBeenCalledWith(null);
  });

  it('zatvorenie počas mazania nespraví nič', () => {
    const setPendingDeleteOffer = jest.fn();
    renderView({
      pendingDeleteOffer: { id: 5 },
      isDeletingOwnProfileOffer: true,
      setPendingDeleteOffer,
    } as unknown as Partial<DashboardContentViewProps>);

    (propsOf('DeleteSkillConfirmModal').onClose as () => void)();

    expect(setPendingDeleteOffer).not.toHaveBeenCalled();
  });

  it('zatvorenie používa nastavovač z posledného renderu', () => {
    const first = jest.fn();
    const second = jest.fn();
    const view = renderView({ isDeletingOwnProfileOffer: false, setPendingDeleteOffer: first } as Partial<DashboardContentViewProps>);
    view.rerender(
      <DashboardContentView
        {...makeProps()}
        isDeletingOwnProfileOffer={false}
        setPendingDeleteOffer={second as unknown as DashboardContentViewProps['setPendingDeleteOffer']}
      />,
    );

    (propsOf('DeleteSkillConfirmModal').onClose as () => void)();

    expect(second).toHaveBeenCalledWith(null);
    expect(first).not.toHaveBeenCalled();
  });
});

describe('okno príspevku nad celou appkou (FeedPostDetailOverlay)', () => {
  it('bez cieľa sa nevykreslí', () => {
    renderView({ feedOverlayTarget: null });

    expect(countOf('FeedPostDetailOverlay')).toBe(0);
  });

  it('s cieľom dostane ID príspevku a komentár na zvýraznenie', () => {
    renderView({ feedOverlayTarget: { postId: 5, highlightCommentId: 8 } } as Partial<DashboardContentViewProps>);

    expect(propsOf('FeedPostDetailOverlay').postId).toBe(5);
    expect(propsOf('FeedPostDetailOverlay').highlightCommentId).toBe(8);
  });

  it.each([
    ['chýbajúci komentár', { postId: 5 }, null],
    ['komentár null', { postId: 5, highlightCommentId: null }, null],
    ['komentár 0', { postId: 5, highlightCommentId: 0 }, 0],
  ])('%s', (_title, target, expected) => {
    renderView({ feedOverlayTarget: target } as Partial<DashboardContentViewProps>);

    expect(propsOf('FeedPostDetailOverlay').highlightCommentId).toBe(expected);
  });

  it('zatvorenie zavolá zmenu cieľa s null a ničím iným', () => {
    const handleFeedOverlayTargetChange = jest.fn();
    renderView({
      feedOverlayTarget: { postId: 5 },
      handleFeedOverlayTargetChange,
    } as Partial<DashboardContentViewProps>);

    (propsOf('FeedPostDetailOverlay').onClose as () => void)();

    expect(handleFeedOverlayTargetChange).toHaveBeenCalledTimes(1);
    expect(handleFeedOverlayTargetChange.mock.calls[0]).toEqual([null]);
  });
});
