import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DashboardLayout from '../DashboardLayout';

jest.mock('@/hooks', () => ({
  useIsMobile: () => true,
}));

jest.mock('../hooks/useMobileViewportHeight', () => ({
  useMobileViewportHeight: () => null,
}));

/** Vlastnosti, s akými sa vykreslil každý Sidebar (mobilný aj desktopový), v poradí vykreslení. */
const mockSidebarCalls: Array<{ isMobile?: boolean; isOpen?: boolean }> = [];

jest.mock('../Sidebar', () => ({
  __esModule: true,
  default: (props: { isMobile?: boolean; isOpen?: boolean }) => {
    mockSidebarCalls.push(props);
    return null;
  },
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

function renderLayout(isMobileMenuOpen = false) {
  return render(
    <DashboardLayout
      activeModule='home'
      activeRightItem=''
      isRightSidebarOpen={false}
      isMobileMenuOpen={isMobileMenuOpen}
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

/** Či je mobilný panel Nastavení práve otvorený (posledné vykreslenie mobilného Sidebaru). */
function mobileSettingsPanelIsOpen(): boolean | undefined {
  const calls = mockSidebarCalls.filter((props) => props.isMobile);
  return calls[calls.length - 1]?.isOpen;
}

describe('DashboardLayout mobile Offer Watch overlay', () => {
  beforeEach(() => {
    mockSidebarCalls.length = 0;
  });

  it('slides the Settings panel away while the overlay is open and brings it back after close, like the other rows', () => {
    renderLayout(true);
    expect(mobileSettingsPanelIsOpen()).toBe(true);

    // Rovnako ako pri riadku „Jazyk“: panel Nastavení sa zasunie doľava a pod ním ostane obrazovka riadka.
    fireEvent.click(screen.getByRole('button', { name: 'open watches' }));
    expect(mobileSettingsPanelIsOpen()).toBe(false);

    // Späť: panel sa vráti zľava.
    fireEvent.click(screen.getByRole('button', { name: 'close watches' }));
    expect(mobileSettingsPanelIsOpen()).toBe(true);
  });

  it('does not open the Settings panel for an overlay that was not entered from it', () => {
    renderLayout(false);
    expect(mobileSettingsPanelIsOpen()).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'open watches' }));
    expect(mobileSettingsPanelIsOpen()).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'close watches' }));
    expect(mobileSettingsPanelIsOpen()).toBe(false);
  });

  it('hides the bottom navigation while the overlay is open and restores it after close', () => {
    renderLayout();

    expect(screen.getByTestId('mobile-bottom-nav')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'open watches' }));
    expect(screen.queryByTestId('mobile-bottom-nav')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'close watches' }));
    expect(screen.getByTestId('mobile-bottom-nav')).toBeInTheDocument();
  });
});
