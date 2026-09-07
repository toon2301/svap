/**
 * Aktívna záložka profilu naviazaná na `?tab=`.
 *
 * Držané pokope, lebo práve tieto tri veci predtým nefungovali: prepnutie
 * záložky sa nikam nezapísalo, F5 ju zhodilo na východziu a krok späť s ňou
 * nehýbal vôbec.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  buildProfileTabUrl,
  parseProfileTab,
  readProfileTabFromSearch,
  useProfileTabQuery,
} from './profileTabQuery';

beforeEach(() => {
  window.history.replaceState(null, '', '/dashboard/users/peter');
});

describe('čítanie záložky z adresy', () => {
  it('accepts every known tab and rejects anything else', () => {
    expect(parseProfileTab('offers')).toBe('offers');
    expect(parseProfileTab('portfolio')).toBe('portfolio');
    expect(parseProfileTab('posts')).toBe('posts');
    expect(parseProfileTab('tagged')).toBe('tagged');

    // Neznáma hodnota sa zahodí – nie „opraví" na niečo iné, aby sa
    // z pokazenej adresy nestala tichá zmena obsahu.
    expect(parseProfileTab('offer')).toBeNull();
    expect(parseProfileTab('')).toBeNull();
    expect(parseProfileTab(null)).toBeNull();
    expect(parseProfileTab(undefined)).toBeNull();
  });

  it('reads the parameter with or without the leading question mark', () => {
    expect(readProfileTabFromSearch('?tab=posts')).toBe('posts');
    expect(readProfileTabFromSearch('tab=posts')).toBe('posts');
    expect(readProfileTabFromSearch('?offer=5&tab=portfolio')).toBe('portfolio');
    expect(readProfileTabFromSearch('?offer=5')).toBeNull();
  });
});

describe('zápis záložky do adresy', () => {
  it('keeps the path and the other parameters', () => {
    // `?offer=` a `?highlight=` appka na profile používa – prepnutie záložky
    // ich nesmie zmazať.
    expect(buildProfileTabUrl('/dashboard/users/peter?offer=5', 'posts')).toBe(
      '/dashboard/users/peter?offer=5&tab=posts',
    );
    expect(buildProfileTabUrl('/dashboard/users/peter', 'portfolio')).toBe(
      '/dashboard/users/peter?tab=portfolio',
    );
  });

  it('replaces an existing tab instead of stacking it', () => {
    expect(
      buildProfileTabUrl('/dashboard/users/peter?tab=posts', 'offers'),
    ).toBe('/dashboard/users/peter?tab=offers');
  });
});

describe('useProfileTabQuery', () => {
  it('falls back to the path-derived tab when the URL carries none', () => {
    window.history.replaceState(null, '', '/dashboard/users/peter/portfolio');
    const { result } = renderHook(() => useProfileTabQuery('portfolio'));

    expect(result.current[0]).toBe('portfolio');
  });

  it('lets the URL win over the fallback', () => {
    window.history.replaceState(null, '', '/dashboard/users/peter/portfolio?tab=posts');
    const { result } = renderHook(() => useProfileTabQuery('portfolio'));

    expect(result.current[0]).toBe('posts');
  });

  it('writes the tab into the URL when it changes', () => {
    const { result } = renderHook(() => useProfileTabQuery('offers'));

    act(() => result.current[1]('posts'));

    expect(result.current[0]).toBe('posts');
    expect(window.location.search).toBe('?tab=posts');
  });

  it('survives a reload', () => {
    const { result, unmount } = renderHook(() => useProfileTabQuery('offers'));
    act(() => result.current[1]('tagged'));
    unmount();

    // F5 = nová inštancia na tej istej adrese. Predtým sa vrátila východzia
    // záložka, lebo stav žil len v komponente.
    const reloaded = renderHook(() => useProfileTabQuery('offers'));
    expect(reloaded.result.current[0]).toBe('tagged');
  });

  it('follows the browser back button', async () => {
    const { result } = renderHook(() => useProfileTabQuery('offers'));

    act(() => result.current[1]('portfolio'));
    act(() => result.current[1]('posts'));
    expect(result.current[0]).toBe('posts');

    // Každé prepnutie je vlastný krok histórie, takže sa dá vrátiť.
    // `history.back()` je v jsdom asynchrónny (adresa aj `popstate` dorazia až
    // o niekoľko cyklov neskôr), preto sa naň čaká namiesto okamžitého
    // tvrdenia – zmeranej hodnote, nie odhadu.
    await act(async () => {
      window.history.back();
    });
    await waitFor(() => expect(window.location.search).toBe('?tab=portfolio'));

    expect(result.current[0]).toBe('portfolio');
  });

  it('keeps the history state other features rely on', () => {
    window.history.replaceState({ marker: 'keep-me' }, '', '/dashboard/users/peter');
    const { result } = renderHook(() => useProfileTabQuery('offers'));

    act(() => result.current[1]('posts'));

    // Návrat z nastavení aj mobilný panel sledovaných ponúk si v stave
    // histórie nesú vlastné štítky – prepnutie záložky im ich nesmie zmazať.
    expect(window.history.state).toEqual({ marker: 'keep-me' });
  });
});
