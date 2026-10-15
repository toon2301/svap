import type { ReactNode } from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import OfferWatchSettingsMobileHost from './OfferWatchSettingsMobileHost';
import {
  OFFER_WATCH_MOBILE_REQUEST_EVENT,
  OFFER_WATCH_SETTINGS_PATH,
  withOfferWatchMobileHistory,
} from './offerWatchMobileNavigation';

/**
 * Obrazovka „Sledovanie“ sa po ťuknutí na riadok vsúva zboku (rovnako sa pri Späť vysúva), no po načítaní stránky,
 * kroku vpred alebo zmene okna sa len objaví na svojom mieste – pri obnove by posun pôsobil ako blikanie.
 */

// `AnimatePresence` drží vysúvajúcu sa obrazovku: v teste je to viditeľný kontajner, aby sa dalo overiť, kde obrazovka je.
jest.mock('framer-motion', () => ({
  motion: { div: 'div' },
  AnimatePresence: ({ children }: { children?: ReactNode }) => <div data-testid='presence'>{children}</div>,
}));

jest.mock('./OfferWatchSettingsMobile', () => ({
  __esModule: true,
  default: ({ slideIn }: { slideIn?: boolean }) => (
    <div data-testid='offer-watch-mobile-overlay' data-slide-in={String(Boolean(slideIn))} />
  ),
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

const slideInOfOverlay = () => screen.getByTestId('offer-watch-mobile-overlay').getAttribute('data-slide-in');

describe('OfferWatchSettingsMobileHost – vsunutie obrazovky', () => {
  beforeEach(() => {
    installMobileMatchMedia();
    window.history.replaceState(null, '', '/dashboard/settings');
  });

  it('slides in when the visitor taps the Settings row', async () => {
    render(<OfferWatchSettingsMobileHost onReturnToSettings={jest.fn()} />);

    act(() => window.dispatchEvent(new Event(OFFER_WATCH_MOBILE_REQUEST_EVENT)));

    await waitFor(() => expect(slideInOfOverlay()).toBe('true'));
  });

  it('only appears, without a slide, when it is restored on load', async () => {
    window.history.replaceState(
      withOfferWatchMobileHistory(null, { version: 2, origin: 'settings', view: { kind: 'list' } }),
      '',
      OFFER_WATCH_SETTINGS_PATH,
    );

    render(<OfferWatchSettingsMobileHost onReturnToSettings={jest.fn()} />);

    await waitFor(() => expect(screen.getByTestId('offer-watch-mobile-overlay')).toBeInTheDocument());
    expect(slideInOfOverlay()).toBe('false');
  });

  it('does not slide in again when the visitor steps forward to it', async () => {
    render(<OfferWatchSettingsMobileHost onReturnToSettings={jest.fn()} />);
    act(() => window.dispatchEvent(new Event(OFFER_WATCH_MOBILE_REQUEST_EVENT)));
    await waitFor(() => expect(slideInOfOverlay()).toBe('true'));

    act(() => window.history.back());
    await waitFor(() => expect(screen.queryByTestId('offer-watch-mobile-overlay')).not.toBeInTheDocument());
    act(() => window.history.forward());

    await waitFor(() => expect(screen.getByTestId('offer-watch-mobile-overlay')).toBeInTheDocument());
    expect(slideInOfOverlay()).toBe('false');
  });

  it('keeps the exit container mounted while the screen is closed, so that a leaving screen can finish sliding out', async () => {
    render(<OfferWatchSettingsMobileHost onReturnToSettings={jest.fn()} />);

    expect(await screen.findByTestId('presence')).toBeInTheDocument();
    expect(screen.queryByTestId('offer-watch-mobile-overlay')).not.toBeInTheDocument();
  });

  it('puts the screen into the exit container', async () => {
    render(<OfferWatchSettingsMobileHost onReturnToSettings={jest.fn()} />);

    act(() => window.dispatchEvent(new Event(OFFER_WATCH_MOBILE_REQUEST_EVENT)));

    const presence = await screen.findByTestId('presence');
    await waitFor(() => expect(within(presence).getByTestId('offer-watch-mobile-overlay')).toBeInTheDocument());
  });

  it('slides in on every tap, not only the first', async () => {
    render(<OfferWatchSettingsMobileHost onReturnToSettings={jest.fn()} />);
    act(() => window.dispatchEvent(new Event(OFFER_WATCH_MOBILE_REQUEST_EVENT)));
    await waitFor(() => expect(slideInOfOverlay()).toBe('true'));
    act(() => window.history.back());
    await waitFor(() => expect(screen.queryByTestId('offer-watch-mobile-overlay')).not.toBeInTheDocument());

    act(() => window.dispatchEvent(new Event(OFFER_WATCH_MOBILE_REQUEST_EVENT)));

    await waitFor(() => expect(slideInOfOverlay()).toBe('true'));
  });
});
