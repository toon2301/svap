/**
 * Obsah aktívneho modulu: ModuleRouter s hodnotami zo stavu dashboardu.
 *
 * Komponent nemá vlastnú logiku ani stav, len skladá props pre ModuleRouter: väčšinu podáva ďalej
 * (pod rovnakým alebo dohodnutým názvom), tri odvodzuje (konečné číslo alebo null) a jeden je funkcia,
 * ktorá zapíše obsluhu späť do refu. ModuleRouter je tu záznamník. Každá hodnota na vstupe je jedinečná
 * (funkcie a objekty majú vlastnú identitu, texty a čísla sa líšia); booleovské vstupy sa overujú v desiatich
 * variantoch tak, aby pre každé dva vstupy existoval variant s opačnými hodnotami a každý vstup nadobudol obe
 * hodnoty, takže zámena dvoch props alebo pevná hodnota by test zlomila.
 * Skutočný dashboard je pokrytý v `DashboardContent.renderShell.test.tsx` a ostatných sadách DashboardContent.
 */

import { render } from '@testing-library/react';
import DashboardModuleContent, { type DashboardModuleContentProps } from './DashboardModuleContent';

let mockRouterCalls: Array<Record<string, unknown>> = [];
jest.mock('../ModuleRouter', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    mockRouterCalls.push(props);
    return null;
  },
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

/** Všetky vstupy komponentu; `variant` mení len booleovské vstupy. */
const makeProps = (variant = 0): DashboardModuleContentProps => {
  return {
    user: { id: 1, slug: 'testuser' },
    activeModule: 'modul-aktivny',
    activeRightItem: 'pravy-prvok',
    isRightSidebarOpen: flagFor(1, variant),
    accountType: 'business',
    handleUserUpdate: fn('handleUserUpdate'),
    handleRightSidebarToggle: fn('handleRightSidebarToggle'),
    closeOwnProfileEdit: fn('closeOwnProfileEdit'),
    setActiveModule: fn('setActiveModule'),
    setIsSkillsCategoryModalOpen: fn('setIsSkillsCategoryModalOpen'),
    setSelectedSkillsCategory: fn('setSelectedSkillsCategory'),
    setIsSkillDescriptionModalOpen: fn('setIsSkillDescriptionModalOpen'),
    setIsAddCustomCategoryModalOpen: fn('setIsAddCustomCategoryModalOpen'),
    setEditingCustomCategoryIndex: fn('setEditingCustomCategoryIndex'),
    setEditingStandardCategoryIndex: fn('setEditingStandardCategoryIndex'),
    standardCategories: [{ id: 1 }],
    customCategories: [{ id: 2 }],
    setAccountType: fn('setAccountType'),
    setIsAccountTypeModalOpen: fn('setIsAccountTypeModalOpen'),
    setIsPersonalAccountModalOpen: fn('setIsPersonalAccountModalOpen'),
    removeStandardCategory: fn('removeStandardCategory'),
    removeCustomCategory: fn('removeCustomCategory'),
    selectedSkillsCategory: { id: 3 },
    isInSubcategories: flagFor(2, variant),
    setIsInSubcategories: fn('setIsInSubcategories'),
    skillsCategoryBackHandlerRef: { current: null },
    userProfile: {
      viewedUserId: 41,
      viewedUserSlug: 'cudzi-slug',
      viewedUserNotFound: flagFor(3, variant),
      viewedUserLoadError: flagFor(4, variant),
      retryViewedUserLoad: fn('retryViewedUserLoad'),
      viewedUserSummary: { id: 55 },
    },
    navigation: {
      handleEditProfileClick: fn('handleEditProfileClick'),
      handleViewUserProfileFromSearch: fn('handleViewUserProfileFromSearch'),
      handleViewUserSkillFromSearch: fn('handleViewUserSkillFromSearch'),
      handleSkillsOfferClick: fn('handleSkillsOfferClick'),
      handleSkillsSearchClick: fn('handleSkillsSearchClick'),
    },
    highlighting: { highlightedSkillId: 77 },
    initialProfileTab: 'portfolio',
    ownProfileTab: 'posts',
    setOwnProfileTab: fn('setOwnProfileTab'),
    handleProfileSkillsClick: fn('handleProfileSkillsClick'),
    handleSkillsModeToggle: fn('handleSkillsModeToggle'),
    effectiveOfferIdForReviews: 101,
    effectiveFeedPostId: 102,
    effectivePortfolioItemId: 103,
    effectivePortfolioOwnerIdentifier: 'vlastnik-portfolia',
    effectivePortfolioCreateOwnerIdentifier: 'vlastnik-tvorby',
    handleCreatePortfolio: fn('handleCreatePortfolio'),
    selectedConversationId: 104,
    targetUserIdFromMessagesQuery: 105,
    handleNotificationNavigate: fn('handleNotificationNavigate'),
    requestsRouteIntent: { tab: 'received' },
    handleEditOwnProfileOffer: fn('handleEditOwnProfileOffer'),
    handleDeleteOwnProfileOffer: fn('handleDeleteOwnProfileOffer'),
    mobileAccountSettingsView: 'privacy',
    setMobileAccountSettingsView: fn('setMobileAccountSettingsView'),
    handleManageOfferWatches: fn('handleManageOfferWatches'),
  } as unknown as DashboardModuleContentProps;
};

/** Hodnota z vnorenej cesty vstupov, napr. `userProfile.viewedUserId`. */
const read = (source: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((value, key) => (value as Record<string, unknown>)[key], source);

const lastRouterProps = () => mockRouterCalls[mockRouterCalls.length - 1];

beforeEach(() => {
  mockRouterCalls = [];
});

/** Props, ktoré ModuleRouter dostane priamo z jedného vstupu: [prop ModuleRouteru, cesta vo vstupoch]. */
const PASS_THROUGH: Array<[string, string]> = [
  ['user', 'user'],
  ['activeModule', 'activeModule'],
  ['activeRightItem', 'activeRightItem'],
  ['isRightSidebarOpen', 'isRightSidebarOpen'],
  ['accountType', 'accountType'],
  ['onUserUpdate', 'handleUserUpdate'],
  ['handleRightSidebarToggle', 'handleRightSidebarToggle'],
  ['closeOwnProfileEdit', 'closeOwnProfileEdit'],
  ['setActiveModule', 'setActiveModule'],
  ['setIsSkillsCategoryModalOpen', 'setIsSkillsCategoryModalOpen'],
  ['setSelectedSkillsCategory', 'setSelectedSkillsCategory'],
  ['setIsSkillDescriptionModalOpen', 'setIsSkillDescriptionModalOpen'],
  ['setIsAddCustomCategoryModalOpen', 'setIsAddCustomCategoryModalOpen'],
  ['setEditingCustomCategoryIndex', 'setEditingCustomCategoryIndex'],
  ['setEditingStandardCategoryIndex', 'setEditingStandardCategoryIndex'],
  ['standardCategories', 'standardCategories'],
  ['customCategories', 'customCategories'],
  ['setAccountType', 'setAccountType'],
  ['setIsAccountTypeModalOpen', 'setIsAccountTypeModalOpen'],
  ['setIsPersonalAccountModalOpen', 'setIsPersonalAccountModalOpen'],
  ['removeStandardCategory', 'removeStandardCategory'],
  ['removeCustomCategory', 'removeCustomCategory'],
  ['selectedSkillsCategory', 'selectedSkillsCategory'],
  ['isInSubcategories', 'isInSubcategories'],
  ['setIsInSubcategories', 'setIsInSubcategories'],
  ['viewedUserId', 'userProfile.viewedUserId'],
  ['viewedUserSlug', 'userProfile.viewedUserSlug'],
  ['viewedUserNotFound', 'userProfile.viewedUserNotFound'],
  ['viewedUserLoadError', 'userProfile.viewedUserLoadError'],
  ['onRetryViewedUserLoad', 'userProfile.retryViewedUserLoad'],
  ['viewedUserSummary', 'userProfile.viewedUserSummary'],
  ['onEditProfileClick', 'navigation.handleEditProfileClick'],
  ['onViewUserProfile', 'navigation.handleViewUserProfileFromSearch'],
  ['highlightedSkillId', 'highlighting.highlightedSkillId'],
  ['onViewUserSkillFromSearch', 'navigation.handleViewUserSkillFromSearch'],
  ['initialProfileTab', 'initialProfileTab'],
  ['ownProfileTab', 'ownProfileTab'],
  ['onOwnProfileTabChange', 'setOwnProfileTab'],
  ['onSkillsClick', 'handleProfileSkillsClick'],
  ['onSkillsOfferClick', 'navigation.handleSkillsOfferClick'],
  ['onSkillsSearchClick', 'navigation.handleSkillsSearchClick'],
  ['onSkillsModeToggle', 'handleSkillsModeToggle'],
  ['offerIdForReviews', 'effectiveOfferIdForReviews'],
  ['feedPostIdForDetail', 'effectiveFeedPostId'],
  ['portfolioOwnerIdentifier', 'effectivePortfolioOwnerIdentifier'],
  ['portfolioCreateOwnerIdentifier', 'effectivePortfolioCreateOwnerIdentifier'],
  ['onCreatePortfolio', 'handleCreatePortfolio'],
  ['onNotificationNavigate', 'handleNotificationNavigate'],
  ['requestsRouteIntent', 'requestsRouteIntent'],
  ['onEditOwnProfileOffer', 'handleEditOwnProfileOffer'],
  ['onDeleteOwnProfileOffer', 'handleDeleteOwnProfileOffer'],
  ['mobileAccountSettingsView', 'mobileAccountSettingsView'],
  ['onMobileAccountSettingsViewChange', 'setMobileAccountSettingsView'],
  ['onManageOfferWatches', 'handleManageOfferWatches'],
];

/** Odvodené props a funkcia zapisujúca do refu. */
const DERIVED = [
  'portfolioItemIdForDetail',
  'conversationIdForMessages',
  'targetUserIdForMessages',
  'onSkillsCategoryBackHandlerSet',
];

/** Presná sada props pre ModuleRouter (kľúče sa zoradia, poradie v JSX nie je súčasť dohody). */
const ROUTER_KEYS = [...PASS_THROUGH.map(([prop]) => prop), ...DERIVED].sort();

describe('štruktúra', () => {
  it('vykreslí ModuleRouter presne raz a nič iné', () => {
    const { container } = render(<DashboardModuleContent {...makeProps()} />);

    expect(mockRouterCalls).toHaveLength(1);
    expect(container.innerHTML).toBe('');
  });

  it('ModuleRouter dostane presne dohodnutú sadu 58 props', () => {
    render(<DashboardModuleContent {...makeProps()} />);

    expect(Object.keys(lastRouterProps()).sort()).toEqual(ROUTER_KEYS);
    expect(ROUTER_KEYS).toHaveLength(58);
  });

  it('pri novom renderi dostane ModuleRouter znova úplnú sadu', () => {
    const view = render(<DashboardModuleContent {...makeProps()} />);
    view.rerender(<DashboardModuleContent {...makeProps(5)} />);

    expect(mockRouterCalls).toHaveLength(2);
    expect(Object.keys(lastRouterProps()).sort()).toEqual(ROUTER_KEYS);
  });
});

describe('podávanie hodnôt do ModuleRouteru', () => {
  it('na zozname je 54 priamo podávaných props a každý má vlastný vstup', () => {
    expect(PASS_THROUGH).toHaveLength(54);
    expect(new Set(PASS_THROUGH.map(([prop]) => prop)).size).toBe(54);
  });

  it.each(VARIANTS)('každý priamo podávaný prop je hodnota svojho vstupu, rovnaká identita (variant %s)', (variant) => {
    const props = makeProps(variant);

    render(<DashboardModuleContent {...props} />);

    PASS_THROUGH.forEach(([prop, path]) => {
      // dvojica sa porovná najprv kvôli čitateľnému rozdielu s názvom props, potom ešte presná identita
      expect([prop, lastRouterProps()[prop]]).toEqual([prop, read(props, path)]);
      expect(lastRouterProps()[prop]).toBe(read(props, path));
    });
  });
});

describe('odvodené čísla', () => {
  const renderWith = (overrides: Partial<DashboardModuleContentProps>) =>
    render(<DashboardModuleContent {...makeProps()} {...overrides} />);

  it.each([
    ['celé číslo', 7, 7],
    ['nula', 0, 0],
    ['záporné číslo', -3, -3],
    ['desatinné číslo', 1.5, 1.5],
    ['null', null, null],
    ['NaN', NaN, null],
    ['Infinity', Infinity, null],
    ['-Infinity', -Infinity, null],
  ])('detail portfólia: %s', (_title, given, expected) => {
    renderWith({ effectivePortfolioItemId: given });

    expect(lastRouterProps().portfolioItemIdForDetail).toBe(expected);
  });

  it.each([
    ['celé číslo', 8, 8],
    ['nula', 0, 0],
    ['záporné číslo', -3, -3],
    ['desatinné číslo', 1.5, 1.5],
    ['null', null, null],
    ['NaN', NaN, null],
    ['Infinity', Infinity, null],
  ])('konverzácia v správach: %s', (_title, given, expected) => {
    renderWith({ selectedConversationId: given });

    expect(lastRouterProps().conversationIdForMessages).toBe(expected);
  });

  it.each([
    ['celé číslo', 9, 9],
    ['nula', 0, 0],
    ['záporné číslo', -3, -3],
    ['desatinné číslo', 1.5, 1.5],
    ['null', null, null],
    ['NaN', NaN, null],
    ['Infinity', Infinity, null],
  ])('cieľový používateľ v správach: %s', (_title, given, expected) => {
    renderWith({ targetUserIdFromMessagesQuery: given });

    expect(lastRouterProps().targetUserIdForMessages).toBe(expected);
  });

  it('každé z troch odvodených čísel berie len svoj vstup', () => {
    renderWith({ effectivePortfolioItemId: 11, selectedConversationId: 22, targetUserIdFromMessagesQuery: 33 });

    expect(lastRouterProps().portfolioItemIdForDetail).toBe(11);
    expect(lastRouterProps().conversationIdForMessages).toBe(22);
    expect(lastRouterProps().targetUserIdForMessages).toBe(33);
  });

  it('neplatný vstup jedného čísla neovplyvní ostatné dve', () => {
    renderWith({ effectivePortfolioItemId: NaN, selectedConversationId: 22, targetUserIdFromMessagesQuery: 33 });

    expect(lastRouterProps().portfolioItemIdForDetail).toBeNull();
    expect(lastRouterProps().conversationIdForMessages).toBe(22);
    expect(lastRouterProps().targetUserIdForMessages).toBe(33);
  });
});

describe('obsluha modulu s výberom kategórie (onSkillsCategoryBackHandlerSet)', () => {
  const handlerSetter = () =>
    lastRouterProps().onSkillsCategoryBackHandlerSet as (handler: (() => void) | null) => void;

  it('zapíše podanú obsluhu do refu', () => {
    const props = makeProps();
    render(<DashboardModuleContent {...props} />);
    const handler = fn('obsluha');

    handlerSetter()(handler);

    expect(props.skillsCategoryBackHandlerRef.current).toBe(handler);
  });

  it('podané null ref vyprázdni', () => {
    const props = makeProps();
    props.skillsCategoryBackHandlerRef.current = fn('stará obsluha');
    render(<DashboardModuleContent {...props} />);

    handlerSetter()(null);

    expect(props.skillsCategoryBackHandlerRef.current).toBeNull();
  });

  it('nič nevracia', () => {
    render(<DashboardModuleContent {...makeProps()} />);

    expect(handlerSetter()(fn('obsluha'))).toBeUndefined();
  });

  it('po novom renderi zapisuje do refu, ktorý prišiel s posledným renderom', () => {
    const first = makeProps();
    const view = render(<DashboardModuleContent {...first} />);
    const second = makeProps();
    view.rerender(<DashboardModuleContent {...second} />);
    const handler = fn('obsluha');

    handlerSetter()(handler);

    expect(second.skillsCategoryBackHandlerRef.current).toBe(handler);
    expect(first.skillsCategoryBackHandlerRef.current).toBeNull();
  });

  it('opakované volanie zapíše vždy poslednú obsluhu', () => {
    const props = makeProps();
    render(<DashboardModuleContent {...props} />);
    const setter = handlerSetter();
    const first = fn('prvá');
    const second = fn('druhá');

    setter(first);
    setter(second);

    expect(props.skillsCategoryBackHandlerRef.current).toBe(second);
  });
});
