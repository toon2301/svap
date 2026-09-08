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

  it('keeps a query and a fragment side by side', () => {
    expect(
      buildProfileTabUrl('/dashboard/users/peter?offer=5#sekcia', 'posts'),
    ).toBe('/dashboard/users/peter?offer=5&tab=posts#sekcia');
  });

  it('splits on the FIRST separator only', () => {
    // Fragment smie obsahovat dalsie `#`…
    expect(buildProfileTabUrl('/dashboard/users/peter#a#b', 'offers')).toBe(
      '/dashboard/users/peter?tab=offers#a#b',
    );
    // …a hodnota v query dalsie `?`. Delenie na kazdom vyskyte adresu ticho
    // skratilo: z `redirect` ostalo len `/x`.
    expect(
      buildProfileTabUrl('/dashboard/users/peter?redirect=/x?y=1', 'offers'),
    ).toBe('/dashboard/users/peter?redirect=%2Fx%3Fy%3D1&tab=offers');
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

  it('writes nothing when the tab does not actually change', () => {
    const { result } = renderHook(() => useProfileTabQuery('offers'));
    const lengthBefore = window.history.length;
    const urlBefore = window.location.href;

    // Klik na UZ AKTIVNU zalozku. Predtym pridal prazdny krok do historie,
    // cez ktory sa pouzivatel musel preklikat spat.
    act(() => result.current[1]('offers'));

    expect(result.current[0]).toBe('offers');
    expect(window.history.length).toBe(lengthBefore);
    expect(window.location.href).toBe(urlBefore);
  });

  it('writes nothing on a derived no-op either', () => {
    const { result } = renderHook(() => useProfileTabQuery('offers'));
    const lengthBefore = window.history.length;

    // Odvodena zmena na tu istu hodnotu (highlight efekt, ked su ponuky uz
    // aktivne) tiez nema co zapisovat.
    act(() => result.current[1]('offers', { replace: true }));

    expect(window.history.length).toBe(lengthBefore);
  });

  it('replaces the current entry instead of adding one', () => {
    const { result } = renderHook(() => useProfileTabQuery('offers'));
    const lengthBefore = window.history.length;

    act(() => result.current[1]('posts', { replace: true }));

    expect(result.current[0]).toBe('posts');
    expect(window.location.search).toBe('?tab=posts');
    // Odvodena zmena si nekonzumuje krok spat ako vlastna navigacia.
    expect(window.history.length).toBe(lengthBefore);
  });

  it('still adds an entry for a direct tab click', () => {
    const { result } = renderHook(() => useProfileTabQuery('offers'));
    // Ustalenie pozicie: jsdom ma jednu historiu na cely subor a predosly test
    // ju nechal uprostred zasobnika, kde `push` zahadzuje zaznamy pred sebou.
    window.history.pushState(null, '', window.location.href);
    const lengthBefore = window.history.length;

    act(() => result.current[1]('posts'));

    expect(window.history.length).toBe(lengthBefore + 1);
  });

  it('re-reads the tab when the profile identity changes', () => {
    window.history.replaceState(null, '', '/dashboard/users/peter?tab=portfolio');
    const { result, rerender } = renderHook(
      ({ key }: { key: string }) => useProfileTabQuery('offers', key),
      { initialProps: { key: 'peter' } },
    );
    expect(result.current[0]).toBe('portfolio');

    // Klik na avatara vo feede: `goToUserProfile` prepise adresu cez
    // `pushState` (ziadny `popstate`, ziadny remount) a modul dostane INE id.
    window.history.pushState(null, '', '/dashboard/users/jana');
    rerender({ key: 'jana' });

    // Novy profil `?tab=` nema, takze plati vychodzia zalozka. Bez identity
    // v deps by tu ostalo svietit `portfolio` z profilu, ktory uz nepozerame.
    expect(result.current[0]).toBe('offers');
  });

  it('lets the new profile URL decide when it carries a tab', () => {
    window.history.replaceState(null, '', '/dashboard/users/peter?tab=portfolio');
    const { result, rerender } = renderHook(
      ({ key }: { key: string }) => useProfileTabQuery('offers', key),
      { initialProps: { key: 'peter' } },
    );

    window.history.pushState(null, '', '/dashboard/users/jana?tab=posts');
    rerender({ key: 'jana' });

    expect(result.current[0]).toBe('posts');
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
