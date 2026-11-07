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

  // Nález 277: pruh neoznámil čítaču obrazovky zmenu pripojenia (žiadna `role` ani `aria-live`). Živý región musí byť
  // v stránke ešte pred zmenou: vložený hotový ho čítače nemusia oznámiť a zmena `role` na existujúcom uzle tiež nie je
  // spoľahlivá. Preto sú oba obaly (`alert` a `status`) stále prítomné a pruh sa vkladá ako ich obsah.
  describe('čítač obrazovky (nález 277)', () => {
    it('obaly sú v stránke aj pri pripojení online a sú prázdne', () => {
      render(<OfflineIndicator />);

      expect(screen.getByRole('alert')).toBeEmptyDOMElement();
      expect(screen.getByRole('status')).toBeEmptyDOMElement();
    });

    it('pri výpadku je text v obale `alert` a `status` ostane prázdny', () => {
      render(<OfflineIndicator />);

      changeConnection(false);

      expect(screen.getByRole('alert')).toHaveTextContent(/Offline režim/);
      expect(screen.getByRole('status')).toBeEmptyDOMElement();
    });

    it('po obnovení je text v obale `status` a `alert` je prázdny', () => {
      setOnLine(false);
      render(<OfflineIndicator />);

      changeConnection(true);

      expect(screen.getByRole('status')).toHaveTextContent(/Pripojenie obnovené/);
      expect(screen.getByRole('alert')).toBeEmptyDOMElement();
    });

    it('pruh je jediná kópia textu: žiadna skrytá duplicita, ktorú by čítač prečítal dvakrát', () => {
      render(<OfflineIndicator />);

      changeConnection(false);

      expect(screen.getAllByText(/Offline režim/)).toHaveLength(1);
    });

    it('obaly sú tie isté uzly pred zmenou aj po nej, takže živý región existuje vopred', () => {
      render(<OfflineIndicator />);
      const alertRegion = screen.getByRole('alert');
      const statusRegion = screen.getByRole('status');

      changeConnection(false);
      changeConnection(true);

      expect(screen.getByRole('alert')).toBe(alertRegion);
      expect(screen.getByRole('status')).toBe(statusRegion);
    });

    it('po 3 s sú oba obaly znova prázdne a ostávajú v stránke', () => {
      setOnLine(false);
      render(<OfflineIndicator />);
      changeConnection(true);

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(screen.getByRole('alert')).toBeEmptyDOMElement();
      expect(screen.getByRole('status')).toBeEmptyDOMElement();
    });

    it('`status` je atomický a `alert` nemá `aria-live` (dvojité čítanie vo VoiceOver na iOS)', () => {
      render(<OfflineIndicator />);

      expect(screen.getByRole('status')).toHaveAttribute('aria-atomic', 'true');
      expect(screen.getByRole('alert')).not.toHaveAttribute('aria-live');
    });

    it('emoji v pruhu čítač nečíta', () => {
      render(<OfflineIndicator />);

      changeConnection(false);

      expect(screen.getByText('🔴')).toHaveAttribute('aria-hidden', 'true');
    });
  });
});
