import React from 'react';
import { fireEvent, render, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import { LanguageProvider } from '@/contexts/LanguageContext';
import { LAST_MANUAL_OFFER_COUNTRY_KEY } from '@/shared/offerCountryPreference';
import MobileTopBar from '../MobileTopBar';
import LanguageModule from '../modules/LanguageModule';
import { MESSAGING_OPEN_CONVERSATION_ACTIONS_EVENT } from '../modules/messages/messagesEvents';
import sk from '../../../../messages/sk.json';
import cs from '../../../../messages/cs.json';
import en from '../../../../messages/en.json';
import de from '../../../../messages/de.json';
import pl from '../../../../messages/pl.json';
import hu from '../../../../messages/hu.json';

jest.unmock('@/contexts/LanguageContext');

const messages = { sk, cs, en, de, pl, hu };
type Locale = keyof typeof messages;
type HeaderProps = React.ComponentProps<typeof MobileTopBar>;
const locales = Object.keys(messages) as Locale[];
const languageKeys = ['slovak', 'czech', 'english', 'german', 'polish', 'hungarian'] as const;
const targetLocales: Locale[] = ['sk', 'cs', 'en', 'de', 'pl', 'hu'];
const languageContexts = [
  { activeModule: 'language' },
  { activeModule: 'profile', activeRightItem: 'language' },
  { activeModule: 'home', activeRightItem: 'language' },
];

function setInitialLocale(locale: Locale) {
  localStorage.setItem('appLocale', locale);
  localStorage.setItem(LAST_MANUAL_OFFER_COUNTRY_KEY, 'SK');
}

function renderLanguage(locale: Locale, props: Partial<HeaderProps> = languageContexts[0]) {
  setInitialLocale(locale);
  const onBack = jest.fn();
  const onProfileClick = jest.fn();
  const onMenuClick = jest.fn();
  const result = render(
    <LanguageProvider>
      <header data-testid="mobile-header">
        <MobileTopBar
          onMenuClick={onMenuClick}
          onBackClick={onBack}
          onProfileClick={onProfileClick}
          {...props}
        />
      </header>
      <main data-testid="language-body"><LanguageModule onBack={onBack} /></main>
    </LanguageProvider>,
  );
  const topBar = result.getByTestId('mobile-header');
  const body = result.getByTestId('language-body');
  // jsdom has no Tailwind styles; scope each assertion to the actual responsive layout.
  const mobile = body.querySelector('div.block.lg\\:hidden') as HTMLElement;
  const desktop = body.querySelector('div.hidden.lg\\:flex') as HTMLElement;
  expect(mobile).not.toBeNull();
  expect(desktop).not.toBeNull();
  return { ...result, topBar, mobile, desktop, onBack, onProfileClick, onMenuClick };
}

describe('mobile language settings header with the real language provider', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => localStorage.clear());

  describe.each(locales)('%s translations', (locale) => {
    it.each(languageContexts)('has a single centered title for %j', (props) => {
      const { topBar, mobile, onBack, onProfileClick, onMenuClick } = renderLanguage(locale, props);
      const title = within(topBar).getByRole('heading', {
        level: 1,
        name: messages[locale].language.title,
      });

      expect(within(topBar).getAllByRole('heading')).toHaveLength(1);
      expect(title.parentElement).toHaveClass('justify-center', 'text-center', 'min-w-0');
      expect(title.parentElement?.parentElement).toHaveClass(
        'grid', 'grid-cols-[2.5rem_minmax(0,1fr)_2.5rem]',
      );
      expect(within(mobile).queryByRole('heading')).not.toBeInTheDocument();
      expect(within(topBar).queryByRole('button', { name: messages[locale].navigation.profile }))
        .not.toBeInTheDocument();
      expect(within(topBar).queryByRole('button', { name: messages[locale].common.menu }))
        .not.toBeInTheDocument();
      expect(within(topBar).getAllByRole('button')).toHaveLength(1);
      fireEvent.click(within(topBar).getByRole('button', { name: messages[locale].common.back }));
      expect(onBack).toHaveBeenCalledTimes(1);
      expect(onProfileClick).not.toHaveBeenCalled();
      expect(onMenuClick).not.toHaveBeenCalled();
    });

    it('keeps the description, six choices, desktop heading and desktop back intact', () => {
      const { mobile, desktop, onBack } = renderLanguage(locale);
      expect(within(mobile).getByText(messages[locale].language.selectLanguage)).toBeInTheDocument();
      expect(within(mobile).getAllByRole('button')).toHaveLength(6);
      for (const key of languageKeys) {
        expect(within(mobile).getByRole('button', { name: messages[locale].language[key] }))
          .toBeInTheDocument();
        expect(within(desktop).getByText(messages[locale].language[key])).toBeInTheDocument();
      }
      expect(within(desktop).getByRole('heading', {
        level: 2, name: messages[locale].language.title,
      })).toBeInTheDocument();
      expect(within(desktop).getByText(messages[locale].language.languageSelection)).toBeInTheDocument();
      expect(within(desktop).getByText(messages[locale].language.selectLanguage)).toBeInTheDocument();
      fireEvent.click(within(desktop).getByRole('button', { name: messages[locale].common.back }));
      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  it.each(targetLocales)('updates the mobile header and persists choosing %s', (targetLocale) => {
    const { topBar, mobile, desktop, onBack } = renderLanguage('sk');
    const index = targetLocales.indexOf(targetLocale);
    const option = within(mobile).getByRole('button', { name: sk.language[languageKeys[index]] });
    fireEvent.pointerDown(option);
    fireEvent.click(option);

    expect(localStorage.getItem('appLocale')).toBe(targetLocale);
    expect(localStorage.getItem(LAST_MANUAL_OFFER_COUNTRY_KEY)).toBe('SK');
    expect(within(topBar).getByRole('heading', {
      level: 1, name: messages[targetLocale].language.title,
    })).toBeInTheDocument();
    expect(within(mobile).queryByRole('heading')).not.toBeInTheDocument();
    expect(within(mobile).getByRole('button', {
      name: messages[targetLocale].language[languageKeys[index]],
    }).querySelector('svg')).toBeInTheDocument();
    expect(within(desktop).getByRole('heading', {
      level: 2, name: messages[targetLocale].language.title,
    })).toBeInTheDocument();
    expect(onBack).not.toHaveBeenCalled();
  });

  it.each(targetLocales)('preserves desktop selection and persistence for %s', (targetLocale) => {
    const { desktop, topBar, onBack } = renderLanguage('sk');
    const index = targetLocales.indexOf(targetLocale);
    const label = within(desktop).getByText(sk.language[languageKeys[index]]);
    const button = label.parentElement?.querySelector('button');
    expect(button).not.toBeNull();
    fireEvent.pointerDown(button!);
    fireEvent.click(button!);
    expect(localStorage.getItem('appLocale')).toBe(targetLocale);
    expect(localStorage.getItem(LAST_MANUAL_OFFER_COUNTRY_KEY)).toBe('SK');
    expect(within(topBar).getByRole('heading', { name: messages[targetLocale].language.title }))
      .toBeInTheDocument();
    expect(button).toHaveClass('bg-black', 'border', 'border-white');
    expect(onBack).not.toHaveBeenCalled();
  });

  it('restores the home profile shortcut after leaving the language screen', () => {
    setInitialLocale('sk');
    const onProfileClick = jest.fn();
    const props = { onMenuClick: jest.fn(), onProfileClick };
    const view = render(
      <LanguageProvider><MobileTopBar {...props} activeModule="language" /></LanguageProvider>,
    );
    expect(view.queryByRole('button', { name: sk.navigation.profile })).not.toBeInTheDocument();
    view.rerender(<LanguageProvider><MobileTopBar {...props} activeModule="home" /></LanguageProvider>);
    expect(view.queryByRole('heading', { name: sk.language.title })).not.toBeInTheDocument();
    fireEvent.click(view.getByRole('button', { name: sk.navigation.profile }));
    expect(onProfileClick).toHaveBeenCalledTimes(1);
  });

  it.each(['home', 'profile', 'privacy', 'messages'])('does not add a language title to %s', (module) => {
    setInitialLocale('sk');
    const { queryByRole } = render(
      <LanguageProvider>
        <MobileTopBar onMenuClick={jest.fn()} onProfileClick={jest.fn()} activeModule={module} />
      </LanguageProvider>,
    );
    expect(queryByRole('heading', { name: sk.language.title })).not.toBeInTheDocument();
  });
});

describe('shared mobile header regressions outside language settings', () => {
  beforeEach(() => {
    localStorage.clear();
    setInitialLocale('sk');
  });

  afterEach(() => localStorage.clear());

  function renderHeader(props: Partial<HeaderProps>) {
    const callbacks = {
      onMenuClick: jest.fn(), onBackClick: jest.fn(), onProfileClick: jest.fn(),
      onFavoritesClick: jest.fn(), onStatisticsClick: jest.fn(),
      onStatisticsBackClick: jest.fn(), onMessagesBackClick: jest.fn(), onSaveClick: jest.fn(),
    };
    const result = render(
      <LanguageProvider><MobileTopBar {...callbacks} {...props} /></LanguageProvider>,
    );
    return { ...result, ...callbacks };
  }

  it.each([
    ['skills', sk.profile.skills], ['skills-offer', 'Ponúkam'], ['skills-search', 'Hľadám'],
    ['skills-select-category', 'Vyber kategóriu'], ['offer-reviews', sk.reviews.title],
    ['favorites', sk.navigation.favorites], ['notifications', sk.rightSidebar.notifications],
    ['notification-settings', sk.rightSidebar.notifications],
    ['account-type', sk.rightSidebar.accountType], ['privacy', sk.privacy.mobileTitle],
    ['portfolio-create', sk.portfolio.createAction], ['blocked-users', sk.blockedUsers.title],
  ])('preserves the %s title and existing profile shortcut policy', (activeModule, title) => {
    const view = renderHeader({ activeModule });
    expect(view.getByRole('heading', { name: title })).toBeInTheDocument();
    const profile = view.queryByRole('button', { name: sk.navigation.profile });
    if (activeModule === 'skills-select-category') expect(profile).toBeInTheDocument();
    else expect(profile).not.toBeInTheDocument();
    expect(view.queryByRole('heading', { name: sk.language.title })).not.toBeInTheDocument();
  });

  it.each([
    ['account-type', sk.rightSidebar.accountType], ['privacy', sk.privacy.mobileTitle],
    ['blocked-users', sk.blockedUsers.title], ['account-settings', sk.rightSidebar.account],
  ])('preserves the %s right-sidebar detail header and Back callback', (activeRightItem, title) => {
    const view = renderHeader({ activeModule: 'profile', activeRightItem });
    expect(view.getByRole('heading', { name: title })).toBeInTheDocument();
    expect(view.queryByRole('button', { name: sk.common.menu })).not.toBeInTheDocument();
    fireEvent.click(view.getByRole('button', { name: sk.common.back }));
    expect(view.onBackClick).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['overview', sk.rightSidebar.account], ['verify-email', sk.profile.verifyEmailButton],
    ['delete-account', sk.deleteAccount.sectionTitle],
  ] as const)('preserves the account %s detail title', (accountSettingsView, title) => {
    const view = renderHeader({ activeModule: 'account-settings', accountSettingsView });
    expect(view.getByRole('heading', { name: title })).toBeInTheDocument();
  });

  it.each(['offer', 'search', 'invalid', null])('keeps skill-description actions for mode %s', (mode) => {
    if (mode) localStorage.setItem('skillsDescribeMode', mode);
    const view = renderHeader({ activeModule: 'skills-describe' });
    expect(view.getByRole('heading', {
      name: mode === 'search' ? sk.skills.describeWhatYouSeek : sk.skills.describeSkillTitle,
    })).toBeInTheDocument();
    fireEvent.click(view.getByRole('button', { name: 'Uložiť' }));
    expect(view.onSaveClick).toHaveBeenCalledTimes(1);
    fireEvent.click(view.getByRole('button', { name: 'Zatvoriť' }));
    expect(view.onBackClick).toHaveBeenCalledTimes(1);
  });

  it('keeps profile edit title and its existing back action', () => {
    const view = renderHeader({ activeModule: 'profile', isEditMode: true });
    expect(view.getByRole('heading', { name: sk.profile.editProfile })).toBeInTheDocument();
    expect(view.queryByRole('button', { name: sk.common.menu })).not.toBeInTheDocument();
    fireEvent.click(view.getByRole('button', { name: sk.common.back }));
    expect(view.onBackClick).toHaveBeenCalledTimes(1);
  });

  it('preserves requests refresh, title and its special grid layout', () => {
    const refresh = jest.fn();
    window.addEventListener('requestsRefresh', refresh);
    try {
      const view = renderHeader({ activeModule: 'requests' });
      const heading = view.getByRole('heading', { name: sk.requests.title });
      expect(heading.parentElement?.parentElement).toHaveClass('grid-cols-[minmax(0,1fr)_0_auto]');
      fireEvent.click(view.getByRole('button', { name: sk.common.refresh }));
      expect(refresh).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener('requestsRefresh', refresh);
    }
  });

  it('preserves the own profile menu and Statistics action', () => {
    const view = renderHeader({ activeModule: 'profile' });
    fireEvent.click(view.getByRole('button', { name: sk.common.menu }));
    fireEvent.click(view.getByRole('button', { name: sk.dashboard.statistics }));
    expect(view.onMenuClick).toHaveBeenCalledTimes(1);
    expect(view.onStatisticsClick).toHaveBeenCalledTimes(1);
    expect(view.onBackClick).not.toHaveBeenCalled();
  });

  it.each([true, false])('preserves the foreign profile menu with a registered opener: %s', (registered) => {
    const propertyName = '__openUserProfileModal';
    const previousDescriptor = Object.getOwnPropertyDescriptor(window, propertyName);
    const openProfileMenu = jest.fn();
    Object.defineProperty(window, propertyName, {
      configurable: true,
      writable: true,
      value: registered ? openProfileMenu : undefined,
    });
    try {
      const view = renderHeader({ activeModule: 'user-profile', viewedUserNotFound: false });
      fireEvent.click(view.getByRole('button', { name: sk.common.menu }));
      expect(openProfileMenu).toHaveBeenCalledTimes(registered ? 1 : 0);
      expect(view.onMenuClick).not.toHaveBeenCalled();
      expect(view.onBackClick).not.toHaveBeenCalled();
    } finally {
      if (previousDescriptor) Object.defineProperty(window, propertyName, previousDescriptor);
      else Reflect.deleteProperty(window, propertyName);
    }
  });

  it('keeps the home Favorites shortcut functional', () => {
    const view = renderHeader({ activeModule: 'home' });
    fireEvent.click(view.getByRole('button', { name: sk.navigation.favorites }));
    expect(view.onFavoritesClick).toHaveBeenCalledTimes(1);
    expect(view.onMenuClick).not.toHaveBeenCalled();
  });

  it.each(['messages', 'user-profile'])('does not leak the profile shortcut into %s', (activeModule) => {
    const view = renderHeader({ activeModule });
    expect(view.queryByRole('button', { name: sk.navigation.profile })).not.toBeInTheDocument();
  });

  it.each([
    { messagePeerName: 'Tester', messagePeerAvatarUrl: '/test-avatar.webp' },
    { messagePeerName: 'Tester' },
    { messagePeerName: '' },
    { messagePeerName: 'Team', messagePeerIsGroup: true },
    { messagePeerName: '', messagePeerIsGroup: true },
  ])('retains conversation title and actions for %j', (peer) => {
    const actions = jest.fn();
    window.addEventListener(MESSAGING_OPEN_CONVERSATION_ACTIONS_EVENT, actions);
    try {
      const view = renderHeader({ activeModule: 'messages', isMessageConversationOpen: true, ...peer });
      expect(view.getByRole('heading', { name: peer.messagePeerName || sk.messages.unknownUser }))
        .toBeInTheDocument();
      expect(view.getByRole('button', { name: sk.messages.openPeerProfile })).toBeDisabled();
      if ('messagePeerAvatarUrl' in peer) {
        expect(view.getByRole('img', { name: 'Tester' })).toHaveAttribute('src', peer.messagePeerAvatarUrl);
      }
      fireEvent.click(view.getByRole('button', { name: sk.messages.openConversationActions }));
      fireEvent.click(view.getByRole('button', { name: sk.common.back }));
      expect(actions).toHaveBeenCalledTimes(1);
      expect(view.onMessagesBackClick).toHaveBeenCalledTimes(1);
      expect(view.onBackClick).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener(MESSAGING_OPEN_CONVERSATION_ACTIONS_EVENT, actions);
    }
  });

  it.each(['My account', undefined])('retains the messages-list title for %s', (accountName) => {
    const view = renderHeader({ activeModule: 'messages', accountName });
    expect(view.getByRole('heading', { name: accountName || sk.navigation.profile })).toBeInTheDocument();
    expect(view.queryByRole('button', { name: sk.common.back })).not.toBeInTheDocument();
  });
});
