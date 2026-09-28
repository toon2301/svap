'use client';

/**
 * [DEBUG ?debugscroll=1 – DOČASNÉ, ODSTRÁNIŤ]
 *
 * Zapnutie ladiaceho pásika: hooky scroll API/history a sledovanie okien po
 * kliku. Volá ho len panel, a len keď je príznak zapnutý. Idempotentné –
 * panel sa pri prechodoch môže remountnúť, hooky ostávajú do konca stránky.
 */

import { installScrollHooks, uninstallScrollHooks } from './scrollDebugHooks';
import { scrollDebugState } from './scrollDebugState';
import { installClickTracking, logPageStart, uninstallClickTracking } from './scrollDebugWindow';

export function installScrollDebug(): void {
  if (scrollDebugState.active || typeof window === 'undefined') return;
  scrollDebugState.active = true;
  logPageStart();
  installScrollHooks();
  installClickTracking();
}

/** Len pre testy – za behu sa pásik vypína cez ?debugscroll=0 a reload. */
export function uninstallScrollDebug(): void {
  scrollDebugState.active = false;
  uninstallClickTracking();
  uninstallScrollHooks();
}
