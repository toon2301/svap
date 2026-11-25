/**
 * Pripnutá vrstva dobehne viditeľnú plochu aj bez udalostí (nález 375, kolo 3c).
 *
 * Z fotiek majiteľa (iPhone, iOS 27.0.1): vrstva prehliadača fotky ostala pripnutá na výške 293 pt, kým viditeľná plocha nad
 * plávajúcimi lištami Safari mala asi 392 pt, takže pole na komentár stálo vysoko nad klávesnicou. Hypotéza: iOS po otvorení
 * klávesnice doladí viditeľnú plochu aj po poslednej udalosti `resize`. Kým je vrstva pripnutá, hook preto meria plochu
 * pravidelne (`KEYBOARD_POLL_INTERVAL_MS`) a pri zmene veľkosti okna; nezmenená hodnota prekreslenie nespúšťa.
 *
 * `visualViewport` jsdom nepozná, preto sa dodáva atrapa, ktorej hodnoty sa dajú zmeniť BEZ udalosti (ako to urobí iOS).
 */

import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  KEYBOARD_POLL_INTERVAL_MS,
  KEYBOARD_RELEASE_DELAY_MS,
  feedKeyboardBoxStyle,
  useFeedKeyboardViewport,
} from '../useFeedKeyboardViewport';

class AtrapaViditelnejPlochy extends EventTarget {
  height = 844;
  offsetTop = 0;
  scale = 1;
}

const povodna = Object.getOwnPropertyDescriptor(window, 'visualViewport');
let plocha: AtrapaViditelnejPlochy;

function Vrstva({ active }: { active: boolean }) {
  const box = useFeedKeyboardViewport(active);
  return <div data-testid="vrstva" style={feedKeyboardBoxStyle(box)} />;
}

function expectNepripnuta() {
  const vrstva = screen.getByTestId('vrstva');
  expect(vrstva.style.top).toBe('');
  expect(vrstva.style.height).toBe('');
  expect(vrstva.style.bottom).toBe('');
}

beforeEach(() => {
  plocha = new AtrapaViditelnejPlochy();
  Object.defineProperty(window, 'visualViewport', {
    value: plocha,
    configurable: true,
    writable: true,
  });
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  if (povodna) Object.defineProperty(window, 'visualViewport', povodna);
  else delete (window as { visualViewport?: unknown }).visualViewport;
});

describe('zmena viditeľnej plochy bez udalosti (iOS po otvorení klávesnice)', () => {
  it('vrstva zaseknutá na nižšej výške (293) dobehne skutočnú plochu (392) do jedného intervalu', () => {
    plocha.height = 293;
    render(<Vrstva active />);
    expect(screen.getByTestId('vrstva')).toHaveStyle({ height: '293px' });

    // iOS plochu zväčší (lišty sa usadia), no žiadnu udalosť nepošle.
    plocha.height = 392;
    act(() => jest.advanceTimersByTime(KEYBOARD_POLL_INTERVAL_MS - 1));
    expect(screen.getByTestId('vrstva')).toHaveStyle({ height: '293px' });

    act(() => jest.advanceTimersByTime(1));
    expect(screen.getByTestId('vrstva')).toHaveStyle({ height: '392px' });
  });

  it('posun viditeľnej plochy bez udalosti sa tiež dobehne', () => {
    render(<Vrstva active />);
    expect(screen.getByTestId('vrstva')).toHaveStyle({ top: '0px' });

    plocha.offsetTop = 59;
    act(() => jest.advanceTimersByTime(KEYBOARD_POLL_INTERVAL_MS));

    expect(screen.getByTestId('vrstva')).toHaveStyle({ top: '59px' });
  });

  it('priblíženie bez udalosti vrstvu uvoľní a návrat na pôvodnú mierku ju znova pripne', () => {
    plocha.height = 508;
    render(<Vrstva active />);
    expect(screen.getByTestId('vrstva')).toHaveStyle({ height: '508px' });

    plocha.scale = 2;
    act(() => jest.advanceTimersByTime(KEYBOARD_POLL_INTERVAL_MS));
    expectNepripnuta();

    plocha.scale = 1;
    act(() => jest.advanceTimersByTime(KEYBOARD_POLL_INTERVAL_MS));
    expect(screen.getByTestId('vrstva')).toHaveStyle({ height: '508px' });
  });

  it('zmena veľkosti okna prepočíta plochu hneď, bez čakania na časovač', () => {
    plocha.height = 293;
    render(<Vrstva active />);

    plocha.height = 392;
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    expect(screen.getByTestId('vrstva')).toHaveStyle({ height: '392px' });
  });

  it('dlhšie meranie nič neprekresľuje, kým sa plocha nezmení', () => {
    plocha.height = 508;
    const prekreslenia = jest.fn();
    function Pocitana() {
      const box = useFeedKeyboardViewport(true);
      prekreslenia();
      return <div data-testid="vrstva" style={feedKeyboardBoxStyle(box)} />;
    }
    render(<Pocitana />);
    const pred = prekreslenia.mock.calls.length;

    // Každý interval je vlastný `act`: v jednom by React aktualizácie z celého bloku spojil do jedného prekreslenia a test by
    // neodlíšil „stav ostal rovnaký“ od „každé meranie uložilo nový objekt“ (pripomienka CodeRabbitu na PR #333).
    for (let i = 0; i < 40; i += 1) {
      act(() => jest.advanceTimersByTime(KEYBOARD_POLL_INTERVAL_MS));
    }

    // React smie jedno prekreslenie navyše zahodiť, nie jedno za každé zo štyridsiatich meraní.
    expect(prekreslenia.mock.calls.length - pred).toBeLessThanOrEqual(1);
    expect(screen.getByTestId('vrstva')).toHaveStyle({ height: '508px' });
  });
});

describe('kedy sa pravidelné meranie spúšťa a zastavuje', () => {
  it('kým pole nie je aktívne, pravidelné meranie sa vôbec nespustí', () => {
    const interval = jest.spyOn(window, 'setInterval');

    render(<Vrstva active={false} />);
    act(() => jest.advanceTimersByTime(KEYBOARD_RELEASE_DELAY_MS + 1));

    expect(interval).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('po uvoľnení vrstvy (po pauze po strate fokusu) časovač zanikne', () => {
    const { rerender } = render(<Vrstva active />);
    expect(jest.getTimerCount()).toBeGreaterThan(0);

    rerender(<Vrstva active={false} />);
    act(() => jest.advanceTimersByTime(KEYBOARD_RELEASE_DELAY_MS + 1));

    expectNepripnuta();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('po odmontovaní sa odoberie časovač aj poslucháč zmeny veľkosti okna', () => {
    const odober = jest.spyOn(window, 'removeEventListener');
    const { unmount } = render(<Vrstva active />);

    unmount();

    expect(jest.getTimerCount()).toBe(0);
    expect(odober).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('bez `visualViewport` nepoužije žiadny časovač a nič nepripne', () => {
    delete (window as { visualViewport?: unknown }).visualViewport;

    render(<Vrstva active />);

    expectNepripnuta();
    expect(jest.getTimerCount()).toBe(0);
  });
});
