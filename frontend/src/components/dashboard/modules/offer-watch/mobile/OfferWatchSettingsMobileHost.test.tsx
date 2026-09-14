import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import OfferWatchSettingsMobileHost from './OfferWatchSettingsMobileHost';
import {
  OFFER_WATCH_MOBILE_REQUEST_EVENT,
  OFFER_WATCH_SETTINGS_PATH,
  hasOfferWatchSettingsReturnHistory,
  readOfferWatchMobileHistory,
} from './offerWatchMobileNavigation';

jest.mock('./OfferWatchSettingsMobile', () => ({
  __esModule: true,
  default: ({ view, onBack, onPushView }: {
    view: {
      kind: 'list' | 'create' | 'edit';
      watchId?: number;
      picker?: 'category' | 'country' | 'district';
    };
    onBack: () => void;
    onPushView: (view: {
      kind: 'list' | 'create' | 'edit';
      watchId?: number;
      picker?: 'category' | 'country' | 'district';
    }) => void;
  }) => (
    <div data-testid='mobile-watch-host-view'>
      <span data-testid='mobile-watch-host-view-name'>{view.picker || view.kind}</span>
      <button type='button' onClick={onBack}>back</button>
      <button type='button' onClick={() => onPushView({ kind: 'create' })}>create</button>
      <button type='button' onClick={() => onPushView({ kind: 'edit', watchId: 9 })}>edit</button>
      <button
        type='button'
        onClick={() => onPushView(view.kind === 'edit'
          ? { kind: 'edit', watchId: view.watchId, picker: 'category' }
          : { kind: 'create', picker: 'category' })}
      >
        category
      </button>
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
    expect(screen.getByTestId('mobile-watch-host-view-name')).toHaveTextContent(/^list$/);
    expect(window.location.pathname).toBe(OFFER_WATCH_SETTINGS_PATH);
    expect(readOfferWatchMobileHistory(window.history.state)).toEqual({
      version: 2,
      origin: 'settings',
      view: { kind: 'list' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'create' }));
    expect(screen.getByTestId('mobile-watch-host-view-name')).toHaveTextContent(/^create$/);
    expect(readOfferWatchMobileHistory(window.history.state)?.view).toEqual({ kind: 'create' });

    fireEvent.click(screen.getByRole('button', { name: 'category' }));
    expect(screen.getByTestId('mobile-watch-host-view-name')).toHaveTextContent(/^category$/);
    expect(readOfferWatchMobileHistory(window.history.state)?.view).toEqual({
      kind: 'create',
      picker: 'category',
    });

    act(() => window.history.back());
    await waitFor(() => expect(screen.getByTestId('mobile-watch-host-view-name')).toHaveTextContent(/^create$/));

    act(() => window.history.back());
    await waitFor(() => expect(screen.getByTestId('mobile-watch-host-view-name')).toHaveTextContent(/^list$/));

    act(() => window.history.back());
    await waitFor(() => expect(screen.queryByTestId('mobile-watch-host-view')).not.toBeInTheDocument());
    // Otvorenie panelu nastaveni je odlozene za ostatne popstate handlery.
    await waitFor(() => expect(onReturnToSettings).toHaveBeenCalledTimes(1));
  });

  it('opens a direct mobile URL and returns to settings without leaving a stale marker', async () => {
    window.history.replaceState(null, '', OFFER_WATCH_SETTINGS_PATH);
    const onReturnToSettings = jest.fn();
    render(<OfferWatchSettingsMobileHost onReturnToSettings={onReturnToSettings} />);

    expect(await screen.findByTestId('mobile-watch-host-view-name')).toHaveTextContent(/^list$/);
    expect(readOfferWatchMobileHistory(window.history.state)).toEqual({
      version: 2,
      origin: 'direct',
      view: { kind: 'list' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'back' }));

    await waitFor(() => {
      expect(screen.queryByTestId('mobile-watch-host-view')).not.toBeInTheDocument();
      expect(window.location.pathname).toBe('/dashboard/settings');
    });
    expect(readOfferWatchMobileHistory(window.history.state)).toBeNull();
    await waitFor(() => expect(onReturnToSettings).toHaveBeenCalledTimes(1));
  });

  it('recovers the settings return after the dashboard host remounts', async () => {
    const firstReturn = jest.fn();
    const first = render(
      <OfferWatchSettingsMobileHost onReturnToSettings={firstReturn} />,
    );
    act(() => window.dispatchEvent(new Event(OFFER_WATCH_MOBILE_REQUEST_EVENT)));
    expect(screen.getByTestId('mobile-watch-host-view')).toBeInTheDocument();

    first.unmount();
    act(() => window.history.back());
    await waitFor(() => expect(window.location.pathname).toBe('/dashboard/settings'));

    const restoredReturn = jest.fn();
    render(<OfferWatchSettingsMobileHost onReturnToSettings={restoredReturn} />);

    await waitFor(() => expect(restoredReturn).toHaveBeenCalledTimes(1));
    expect(firstReturn).not.toHaveBeenCalled();
  });

  it('handles browser Back from a directly opened URL', async () => {
    window.history.replaceState(null, '', OFFER_WATCH_SETTINGS_PATH);
    const onReturnToSettings = jest.fn();
    render(<OfferWatchSettingsMobileHost onReturnToSettings={onReturnToSettings} />);
    expect(await screen.findByTestId('mobile-watch-host-view')).toBeInTheDocument();

    act(() => window.history.back());

    await waitFor(() => expect(window.location.pathname).toBe('/dashboard/settings'));
    await waitFor(() => expect(onReturnToSettings).toHaveBeenCalledTimes(1));
  });

  it('preserves the underlying route and consumes its return marker after settings open', async () => {
    window.history.replaceState(null, '', '/dashboard/messages/17?source=watch-test');
    const onReturnToSettings = jest.fn();
    const { rerender } = render(
      <OfferWatchSettingsMobileHost
        onReturnToSettings={onReturnToSettings}
        isSettingsOpen={false}
      />,
    );
    act(() => window.dispatchEvent(new Event(OFFER_WATCH_MOBILE_REQUEST_EVENT)));

    act(() => window.history.back());

    await waitFor(() => expect(window.location.pathname).toBe('/dashboard/messages/17'));
    expect(window.location.search).toBe('?source=watch-test');
    await waitFor(() => expect(onReturnToSettings).toHaveBeenCalledTimes(1));
    expect(hasOfferWatchSettingsReturnHistory(window.history.state)).toBe(true);

    rerender(
      <OfferWatchSettingsMobileHost
        onReturnToSettings={onReturnToSettings}
        isSettingsOpen
      />,
    );
    expect(hasOfferWatchSettingsReturnHistory(window.history.state)).toBe(false);
  });

  it('queues only one browser traversal for repeated back clicks', () => {
    render(<OfferWatchSettingsMobileHost onReturnToSettings={jest.fn()} />);
    act(() => window.dispatchEvent(new Event(OFFER_WATCH_MOBILE_REQUEST_EVENT)));
    const backSpy = jest.spyOn(window.history, 'back').mockImplementation(() => undefined);

    fireEvent.click(screen.getByRole('button', { name: 'back' }));
    fireEvent.click(screen.getByRole('button', { name: 'back' }));

    expect(backSpy).toHaveBeenCalledTimes(1);
    backSpy.mockRestore();
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
