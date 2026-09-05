import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { User } from '@/types';

let mockIsMobile = false;

jest.mock('@/hooks', () => ({
  useIsMobile: () => mockIsMobile,
}));

jest.mock('../modules/HomeModule', () => ({
  __esModule: true,
  default: () => <div data-testid="home-module">HomeModule</div>,
}));
jest.mock('../modules/StatisticsModule', () => ({
  __esModule: true,
  default: (props: {
    user: { id: number };
    variant?: string;
    setActiveModule?: unknown;
    onEditProfileClick?: unknown;
    onSkillsOfferClick?: unknown;
  }) => (
    <div
      data-testid="statistics-module"
      data-variant={props.variant}
      data-nav={`${typeof props.setActiveModule}|${typeof props.onEditProfileClick}|${typeof props.onSkillsOfferClick}`}
    >
      StatisticsModule for {props.user.id}
    </div>
  ),
}));
jest.mock('../modules/NotificationsModule', () => ({
  __esModule: true,
  default: () => <div data-testid="notifications-module">NotificationsModule</div>,
}));
jest.mock('../modules/NotificationSettingsModule', () => ({
  __esModule: true,
  default: () => <div data-testid="notification-settings-module">NotificationSettingsModule</div>,
}));
jest.mock('../modules/offer-watch/settings/OfferWatchSettingsDesktop', () => ({
  __esModule: true,
  default: () => <div data-testid="offer-watch-settings-desktop">OfferWatchSettingsDesktop</div>,
}));
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

import ModuleRouter from '../ModuleRouter';

const mockUser = {
  id: 42,
  username: 'u',
  email: 'u@e.com',
  first_name: 'U',
  last_name: 'U',
  user_type: 'individual',
  is_verified: true,
  is_public: true,
  created_at: '',
  updated_at: '',
  profile_completeness: 50,
} as User;

function baseProps() {
  return {
    user: mockUser,
    activeModule: 'home',
    activeRightItem: '',
    isRightSidebarOpen: false,
    accountType: 'personal' as const,
    onUserUpdate: jest.fn(),
    handleRightSidebarToggle: jest.fn(),
    closeOwnProfileEdit: jest.fn(),
    setActiveModule: jest.fn(),
    setIsSkillsCategoryModalOpen: jest.fn(),
    setSelectedSkillsCategory: jest.fn(),
    setIsSkillDescriptionModalOpen: jest.fn(),
    setIsAddCustomCategoryModalOpen: jest.fn(),
    setEditingCustomCategoryIndex: jest.fn(),
    setEditingStandardCategoryIndex: jest.fn(),
    standardCategories: [],
    customCategories: [],
    setAccountType: jest.fn(),
    setIsAccountTypeModalOpen: jest.fn(),
    setIsPersonalAccountModalOpen: jest.fn(),
    removeStandardCategory: jest.fn(),
    removeCustomCategory: jest.fn(),
    selectedSkillsCategory: null,
    onEditProfileClick: jest.fn(),
    onSkillsOfferClick: jest.fn(),
  };
}

describe('ModuleRouter – home', () => {
  beforeEach(() => {
    mockIsMobile = false;
  });

  it('renders the clean HomeModule for the "home" module', () => {
    render(<ModuleRouter {...baseProps()} />);

    expect(screen.getByTestId('home-module')).toBeInTheDocument();
    expect(screen.queryByTestId('statistics-module')).not.toBeInTheDocument();
  });

  it('uses the clean HomeModule on mobile after moving Statistics to its own screen', () => {
    mockIsMobile = true;

    render(<ModuleRouter {...baseProps()} />);

    expect(screen.getByTestId('home-module')).toBeInTheDocument();
    expect(screen.queryByTestId('statistics-module')).not.toBeInTheDocument();
  });

  it('renders StatisticsModule and forwards its navigation callbacks', () => {
    render(<ModuleRouter {...baseProps()} activeModule="statistics" />);

    expect(screen.getByText('StatisticsModule for 42')).toBeInTheDocument();
    expect(screen.getByTestId('statistics-module')).toHaveAttribute(
      'data-variant',
      'desktop-page',
    );
    expect(screen.getByTestId('statistics-module')).toHaveAttribute(
      'data-nav',
      'function|function|function',
    );
  });

  it('renders the mobile Statistics page variant', () => {
    mockIsMobile = true;

    render(<ModuleRouter {...baseProps()} activeModule="statistics" />);

    expect(screen.getByTestId('statistics-module')).toHaveAttribute(
      'data-variant',
      'mobile-page',
    );
  });

  it('renders the notifications feed after history restores a stale right-panel state', () => {
    render(
      <ModuleRouter
        {...baseProps()}
        activeModule="notifications"
        activeRightItem="notifications"
        isRightSidebarOpen
      />,
    );

    expect(screen.getByTestId('notifications-module')).toBeInTheDocument();
    expect(screen.queryByTestId('notification-settings-module')).not.toBeInTheDocument();
  });

  it('keeps the actual notification settings route unchanged', () => {
    render(
      <ModuleRouter
        {...baseProps()}
        activeModule="notification-settings"
        activeRightItem="notifications"
        isRightSidebarOpen
      />,
    );

    expect(screen.getByTestId('notification-settings-module')).toBeInTheDocument();
    expect(screen.queryByTestId('notifications-module')).not.toBeInTheDocument();
  });

  it('renders saved-watch settings only as a desktop right-sidebar section', () => {
    const { rerender } = render(
      <ModuleRouter
        {...baseProps()}
        activeModule="settings"
        activeRightItem="offer-watches"
        isRightSidebarOpen
      />,
    );
    expect(screen.getByTestId('offer-watch-settings-desktop')).toBeInTheDocument();

    mockIsMobile = true;
    rerender(
      <ModuleRouter
        {...baseProps()}
        activeModule="settings"
        activeRightItem="offer-watches"
        isRightSidebarOpen
      />,
    );
    expect(screen.queryByTestId('offer-watch-settings-desktop')).not.toBeInTheDocument();
  });
});
