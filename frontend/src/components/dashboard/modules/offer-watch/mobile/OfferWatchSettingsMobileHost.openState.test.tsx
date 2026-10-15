import type { MutableRefObject, ReactNode } from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { act, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import OfferWatchSettingsMobileHost from './OfferWatchSettingsMobileHost';
import { OFFER_WATCH_MOBILE_REQUEST_EVENT } from './offerWatchMobileNavigation';

/**
 * Hostiteľ hlási, či je obrazovka otvorená, ešte PRED vykreslením (layout efekt): rodič podľa toho zatvára a
 * otvára panel Nastavení. Pasívny efekt by pri Späť nechal jedno vykreslenie, v ktorom nie je ani obrazovka
 * (už zmizla), ani panel (ešte sa neotvoril), takže by na okamih blikla stránka pod nimi.
 *
 * Model: súrodenec hostiteľa sa prekreslí v TOM ISTOM potvrdení (reaguje na rovnakú udalosť) a jeho layout efekt
 * beží až po layout efekte hostiteľa – vidí, či už bolo „otvorené / zatvorené“ nahlásené.
 */

jest.mock('framer-motion', () => ({
  motion: { div: 'div' },
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

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

/** Čo súrodenec videl vo svojom layout efekte po každom potvrdenom vykreslení: nahlásený stav hostiteľa. */
const seenInLayout: boolean[] = [];

/** Prekreslí sa v rovnakom potvrdení ako hostiteľ (rovnaké udalosti) a zapíše nahlásený stav. */
function Sibling({ reported }: { reported: MutableRefObject<boolean> }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((tick) => tick + 1);
    window.addEventListener(OFFER_WATCH_MOBILE_REQUEST_EVENT, bump);
    window.addEventListener('popstate', bump);
    return () => {
      window.removeEventListener(OFFER_WATCH_MOBILE_REQUEST_EVENT, bump);
      window.removeEventListener('popstate', bump);
    };
  }, []);
  useLayoutEffect(() => {
    seenInLayout.push(reported.current);
  });
  return null;
}

function Probe() {
  const reported = useRef(false);
  return (
    <>
      <OfferWatchSettingsMobileHost
        onReturnToSettings={jest.fn()}
        onOpenChange={(isOpen) => {
          reported.current = isOpen;
        }}
      />
      <Sibling reported={reported} />
    </>
  );
}

describe('OfferWatchSettingsMobileHost – hlásenie otvorenia', () => {
  beforeEach(() => {
    installMobileMatchMedia();
    window.history.replaceState(null, '', '/dashboard/settings');
    seenInLayout.length = 0;
  });

  it('reports that the screen opened in the same commit that mounts it', () => {
    render(<Probe />);
    seenInLayout.length = 0;

    act(() => {
      window.dispatchEvent(new Event(OFFER_WATCH_MOBILE_REQUEST_EVENT));
    });

    // Prvé potvrdenie po ťuknutí už nesie nahlásené „otvorené“; po pasívnom efekte by tam bolo ešte `false`.
    expect(seenInLayout[0]).toBe(true);
  });

  it('reports that the screen closed in the same commit that removes it', async () => {
    render(<Probe />);
    act(() => {
      window.dispatchEvent(new Event(OFFER_WATCH_MOBILE_REQUEST_EVENT));
    });
    expect(seenInLayout[seenInLayout.length - 1]).toBe(true);
    seenInLayout.length = 0;

    await act(async () => {
      window.history.back();
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(seenInLayout.length).toBeGreaterThan(0);
    expect(seenInLayout[0]).toBe(false);
  });
});
