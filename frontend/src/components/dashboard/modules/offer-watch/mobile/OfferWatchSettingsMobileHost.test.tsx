import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import OfferWatchSettingsMobileHost from './OfferWatchSettingsMobileHost';
import {
  OFFER_WATCH_MOBILE_REQUEST_EVENT,
  OFFER_WATCH_SETTINGS_PATH,
  readOfferWatchMobileHistory,
} from './offerWatchMobileNavigation';

jest.mock('./OfferWatchSettingsMobile', () => ({
  __esModule: true,
  default: ({ view, onBack, onPushView }: {
    view: { kind: 'list' | 'create' | 'edit'; watchId?: number };
    onBack: () => void;
    onPushView: (view: { kind: 'list' | 'create' | 'edit'; watchId?: number }) => void;
  }) => (
    <div data-testid='mobile-watch-host-view'>
      <span>{view.kind}</span>
      <button type='button' onClick={onBack}>back</button>
      <button type='button' onClick={() => onPushView({ kind: 'create' })}>create</button>
      <button type='button' onClick={() => onPushView({ kind: 'edit', watchId: 9 })}>edit</button>
    </div>
  ),
}));

let mobileViewport = true;

function installMatchMedia() {
  window.matchMedia = jest.fn().mockImplementation(() => ({
      matches: mobileViewport,
      media: '(max-width: 1023px)',
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
}

describe('OfferWatchSettingsMobileHost', () => {
  beforeEach(() => {
    mobileViewport = true;
    installMatchMedia();
    window.history.replaceState(null, '', '/dashboard/settings');
  });

  it('opens from mobile settings and gives every nested screen its own history entry', async () => {
    const onReturnToSettings = jest.fn();
    render(<OfferWatchSettingsMobileHost onReturnToSettings={onReturnToSettings} />);

    act(() => window.dispatchEvent(new Event(OFFER_WATCH_MOBILE_REQUEST_EVENT)));
    expect(screen.getByTestId('mobile-watch-host-view')).toHaveTextContent('list');
    expect(window.location.pathname).toBe(OFFER_WATCH_SETTINGS_PATH);
    expect(readOfferWatchMobileHistory(window.history.state)).toEqual({
      version: 1,
      origin: 'settings',
      view: { kind: 'list' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'create' }));
    expect(screen.getByTestId('mobile-watch-host-view')).toHaveTextContent('create');
    expect(readOfferWatchMobileHistory(window.history.state)?.view).toEqual({ kind: 'create' });

    act(() => window.history.back());
    await waitFor(() => expect(screen.getByTestId('mobile-watch-host-view')).toHaveTextContent('list'));

    act(() => window.history.back());
    await waitFor(() => expect(screen.queryByTestId('mobile-watch-host-view')).not.toBeInTheDocument());
    expect(onReturnToSettings).toHaveBeenCalledTimes(1);
  });

  it('opens a direct mobile URL and returns to settings without leaving a stale marker', async () => {
    window.history.replaceState(null, '', OFFER_WATCH_SETTINGS_PATH);
    const onReturnToSettings = jest.fn();
    render(<OfferWatchSettingsMobileHost onReturnToSettings={onReturnToSettings} />);

    expect(await screen.findByTestId('mobile-watch-host-view')).toHaveTextContent('list');
    expect(readOfferWatchMobileHistory(window.history.state)?.origin).toBe('direct');

    fireEvent.click(screen.getByRole('button', { name: 'back' }));

    expect(screen.queryByTestId('mobile-watch-host-view')).not.toBeInTheDocument();
    expect(window.location.pathname).toBe('/dashboard/settings');
    expect(readOfferWatchMobileHistory(window.history.state)).toBeNull();
    expect(onReturnToSettings).toHaveBeenCalledTimes(1);
  });

  it('ignores the mobile open event on a desktop viewport', () => {
    mobileViewport = false;
    render(<OfferWatchSettingsMobileHost onReturnToSettings={jest.fn()} />);

    act(() => window.dispatchEvent(new Event(OFFER_WATCH_MOBILE_REQUEST_EVENT)));

    expect(screen.queryByTestId('mobile-watch-host-view')).not.toBeInTheDocument();
    expect(window.location.pathname).toBe('/dashboard/settings');
  });
});
