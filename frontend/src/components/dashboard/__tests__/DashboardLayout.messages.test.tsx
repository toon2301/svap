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
};

describe('DashboardLayout messages mobile sizing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useIsMobile.mockReturnValue(false);
    useMobileViewportHeight.mockReturnValue(null);
  });

  it('keeps both mobile messages wrappers full-height when a conversation is open', () => {
    useIsMobile.mockReturnValue(true);

    render(
      <DashboardLayout
        {...baseProps}
        activeModule="messages"
        isMobileMessageConversationOpen
      >
        <div data-testid="layout-child">Obsah sprav</div>
      </DashboardLayout>,
    );

    const widthWrapper = screen.getByTestId('layout-child').parentElement;
    const spacingWrapper = widthWrapper?.parentElement;

    expect(widthWrapper).toHaveClass('h-full');
    expect(widthWrapper).toHaveClass('min-h-0');
    expect(spacingWrapper).toHaveClass('h-full');
    expect(spacingWrapper).toHaveClass('min-h-0');
  });

  it('uses the visible mobile viewport height only for an open mobile message conversation', () => {
    useIsMobile.mockReturnValue(true);
    useMobileViewportHeight.mockReturnValue(612);

    const { container } = render(
      <DashboardLayout
        {...baseProps}
        activeModule="messages"
        isMobileMessageConversationOpen
      >
        <div data-testid="layout-child">Obsah sprav</div>
      </DashboardLayout>,
    );

    const root = container.firstElementChild as HTMLElement | null;
    const main = root?.querySelector('[data-dashboard-main]') as HTMLElement | null;

    expect(root).toHaveStyle({ height: '612px' });
    expect(main).toHaveStyle({ height: '612px' });
    expect(useMobileViewportHeight).toHaveBeenCalledWith(true);
  });

  it('does not opt into the dynamic mobile viewport outside the mobile message detail flow', () => {
    render(
      <DashboardLayout {...baseProps} activeModule="messages">
        <div data-testid="layout-child">Obsah sprav</div>
      </DashboardLayout>,
    );

    expect(useMobileViewportHeight).toHaveBeenCalledWith(false);
  });
});
