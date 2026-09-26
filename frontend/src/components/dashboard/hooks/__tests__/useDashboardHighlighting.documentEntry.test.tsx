/**
 * Obnova zvýraznenia zo `sessionStorage` patrí len aktivácii, na ktorej sa
 * dokument načítal.
 *
 * Záloha v `sessionStorage` je pre F5 na profile, keď adresa parameter už
 * nemá. Predtým sa vetva spúšťala pri každom prepnutí na profil v bežiacej
 * appke a vzkriesila zvýraznenie spred menej ako minúty aj tam, kde si ho nikto
 * nevyžiadal – profil sa potom odscrolloval na starú kartu.
 *
 * `useSearchParams` je tu zámerne STABILNÝ objekt, ktorý sa mení len vtedy,
 * keď ho test „dobehne" – presne ako Next, ktorý adresu po `pushState`
 * prenáša do `searchParams` až v prechode (`startTransition`). Objekt nový pri
 * každom renderi by efekt nad ním prehrával donekonečna.
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';

/**
 * Len zaznamená volanie. Next pri `router.replace` zapíše históriu až pri
 * commite prechodu, teda NESKÔR – okamžitý zápis by maskoval chybu, pri ktorej
 * druhý beh efektu (StrictMode) nájde parameter v adrese, hoci tam ešte nie je.
 */
const replaceMock = jest.fn();
/** Stabilný ako v Next (objekt z kontextu) – nový pri každom renderi by efekt spúšťal stále. */
const mockRouter = { replace: replaceMock };
let mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => mockSearchParams,
}));

import {
  __resetHighlightDocumentEntryForTests,
  useDashboardHighlighting,
} from '../useDashboardHighlighting';

/** Next dobehol adresu – `searchParams` sa zmení až teraz. */
function nextCatchesUp() {
  mockSearchParams = new URLSearchParams(window.location.search);
}

/** Zvýraznenie zapísané niekým pred chvíľou (menej ako minúta). */
function storeRecentHighlight(id: number) {
  sessionStorage.setItem('highlightedSkillId', String(id));
  sessionStorage.setItem('highlightedSkillTime', String(Date.now() - 20_000));
}

function renderHighlighting(initialModule: string, options: { strict?: boolean } = {}) {
  return renderHook(
    ({ module }: { module: string }) => useDashboardHighlighting({ activeModule: module }),
    {
      initialProps: { module: initialModule },
      wrapper: options.strict ? React.StrictMode : undefined,
    },
  );
}

beforeEach(() => {
  __resetHighlightDocumentEntryForTests();
  replaceMock.mockClear();
  sessionStorage.clear();
  window.history.replaceState(null, '', '/dashboard');
  nextCatchesUp();
});

describe('F5 priamo na profile', () => {
  it('restores the highlight from sessionStorage when the address has none', () => {
    window.history.replaceState(null, '', '/dashboard/users/peter');
    nextCatchesUp();
    storeRecentHighlight(55);

    const { result } = renderHighlighting('user-profile');

    expect(result.current.highlightedSkillId).toBe(55);
    expect(replaceMock).toHaveBeenCalledWith('/dashboard/users/peter?highlight=55');
  });

  it('keeps restoring under StrictMode, which runs the effect twice', () => {
    // Druhý beh tej istej aktivácie nesmie obnovené zvýraznenie hneď zmazať.
    window.history.replaceState(null, '', '/dashboard/users/peter');
    nextCatchesUp();
    storeRecentHighlight(55);

    const { result } = renderHighlighting('user-profile', { strict: true });

    expect(result.current.highlightedSkillId).toBe(55);
  });

  it('takes the highlight from the address when it is there', () => {
    window.history.replaceState(null, '', '/dashboard/users/peter?highlight=9');
    nextCatchesUp();
    storeRecentHighlight(55);

    const { result } = renderHighlighting('user-profile');

    // Adresa má prednosť pred zálohou.
    expect(result.current.highlightedSkillId).toBe(9);
  });
});

describe('vstup na profil v bežiacej appke', () => {
  it('does not resurrect a recent highlight (profile icon, post header)', () => {
    // Dokument sa načítal na Nástenke.
    const { result, rerender } = renderHighlighting('home');
    storeRecentHighlight(55);

    // Ťuk na ikonu profilu / na hlavičku príspevku – adresa bez parametra.
    window.history.pushState(null, '', '/dashboard/users/test-user');
    nextCatchesUp();
    rerender({ module: 'profile' });

    expect(result.current.highlightedSkillId).toBeNull();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('does not resurrect it even on the very profile the document was loaded on', () => {
    window.history.replaceState(null, '', '/dashboard/users/peter');
    nextCatchesUp();
    const { result, rerender } = renderHighlighting('user-profile');

    // Odbočka na Nástenku a späť – to už nie je znovunačítanie.
    window.history.pushState(null, '', '/dashboard');
    nextCatchesUp();
    rerender({ module: 'home' });
    storeRecentHighlight(55);
    window.history.pushState(null, '', '/dashboard/users/peter');
    nextCatchesUp();
    rerender({ module: 'user-profile' });

    expect(result.current.highlightedSkillId).toBeNull();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});

describe('návrat na profil, na ktorom sa dokument načítal', () => {
  it('does not resurrect even when no effect run saw the other profile', () => {
    // Priamy vstup na profil – zvýraznenie sa zo zálohy obnoví oprávnene.
    window.history.replaceState(null, '', '/dashboard/users/peter');
    nextCatchesUp();
    storeRecentHighlight(55);
    const { result, rerender } = renderHighlighting('user-profile');
    expect(result.current.highlightedSkillId).toBe(55);
    replaceMock.mockClear();

    // Odchod na iný cudzí profil a späť. Modul ostáva ten istý a Next adresu
    // ešte nedobehol, takže efekt cestou NEBEŽÍ – odchod nikto nezaznamenal.
    act(() => {
      result.current.setHighlightedSkillId(null);
      window.history.pushState(null, '', '/dashboard/users/jana');
      rerender({ module: 'user-profile' });
    });
    act(() => {
      window.history.pushState(null, '', '/dashboard/users/peter');
      rerender({ module: 'user-profile' });
    });

    // Až teraz beží – na pôvodnom profile, bez parametra v adrese.
    act(() => {
      nextCatchesUp();
      rerender({ module: 'user-profile' });
    });

    expect(result.current.highlightedSkillId).toBeNull();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});

describe('prechod na profil bez zvýraznenia', () => {
  it('does not pick up the previous address while Next still describes it', () => {
    // Cudzí profil otvorený so zvýraznením (napr. zdieľaná ponuka).
    window.history.replaceState(null, '', '/dashboard/users/peter?offer=55');
    nextCatchesUp();
    const { result, rerender } = renderHighlighting('user-profile');
    expect(result.current.highlightedSkillId).toBe(55);

    // `goToMyProfile` bez zvýraznenia: stav zruší a zapíše adresu bez
    // parametra. `searchParams` ešte opisujú predošlú adresu s `?offer=55`.
    act(() => {
      result.current.setHighlightedSkillId(null);
      window.history.pushState(null, '', '/dashboard/profile');
      rerender({ module: 'profile' });
    });

    // Prázdna skutočná adresa znamená „bez zvýraznenia", nie „nevieme".
    expect(result.current.highlightedSkillId).toBeNull();
  });
});

describe('explicitné zvýraznenie v bežiacej appke', () => {
  it('survives the render before Next catches up with the address', () => {
    // Presne to, čo robí `goToMyProfile` / `goToUserProfile`: nastaví stav a
    // zapíše `?highlight=` cez `pushState`. Next však `searchParams` dobehne
    // až v prechode, takže prvý beh efektu ich ešte vidí bez parametra.
    const { result, rerender } = renderHighlighting('home');

    act(() => {
      storeRecentHighlight(55);
      result.current.setHighlightedSkillId(55);
      window.history.pushState(null, '', '/dashboard/users/test-user?highlight=55');
      rerender({ module: 'user-profile' });
    });

    // Doteraz to premosťovala obnova zo `sessionStorage`; teraz ju efekt
    // nemá, a bez čítania skutočnej adresy by zvýraznenie zmazal.
    expect(result.current.highlightedSkillId).toBe(55);

    act(() => {
      nextCatchesUp();
      rerender({ module: 'user-profile' });
    });
    expect(result.current.highlightedSkillId).toBe(55);
  });

  it('is still cleaned up, storage included, when the profile is left', () => {
    window.history.replaceState(null, '', '/dashboard/users/peter?highlight=55');
    nextCatchesUp();
    const { result, rerender } = renderHighlighting('user-profile');
    expect(result.current.highlightedSkillId).toBe(55);
    expect(sessionStorage.getItem('highlightedSkillId')).toBe('55');

    // Odchod na modul, ktorý karty ponúk nezvýrazňuje.
    act(() => {
      window.history.pushState(null, '', '/dashboard/messages');
      nextCatchesUp();
      rerender({ module: 'messages' });
    });

    expect(result.current.highlightedSkillId).toBeNull();
    expect(sessionStorage.getItem('highlightedSkillId')).toBeNull();
  });
});
