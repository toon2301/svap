/**
 * Skrytý prekryv s hodnotami viditeľnej plochy (`FeedKeyboardDiagnostics`, nálezy 375 až 377, kolo 3c).
 *
 * Predvolene je diagnostika vypnutá a komponent nevykreslí nič. Zapnutý kreslí do `body` nedotknuteľný blok s číslami, ktoré sa
 * obnovujú pri udalostiach `visualViewport` aj pravidelne. Po vypnutí alebo odmontovaní nezostane žiadny časovač ani poslucháč.
 */

import { act, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import '@testing-library/jest-dom';
import FeedKeyboardDiagnostics, { KEYBOARD_DIAGNOSTICS_REFRESH_MS } from '../FeedKeyboardDiagnostics';
import { readKeyboardDiagnosticsFlag, toggleKeyboardDiagnostics } from '../feedKeyboardDiagnostics';

class AtrapaViditelnejPlochy extends EventTarget {
  height = 392;
  offsetTop = 0;
  pageTop = 0;
  scale = 1;
}

const povodnaPlocha = Object.getOwnPropertyDescriptor(window, 'visualViewport');
let plocha: AtrapaViditelnejPlochy;

function obdlznik(top: number, bottom: number): DOMRect {
  return { top, bottom, left: 0, right: 0, width: 0, height: bottom - top, x: 0, y: top, toJSON: () => ({}) };
}

function zapni() {
  act(() => {
    if (!readKeyboardDiagnosticsFlag()) toggleKeyboardDiagnostics();
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  plocha = new AtrapaViditelnejPlochy();
  Object.defineProperty(window, 'visualViewport', { value: plocha, configurable: true, writable: true });
  document.body.innerHTML = '';
});

afterEach(() => {
  if (readKeyboardDiagnosticsFlag()) act(() => void toggleKeyboardDiagnostics());
  window.localStorage.clear();
  jest.useRealTimers();
  jest.restoreAllMocks();
  if (povodnaPlocha) Object.defineProperty(window, 'visualViewport', povodnaPlocha);
  else delete (window as { visualViewport?: unknown }).visualViewport;
});

describe('kým je diagnostika vypnutá', () => {
  it('nevykreslí nič a nespustí žiadny časovač', () => {
    const interval = jest.spyOn(window, 'setInterval');

    render(<FeedKeyboardDiagnostics label="panel" layerTestId="vrstva" />);

    expect(screen.queryByTestId('feed-kbd-diagnostics')).not.toBeInTheDocument();
    expect(interval).not.toHaveBeenCalled();
  });
});

describe('po zapnutí', () => {
  it('ukáže číselný blok s názvom a výškou viditeľnej plochy', () => {
    zapni();

    render(<FeedKeyboardDiagnostics label="panel" layerTestId="vrstva" />);

    const blok = screen.getByTestId('feed-kbd-diagnostics');
    expect(blok).toHaveTextContent('KBD panel');
    expect(blok).toHaveTextContent('vv výška 392');
    expect(blok).toHaveAttribute('aria-hidden', 'true');
    expect(blok.parentElement).toBe(document.body);
  });

  it('je nedotknuteľný a pri detaile stojí vpravo, pri paneli vľavo (dve vrstvy sa nezakrývajú)', () => {
    zapni();

    const { unmount } = render(<FeedKeyboardDiagnostics label="panel" layerTestId="vrstva" />);
    expect(screen.getByTestId('feed-kbd-diagnostics')).toHaveClass('pointer-events-none', 'fixed', 'left-1');
    unmount();

    render(<FeedKeyboardDiagnostics label="detail" layerTestId="vrstva" />);
    expect(screen.getByTestId('feed-kbd-diagnostics')).toHaveClass('pointer-events-none', 'right-1');
    expect(screen.getByTestId('feed-kbd-diagnostics')).not.toHaveClass('left-1');
  });

  it('čísla sa obnovujú aj bez udalostí', () => {
    zapni();
    render(<FeedKeyboardDiagnostics label="panel" layerTestId="vrstva" />);
    expect(screen.getByTestId('feed-kbd-diagnostics')).toHaveTextContent('vv výška 392');

    plocha.height = 293;
    act(() => jest.advanceTimersByTime(KEYBOARD_DIAGNOSTICS_REFRESH_MS));

    expect(screen.getByTestId('feed-kbd-diagnostics')).toHaveTextContent('vv výška 293');
  });

  it('počíta udalosti `resize` a `scroll` a hneď ich ukáže', () => {
    zapni();
    render(<FeedKeyboardDiagnostics label="panel" layerTestId="vrstva" />);
    expect(screen.getByTestId('feed-kbd-diagnostics')).toHaveTextContent('resize 0 scroll 0 pred –');

    act(() => {
      plocha.height = 300;
      plocha.dispatchEvent(new Event('resize'));
    });
    expect(screen.getByTestId('feed-kbd-diagnostics')).toHaveTextContent('resize 1 scroll 0');
    expect(screen.getByTestId('feed-kbd-diagnostics')).toHaveTextContent('vv výška 300');

    act(() => {
      plocha.offsetTop = 59;
      plocha.dispatchEvent(new Event('scroll'));
      plocha.dispatchEvent(new Event('scroll'));
    });
    expect(screen.getByTestId('feed-kbd-diagnostics')).toHaveTextContent('resize 1 scroll 2');
    expect(screen.getByTestId('feed-kbd-diagnostics')).toHaveTextContent('posun 59');
  });

  it('meria polohu vrstvy, panela a poľa podľa `data-testid`', () => {
    document.body.innerHTML = `
      <div data-testid="vrstva"><textarea></textarea></div>
      <div data-testid="panel"></div>`;
    jest
      .spyOn(document.querySelector('[data-testid="vrstva"]') as HTMLElement, 'getBoundingClientRect')
      .mockReturnValue(obdlznik(59, 451));
    jest
      .spyOn(document.querySelector('[data-testid="panel"]') as HTMLElement, 'getBoundingClientRect')
      .mockReturnValue(obdlznik(146, 451));
    jest
      .spyOn(document.querySelector('textarea') as HTMLElement, 'getBoundingClientRect')
      .mockReturnValue(obdlznik(394, 434));
    zapni();

    render(<FeedKeyboardDiagnostics label="panel" layerTestId="vrstva" panelTestId="panel" />);

    const blok = screen.getByTestId('feed-kbd-diagnostics');
    expect(blok).toHaveTextContent('vrstva 59 až 451');
    expect(blok).toHaveTextContent('panel 146 až 451');
    expect(blok).toHaveTextContent('pole 394 až 434');
  });
});

describe('vypnutie a odmontovanie', () => {
  it('po vypnutí prekryv zmizne bez odmontovania komponentu a časovač zanikne', () => {
    zapni();
    render(<FeedKeyboardDiagnostics label="panel" layerTestId="vrstva" />);
    expect(screen.getByTestId('feed-kbd-diagnostics')).toBeInTheDocument();

    act(() => {
      toggleKeyboardDiagnostics();
    });

    expect(screen.queryByTestId('feed-kbd-diagnostics')).not.toBeInTheDocument();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('po odmontovaní sa odoberú časovač aj poslucháči viditeľnej plochy', () => {
    zapni();
    const odober = jest.spyOn(plocha, 'removeEventListener');
    const { unmount } = render(<FeedKeyboardDiagnostics label="panel" layerTestId="vrstva" />);

    unmount();

    expect(jest.getTimerCount()).toBe(0);
    expect(odober).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(odober).toHaveBeenCalledWith('scroll', expect.any(Function));
  });

  it('bez `visualViewport` sa prekryv ukáže (s pomlčkami) a nič nespadne', () => {
    delete (window as { visualViewport?: unknown }).visualViewport;
    zapni();

    render(<FeedKeyboardDiagnostics label="panel" layerTestId="vrstva" />);

    expect(screen.getByTestId('feed-kbd-diagnostics')).toHaveTextContent('vv výška – posun –');
  });
});

describe('vykreslenie na serveri', () => {
  it('aj pri zapnutom príznaku sa na serveri nevykreslí nič (príznak je len v prehliadači)', () => {
    zapni();

    const html = renderToString(<FeedKeyboardDiagnostics label="panel" layerTestId="vrstva" />);

    expect(html).toBe('');
  });
});
