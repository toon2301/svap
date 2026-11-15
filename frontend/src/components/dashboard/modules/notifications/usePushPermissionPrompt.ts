'use client';

import { useState } from 'react';

import type { PushPermissionState } from './pushBrowser';
import { isAppleMobile, isInstalledApp } from './pushPlatform';

/** Kľúč v `localStorage`, pod ktorým si tento prehliadač pamätá, že používateľ výzvu na povolenie push odmietol (R36 a). */
export const PUSH_PROMPT_DISMISSED_KEY = 'svaplyPushPromptDismissedV1';

/**
 * Druh výzvy: `enable` = povolenie sa dá vyžiadať tlačidlom, `ios-install` = na iPhone alebo iPade mimo nainštalovanej
 * aplikácie push nefunguje, najprv treba pridať aplikáciu na plochu (tlačidlo na povolenie tam nie je).
 */
export type PushPromptVariant = 'enable' | 'ios-install';

/** Časť návratovej hodnoty voľby Správy (`usePushMessagesPreferenceWith`), z ktorej sa výzva odvodzuje. */
export interface PushPromptSource {
  /** Uložená voľba Správ („Zapnuté“ = `true`); `null` = neznáma (načítanie zlyhalo). */
  value: boolean | null;
  /** Prebieha úvodné načítanie uloženej voľby. */
  initialLoading: boolean;
  permission: PushPermissionState;
  /** Prehliadač podporuje push (API je dostupné v zabezpečenom kontexte). */
  supported: boolean;
  /** Ukladanie alebo iná akcia beží, voľbu nemožno meniť. */
  disabled: boolean;
  /** Zmena voľby Správ; `true` vyžiada povolenie, zaregistruje odber a uloží voľbu. */
  onChange: (enabled: boolean) => void;
}

/** Stav výzvy pre rozhranie. */
export interface PushPermissionPromptState {
  /** Ktorá výzva sa má ukázať; `null` = žiadna. */
  variant: PushPromptVariant | null;
  /** Tlačidlo na povolenie sa nedá stlačiť (beží ukladanie alebo iná akcia). */
  disabled: boolean;
  /** Skryje výzvu a v tomto prehliadači sa už nevráti. */
  dismiss: () => void;
  /** Vyžiada povolenie (existujúce zapnutie Správ); volá sa priamo v obsluhe kliknutia, kvôli geste používateľa. */
  enable: () => void;
}

/** Prečíta príznak odmietnutia z `localStorage`; nedostupné úložisko znamená „neodmietnuté“. */
function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(PUSH_PROMPT_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

/** Zapíše príznak odmietnutia do `localStorage`; zlyhanie úložiska nič nerozbije (výzva ostane skrytá len v tejto relácii). */
function writeDismissed(): void {
  try {
    window.localStorage.setItem(PUSH_PROMPT_DISMISSED_KEY, '1');
  } catch {
    // Bez úložiska sa výzva skryje len v pamäti hooku.
  }
}

/**
 * Ktorá výzva sa má ukázať. Výzva sa ukáže, len ak je uložená voľba Správ výslovne zapnutá a už načítaná (nie
 * predvolená ani neznáma po zlyhaní) a používateľ ju neodmietol: `enable`, ak prehliadač push podporuje a povolenie ešte
 * nebolo vyžiadané (`default`); `ios-install`, ak push nie je dostupný, pretože ide o iPhone alebo iPad mimo
 * nainštalovanej aplikácie. Inak `null` (povolené alebo zablokované povolenie už hlási existujúce varovanie).
 */
function getPromptVariant(source: PushPromptSource, dismissed: boolean): PushPromptVariant | null {
  if (dismissed || source.initialLoading || source.value !== true) {
    return null;
  }

  if (source.supported) {
    return source.permission === 'default' ? 'enable' : null;
  }

  return isAppleMobile() && !isInstalledApp() ? 'ios-install' : null;
}

/**
 * Výzva na povolenie push upozornení pre Správy v Nastaveniach → Upozornenia (nález 321, etapa 3b, R36 a). Počíta sa
 * počas vykresľovania (ako `getPassiveBrowserWarning`, nález 308), nie v efekte, takže výzva príde v tom istom vykreslení
 * ako riadky voľby a nič sa neposunie. Príznak odmietnutia sa číta raz pri vzniku hooku; `dismiss` ho zapíše a výzvu skryje
 * aj pri nedostupnom úložisku (vtedy len v tejto relácii). `enable` je zapnutie Správ z hooku voľby: povolenie vyžiada
 * hneď v tom istom behu obsluhy kliknutia (bez `await`), ako vyžaduje prehliadač.
 */
export function usePushPermissionPrompt(source: PushPromptSource): PushPermissionPromptState {
  const [dismissed, setDismissed] = useState(readDismissed);

  return {
    variant: getPromptVariant(source, dismissed),
    disabled: source.disabled,
    dismiss: () => {
      writeDismissed();
      setDismissed(true);
    },
    enable: () => {
      source.onChange(true);
    },
  };
}
