import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import DashboardLayout from '../DashboardLayout';

jest.mock('@/hooks', () => ({
  __esModule: true,
  useIsMobile: jest.fn(),
}));

jest.mock('../hooks/useMobileViewportHeight', () => ({
  __esModule: true,
  useMobileViewportHeight: jest.fn(),
}));

jest.mock('../Sidebar', () => ({
  __esModule: true,
  default: () => <div data-testid="sidebar" />,
}));

jest.mock('../RightSidebar', () => ({
  __esModule: true,
  default: () => <div data-testid="right-sidebar" />,
}));

jest.mock('../MobileTopNav', () => ({
  __esModule: true,
  default: () => <div data-testid="mobile-top-nav" />,
}));

jest.mock('../MobileTopBar', () => ({
  __esModule: true,
  default: () => <div data-testid="mobile-top-bar" />,
}));

const { useIsMobile } = jest.requireMock('@/hooks') as {
  useIsMobile: jest.Mock;
};

const { useMobileViewportHeight } = jest.requireMock('../hooks/useMobileViewportHeight') as {
  useMobileViewportHeight: jest.Mock;
};

const baseProps = {
  activeModule: 'home',
  activeRightItem: '',
  isRightSidebarOpen: false,
  isMobileMenuOpen: false,
  onModuleChange: jest.fn(),
  onLogout: jest.fn(),
  onRightSidebarClose: jest.fn(),
  onRightItemClick: jest.fn(),
  onMobileMenuOpen: jest.fn(),
  onMobileMenuClose: jest.fn(),
  onMobileBack: jest.fn(),
  onMobileProfileClick: jest.fn(),
  onSidebarLanguageClick: jest.fn(),
  onSidebarAccountTypeClick: jest.fn(),
  onSidebarAccountSettingsClick: jest.fn(),
};

describe('DashboardLayout mobile bottom navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useIsMobile.mockReturnValue(false);
    useMobileViewportHeight.mockReturnValue(null);
  });

  it.each([
    'offer-reviews',
    'portfolio-detail',
    'portfolio-create',
    'user-profile',
    'skills-describe',
    'feed-post-create',
    'statistics',
  ])('hides the bottom navigation on the %s screen', (activeModule) => {
    render(
      <DashboardLayout {...baseProps} activeModule={activeModule}>
        <div>Obsah</div>
      </DashboardLayout>,
    );

    expect(screen.queryByTestId('mobile-top-nav')).not.toBeInTheDocument();
  });

  it.each(['home', 'profile', 'messages', 'requests', 'notifications'])(
    'keeps the bottom navigation on the %s screen',
    (activeModule) => {
      render(
        <DashboardLayout {...baseProps} activeModule={activeModule}>
          <div>Obsah</div>
        </DashboardLayout>,
      );

      expect(screen.getByTestId('mobile-top-nav')).toBeInTheDocument();
    },
  );
});
