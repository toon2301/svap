/**
 * Appková šípka opúšťa profil CELÝ – na jeho pôvod.
 *
 * Každé prepnutie záložky je vlastný krok histórie (aby fungoval browser
 * Back), takže jeden krok späť vrátil len o záložku. Marker preto nesie hĺbku
 * záznamu v profile a šípka skočí `history.go(-(hĺbka + 1))`.
 */

import {
  adoptProfileOrigin,
  markProfileOriginPending,
  readProfileOriginDepth,
  resetProfileOriginPending,
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

/**
 * Vstup cez `router.push` (vyhľadávanie): stav sa pripnúť dopredu nedá, lebo
 * záznam vzniká až po dokončení navigácie. Pôvod si preto profil prevezme po
 * príchode – rovnako ako detail portfólia.
 */
describe('prevzatie pôvodu po navigácii routerom', () => {
  beforeEach(() => {
    resetProfileOriginPending();
    window.history.replaceState(null, '', '/dashboard/users/jana');
  });

  it('označí záznam profilu, ktorý appka otvorila', () => {
    markProfileOriginPending('/dashboard/users/jana');
    adoptProfileOrigin();

    expect(readProfileOriginDepth(window.history.state)).toBe(0);
  });

  it('profil otvorený odkazom si pôvod neprivlastní', () => {
    // Žiadna čakajúca navigácia – appka tento profil neotvárala.
    adoptProfileOrigin();

    expect(readProfileOriginDepth(window.history.state)).toBeNull();
  });

  it('záznam s inou adresou si pôvod neprivlastní', () => {
    markProfileOriginPending('/dashboard/users/peter');
    adoptProfileOrigin();

    expect(readProfileOriginDepth(window.history.state)).toBeNull();
  });

  // Dashboard prepne modul na profil ešte PRED zmenou adresy (stav sa nastaví hneď,
  // `router.push` dokončí navigáciu až po stiahnutí stránky), takže profil sa
  // prvýkrát zobrazí na adrese východiskovej stránky. Čakajúci pôvod preto nesmie
  // zaniknúť pri tomto skorom volaní, inak ho záznam profilu už nikdy nedostane.
  it('pri nezhode adries čakajúci pôvod ostáva a prevezme ho záznam so zhodnou adresou', () => {
    markProfileOriginPending('/dashboard/users/peter');
    adoptProfileOrigin();
    expect(readProfileOriginDepth(window.history.state)).toBeNull();

    window.history.replaceState(null, '', '/dashboard/users/peter');
    adoptProfileOrigin();

    expect(readProfileOriginDepth(window.history.state)).toBe(0);
  });

  it('scenár z nálezu: profil sa zobrazí ešte na adrese vyhľadávania, adresa príde neskôr', () => {
    const go = jest.spyOn(window.history, 'go').mockImplementation(() => {});
    window.history.replaceState(null, '', '/dashboard/search');

    // Klik na výsledok: stav sa prepne hneď, `router.push` ešte nedoručil adresu.
    markProfileOriginPending('/dashboard/users/jana');
    adoptProfileOrigin();
    // Router doručí adresu profilu ako nový záznam histórie.
    window.history.pushState(null, '', '/dashboard/users/jana');
    adoptProfileOrigin();
    // Používateľ prepne záložku a ťukne na šípku späť.
    window.history.pushState(
      withProfileOriginStep(window.history.state),
      '',
      '/dashboard/users/jana?tab=portfolio',
    );

    expect(readProfileOriginDepth(window.history.state)).toBe(1);
    expect(returnToProfileOrigin()).toBe(true);
    expect(go).toHaveBeenCalledWith(-2);
    go.mockRestore();
  });

  // Router doručí adresu profilu, až keď stiahne stránku – po pomalej sieti alebo s appkou
  // na pozadí to trvá aj minúty. Čakajúci pôvod preto nesmie starnúť podľa hodín: platí,
  // kým je stránka na východiskovej adrese, a zaniká, až keď navigáciu zruší alebo
  // nahradí iná (profil sa zobrazí na tretej adrese).
  describe('pomalá a zrušená navigácia', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('pomalá navigácia: pôvod sa prevezme aj po dlhom čakaní na adresu', () => {
      jest.useFakeTimers();
      window.history.replaceState(null, '', '/dashboard/search');
      markProfileOriginPending('/dashboard/users/jana');
      adoptProfileOrigin();

      jest.advanceTimersByTime(10 * 60_000);
      window.history.pushState(null, '', '/dashboard/users/jana');
      adoptProfileOrigin();

      expect(readProfileOriginDepth(window.history.state)).toBe(0);
    });

    it('prvé volanie až po dlhom čakaní pôvod nezahodí, kým adresa nedorazí', () => {
      jest.useFakeTimers();
      window.history.replaceState(null, '', '/dashboard/search');
      markProfileOriginPending('/dashboard/users/jana');

      jest.advanceTimersByTime(10 * 60_000);
      adoptProfileOrigin();
      window.history.pushState(null, '', '/dashboard/users/jana');
      adoptProfileOrigin();

      expect(readProfileOriginDepth(window.history.state)).toBe(0);
    });

    it('východisková adresa sa porovnáva bez query (na vyhľadávaní uniká ?tab=offers)', () => {
      window.history.replaceState(null, '', '/dashboard/search?tab=offers');
      markProfileOriginPending('/dashboard/users/jana');
      adoptProfileOrigin();
      window.history.pushState(null, '', '/dashboard/users/jana');
      adoptProfileOrigin();

      expect(readProfileOriginDepth(window.history.state)).toBe(0);
    });

    it('nová žiadosť si zapamätá aj novú východiskovú adresu', () => {
      window.history.replaceState(null, '', '/dashboard/search');
      markProfileOriginPending('/dashboard/users/peter');
      // Používateľ otvorí profil zo stránky všetkých výsledkov na inej adrese.
      window.history.replaceState(null, '', '/search');
      markProfileOriginPending('/dashboard/users/jana');
      adoptProfileOrigin();
      window.history.pushState(null, '', '/dashboard/users/jana');
      adoptProfileOrigin();

      expect(readProfileOriginDepth(window.history.state)).toBe(0);
    });

    it('navigácia, ktorú nahradila iná adresa, čakajúci pôvod zruší', () => {
      window.history.replaceState(null, '', '/dashboard/search');
      markProfileOriginPending('/dashboard/users/jana');

      // Používateľ medzitým odišiel inam: profil sa zobrazí na tretej adrese.
      window.history.replaceState(null, '', '/dashboard/users/peter');
      adoptProfileOrigin();
      expect(readProfileOriginDepth(window.history.state)).toBeNull();

      // Neskorší príchod na pôvodne čakajúcu adresu už pôvod nedostane – patril zrušenej navigácii.
      window.history.replaceState(null, '', '/dashboard/users/jana');
      adoptProfileOrigin();
      expect(readProfileOriginDepth(window.history.state)).toBeNull();
    });
  });

  it('nová žiadosť o pôvod nahradí predošlú', () => {
    markProfileOriginPending('/dashboard/users/peter');
    markProfileOriginPending('/dashboard/users/jana');

    adoptProfileOrigin();

    expect(readProfileOriginDepth(window.history.state)).toBe(0);
  });

  it('prevzatie je jednorazové', () => {
    markProfileOriginPending('/dashboard/users/jana');
    adoptProfileOrigin();

    // Ďalší profil v tom istom behu už tento štítok dostať nesmie.
    window.history.replaceState(null, '', '/dashboard/users/jana');
    adoptProfileOrigin();

    expect(readProfileOriginDepth(window.history.state)).toBeNull();
  });

  it('hĺbku už označeného záznamu neprepíše', () => {
    // Krok dopredu na profil, kde už používateľ prepínal záložky.
    window.history.replaceState(
      withProfileOriginStep(withProfileOriginEntry(null)),
      '',
      '/dashboard/users/jana',
    );
    markProfileOriginPending('/dashboard/users/jana');
    adoptProfileOrigin();

    expect(readProfileOriginDepth(window.history.state)).toBe(1);
  });

  it('scenár z nálezu: vstup z vyhľadávania → záložka → šípka opustí profil', () => {
    const go = jest.spyOn(window.history, 'go').mockImplementation(() => {});

    // Vyhľadávanie otvorí profil routerom a profil si pôvod prevezme.
    markProfileOriginPending('/dashboard/users/jana');
    adoptProfileOrigin();
    // Používateľ prepne záložku – vlastný krok histórie.
    window.history.replaceState(
      withProfileOriginStep(window.history.state),
      '',
      '/dashboard/users/jana?tab=portfolio',
    );

    expect(returnToProfileOrigin()).toBe(true);
    // Záložka + profil = dva kroky. Predtým sa vrátila len záložka.
    expect(go).toHaveBeenCalledWith(-2);
    go.mockRestore();
  });
});
