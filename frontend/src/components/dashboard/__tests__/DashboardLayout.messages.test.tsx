import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import DashboardLayout from '../DashboardLayout';

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
  });

  it('keeps both mobile messages wrappers full-height when a conversation is open', () => {
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
});
