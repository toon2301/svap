/**
 * Skrytá diagnostika viditeľnej plochy: príznak, meranie a text (`feedKeyboardDiagnostics.ts`, nálezy 375 až 377, kolo 3c).
 *
 * Príznak sa pamätá v `localStorage` zariadenia (a v pamäti, keď je úložisko zablokované), prepína sa funkciou
 * `toggleKeyboardDiagnostics` a otvorené prekryvy sa o zmene dozvedia udalosťou. Meranie číta `visualViewport` a polohu vrstvy,
 * panela a poľa podľa `data-testid`; text je jeden riadok na údaj so zaokrúhlenými hodnotami.
 */

import { act, renderHook } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  KEYBOARD_DIAGNOSTICS_EVENT,
  KEYBOARD_DIAGNOSTICS_STORAGE_KEY,
  collectKeyboardDiagnostics,
  formatKeyboardDiagnostics,
  readKeyboardDiagnosticsFlag,
  toggleKeyboardDiagnostics,
  useKeyboardDiagnosticsFlag,
  type KeyboardDiagnosticsSample,
} from '../feedKeyboardDiagnostics';

const povodnaPlocha = Object.getOwnPropertyDescriptor(window, 'visualViewport');

function nastavPlochu(hodnota: unknown) {
  Object.defineProperty(window, 'visualViewport', { value: hodnota, configurable: true, writable: true });
}

function obdlznik(top: number, bottom: number): DOMRect {
  return { top, bottom, left: 0, right: 0, width: 0, height: bottom - top, x: 0, y: top, toJSON: () => ({}) };
}

afterEach(() => {
  jest.restoreAllMocks();
  if (readKeyboardDiagnosticsFlag()) toggleKeyboardDiagnostics();
  // Poistka v pamäti po zlyhanom zápise sa zahodí až úspešným zápisom: zapnúť a znova vypnúť (úložisko už funguje).
  toggleKeyboardDiagnostics();
  toggleKeyboardDiagnostics();
  window.localStorage.clear();
  document.body.innerHTML = '';
  if (povodnaPlocha) Object.defineProperty(window, 'visualViewport', povodnaPlocha);
  else delete (window as { visualViewport?: unknown }).visualViewport;
});

describe('príznak diagnostiky', () => {
  it('predvolene je vypnutý', () => {
    expect(readKeyboardDiagnosticsFlag()).toBe(false);
  });

  it('prepnutie ho zapne a uloží, ďalšie ho vypne a zmaže z úložiska', () => {
    expect(toggleKeyboardDiagnostics()).toBe(true);
    expect(readKeyboardDiagnosticsFlag()).toBe(true);
    expect(window.localStorage.getItem(KEYBOARD_DIAGNOSTICS_STORAGE_KEY)).toBe('1');

    expect(toggleKeyboardDiagnostics()).toBe(false);
    expect(readKeyboardDiagnosticsFlag()).toBe(false);
    expect(window.localStorage.getItem(KEYBOARD_DIAGNOSTICS_STORAGE_KEY)).toBeNull();
  });

  it('prepnutie dá o sebe vedieť udalosťou', () => {
    const poslucham = jest.fn();
    window.addEventListener(KEYBOARD_DIAGNOSTICS_EVENT, poslucham);

    toggleKeyboardDiagnostics();

    window.removeEventListener(KEYBOARD_DIAGNOSTICS_EVENT, poslucham);
    expect(poslucham).toHaveBeenCalledTimes(1);
  });

  it('hook sa po prepnutí prekreslí s novou hodnotou', () => {
    const { result } = renderHook(() => useKeyboardDiagnosticsFlag());
    expect(result.current).toBe(false);

    act(() => {
      toggleKeyboardDiagnostics();
    });
    expect(result.current).toBe(true);

    act(() => {
      toggleKeyboardDiagnostics();
    });
    expect(result.current).toBe(false);
  });

  it('hook zachytí aj zmenu z iného okna (udalosť `storage`)', () => {
    const { result } = renderHook(() => useKeyboardDiagnosticsFlag());

    act(() => {
      window.localStorage.setItem(KEYBOARD_DIAGNOSTICS_STORAGE_KEY, '1');
      window.dispatchEvent(new StorageEvent('storage', { key: KEYBOARD_DIAGNOSTICS_STORAGE_KEY }));
    });

    expect(result.current).toBe(true);
  });

  it('po odmontovaní hook prestane počúvať', () => {
    const odober = jest.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useKeyboardDiagnosticsFlag());

    unmount();

    expect(odober).toHaveBeenCalledWith(KEYBOARD_DIAGNOSTICS_EVENT, expect.any(Function));
    expect(odober).toHaveBeenCalledWith('storage', expect.any(Function));
  });

  it('keď je úložisko zablokované, príznak funguje aspoň v pamäti', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('zablokované');
    });
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('zablokované');
    });
    jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('zablokované');
    });

    expect(toggleKeyboardDiagnostics()).toBe(true);
    expect(readKeyboardDiagnosticsFlag()).toBe(true);
    expect(toggleKeyboardDiagnostics()).toBe(false);
    expect(readKeyboardDiagnosticsFlag()).toBe(false);
  });

  // Pripomienka CodeRabbitu na PR #333: po zlyhanom zápise do úložiska nesmie čítanie vrátiť zastaranú hodnotu z úložiska.
  it('keď `removeItem` zlyhá a v úložisku je „1“, diagnostika sa aj tak vypne', () => {
    expect(toggleKeyboardDiagnostics()).toBe(true);
    expect(window.localStorage.getItem(KEYBOARD_DIAGNOSTICS_STORAGE_KEY)).toBe('1');
    jest.spyOn(Storage.prototype, 'removeItem').mockImplementationOnce(() => {
      throw new Error('zablokované');
    });

    expect(toggleKeyboardDiagnostics()).toBe(false);

    // Úložisko stále drží „1“, no platí hodnota v pamäti: diagnostika je vypnutá.
    expect(window.localStorage.getItem(KEYBOARD_DIAGNOSTICS_STORAGE_KEY)).toBe('1');
    expect(readKeyboardDiagnosticsFlag()).toBe(false);

    // Ďalšie prepnutie sa už do úložiska zapíše a znova platí úložisko.
    expect(toggleKeyboardDiagnostics()).toBe(true);
    expect(readKeyboardDiagnosticsFlag()).toBe(true);
    expect(toggleKeyboardDiagnostics()).toBe(false);
    expect(window.localStorage.getItem(KEYBOARD_DIAGNOSTICS_STORAGE_KEY)).toBeNull();
    expect(readKeyboardDiagnosticsFlag()).toBe(false);
  });

  it('keď `setItem` zlyhá (úložisko sa číta, no nezapisuje), diagnostika sa zapne aspoň v pamäti', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('zablokované');
    });

    expect(toggleKeyboardDiagnostics()).toBe(true);

    expect(window.localStorage.getItem(KEYBOARD_DIAGNOSTICS_STORAGE_KEY)).toBeNull();
    expect(readKeyboardDiagnosticsFlag()).toBe(true);

    // Vypnutie sa do úložiska podarí (kľúč tam nie je), takže znova platí úložisko.
    expect(toggleKeyboardDiagnostics()).toBe(false);
    expect(readKeyboardDiagnosticsFlag()).toBe(false);
  });

  it('po úspešnom zápise sa znova číta úložisko, takže zmena z iného okna platí', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('zablokované');
    });
    toggleKeyboardDiagnostics();
    toggleKeyboardDiagnostics();
    expect(readKeyboardDiagnosticsFlag()).toBe(false);

    window.localStorage.setItem(KEYBOARD_DIAGNOSTICS_STORAGE_KEY, '1');

    expect(readKeyboardDiagnosticsFlag()).toBe(true);
  });
});

describe('meranie', () => {
  function pripravStranku() {
    document.body.innerHTML = `
      <div data-testid="vrstva"><textarea></textarea></div>
      <div data-testid="panel"></div>`;
    const vrstva = document.querySelector('[data-testid="vrstva"]') as HTMLElement;
    const panel = document.querySelector('[data-testid="panel"]') as HTMLElement;
    const pole = document.querySelector('textarea') as HTMLElement;
    jest.spyOn(vrstva, 'getBoundingClientRect').mockReturnValue(obdlznik(59, 450.5));
    jest.spyOn(panel, 'getBoundingClientRect').mockReturnValue(obdlznik(146, 450.5));
    jest.spyOn(pole, 'getBoundingClientRect').mockReturnValue(obdlznik(394, 434));
  }

  it('prečíta `visualViewport` a polohu vrstvy, panela a poľa', () => {
    pripravStranku();
    nastavPlochu({ height: 391.6, offsetTop: 0, pageTop: 12, scale: 1 });

    const vzorka = collectKeyboardDiagnostics(
      'vrstva',
      'panel',
      { resize: 2, scroll: 3, lastEventAt: 1000 },
      1250,
    );

    expect(vzorka).toMatchObject({
      vvHeight: 391.6,
      vvOffsetTop: 0,
      vvPageTop: 12,
      vvScale: 1,
      layer: { top: 59, bottom: 450.5 },
      panel: { top: 146, bottom: 450.5 },
      field: { top: 394, bottom: 434 },
      resizeEvents: 2,
      scrollEvents: 3,
      sinceLastEventMs: 250,
    });
  });

  it('bez vrstvy, panela, poľa, udalostí aj bez `visualViewport` vráti prázdne hodnoty', () => {
    delete (window as { visualViewport?: unknown }).visualViewport;

    const vzorka = collectKeyboardDiagnostics(
      'neexistuje',
      null,
      { resize: 0, scroll: 0, lastEventAt: null },
      500,
    );

    expect(vzorka).toMatchObject({
      vvHeight: null,
      vvOffsetTop: null,
      vvPageTop: null,
      vvScale: null,
      layer: null,
      panel: null,
      field: null,
      sinceLastEventMs: null,
    });
  });

  it('panel sa hľadá len keď je zadané jeho `data-testid`', () => {
    pripravStranku();

    const vzorka = collectKeyboardDiagnostics('vrstva', null, { resize: 0, scroll: 0, lastEventAt: null }, 0);

    expect(vzorka.panel).toBeNull();
    expect(vzorka.layer).not.toBeNull();
  });
});

describe('text prekryvu', () => {
  const vzorka: KeyboardDiagnosticsSample = {
    innerWidth: 393,
    innerHeight: 759.4,
    scrollY: 0,
    vvHeight: 391.6,
    vvOffsetTop: 0,
    vvPageTop: 12,
    vvScale: 1,
    layer: { top: 59, bottom: 450.5 },
    panel: { top: 146, bottom: 450.5 },
    field: { top: 394, bottom: 434 },
    resizeEvents: 2,
    scrollEvents: 3,
    sinceLastEventMs: 250.4,
  };

  it('má jeden riadok na údaj a hodnoty zaokrúhľuje na celé body', () => {
    expect(formatKeyboardDiagnostics('panel', vzorka, '15:41:07')).toBe(
      [
        'KBD panel 15:41:07',
        'okno 393×759 scrollY 0',
        'vv výška 392 posun 0 strana 12 mierka 1.00',
        'vrstva 59 až 451',
        'panel 146 až 451',
        'pole 394 až 434',
        'udalosti resize 2 scroll 3 pred 250 ms',
      ].join('\n'),
    );
  });

  it('chýbajúce hodnoty nahradí pomlčkou', () => {
    const prazdna: KeyboardDiagnosticsSample = {
      ...vzorka,
      vvHeight: null,
      vvOffsetTop: null,
      vvPageTop: null,
      vvScale: null,
      layer: null,
      panel: null,
      field: null,
      sinceLastEventMs: null,
    };

    const text = formatKeyboardDiagnostics('detail', prazdna, '10:00:00');

    expect(text).toContain('vv výška – posun – strana – mierka –');
    expect(text).toContain('vrstva –');
    expect(text).toContain('panel –');
    expect(text).toContain('pole –');
    expect(text).toContain('pred –');
  });
});
