'use client';

/**
 * Nastavenia sa otvárajú od vrchu – vlastná obdoba fresh-entry pre ich oblasť.
 *
 * Dashboard má JEDINÝ scrollovateľný kontajner (`<main data-dashboard-main>`)
 * a vykresľujú sa doň všetky sekcie Nastavení – desktopové (podľa pravej
 * položky) aj mobilné (ako vlastný modul); vlastný scroller nemá ani jedna.
 * Bez nulovania si preto Nastavenia vezmú pozíciu obrazovky, z ktorej sa do
 * nich vošlo (typicky odscrollovaná Nástenka), a držia si ju aj pri prepínaní
 * medzi sekciami – tie totiž menia len obsah `main`, nie kontajner.
 *
 * Profilový `useProfileFreshEntry` sa použiť nedá: je viazaný na identitu
 * profilu (`{id, slug}`), ktorú sekcia Nastavení nemá. Spoločné je len to, čo
 * robia so scrollom, preto je toto samostatná inštancia toho istého vzoru.
 */

import { useEffect, useLayoutEffect } from 'react';
import { getDesktopSettingsSectionFromModule } from './desktopSettingsNavigation';

/** Scrollovateľná plocha dashboardu – tá istá, akú používa feed aj profil. */
const DASHBOARD_MAIN_SELECTOR = '[data-dashboard-main]';

// V prehliadači pred vykreslením, nech nová sekcia neblikne na starej pozícii.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Ktorú obrazovku Nastavení appka práve ukazuje; `null` mimo Nastavení.
 *
 * Zoznam sekcií sa neopisuje – berie sa z `desktopSettingsNavigation`, aby
 * pribudnutá sekcia nemusela byť zapísaná na druhom mieste.
 */
function settingsScreenKey(
  activeModule: string,
  activeRightItem: string,
  isRightSidebarOpen: boolean,
): string | null {
  // Desktop: oblasťou je modul `settings`, konkrétnu sekciu určuje pravá položka.
  if (activeModule === 'settings' && isRightSidebarOpen) {
    return `section:${activeRightItem}`;
  }
  // Mobil (a desktopová sekcia otvorená mimo Nastavení): sekcia je vlastný modul.
  if (getDesktopSettingsSectionFromModule(activeModule)) {
    return `module:${activeModule}`;
  }
  return null;
}

/**
 * Vynuluje scroll pri vstupe do Nastavení aj pri prepnutí medzi ich sekciami.
 *
 * Mimo Nastavení sa nedeje nič: obnovu pozície si tam rieši cieľová obrazovka
 * sama (feed `useFeedReturn`, profil `useProfileFreshEntry`).
 */
export function useSettingsScrollReset(
  activeModule: string,
  activeRightItem: string,
  isRightSidebarOpen: boolean,
): void {
  const screen = settingsScreenKey(activeModule, activeRightItem, isRightSidebarOpen);

  // Kľúč je v deps, takže efekt beží PRÁVE pri zmene obrazovky – scroll vnútri
  // jednej sekcie tak zostáva, kde ho používateľ nechal.
  useIsomorphicLayoutEffect(() => {
    if (screen === null) return;
    if (typeof document === 'undefined') return;

    const main = document.querySelector<HTMLElement>(DASHBOARD_MAIN_SELECTOR);
    if (main) main.scrollTop = 0;
  }, [screen]);
}
