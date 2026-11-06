import { render, screen, act } from '@testing-library/react';
import OfflineIndicator from '../OfflineIndicator';

/** Nastaví, čo o pripojení hlási prehliadač (`navigator.onLine`). */
function setOnLine(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', { value, configurable: true });
}

/** Prepne pripojenie a pošle stránke príslušnú udalosť, tak ako to robí prehliadač. */
function changeConnection(online: boolean) {
  setOnLine(online);
  act(() => {
    window.dispatchEvent(new Event(online ? 'online' : 'offline'));
  });
}

/** Pruh (koreňový `div`) okolo daného textu, alebo `null`, keď text nie je vykreslený. */
function bannerOf(text: RegExp): HTMLElement | null {
  return (screen.queryByText(text)?.closest('div.fixed') as HTMLElement | undefined) ?? null;
}

describe('OfflineIndicator', () => {
  const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
  const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

  beforeEach(() => {
    jest.useFakeTimers();
    Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('nezobrazuje banner, keď je online', () => {
    render(<OfflineIndicator />);
    expect(screen.queryByText(/Offline režim/)).not.toBeInTheDocument();
  });

  it('zobrazí banner, keď je offline a schová po návrate online', () => {
    Object.defineProperty(window.navigator, 'onLine', { value: false });
    render(<OfflineIndicator />);

    expect(screen.getByText(/Offline režim/)).toBeInTheDocument();

    // prepni na online a po 3s sa skryje
    Object.defineProperty(window.navigator, 'onLine', { value: true });
    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(screen.queryByText(/Offline režim/)).not.toBeInTheDocument();
  });

  it('registruje a odregisruje event listener-y', () => {
    const { unmount } = render(<OfflineIndicator />);
    expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  // Nález 270: zelený pruh mal v online stave `-translate-y-full`, takže bol hneď mimo obrazovky (vidno ho bolo asi 0,3 s
  // pri zasúvaní). Časovač, ktorý ho po 3 s schová, sa navyše nerušil ani pri odpojení komponentu, ani pri novej udalosti
  // pripojenia, takže starý časovač mohol pruh po rýchlom striedaní výpadku a obnovenia zhasnúť predčasne.
  describe('zelený pruh po obnovení pripojenia', () => {
    it('ostane na obrazovke: nie je posunutý nad ňu', () => {
      setOnLine(false);
      render(<OfflineIndicator />);

      changeConnection(true);

      const banner = bannerOf(/Pripojenie obnovené/);
      expect(banner).not.toBeNull();
      expect(banner!.className).toContain('bg-green-600');
      expect(banner!.className).toContain('translate-y-0');
      expect(banner!.className).not.toContain('-translate-y-full');
    });

    it('po 3 s zmizne, nie skôr', () => {
      setOnLine(false);
      render(<OfflineIndicator />);
      changeConnection(true);

      act(() => {
        jest.advanceTimersByTime(2999);
      });
      expect(bannerOf(/Pripojenie obnovené/)).not.toBeNull();

      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(bannerOf(/Pripojenie obnovené/)).toBeNull();
    });

    it('po odpojení komponentu nezostane žiadny časovač', () => {
      setOnLine(false);
      const { unmount } = render(<OfflineIndicator />);
      changeConnection(true);
      // Jediný živý časovač je skrývanie pruhu.
      expect(jest.getTimerCount()).toBe(1);

      unmount();

      expect(jest.getTimerCount()).toBe(0);
    });

    it('rýchle striedanie výpadku a obnovenia nezhasne pruh podľa starého časovača', () => {
      setOnLine(false);
      render(<OfflineIndicator />);
      changeConnection(true);
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      changeConnection(false);
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      // 2 s od prvého obnovenia: nový časovač nahrádza starý, ktorý by pruh zhasol o ďalšiu sekundu.
      changeConnection(true);

      act(() => {
        jest.advanceTimersByTime(2500);
      });
      expect(bannerOf(/Pripojenie obnovené/)).not.toBeNull();

      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(bannerOf(/Pripojenie obnovené/)).toBeNull();
    });
  });
});


