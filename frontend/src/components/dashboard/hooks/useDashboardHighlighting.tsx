"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export interface DashboardHighlightingProps {
  highlightedSkillId: number | null;
  setHighlightedSkillId: (skillId: number | null) => void;
  highlightTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  clearHighlighting: () => void;
}

interface UseDashboardHighlightingParams {
  activeModule: string;
  initialHighlightedSkillId?: number | null;
}

/**
 * Moduly, ktorým vie zvýraznenie určiť ADRESA.
 *
 * Kým je zobrazený takýto modul, zvýraznenie odvádza z adresy efekt nižšie –
 * a to v oboch smeroch: parameter v adrese kartu zvýrazní, jeho neprítomnosť
 * zvýraznenie zruší. Iné miesta sa preto majú do tej istej hodnoty miešať len
 * vtedy, keď je zobrazené niečo iné.
 */
export function supportsSkillHighlight(activeModule: string): boolean {
  return activeModule === 'profile' || activeModule === 'user-profile';
}

function clearHighlightSearchParams(url: URL): boolean {
  let changed = false;

  if (url.searchParams.has('highlight')) {
    url.searchParams.delete('highlight');
    changed = true;
  }

  if (url.searchParams.has('offer')) {
    url.searchParams.delete('offer');
    changed = true;
  }

  if (url.searchParams.get('side') === 'back') {
    url.searchParams.delete('side');
    changed = true;
  }

  return changed;
}

/** Parameter zvýraznenia v adrese – `offer` znamená to isté čo `highlight`. */
function highlightParamOf(params: Pick<URLSearchParams, 'get'> | null | undefined): string | null {
  return params?.get('offer') ?? params?.get('highlight') ?? null;
}

/**
 * Obnova zvýraznenia zo `sessionStorage` patrí JEDINEJ aktivácii – tej, na
 * ktorej sa dokument načítal (F5 na profile, priamy vstup odkazom).
 *
 * Záloha je pre prípad, keď adresa po obnovení stránky parameter už nemá.
 * Predtým sa však vetva spúšťala pri KAŽDOM prepnutí na profil v bežiacej
 * appke a vzkriesila zvýraznenie spred menej ako minúty aj tam, kde si ho
 * nikto nevyžiadal: ťuk na ikonu profilu či na hlavičku príspevku otvoril
 * profil od vrchu a vzápätí ho odscrolloval na starú kartu. Navigácia v appke
 * si zvýraznenie nesie sama – adresou, `goToMyProfile`, `goToUserProfile`.
 *
 * Okno je otvorené, kým synchronizácia beží pre ten istý modul aj cestu ako
 * pri prvom behu v dokumente (StrictMode efekt zopakuje a musí dostať to
 * isté), a pri prvej inej aktivácii sa zavrie natrvalo. Modulový stav zámerne:
 * prežije prepínanie modulov aj výmenu inštancie dashboardu pri zmene Next
 * stránky; znovunačítanie dokumentu ho vynuluje.
 */
let documentEntry: { module: string; path: string } | null = null;
let documentEntryOpen = true;

function isDocumentEntry(activeModule: string, path: string): boolean {
  if (documentEntry === null) {
    documentEntry = { module: activeModule, path };
    return true;
  }
  if (documentEntry.module !== activeModule || documentEntry.path !== path) {
    documentEntryOpen = false;
  }
  return documentEntryOpen;
}

/** Len pre testy – nový „dokument". */
export function __resetHighlightDocumentEntryForTests(): void {
  documentEntry = null;
  documentEntryOpen = true;
}

/**
 * Custom hook pre highlighting logiku skill kariet v Dashboard
 */
export function useDashboardHighlighting({
  activeModule,
  initialHighlightedSkillId,
}: UseDashboardHighlightingParams): DashboardHighlightingProps {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [highlightedSkillId, setHighlightedSkillId] = useState<number | null>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevActiveModuleRef = useRef<string>(activeModule);

  // Inicializácia highlight ID ak je poskytnuté
  useEffect(() => {
    if (initialHighlightedSkillId != null) {
      setHighlightedSkillId(initialHighlightedSkillId);
    }
  }, [initialHighlightedSkillId]);

  // Funkcia pre vyčistenie highlighting
  const clearHighlighting = () => {
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }
    setHighlightedSkillId(null);
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('highlightedSkillId');
        sessionStorage.removeItem('highlightedSkillTime');
      }
    } catch {
      // ignore
    }
  };

  // Synchronizácia highlightedSkillId s URL parametrom 'highlight'
  // A záloha v sessionStorage pre prípad full refreshu (profile aj user-profile)
  useEffect(() => {
    // Registruje sa KAŽDÝ beh, aj mimo profilu: prvý beh v dokumente určuje,
    // či vôbec ide o vstup priamo na profil (viď `isDocumentEntry`).
    const mayRestoreFromStorage = isDocumentEntry(
      activeModule,
      typeof window !== 'undefined' ? window.location.pathname : '',
    );

    // Ak nie sme v profile s kartami ponúk, neobnovovať zo sessionStorage
    if (!supportsSkillHighlight(activeModule)) {
      return;
    }

    // Skutočná adresa má prednosť pred `searchParams`: Next ich po `pushState`
    // dobieha až v prechode (`startTransition`), takže prvý beh po kliku vidí
    // ešte adresu predošlej obrazovky. Parameter, ktorý tam práve zapísal
    // `goToMyProfile` či `goToUserProfile`, by sa inak na jeden commit
    // zmazal – doteraz to nepriznane premosťovala obnova zo `sessionStorage`.
    const highlightParam =
      (typeof window !== 'undefined'
        ? highlightParamOf(new URLSearchParams(window.location.search))
        : null) ?? highlightParamOf(searchParams);
    if (highlightParam) {
      const id = Number(highlightParam);
      if (!isNaN(id)) {
        setHighlightedSkillId(id);
        // Uložiť do session storage pre persistenciu
        try {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('highlightedSkillId', String(id));
            sessionStorage.setItem('highlightedSkillTime', String(Date.now()));
          }
        } catch {
          // ignore
        }
      }
    } else {
      // Ak v URL nie je parameter, skúsime obnoviť zo sessionStorage – len pri
      // aktivácii, na ktorej sa dokument načítal (po refreshi), a len ak
      // neubehol čas.
      try {
        if (mayRestoreFromStorage && typeof window !== 'undefined') {
          const storedId = sessionStorage.getItem('highlightedSkillId');
          const storedTime = sessionStorage.getItem('highlightedSkillTime');
          
          if (storedId && storedTime) {
            const timeDiff = Date.now() - Number(storedTime);
            if (timeDiff < 1 * 60 * 1000) { // Menej ako 1 minúta
              setHighlightedSkillId(Number(storedId));
              // Obnovíme aj URL parameter, aby to bolo konzistentné
              // Ale opatrne, aby sme nespôsobili loop
              const currentUrl = new URL(window.location.href);
              if (
                !currentUrl.searchParams.has('highlight') &&
                !currentUrl.searchParams.has('offer')
              ) {
                 currentUrl.searchParams.set('highlight', storedId);
                 // Dopĺňa sa VÝHRADNE parameter zvýraznenia – fragment patrí
                 // stránke rovnako ako zvyšok adresy, takže ostáva.
                 router.replace(
                   currentUrl.pathname + currentUrl.search + currentUrl.hash,
                 );
              }
              return; // Koniec, obnovili sme
            } else {
              // Expirovalo
              sessionStorage.removeItem('highlightedSkillId');
              sessionStorage.removeItem('highlightedSkillTime');
            }
          }
        }
      } catch {
        // ignore
      }

      // Ak nič z toho, zrušíme zvýraznenie
      if (!highlightTimeoutRef.current) {
        setHighlightedSkillId(null);
      }
    }
  }, [searchParams, router, activeModule]);

  // Zrušiť zvýraznenie pri opustení profilu s kartami ponúk
  useEffect(() => {
    const prevModule = prevActiveModuleRef.current;
    
    // Ak sa odchádza z modulu, ktorý vie zvýrazniť kartu, zrušiť zvýraznenie
    if (supportsSkillHighlight(prevModule) && !supportsSkillHighlight(activeModule)) {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = null;
      }
      setHighlightedSkillId(null);
      try {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('highlightedSkillId');
          sessionStorage.removeItem('highlightedSkillTime');
          
          // Odstrániť parametre zvýraznenia z URL
          const currentUrl = new URL(window.location.href);
          if (clearHighlightSearchParams(currentUrl)) {
            // Odstraňujú sa VÝHRADNE parametre zvýraznenia – fragment patrí
            // stránke rovnako ako zvyšok query, takže ostáva.
            window.history.replaceState(
              null,
              '',
              currentUrl.pathname + currentUrl.search + currentUrl.hash,
            );
          }
        }
      } catch {
        // ignore
      }
    }
    
    // Vždy aktualizovať ref na aktuálnu hodnotu
    prevActiveModuleRef.current = activeModule;
  }, [activeModule]);

  // Inteligentný časovač pre zvýraznenie:
  useEffect(() => {
    if (highlightedSkillId != null) {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }

      // Vypočítať zostávajúci čas (ak obnovujeme zo storage)
      let remainingTime = 1 * 60 * 1000;
      try {
        if (typeof window !== 'undefined') {
          const storedTime = sessionStorage.getItem('highlightedSkillTime');
          if (storedTime) {
            const elapsed = Date.now() - Number(storedTime);
            remainingTime = Math.max(1000, 1 * 60 * 1000 - elapsed);
          }
        }
      } catch {
        // ignore
      }

      highlightTimeoutRef.current = setTimeout(() => {
        setHighlightedSkillId(null);
        highlightTimeoutRef.current = null;
        
        // Vyčistiť URL a Storage
        try {
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('highlightedSkillId');
            sessionStorage.removeItem('highlightedSkillTime');
            
            const currentUrl = new URL(window.location.href);
            if (clearHighlightSearchParams(currentUrl)) {
              // Odstraňujú sa VÝHRADNE parametre zvýraznenia; fragment ostáva.
              router.replace(
                currentUrl.pathname + currentUrl.search + currentUrl.hash,
              );
            }
          }
        } catch {
          // ignore
        }
      }, remainingTime);
    }

    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, [highlightedSkillId, router]);

  // Vyčistenie timeru pri unmount-e Dashboardu
  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  return {
    highlightedSkillId,
    setHighlightedSkillId,
    highlightTimeoutRef,
    clearHighlighting,
  };
}
