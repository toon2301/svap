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
/** Zachytene listenery na prekrocenie hranice 1024 px. */
let mediaListeners: Array<() => void> = [];

function installMatchMedia() {
  window.matchMedia = jest.fn().mockImplementation(() => ({
      get matches() {
        return mobileViewport;
      },
      media: '(max-width: 1023px)',
      onchange: null,
      // Zachytene, nie zahodene: prechod cez hranicu sa inak neda vyvolat.
      addEventListener: (_type: string, listener: () => void) => {
        mediaListeners.push(listener);
      },
      removeEventListener: (_type: string, listener: () => void) => {
        mediaListeners = mediaListeners.filter((entry) => entry !== listener);
      },
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
}

/** Prekroc hranicu 1024 px smerom na desktop. */
function growToDesktop() {
  mobileViewport = false;
  act(() => mediaListeners.forEach((listener) => listener()));
}

describe('OfferWatchSettingsMobileHost', () => {
  beforeEach(() => {
    mobileViewport = true;
    mediaListeners = [];
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
    // Otvorenie panelu nastaveni je odlozene za ostatne popstate handlery.
    await waitFor(() => expect(onReturnToSettings).toHaveBeenCalledTimes(1));
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

    describe('spolupraca s nadradenym popstate handlerom', () => {
    it('opens the settings panel only after every other popstate handler ran', async () => {
      const order: string[] = [];
      const onReturnToSettings = jest.fn(() => {
        order.push('return');
      });
      render(<OfferWatchSettingsMobileHost onReturnToSettings={onReturnToSettings} />);

      act(() => window.dispatchEvent(new Event(OFFER_WATCH_MOBILE_REQUEST_EVENT)));
      expect(screen.getByTestId('mobile-watch-host-view')).toBeInTheDocument();

      // Nadradeny listener sa registruje AZ PO tomto komponente – presne ako
      // v appke, kde efekty dietata bezia skor nez rodicove. Pri rozpoznanej
      // ceste konci zatvorenim mobilneho menu, takze synchronne otvorenie by
      // hned zase zhaslo.
      const parentHandler = () => {
        order.push('parent');
      };
      window.addEventListener('popstate', parentHandler);

      act(() => window.history.back());
      await waitFor(() => expect(onReturnToSettings).toHaveBeenCalledTimes(1));

      expect(order).toEqual(['parent', 'return']);
      window.removeEventListener('popstate', parentHandler);
    });
  });

  describe('prechod cez hranicu 1024 px', () => {
    it('hands the open section over to the desktop layout', () => {
      const onOpenDesktop = jest.fn();
      render(
        <OfferWatchSettingsMobileHost
          onReturnToSettings={jest.fn()}
          onOpenDesktop={onOpenDesktop}
        />,
      );

      act(() => window.dispatchEvent(new Event(OFFER_WATCH_MOBILE_REQUEST_EVENT)));
      expect(screen.getByTestId('mobile-watch-host-view')).toBeInTheDocument();

      growToDesktop();

      // Panel zhasne…
      expect(screen.queryByTestId('mobile-watch-host-view')).not.toBeInTheDocument();
      // …adresa ostava na sledovanych ponukach…
      expect(window.location.pathname).toBe(OFFER_WATCH_SETTINGS_PATH);
      // …a desktopovy stav sa dotiahne za nou. Bez toho by na obrazovke ostal
      // modul, ktory bol POD mobilnym panelom.
      expect(onOpenDesktop).toHaveBeenCalledTimes(1);
      // Mobilny stitok v historii uz nema co robit.
      expect(readOfferWatchMobileHistory(window.history.state)).toBeNull();
    });

    it('leaves a desktop mount alone when no mobile panel was open', () => {
      mobileViewport = false;
      window.history.replaceState(null, '', OFFER_WATCH_SETTINGS_PATH);
      const onOpenDesktop = jest.fn();

      render(
        <OfferWatchSettingsMobileHost
          onReturnToSettings={jest.fn()}
          onOpenDesktop={onOpenDesktop}
        />,
      );

      // Priame otvorenie na desktope si pociatocny stav sekcie riesi samotna
      // stranka route-u; druhe otvorenie by len pridalo krok do historie.
      expect(onOpenDesktop).not.toHaveBeenCalled();
    });
  });
});
