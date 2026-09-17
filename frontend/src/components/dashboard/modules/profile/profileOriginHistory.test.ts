/**
 * Appková šípka opúšťa profil CELÝ – na jeho pôvod.
 *
 * Každé prepnutie záložky je vlastný krok histórie (aby fungoval browser
 * Back), takže jeden krok späť vrátil len o záložku. Marker preto nesie hĺbku
 * záznamu v profile a šípka skočí `history.go(-(hĺbka + 1))`.
 */

import {
  readProfileOriginDepth,
  returnToProfileOrigin,
  withProfileOriginEntry,
  withProfileOriginStep,
} from './profileOriginHistory';

describe('marker pôvodu profilu', () => {
  it('prvý záznam profilu má hĺbku nula', () => {
    expect(readProfileOriginDepth(withProfileOriginEntry(null))).toBe(0);
  });

  it('každý krok vnútri profilu hĺbku zvýši', () => {
    const entry = withProfileOriginEntry(null);
    const first = withProfileOriginStep(entry);
    const second = withProfileOriginStep(first);

    expect(readProfileOriginDepth(first)).toBe(1);
    expect(readProfileOriginDepth(second)).toBe(2);
  });

  it('mimo profilu nemá čo prehlbovať', () => {
    // Krok, ktorý s profilom nesúvisí, si jeho pôvod privlastniť nemá.
    expect(readProfileOriginDepth(withProfileOriginStep(null))).toBeNull();
    expect(readProfileOriginDepth(withProfileOriginStep({ iny: 'stav' }))).toBeNull();
  });

  it('cudzie štítky v stave histórie ostávajú', () => {
    // Návrat z nastavení aj mobilný panel sledovaných ponúk si v stave nesú
    // vlastné štítky – marker profilu im ich nesmie zmazať.
    const withMarker = withProfileOriginEntry({ __svaplyDesktopSettings: 'keep' });

    expect(withMarker.__svaplyDesktopSettings).toBe('keep');
    expect(withProfileOriginStep(withMarker).__svaplyDesktopSettings).toBe('keep');
  });

  it('marker z iného načítania stránky neplatí', () => {
    // `history.state` prežije F5, ale záznamy spred reloadu appka preskočiť
    // nevie – vtedy sa šípka musí vrátiť k jednému kroku späť.
    const foreign = {
      __svaplyProfileOrigin: { version: 1, pageLoadId: 'ine-nacitanie', depth: 3 },
    };

    expect(readProfileOriginDepth(foreign)).toBeNull();
  });

  it('poškodený marker neplatí', () => {
    const own = withProfileOriginEntry(null).__svaplyProfileOrigin as Record<string, unknown>;

    expect(readProfileOriginDepth({ __svaplyProfileOrigin: { ...own, version: 2 } })).toBeNull();
    expect(readProfileOriginDepth({ __svaplyProfileOrigin: { ...own, depth: -1 } })).toBeNull();
    expect(readProfileOriginDepth({ __svaplyProfileOrigin: { ...own, depth: 1.5 } })).toBeNull();
    expect(readProfileOriginDepth({ __svaplyProfileOrigin: 'nie objekt' })).toBeNull();
  });
});

describe('skok na pôvod', () => {
  const go = jest.spyOn(window.history, 'go').mockImplementation(() => {});

  beforeEach(() => {
    go.mockClear();
    window.history.replaceState(null, '', '/dashboard/users/peter');
  });

  afterAll(() => go.mockRestore());

  it('z prvého záznamu je to jeden krok', () => {
    window.history.replaceState(withProfileOriginEntry(null), '', '/dashboard/users/peter');

    expect(returnToProfileOrigin()).toBe(true);
    expect(go).toHaveBeenCalledWith(-1);
  });

  it('po dvoch prepnutiach záložky preskočí obe naraz', () => {
    const entry = withProfileOriginEntry(null);
    const afterTwoTabs = withProfileOriginStep(withProfileOriginStep(entry));
    window.history.replaceState(afterTwoTabs, '', '/dashboard/users/peter?tab=posts');

    expect(returnToProfileOrigin()).toBe(true);
    // Dve záložky + samotný profil = tri kroky na pôvod.
    expect(go).toHaveBeenCalledWith(-3);
  });

  it('bez známeho pôvodu neskáče nikam', () => {
    window.history.replaceState(null, '', '/dashboard/users/peter');

    expect(returnToProfileOrigin()).toBe(false);
    expect(go).not.toHaveBeenCalled();
  });
});

describe('marker a adresa sú oddelené', () => {
  it('`?tab=` sa markera nedotýka a naopak', () => {
    // Záložka žije v adrese, pôvod v `history.state`. Ani jedno nesmie
    // prepisovať to druhé.
    window.history.replaceState(
      withProfileOriginStep(withProfileOriginEntry(null)),
      '',
      '/dashboard/users/peter?tab=portfolio',
    );

    expect(window.location.search).toBe('?tab=portfolio');
    expect(readProfileOriginDepth(window.history.state)).toBe(1);

    // Zmena samotnej adresy (prepnutie záložky cez replace) hĺbku nemení.
    window.history.replaceState(
      window.history.state,
      '',
      '/dashboard/users/peter?tab=posts',
    );

    expect(window.location.search).toBe('?tab=posts');
    expect(readProfileOriginDepth(window.history.state)).toBe(1);
  });
});
