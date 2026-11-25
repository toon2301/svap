/**
 * Pripnutie vrstvy na viditeľnú plochu nad klávesnicou (R75 bod 5, nález 370).
 *
 * Vrstva `fixed inset-0` sa pri otvorení klávesnice na iPhone nezmenší, zmenší sa len `visualViewport`. Kým je pole na komentár
 * aktívne, hook vráti jeho posun a výšku, aby vrstva stála presne na viditeľnej ploche. Po strate fokusu ostane pripnutá ešte
 * 300 ms (zasúvanie klávesnice, krátke zavlnenie fokusu), potom sa uvoľní. Pri priblížení a bez `visualViewport` sa nepripína.
 *
 * `visualViewport` jsdom nepozná, preto sa dodáva atrapa s udalosťami `resize` a `scroll`.
 */

import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  KEYBOARD_RELEASE_DELAY_MS,
  feedKeyboardBoxStyle,
  useFeedKeyboardViewport,
} from '../useFeedKeyboardViewport';

class AtrapaViditelnejPlochy extends EventTarget {
  height = 844;
  offsetTop = 0;
  scale = 1;

  /** Zmena veľkosti (klávesnica sa otvorila alebo zavrela). */
  zmen(vlastnosti: { height?: number; scale?: number }) {
    Object.assign(this, vlastnosti);
    this.dispatchEvent(new Event('resize'));
  }

  /** Posun viditeľnej plochy (iPhone odkryl pole). */
  posun(offsetTop: number) {
    this.offsetTop = offsetTop;
    this.dispatchEvent(new Event('scroll'));
  }
}

const povodna = Object.getOwnPropertyDescriptor(window, 'visualViewport');
let plocha: AtrapaViditelnejPlochy;

function nastavPlochu(hodnota: unknown) {
  Object.defineProperty(window, 'visualViewport', {
    value: hodnota,
    configurable: true,
    writable: true,
  });
}

function Vrstva({ active, pocitadlo }: { active: boolean; pocitadlo?: () => void }) {
  const box = useFeedKeyboardViewport(active);
  pocitadlo?.();
  return <div data-testid="vrstva" style={feedKeyboardBoxStyle(box)} />;
}

/** Vrstva nemá žiadny inline štýl (React po odpnutí nechá prázdny atribút `style=""`, preto sa kontroluje hodnota). */
function expectNepripnuta() {
  const vrstva = screen.getByTestId('vrstva');
  expect(vrstva.style.top).toBe('');
  expect(vrstva.style.height).toBe('');
  expect(vrstva.style.bottom).toBe('');
}

beforeEach(() => {
  plocha = new AtrapaViditelnejPlochy();
  nastavPlochu(plocha);
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  if (povodna) Object.defineProperty(window, 'visualViewport', povodna);
  else delete (window as { visualViewport?: unknown }).visualViewport;
});

describe('kým pole nie je aktívne', () => {
  it('nepripína a nepočúva viditeľnú plochu', () => {
    const pridaj = jest.spyOn(plocha, 'addEventListener');

    render(<Vrstva active={false} />);

    expectNepripnuta();
    expect(pridaj).not.toHaveBeenCalled();
  });
});

describe('kým je pole aktívne', () => {
  it('vrstva dostane posun a výšku viditeľnej plochy a ruší spodný okraj', () => {
    plocha.height = 508;
    plocha.offsetTop = 0;

    render(<Vrstva active />);

    expect(screen.getByTestId('vrstva')).toHaveStyle({
      top: '0px',
      height: '508px',
      bottom: 'auto',
    });
  });

  it('pri zmenšení plochy (klávesnica) aj pri posune (iPhone odkryl pole) sa hodnoty aktualizujú', () => {
    render(<Vrstva active />);
    expect(screen.getByTestId('vrstva')).toHaveStyle({ top: '0px', height: '844px' });

    act(() => plocha.zmen({ height: 508 }));
    expect(screen.getByTestId('vrstva')).toHaveStyle({ top: '0px', height: '508px' });

    act(() => plocha.posun(120));
    expect(screen.getByTestId('vrstva')).toHaveStyle({ top: '120px', height: '508px' });
  });

  it('hodnoty zaokrúhľuje a záporný posun (gumový efekt) orezá na nulu', () => {
    plocha.height = 507.6;
    plocha.offsetTop = -12.4;

    render(<Vrstva active />);

    expect(screen.getByTestId('vrstva')).toHaveStyle({ top: '0px', height: '508px' });
  });

  it('nezmenená viditeľná plocha neprekresľuje obrazovku pri každej udalosti', () => {
    const pocitadlo = jest.fn();
    render(<Vrstva active pocitadlo={pocitadlo} />);
    const pred = pocitadlo.mock.calls.length;

    for (let i = 0; i < 10; i += 1) {
      act(() => plocha.zmen({ height: 844 }));
      act(() => plocha.posun(0));
    }

    // React smie jedno prekreslenie navyše zahodiť pri prvej nezmenenej hodnote, nie pri každej z dvadsiatich udalostí.
    expect(pocitadlo.mock.calls.length - pred).toBeLessThanOrEqual(1);
    expect(screen.getByTestId('vrstva')).toHaveStyle({ top: '0px', height: '844px' });
  });

  it('pri priblížení prstami sa nepripína a po návrate na pôvodnú mierku pripne', () => {
    plocha.scale = 2;
    render(<Vrstva active />);
    expectNepripnuta();

    act(() => plocha.zmen({ scale: 1 }));
    expect(screen.getByTestId('vrstva')).toHaveStyle({ height: '844px' });
  });

  it('s nulovou výškou viditeľnej plochy sa nepripína', () => {
    plocha.height = 0;

    render(<Vrstva active />);

    expectNepripnuta();
  });
});

describe('po strate aktívneho poľa', () => {
  it('vrstva ostane pripnutá a sleduje plochu, kým klávesnica nezmizne, potom sa uvoľní', () => {
    plocha.height = 508;
    const { rerender } = render(<Vrstva active />);

    rerender(<Vrstva active={false} />);
    act(() => plocha.zmen({ height: 700 }));
    act(() => jest.advanceTimersByTime(KEYBOARD_RELEASE_DELAY_MS - 1));
    expect(screen.getByTestId('vrstva')).toHaveStyle({ height: '700px' });

    act(() => jest.advanceTimersByTime(1));
    expectNepripnuta();
  });

  it('po uvoľnení prestane počúvať viditeľnú plochu', () => {
    const odober = jest.spyOn(plocha, 'removeEventListener');
    const { rerender } = render(<Vrstva active />);

    rerender(<Vrstva active={false} />);
    act(() => jest.advanceTimersByTime(KEYBOARD_RELEASE_DELAY_MS));

    expect(odober).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(odober).toHaveBeenCalledWith('scroll', expect.any(Function));
    // Neskoršia zmena plochy vrstvu znova nepripne.
    act(() => plocha.zmen({ height: 400 }));
    expectNepripnuta();
  });

  it('krátke zavlnenie fokusu (ťuk na krížik, prepnutie cieľa) vrstvu neuvoľní', () => {
    const { rerender } = render(<Vrstva active />);

    rerender(<Vrstva active={false} />);
    act(() => jest.advanceTimersByTime(KEYBOARD_RELEASE_DELAY_MS - 50));
    rerender(<Vrstva active />);
    act(() => jest.advanceTimersByTime(5 * KEYBOARD_RELEASE_DELAY_MS));

    expect(screen.getByTestId('vrstva')).toHaveStyle({ height: '844px' });
  });
});

describe('bez `visualViewport`', () => {
  it('nič nepripína (vrstva ostáva `inset-0`)', () => {
    nastavPlochu(undefined);

    render(<Vrstva active />);

    expectNepripnuta();
  });
});

describe('štýl pripnutej vrstvy', () => {
  it('bez viditeľnej plochy je `undefined`, s ňou `top`, `height` a `bottom: auto`', () => {
    expect(feedKeyboardBoxStyle(null)).toBeUndefined();
    expect(feedKeyboardBoxStyle({ top: 30, height: 500 })).toEqual({
      top: 30,
      height: 500,
      bottom: 'auto',
    });
  });
});
