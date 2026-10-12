/**
 * Profil otvorený z vyhľadávania musí poznať svoj pôvod.
 *
 * Appka má dve vyhľadávania: panel v dashboarde a samostatnú stránku
 * `/search`. Stránka si držala vlastnú kópiu tejto navigácie, takže značenie
 * pôvodu, ktoré dostala dashboardová vetva, sa na ňu nedostalo – appková šípka
 * potom profil neopustila, len prepla záložku.
 *
 * Obe cesty teraz vedú cez `openUserProfileFromSearch`, takže test overuje
 * jeden mechanizmus pre obe.
 */

import {
  openUserProfileFromSearch,
  profileIdentifierFor,
} from './openUserProfileFromSearch';
import {
  adoptProfileOrigin,
  markProfileOriginPending,
  readProfileOriginDepth,
  resetProfileOriginPending,
  returnToProfileOrigin,
  withProfileOriginStep,
} from './profileOriginHistory';

/** Router, ktorý adresu naozaj zmení – ako `router.push` v prehliadači. */
function testRouter() {
  return { push: jest.fn((url: string) => window.history.pushState(null, '', url)) };
}

beforeEach(() => {
  resetProfileOriginPending();
  window.history.replaceState(null, '', '/search');
});

describe('identifikátor profilu', () => {
  it('uprednostní slug, inak vezme ID', () => {
    expect(profileIdentifierFor(42, 'jana')).toBe('jana');
    expect(profileIdentifierFor(42, null)).toBe('42');
    expect(profileIdentifierFor(42, '  ')).toBe('42');
  });
});

describe('otvorenie profilu z vyhľadávania', () => {
  it('prejde na profil a označí jeho záznam pôvodom', () => {
    const router = testRouter();

    openUserProfileFromSearch(router, 'jana');
    adoptProfileOrigin();

    expect(router.push).toHaveBeenCalledWith('/dashboard/users/jana');
    expect(readProfileOriginDepth(window.history.state)).toBe(0);
  });

  it('so zvýraznením ponuky pôvod označí tiež', () => {
    const router = testRouter();

    openUserProfileFromSearch(router, 'jana', { highlightSkillId: 55 });
    adoptProfileOrigin();

    // Pôvod sa značí CESTOU bez query – prevzatie porovnáva `pathname`,
    // takže s parametrom by sa nikdy netrafilo.
    expect(router.push).toHaveBeenCalledWith('/dashboard/users/jana?highlight=55');
    expect(readProfileOriginDepth(window.history.state)).toBe(0);
  });

  it('scenár z nálezu: profil → záložka → šípka opustí profil', () => {
    const go = jest.spyOn(window.history, 'go').mockImplementation(() => {});
    const router = testRouter();

    openUserProfileFromSearch(router, 'jana');
    adoptProfileOrigin();
    // Prepnutie na Portfólio – vlastný krok histórie.
    window.history.pushState(
      withProfileOriginStep(window.history.state),
      '',
      '/dashboard/users/jana?tab=portfolio',
    );

    expect(returnToProfileOrigin()).toBe(true);
    // Záložka + profil = dva kroky späť na Vyhľadávanie. Predtým sa šípka
    // vrátila len o záložku.
    expect(go).toHaveBeenCalledWith(-2);
    go.mockRestore();
  });

  it('pôvod sa označí ešte PRED `router.push`, aj keď sa profil zobrazí hneď', () => {
    // Profil sa môže zobraziť a volať `adoptProfileOrigin()` už počas `push` – čakajúci pôvod
    // musí v tom okamihu existovať.
    const router = {
      push: jest.fn((url: string) => {
        window.history.pushState(null, '', url);
        adoptProfileOrigin();
      }),
    };

    openUserProfileFromSearch(router, 'jana');

    expect(readProfileOriginDepth(window.history.state)).toBe(0);
  });

  it('bez použiteľného identifikátora nenaviguje nikam', () => {
    const router = testRouter();

    openUserProfileFromSearch(router, '');

    expect(router.push).not.toHaveBeenCalled();
  });
});

describe('zlyhanie navigácie', () => {
  // `router.push` môže zlyhať ešte pred navigáciou. Čakajúci pôvod potom nemá kto prevziať,
  // preto sa zruší – a chyba ide ďalej tak ako doteraz.
  it('router.push zlyhá: chyba sa prepošle a pôvod sa nepripne', () => {
    const failure = new Error('push zlyhal');
    const router = {
      push: jest.fn(() => {
        throw failure;
      }),
    };

    expect(() => openUserProfileFromSearch(router, 'jana')).toThrow(failure);

    window.history.replaceState(null, '', '/dashboard/users/jana');
    adoptProfileOrigin();
    expect(readProfileOriginDepth(window.history.state)).toBeNull();
  });

  it('zlyhanie staršej navigácie novšiu žiadosť nezruší', () => {
    const router = {
      push: jest.fn(() => {
        // Medzitým vznikla novšia žiadosť (iný profil) – zlyhanie staršej ju nesmie zmazať.
        markProfileOriginPending('/dashboard/users/peter');
        throw new Error('push zlyhal');
      }),
    };

    expect(() => openUserProfileFromSearch(router, 'jana')).toThrow('push zlyhal');

    window.history.replaceState(null, '', '/dashboard/users/peter');
    adoptProfileOrigin();
    expect(readProfileOriginDepth(window.history.state)).toBe(0);
  });
});
