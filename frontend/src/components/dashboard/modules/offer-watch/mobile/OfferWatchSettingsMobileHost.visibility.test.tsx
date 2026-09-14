import { act, render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import OfferWatchSettingsMobileHost from './OfferWatchSettingsMobileHost';
import { OFFER_WATCH_MOBILE_REQUEST_EVENT } from './offerWatchMobileNavigation';

jest.mock('./OfferWatchSettingsMobile', () => ({
  __esModule: true,
  default: () => <div data-testid='offer-watch-mobile-overlay' />,
}));

function installMobileMatchMedia(): void {
  window.matchMedia = jest.fn().mockImplementation(() => ({
    matches: true,
    media: '(max-width: 1023px)',
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
}

describe('OfferWatchSettingsMobileHost visibility', () => {
  beforeEach(() => {
    installMobileMatchMedia();
    window.history.replaceState(null, '', '/dashboard/settings');
  });

  it('reports open and closed states without repeating true for nested views', async () => {
    const onOpenChange = jest.fn();
    render(
      <OfferWatchSettingsMobileHost
        onReturnToSettings={jest.fn()}
        onOpenChange={onOpenChange}
      />,
    );

    await waitFor(() => expect(onOpenChange).toHaveBeenLastCalledWith(false));

    act(() => window.dispatchEvent(new Event(OFFER_WATCH_MOBILE_REQUEST_EVENT)));
    await waitFor(() => expect(onOpenChange).toHaveBeenLastCalledWith(true));

    const trueCalls = onOpenChange.mock.calls.filter(([value]) => value === true);
    expect(trueCalls).toHaveLength(1);

    act(() => window.history.back());
    await waitFor(() => expect(onOpenChange).toHaveBeenLastCalledWith(false));
  });

  it('reports closed when an open host unmounts', async () => {
    const onOpenChange = jest.fn();
    const view = render(
      <OfferWatchSettingsMobileHost
        onReturnToSettings={jest.fn()}
        onOpenChange={onOpenChange}
      />,
    );

    act(() => window.dispatchEvent(new Event(OFFER_WATCH_MOBILE_REQUEST_EVENT)));
    await waitFor(() => expect(onOpenChange).toHaveBeenLastCalledWith(true));

    view.unmount();
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });
});
