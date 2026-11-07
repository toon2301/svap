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

/** Ako `Probe`, no s podržaním kľúča (mobilný zoznam Nastavení, ktorý sa vsúva ponad obrazovku). */
function HoldProbe({ module, hold }: { module: string; hold: boolean }) {
  const key = useDashboardMainKey(module, hold);
  return (
    <main key={key} data-testid="main" data-module={module}>
      obsah
    </main>
  );
}

describe('useDashboardMainKey: podržanie kľúča', () => {
  it('kým je podržanie zapnuté, zmena obrazovky element nevymení', () => {
    const { rerender } = render(<HoldProbe module="profile" hold={false} />);
    const first = screen.getByTestId('main');

    rerender(<HoldProbe module="settings" hold />);

    expect(screen.getByTestId('main')).toBe(first);
    expect(first.isConnected).toBe(true);
  });

  it('návrat na tú istú obrazovku po podržaní ostane na tom istom elemente (obrazovka sa nezmenila)', () => {
    const { rerender } = render(<HoldProbe module="profile" hold={false} />);
    const first = screen.getByTestId('main');

    rerender(<HoldProbe module="settings" hold />);
    rerender(<HoldProbe module="profile" hold={false} />);

    expect(screen.getByTestId('main')).toBe(first);
  });

  it('iná obrazovka po podržaní dostane nový element a starý sa odpojí', () => {
    const { rerender } = render(<HoldProbe module="profile" hold={false} />);
    const first = screen.getByTestId('main');

    rerender(<HoldProbe module="settings" hold />);
    rerender(<HoldProbe module="language" hold={false} />);

    const second = screen.getByTestId('main');
    expect(second).not.toBe(first);
    expect(first.isConnected).toBe(false);
  });

  it('po podržaní sa ďalšie zmeny správajú ako predtým (každá dostane nový element)', () => {
    const { rerender } = render(<HoldProbe module="profile" hold={false} />);
    rerender(<HoldProbe module="settings" hold />);
    rerender(<HoldProbe module="language" hold={false} />);
    const afterLanguage = screen.getByTestId('main');

    rerender(<HoldProbe module="home" hold={false} />);

    expect(screen.getByTestId('main')).not.toBe(afterLanguage);
  });

  it('podržanie pri prvom vykreslení (priamy vstup) nič nepokazí', () => {
    const { rerender } = render(<HoldProbe module="settings" hold />);
    const first = screen.getByTestId('main');

    rerender(<HoldProbe module="settings" hold />);
    expect(screen.getByTestId('main')).toBe(first);

    rerender(<HoldProbe module="language" hold={false} />);
    expect(screen.getByTestId('main')).not.toBe(first);
  });
});
