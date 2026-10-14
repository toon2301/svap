/** @jest-environment node */

import { renderToString } from 'react-dom/server';
import OfferWatchSettingsMobileHost from './OfferWatchSettingsMobileHost';
import {
  OFFER_WATCH_MOBILE_REQUEST_EVENT,
  readOfferWatchMobileRequestOrigin,
  requestOfferWatchMobile,
} from './offerWatchMobileNavigation';
import { isOfferWatchMobileViewport } from './offerWatchMobileViewport';
import { useOfferWatchResultsNavigation } from '../results/offerWatchResultsNavigation';

jest.mock('./OfferWatchSettingsMobile', () => ({ __esModule: true, default: () => null }));

describe('Offer Watch navigation in a real server environment', () => {
  it('runs without browser globals rather than replacing a jsdom window', () => {
    expect(typeof window).toBe('undefined');
    expect(typeof document).toBe('undefined');
  });

  it('ignores mobile requests and reports a safe origin without a browser', () => {
    expect(() => requestOfferWatchMobile()).not.toThrow();
    expect(() => requestOfferWatchMobile('results')).not.toThrow();
    expect(readOfferWatchMobileRequestOrigin(new Event(OFFER_WATCH_MOBILE_REQUEST_EVENT)))
      .toBe('settings');
  });

  it('uses the non-mobile default when media matching and viewport width do not exist', () => {
    expect(isOfferWatchMobileViewport()).toBe(false);
  });

  it('renders no mobile portal or navigation side effects on the server', () => {
    const onReturnToSettings = jest.fn();
    const onOpenChange = jest.fn();
    const onOpenDesktop = jest.fn();
    expect(renderToString(
      <OfferWatchSettingsMobileHost
        onReturnToSettings={onReturnToSettings}
        onOpenChange={onOpenChange}
        onOpenDesktop={onOpenDesktop}
      />,
    )).toBe('');
    expect(onReturnToSettings).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(onOpenDesktop).not.toHaveBeenCalled();
  });

  it('keeps the results navigation callback inert when rendered without a browser', () => {
    const openDesktopSettings = jest.fn();
    const setActiveRightItem = jest.fn();
    let navigate: () => void = () => { throw new Error('The SSR probe did not render'); };
    /** Render the actual hook under the server renderer without replacing React hooks. */
    function NavigationProbe() {
      navigate = useOfferWatchResultsNavigation({
        activeModule: 'watches', openDesktopSettings, setActiveRightItem,
      });
      return null;
    }
    expect(renderToString(<NavigationProbe />)).toBe('');
    expect(() => navigate()).not.toThrow();
    expect(openDesktopSettings).not.toHaveBeenCalled();
    expect(setActiveRightItem).not.toHaveBeenCalled();
  });
});
