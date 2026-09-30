/**
 * `useDashboardWindowScrollReset`: nová obrazovka dashboardu začína s oknom na pozícii 0.
 *
 * Dashboard scrolluje výhradne vnútri `<main>`, okno (dokument) sa scrollovať nemá.
 * Na iOS Safari sa však kvôli lištám dokument dá odscrollovať a okno ostane posunuté
 * aj po prepnutí modulu – nová obrazovka sa potom zobrazí odrezaná zhora.
 */

import React, { useEffect } from 'react';
import { render } from '@testing-library/react';
import { useDashboardWindowScrollReset } from '../useDashboardWindowScrollReset';

function Probe({ screen }: { screen: string }) {
  useDashboardWindowScrollReset(screen);
  return null;
}

const originalScrollY = Object.getOwnPropertyDescriptor(window, 'scrollY');
let windowScrollY = 0;
let scrollToSpy: jest.SpyInstance;

describe('useDashboardWindowScrollReset', () => {
  beforeEach(() => {
    windowScrollY = 0;
    Object.defineProperty(window, 'scrollY', { configurable: true, get: () => windowScrollY });
    scrollToSpy = jest.spyOn(window, 'scrollTo').mockImplementation((_x: unknown, y?: unknown) => {
      windowScrollY = typeof y === 'number' ? y : 0;
    });
  });

  afterEach(() => {
    scrollToSpy.mockRestore();
    if (originalScrollY) Object.defineProperty(window, 'scrollY', originalScrollY);
  });

  it('okno je na začiatku: pri prvom vykreslení ani pri zmene obrazovky sa nescrolluje', () => {
    const { rerender } = render(<Probe screen="home" />);
    rerender(<Probe screen="profile" />);

    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it('prvé vykreslenie s odscrollovaným oknom ho vráti na začiatok', () => {
    windowScrollY = 40;

    render(<Probe screen="home" />);

    expect(scrollToSpy).toHaveBeenCalledTimes(1);
    expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
    expect(window.scrollY).toBe(0);
  });

  it('zmena obrazovky s odscrollovaným oknom ho vráti na začiatok', () => {
    const { rerender } = render(<Probe screen="home" />);
    windowScrollY = 40;

    rerender(<Probe screen="profile" />);

    expect(scrollToSpy).toHaveBeenCalledTimes(1);
    expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
    expect(window.scrollY).toBe(0);
  });

  it('prekreslenie tej istej obrazovky okno nechá tak (napr. posun kvôli klávesnici)', () => {
    const { rerender } = render(<Probe screen="home" />);
    windowScrollY = 40;

    rerender(<Probe screen="home" />);
    rerender(<Probe screen="home" />);

    expect(scrollToSpy).not.toHaveBeenCalled();
    expect(window.scrollY).toBe(40);
  });

  it('každý ďalší prechod vynuluje okno znova', () => {
    const { rerender } = render(<Probe screen="home" />);

    windowScrollY = 40;
    rerender(<Probe screen="profile" />);
    windowScrollY = 25;
    rerender(<Probe screen="messages" />);

    expect(scrollToSpy).toHaveBeenCalledTimes(2);
    expect(window.scrollY).toBe(0);
  });

  it('StrictMode: okno sa vráti na začiatok práve raz', () => {
    windowScrollY = 40;

    render(
      <React.StrictMode>
        <Probe screen="home" />
      </React.StrictMode>,
    );

    expect(scrollToSpy).toHaveBeenCalledTimes(1);
    expect(window.scrollY).toBe(0);
  });

  it('beží ako layout efekt: okno je vynulované skôr, než sa spustia pasívne efekty', () => {
    // Pasívny efekt súrodenca stojaceho PRED hookom: keby hook bežal tiež až ako pasívny efekt,
    // videl by okno ešte na 40.
    const seen: number[] = [];
    function Recorder() {
      useEffect(() => {
        seen.push(windowScrollY);
      });
      return null;
    }
    windowScrollY = 40;

    render(
      <>
        <Recorder />
        <Probe screen="home" />
      </>,
    );

    expect(seen).toEqual([0]);
  });
});
