/**
 * Nový vstup do profilu vs. pokračovanie v už otvorenom.
 *
 * Klik na avatar/meno má profil otvoriť od vrchu a na Ponukách. F5 ani krok
 * späť/dopredu vnútri profilu to spustiť NESMÚ – tam sa obnovuje to, čo si
 * používateľ vybral.
 */

import { act, renderHook } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  markProfileFreshEntry,
  resetProfileFreshEntry,
  takeProfileFreshEntry,
} from './profileFreshEntry';
import { useProfileFreshEntry } from './useProfileFreshEntry';
import { openUserProfile } from '../feed/feedProfileNavigation';

function mountDashboardMain(scrollTop: number): HTMLElement {
  const main = document.createElement('main');
  main.setAttribute('data-dashboard-main', '');
  main.scrollTop = scrollTop;
  document.body.appendChild(main);
  return main;
}

beforeEach(() => {
  resetProfileFreshEntry();
  document.querySelectorAll('[data-dashboard-main]').forEach((node) => node.remove());
});

afterEach(() => resetProfileFreshEntry());

describe('príznak nového vstupu', () => {
  it('is set by the avatar click and consumed once', () => {
    // Preklik z hlavičky príspevku, komentára aj zoznamu lajkujúcich ide cez
    // ten istý `openUserProfile`.
    act(() => openUserProfile({ id: 21, slug: 'peter' }));

    expect(takeProfileFreshEntry()).toBe(true);
    // Druhé prekreslenie toho istého profilu už nový vstup nie je.
    expect(takeProfileFreshEntry()).toBe(false);
  });

  it('is absent without a click', () => {
    // F5 aj krok späť/dopredu – nikto príznak nenastavil.
    expect(takeProfileFreshEntry()).toBe(false);
  });
});

describe('useProfileFreshEntry', () => {
  it('scrolls to the top and reports a fresh entry', () => {
    const main = mountDashboardMain(1400);
    markProfileFreshEntry();

    const { result } = renderHook(() => useProfileFreshEntry('peter'));

    // Presne pozorovaný scenár: odscrollovaný cudzí profil, klik na iný
    // profil → nový sa otvorí od vrchu, nie prescrollovaný.
    expect(main.scrollTop).toBe(0);
    expect(result.current).toBe(true);
  });

  it('leaves the scroll alone on F5 or history navigation', () => {
    const main = mountDashboardMain(1400);

    // Žiadny preklik → žiadny príznak → nič sa nedeje.
    const { result } = renderHook(() => useProfileFreshEntry('peter'));

    expect(main.scrollTop).toBe(1400);
    expect(result.current).toBe(false);
  });

  it('fires again when the visitor moves to another profile', () => {
    const main = mountDashboardMain(0);
    markProfileFreshEntry();
    const { result, rerender } = renderHook(
      ({ key }: { key: string }) => useProfileFreshEntry(key),
      { initialProps: { key: 'peter' } },
    );
    expect(result.current).toBe(true);

    // Z profilu na profil sa ide klientsky – modul sa neodmountuje.
    main.scrollTop = 900;
    markProfileFreshEntry();
    rerender({ key: 'jana' });

    expect(main.scrollTop).toBe(0);
    expect(result.current).toBe(true);
  });

  it('does not fire on a re-render of the same profile', () => {
    const main = mountDashboardMain(0);
    markProfileFreshEntry();
    const { result, rerender } = renderHook(
      ({ key }: { key: string }) => useProfileFreshEntry(key),
      { initialProps: { key: 'peter' } },
    );
    expect(result.current).toBe(true);

    // Bežné prekreslenie (načítali sa dáta) – používateľov scroll ostáva.
    main.scrollTop = 900;
    rerender({ key: 'peter' });

    expect(main.scrollTop).toBe(900);
  });
});
