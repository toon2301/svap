/**
 * Žiadosť „prepni ma na Nástenku" musí skončiť PREPNUTÍM MODULU.
 *
 * Toto je presne to miesto, kde pôvodná oprava zlyhala: `router.push` sa síce
 * zavolal, ale Next router je celý čas na route `/dashboard`, takže sa nič
 * neprepli. Test preto tvrdí účinok (`onModuleChange('home')`), nie volanie.
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import DashboardLayout from '../DashboardLayout';
import { requestFeedHomeNavigation } from '../modules/feed/feedHomeNavigation';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/hooks', () => ({
  useIsMobile: () => false,
  useIsMobileState: () => ({ isMobile: false, isResolved: true }),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fallback?: string) => fallback ?? _k }),
}));

jest.mock('../Sidebar', () => ({ __esModule: true, default: () => <nav /> }));
jest.mock('../RightSidebar', () => ({ __esModule: true, default: () => <aside /> }));
jest.mock('../MobileTopNav', () => ({ __esModule: true, default: () => null }));
jest.mock('../MobileTopBar', () => ({ __esModule: true, default: () => null }));
jest.mock('../modules/bug-report/BugReportDialogHost', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../modules/offer-watch/mobile/OfferWatchSettingsMobileHost', () => ({
  __esModule: true,
  default: () => null,
}));

const noop = () => {};

function renderLayout(onModuleChange: (moduleId: string) => void) {
  return render(
    <DashboardLayout
      activeModule="profile"
      activeRightItem=""
      isRightSidebarOpen={false}
      isMobileMenuOpen={false}
      onModuleChange={onModuleChange}
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
      <div data-testid="module-content" />
    </DashboardLayout>,
  );
}

describe('žiadosť o prepnutie na Nástenku', () => {
  it('reaches the module switch, not just the router', () => {
    const onModuleChange = jest.fn();
    renderLayout(onModuleChange);

    act(() => requestFeedHomeNavigation());

    // `handleMainModuleChange('home')` prepne modul AJ adresu – jediný lievik,
    // ktorým appka moduly naozaj mení.
    expect(onModuleChange).toHaveBeenCalledWith('home');
  });

  it('stops listening once the layout is gone', () => {
    const onModuleChange = jest.fn();
    const { unmount } = renderLayout(onModuleChange);
    unmount();

    act(() => requestFeedHomeNavigation());

    expect(onModuleChange).not.toHaveBeenCalled();
  });
});
