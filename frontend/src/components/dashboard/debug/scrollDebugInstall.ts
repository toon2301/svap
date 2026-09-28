'use client';

/**
 * [DEBUG ?debugscroll=1 – DOČASNÉ, ODSTRÁNIŤ]
 *
 * Zapnutie ladiaceho pásika: hooky scroll API/history a sledovanie okien po
 * kliku. Volá ho len panel, a len keď je príznak zapnutý. Idempotentné –
 * panel sa pri prechodoch v rámci dashboardu môže remountnúť, hooky ostávajú.
 * Končí odchodom z dashboardu (`endScrollDebugSession`) alebo reloadom.
 */

import { installScrollHooks, uninstallScrollHooks } from './scrollDebugHooks';
import { forgetScrollDebug } from './scrollDebugLog';
import { scrollDebugState } from './scrollDebugState';
import { installClickTracking, logPageStart, uninstallClickTracking } from './scrollDebugWindow';

export function installScrollDebug(): void {
  if (scrollDebugState.active || typeof window === 'undefined') return;
  scrollDebugState.active = true;
  logPageStart();
  installScrollHooks();
  installClickTracking();
}

/** Vráti pôvodné funkcie a zruší listenery; záznam nechá. */
export function uninstallScrollDebug(): void {
  scrollDebugState.active = false;
  uninstallClickTracking();
  uninstallScrollHooks();
}

/**
 * Odchod z dashboardu – odhlásenie aj neplatná session idú na '/' bez
 * reloadu. Meranie končí a záznam s príznakom zmiznú: navigácia jedného
 * účtu nesmie v karte prejsť na ďalší, rovnako ako snímka Nástenky.
 */
export function endScrollDebugSession(): void {
  uninstallScrollDebug();
  forgetScrollDebug();
}
