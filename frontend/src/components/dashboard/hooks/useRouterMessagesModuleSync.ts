'use client';

import { useEffect, useRef } from 'react';
import { dashboardModuleFromPath } from '../components/dashboardMountRoute';
import type { SearchUserResult } from '../modules/search/types';

type RouterMessagesModuleSyncInput = {
  /** `usePathname()` – adresa, ktorú drží Next router. */
  pathname: string | null | undefined;
  /** `useSearchParams()` ako reťazec – query, ktorú drží Next router. */
  searchString: string;
  activeModule: string;
  setActiveModule: (module: string) => void;
  setIsRightSidebarOpen: (open: boolean) => void;
  setActiveRightItem: (item: string) => void;
  setIsMobileMenuOpen: (open: boolean) => void;
  setViewedUserId: (userId: number | null) => void;
  setViewedUserSlug: (slug: string | null) => void;
  setViewedUserSummary: (summary: SearchUserResult | null) => void;
};

/**
 * Vstup do Správ cez `router.push`, keď Dashboard už stojí na stránke Správ.
 *
 * Dashboard prepína moduly dvoma cestami: stavom (`setActiveModule` + `pushState`) a novou
 * inštanciou, ktorú vytvorí nová Next stránka. `router.push` na `/dashboard/messages?…` z
 * miesta, ktoré je tiež stránkou Správ (po F5, po predošlom otvorení správ z profilu), je tá
 * istá stránka s inou query: Next ju nenamountuje znova a `activeModule` sa nezmení. Adresa
 * ukazuje Správy, obrazovka ostane napr. na profile. Týka sa to „Poslať správu“ z profilu,
 * z karty ponuky, zo Žiadostí aj z Obľúbených.
 *
 * Rovnako ako `usePopstateModuleSync` (krok späť) preto modul zosúladíme s adresou, tentoraz
 * pri zmene adresy v routeri. Bez `pushState`/`replaceState` – adresu už zapísal router.
 */
export function useRouterMessagesModuleSync({
  pathname,
  searchString,
  activeModule,
  setActiveModule,
  setIsRightSidebarOpen,
  setActiveRightItem,
  setIsMobileMenuOpen,
  setViewedUserId,
  setViewedUserSlug,
  setViewedUserSummary,
}: RouterMessagesModuleSyncInput) {
  // Aktuálny modul čítame cez ref: efekt sa má spúšťať ZMENOU ADRESY v routeri, nie zmenou
  // modulu. Po `goToUserProfile` je krátko modul už profil, kým router ešte ukazuje Správy;
  // spätné prepnutie by profil hneď zrušilo.
  const activeModuleRef = useRef(activeModule);
  activeModuleRef.current = activeModule;

  const routeKey = `${pathname ?? ''}?${searchString}`;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (dashboardModuleFromPath(pathname ?? '') !== 'messages') return;
    // Adresa v prehliadači musí tiež ukazovať Správy. Pri `router.push` to platí vždy: Next zapíše
    // adresu (`useInsertionEffect`) v tom istom commite, v ktorom zmení `usePathname` a
    // `useSearchParams`, a to ešte pred efektmi, takže sa tu nečaká na žiadne dobehnutie adresy.
    // Ochrana je pre opačný rozchod: `pushState` z Dashboardu (napr. profil) zmení adresu skôr,
    // než ju router dobehne, a router vtedy ešte nesie starú cestu Správ. To nie je vstup do Správ.
    if (dashboardModuleFromPath(window.location.pathname || '') !== 'messages') return;
    if (activeModuleRef.current === 'messages') return;

    setActiveModule('messages');
    try {
      localStorage.setItem('activeModule', 'messages');
    } catch {
      // Stav obrazovky je už prepnutý, chyba úložiska nevadí.
    }
    setViewedUserId(null);
    setViewedUserSlug(null);
    setViewedUserSummary(null);
    setIsRightSidebarOpen(false);
    setActiveRightItem('');
    setIsMobileMenuOpen(false);
    // Zámerne len `routeKey`: ostatné vstupy sú stabilné settery a modul sa číta cez ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey]);
}
