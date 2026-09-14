import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DashboardLayout from '../DashboardLayout';

jest.mock('@/hooks', () => ({
  useIsMobile: () => true,
}));

jest.mock('../hooks/useMobileViewportHeight', () => ({
  useMobileViewportHeight: () => null,
}));

jest.mock('../Sidebar', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../RightSidebar', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../MobileTopBar', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../MobileTopNav', () => ({
  __esModule: true,
  default: () => <nav data-testid='mobile-bottom-nav' />,
}));

jest.mock('../modules/bug-report/BugReportDialogHost', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../modules/offer-watch/mobile/OfferWatchSettingsMobileHost', () => ({
  __esModule: true,
  default: ({ onOpenChange }: { onOpenChange?: (isOpen: boolean) => void }) => (
    <div>
      <button type='button' onClick={() => onOpenChange?.(true)}>open watches</button>
      <button type='button' onClick={() => onOpenChange?.(false)}>close watches</button>
    </div>
  ),
}));

const noop = () => {};

function renderLayout() {
  return render(
    <DashboardLayout
      activeModule='home'
      activeRightItem=''
      isRightSidebarOpen={false}
      isMobileMenuOpen={false}
      onModuleChange={noop}
      onLogout={noop}
      onRightSidebarClose={noop}
      onRightItemClick={noop}
      onMobileMenuOpen={noop}
      onMobileMenuClose={noop}
      onMobileBack={noop}
      onMobileProfileClick={noop}
      onSidebarLanguageClick={noop}
      onSidebarAccountTypeClick={noop}
      onSidebarAccountSettingsClick={noop}
    >
      <div />
    </DashboardLayout>,
  );
}

describe('DashboardLayout mobile Offer Watch overlay', () => {
  it('hides the bottom navigation while the overlay is open and restores it after close', () => {
    renderLayout();

    expect(screen.getByTestId('mobile-bottom-nav')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'open watches' }));
    expect(screen.queryByTestId('mobile-bottom-nav')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'close watches' }));
    expect(screen.getByTestId('mobile-bottom-nav')).toBeInTheDocument();
  });
});
