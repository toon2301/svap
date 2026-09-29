/**
 * `useDashboardMainKey`: nový kľúč pre `<main>` len pri zmene `activeModule`.
 *
 * Testuje sa cez samotný React strom (nie volaním hooku priamo), aby sa
 * overilo, čo naozaj vidí DOM: kľúč sa použije na `<main key={...}>`, takže
 * jediný pozorovateľný dôkaz je identita vykresleného elementu.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { useDashboardMainKey } from '../useDashboardMainKey';

function Probe({ module }: { module: string }) {
  const key = useDashboardMainKey(module);
  return (
    <main key={key} data-testid="main" data-module={module}>
      obsah
    </main>
  );
}

describe('useDashboardMainKey', () => {
  it('prvé vykreslenie nezískava nový element navyše (bez zbytočného remountu)', () => {
    render(<Probe module="home" />);
    expect(screen.getByTestId('main')).toHaveTextContent('obsah');
  });

  it('rovnaký modul pri prekreslení drží ten istý element', () => {
    const { rerender } = render(<Probe module="home" />);
    const first = screen.getByTestId('main');

    rerender(<Probe module="home" />);
    rerender(<Probe module="home" />);

    expect(screen.getByTestId('main')).toBe(first);
  });

  it('zmena modulu vytvorí nový element a starý sa odpojí', () => {
    const { rerender } = render(<Probe module="home" />);
    const first = screen.getByTestId('main');

    rerender(<Probe module="profile" />);

    const second = screen.getByTestId('main');
    expect(second).not.toBe(first);
    expect(first.isConnected).toBe(false);
    expect(second.isConnected).toBe(true);
  });

  it('návrat na PÔVODNÝ modul dostane TIEŽ nový element (nie ten prvý späť)', () => {
    const { rerender } = render(<Probe module="home" />);
    const first = screen.getByTestId('main');

    rerender(<Probe module="profile" />);
    rerender(<Probe module="home" />);

    const third = screen.getByTestId('main');
    expect(third).not.toBe(first);
    expect(first.isConnected).toBe(false);
  });

  it('reťaz mnohých prechodov: každá zmena modulu je nový element, žiadne dva susedné rovnaké', () => {
    const modules = ['home', 'profile', 'search', 'messages', 'requests', 'favorites', 'statistics', 'settings', 'watches', 'home'];
    const { rerender } = render(<Probe module={modules[0]} />);
    let previous = screen.getByTestId('main');
    const seen = new Set<Element>([previous]);

    for (const moduleName of modules.slice(1)) {
      rerender(<Probe module={moduleName} />);
      const current = screen.getByTestId('main');
      expect(current).not.toBe(previous);
      expect(seen.has(current)).toBe(false); // aj opakovaný modul dostane ČERSTVÝ element
      seen.add(current);
      previous = current;
    }
    expect(seen.size).toBe(modules.length);
  });

  it('viacero prekreslení TOHO ISTÉHO modulu medzi dvoma zmenami nevytvára ďalšie elementy', () => {
    const { rerender } = render(<Probe module="home" />);
    rerender(<Probe module="profile" />);
    const afterFirstChange = screen.getByTestId('main');

    for (let i = 0; i < 5; i += 1) rerender(<Probe module="profile" />);

    expect(screen.getByTestId('main')).toBe(afterFirstChange);
  });

  it('prázdny a neprázdny reťazec modulu sú odlišné hodnoty (zmena aj z/ do "")', () => {
    const { rerender } = render(<Probe module="" />);
    const first = screen.getByTestId('main');

    rerender(<Probe module="home" />);

    expect(screen.getByTestId('main')).not.toBe(first);
  });

  it('StrictMode: dvojité spustenie renderu v deve nevytvorí extra element navyše oproti bežnému renderu', () => {
    const { rerender } = render(
      <React.StrictMode>
        <Probe module="home" />
      </React.StrictMode>,
    );
    const first = screen.getByTestId('main');

    rerender(
      <React.StrictMode>
        <Probe module="home" />
      </React.StrictMode>,
    );
    expect(screen.getByTestId('main')).toBe(first);

    rerender(
      <React.StrictMode>
        <Probe module="profile" />
      </React.StrictMode>,
    );
    expect(screen.getByTestId('main')).not.toBe(first);
  });
});
