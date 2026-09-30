'use client';

/**
 * Zámok akcií nad vlastným profilom (uloženie, zmena fotky): jedna naraz.
 *
 * Stav je v module, nie v komponente. `ProfileModule` sa s novým `<main>`
 * (prepnutie obrazovky, na mobile aj „Upraviť profil"; prechod cez breakpoint)
 * vytvorí nanovo – zámok viazaný na inštanciu by sa uvoľnil, kým PATCH ešte
 * letí, a nová inštancia by mohla odoslať druhé uloženie, ktoré by prvé na
 * serveri predbehlo alebo prepísalo. Dokončenie pôvodnej akcie (úspech aj
 * rollback) sa uplatní aj po odmountovaní: server ju spracoval a rodič, ktorému
 * stav používateľa patrí, žije ďalej.
 */

import { useSyncExternalStore } from 'react';

let lastActionId = 0;
let activeActionId: number | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getIsBusy(): boolean {
  return activeActionId !== null;
}

function getServerIsBusy(): boolean {
  return false;
}

/** Vráti ID akcie, alebo `null`, ak už nejaká beží. */
function beginAction(): number | null {
  if (activeActionId !== null) return null;
  activeActionId = ++lastActionId;
  notify();
  return activeActionId;
}

function endAction(actionId: number): void {
  if (activeActionId !== actionId) return;
  activeActionId = null;
  notify();
}

function isActionActive(actionId: number): boolean {
  return activeActionId === actionId;
}

export function useProfileActionLock() {
  const isBusy = useSyncExternalStore(subscribe, getIsBusy, getServerIsBusy);
  return { isBusy, beginAction, endAction, isActionActive };
}

/** Len pre testy – vyčistí modulový stav medzi prípadmi. */
export function resetProfileActionLock(): void {
  activeActionId = null;
  lastActionId = 0;
}
