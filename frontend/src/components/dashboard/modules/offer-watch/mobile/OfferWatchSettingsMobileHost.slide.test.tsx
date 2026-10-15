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
 * Poloha obrazovky „Sledovanie“ podľa toho, odkiaľ sa otvorila:
 * - z riadku v Nastaveniach sa nehýbe: objaví sa na mieste POD panelom Nastavení a ten sa odsunie doľava,
 *   rovnako ako pri riadku „Jazyk“ (`placement='under-settings'`, bez vsunutia),
 * - z výsledkov sledovaní sa vsunie zboku a pri Späť sa vysunie (`placement='over-app'`, `slideIn`),
 * - po načítaní stránky, kroku vpred alebo zmene okna sa len objaví na svojom mieste.
 */

// `AnimatePresence` drží vysúvajúcu sa obrazovku: v teste je to viditeľný kontajner, aby sa dalo overiť, kde obrazovka je.
jest.mock('framer-motion', () => ({
  motion: { div: 'div' },
  AnimatePresence: ({ children }: { children?: ReactNode }) => <div data-testid='presence'>{children}</div>,
}));

jest.mock('./OfferWatchSettingsMobile', () => ({
  __esModule: true,
  default: ({ slideIn, placement }: { slideIn?: boolean; placement?: string }) => (
    <div
      data-testid='offer-watch-mobile-overlay'
      data-slide-in={String(Boolean(slideIn))}
      data-placement={String(placement)}
    />
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

const overlay = () => screen.getByTestId('offer-watch-mobile-overlay');
const slideInOfOverlay = () => overlay().getAttribute('data-slide-in');
const placementOfOverlay = () => overlay().getAttribute('data-placement');

/** Ťuknutie na riadok „Sledovanie“ v Nastaveniach. */
const tapSettingsRow = () => act(() => window.dispatchEvent(new Event(OFFER_WATCH_MOBILE_REQUEST_EVENT)));

/** „Spravovať sledovania“ na stránke výsledkov (smie sa len na jej adrese). */
const tapFromResults = () => {
  window.history.replaceState(null, '', '/dashboard/watches');
  act(() => {
    window.dispatchEvent(new CustomEvent(OFFER_WATCH_MOBILE_REQUEST_EVENT, { detail: { origin: 'results' } }));
  });
};

describe('OfferWatchSettingsMobileHost – poloha obrazovky', () => {
  beforeEach(() => {
    installMobileMatchMedia();
    window.history.replaceState(null, '', '/dashboard/settings');
  });

  it('appears in place under the Settings panel, without a slide, when the visitor taps the Settings row', async () => {
    render(<OfferWatchSettingsMobileHost onReturnToSettings={jest.fn()} />);

    tapSettingsRow();

    await waitFor(() => expect(placementOfOverlay()).toBe('under-settings'));
    expect(slideInOfOverlay()).toBe('false');
  });

  it('slides in over the app when it is opened from the results', async () => {
    render(<OfferWatchSettingsMobileHost onReturnToSettings={jest.fn()} />);

    tapFromResults();

    await waitFor(() => expect(slideInOfOverlay()).toBe('true'));
    expect(placementOfOverlay()).toBe('over-app');
  });

  it.each([
    ['settings', 'under-settings'],
    ['direct', 'over-app'],
    ['results', 'over-app'],
  ] as const)('only appears, without a slide, when it is restored on load (origin %s)', async (origin, placement) => {
    window.history.replaceState(
      withOfferWatchMobileHistory(null, { version: 2, origin, view: { kind: 'list' } }),
      '',
      OFFER_WATCH_SETTINGS_PATH,
    );

    render(<OfferWatchSettingsMobileHost onReturnToSettings={jest.fn()} />);

    await waitFor(() => expect(screen.getByTestId('offer-watch-mobile-overlay')).toBeInTheDocument());
    expect(slideInOfOverlay()).toBe('false');
    expect(placementOfOverlay()).toBe(placement);
  });

  it('does not slide in again when the visitor steps forward to a screen opened from the results', async () => {
    render(<OfferWatchSettingsMobileHost onReturnToSettings={jest.fn()} />);
    tapFromResults();
    await waitFor(() => expect(slideInOfOverlay()).toBe('true'));

    act(() => window.history.back());
    await waitFor(() => expect(screen.queryByTestId('offer-watch-mobile-overlay')).not.toBeInTheDocument());
    act(() => window.history.forward());

    await waitFor(() => expect(screen.getByTestId('offer-watch-mobile-overlay')).toBeInTheDocument());
    expect(slideInOfOverlay()).toBe('false');
    expect(placementOfOverlay()).toBe('over-app');
  });

  it('keeps the exit container mounted while the screen is closed, so that a leaving screen can finish its exit', async () => {
    render(<OfferWatchSettingsMobileHost onReturnToSettings={jest.fn()} />);

    expect(await screen.findByTestId('presence')).toBeInTheDocument();
    expect(screen.queryByTestId('offer-watch-mobile-overlay')).not.toBeInTheDocument();
  });

  it('puts the screen into the exit container', async () => {
    render(<OfferWatchSettingsMobileHost onReturnToSettings={jest.fn()} />);

    tapSettingsRow();

    const presence = await screen.findByTestId('presence');
    await waitFor(() => expect(within(presence).getByTestId('offer-watch-mobile-overlay')).toBeInTheDocument());
  });

  it('slides in on every tap from the results, not only the first', async () => {
    render(<OfferWatchSettingsMobileHost onReturnToSettings={jest.fn()} />);
    tapFromResults();
    await waitFor(() => expect(slideInOfOverlay()).toBe('true'));
    act(() => window.history.back());
    await waitFor(() => expect(screen.queryByTestId('offer-watch-mobile-overlay')).not.toBeInTheDocument());

    tapFromResults();

    await waitFor(() => expect(slideInOfOverlay()).toBe('true'));
  });

  it('opens under the Settings panel again on every tap on the Settings row', async () => {
    render(<OfferWatchSettingsMobileHost onReturnToSettings={jest.fn()} />);
    tapSettingsRow();
    await waitFor(() => expect(placementOfOverlay()).toBe('under-settings'));
    act(() => window.history.back());
    await waitFor(() => expect(screen.queryByTestId('offer-watch-mobile-overlay')).not.toBeInTheDocument());

    tapSettingsRow();

    await waitFor(() => expect(placementOfOverlay()).toBe('under-settings'));
    expect(slideInOfOverlay()).toBe('false');
  });
});
