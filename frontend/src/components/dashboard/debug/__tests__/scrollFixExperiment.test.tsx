/**
 * [EXPERIMENT ?scrollfix=b – DOČASNÉ]
 * Príznak experimentu B a kľúč pre `<main>`: bez príznaku ten istý element
 * navždy, s ním nový element pri každej zmene modulu – nie však po načítaní.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  SCROLL_FIX_FLAG_KEY,
  resetScrollFixForTests,
  resolveScrollFixFlag,
  scrollFixLabel,
  useScrollFixMainKey,
} from '../scrollFixExperiment';

function Probe({ module }: { module: string }) {
  const key = useScrollFixMainKey(module);
  return (
    <main key={key} data-testid="main" data-key={key}>
      {module}
    </main>
  );
}

beforeEach(() => {
  resetScrollFixForTests();
  sessionStorage.clear();
  window.history.replaceState(null, '', '/dashboard');
});

describe('resolveScrollFixFlag', () => {
  it('?scrollfix=b zapne a stav prežije adresu bez parametra', () => {
    expect(resolveScrollFixFlag('?scrollfix=b')).toBe(true);
    expect(sessionStorage.getItem(SCROLL_FIX_FLAG_KEY)).toBe('b');
    expect(resolveScrollFixFlag('?offer=11')).toBe(true);
  });

  it('?scrollfix=0 vypne a stav zmaže', () => {
    resolveScrollFixFlag('?scrollfix=b');
    expect(resolveScrollFixFlag('?scrollfix=0')).toBe(false);
    expect(sessionStorage.getItem(SCROLL_FIX_FLAG_KEY)).toBeNull();
    expect(resolveScrollFixFlag('')).toBe(false);
  });

  it('iná hodnota experiment nezapne', () => {
    expect(resolveScrollFixFlag('?scrollfix=a')).toBe(false);
    expect(resolveScrollFixFlag('?scrollfix=1')).toBe(false);
  });
});

describe('useScrollFixMainKey', () => {
  it('bez príznaku: ten istý element pri každej zmene modulu', () => {
    const { rerender } = render(<Probe module="home" />);
    const first = screen.getByTestId('main');
    expect(first).toHaveAttribute('data-key', 'main-0');

    rerender(<Probe module="profile" />);
    rerender(<Probe module="home" />);

    expect(screen.getByTestId('main')).toBe(first);
  });

  it('s príznakom: po načítaní rovnaký kľúč, pri zmene modulu nový element', () => {
    sessionStorage.setItem(SCROLL_FIX_FLAG_KEY, 'b');
    const { rerender } = render(<Probe module="home" />);
    const first = screen.getByTestId('main');
    // Prvé vykreslenie má ten istý kľúč ako bez experimentu – nič sa neremountuje.
    expect(first).toHaveAttribute('data-key', 'main-0');

    rerender(<Probe module="home" />);
    expect(screen.getByTestId('main')).toBe(first);

    rerender(<Probe module="profile" />);
    const second = screen.getByTestId('main');
    expect(second).not.toBe(first);
    expect(first.isConnected).toBe(false);
    expect(second).toHaveAttribute('data-key', 'main-1');

    rerender(<Probe module="home" />);
    expect(screen.getByTestId('main')).not.toBe(second);
    expect(screen.getByTestId('main')).toHaveAttribute('data-key', 'main-2');
  });

  it('príznak v adrese pri načítaní experiment zapne', () => {
    window.history.replaceState(null, '', '/dashboard?scrollfix=b');
    const { rerender } = render(<Probe module="home" />);
    const first = screen.getByTestId('main');

    rerender(<Probe module="settings" />);

    expect(screen.getByTestId('main')).not.toBe(first);
    expect(sessionStorage.getItem(SCROLL_FIX_FLAG_KEY)).toBe('b');
  });
});

describe('scrollFixLabel (hlavička pásika)', () => {
  it('hlási stav, ktorý použil hook – pred ním „?"', () => {
    expect(scrollFixLabel()).toBe('?');
    render(<Probe module="home" />);
    expect(scrollFixLabel()).toBe('-');
  });

  it('zapnutý experiment je „b"', () => {
    sessionStorage.setItem(SCROLL_FIX_FLAG_KEY, 'b');
    render(<Probe module="home" />);
    expect(scrollFixLabel()).toBe('b');
  });

  it('bez sessionStorage zapne experiment parameter v adrese a hlavička to ukáže', () => {
    window.history.replaceState(null, '', '/dashboard?scrollfix=b');
    const getItem = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    try {
      const { rerender } = render(<Probe module="home" />);
      const first = screen.getByTestId('main');
      rerender(<Probe module="profile" />);

      expect(screen.getByTestId('main')).not.toBe(first);
      expect(scrollFixLabel()).toBe('b');
    } finally {
      getItem.mockRestore();
      setItem.mockRestore();
    }
  });
});

