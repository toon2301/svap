'use client';

/**
 * Odkiaľ sa do profilu vošlo – pre appkovú šípku „späť".
 *
 * Šípka má profil opustiť CELÝ a vrátiť sa tam, odkiaľ používateľ prišiel,
 * bez ohľadu na to, koľko záložiek si medzitým preklikal. Každé prepnutie
 * záložky je pritom vlastný krok histórie (aby fungoval browser Back), takže
 * jeden `history.back()` vrátil len o záložku späť – presne to bol nález C7.
 *
 * Preto si každý profilový záznam nesie svoju HĹBKU: prvý záznam profilu má 0,
 * každé ďalšie prepnutie záložky o jedna viac. Šípka z hĺbky `n` skočí
 * `history.go(-(n + 1))` a pristane na zázname pred profilom.
 *
 * Marker žije v `history.state`, teda oddelene od adresy – `?tab=` ani žiadny
 * iný parameter sa ho netýka a naopak.
 *
 * Browser Back/Forward zostáva nedotknutý: prehráva záznamy po jednom tak ako
 * doteraz. Mení sa výhradne to, čo robí appková šípka.
 */

const HISTORY_KEY = '__svaplyProfileOrigin';

/**
 * Identita tohto načítania stránky.
 *
 * `history.state` prežije F5, ale záznamy spred reloadu už nevieme preskočiť
 * spoľahlivo – appka o nich po novom načítaní nič nevie. Marker z iného
 * načítania preto neplatí a šípka sa vráti k jednému kroku späť.
 */
const PAGE_LOAD_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

type ProfileOriginMarker = {
  version: 1;
  pageLoadId: string;
  /** Počet krokov od prvého záznamu profilu; prvý má 0. */
  depth: number;
};

function historyStateRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Marker tohto načítania, alebo `null` (chýba, cudzí, poškodený). */
function readMarker(historyState: unknown): ProfileOriginMarker | null {
  const marker = historyStateRecord(historyState)[HISTORY_KEY] as
    | Partial<ProfileOriginMarker>
    | undefined;
  if (!marker || marker.version !== 1 || marker.pageLoadId !== PAGE_LOAD_ID) return null;
  return Number.isInteger(marker.depth) && (marker.depth as number) >= 0
    ? (marker as ProfileOriginMarker)
    : null;
}

function withDepth(historyState: unknown, depth: number): Record<string, unknown> {
  return {
    ...historyStateRecord(historyState),
    [HISTORY_KEY]: { version: 1, pageLoadId: PAGE_LOAD_ID, depth } satisfies ProfileOriginMarker,
  };
}

/**
 * Stav pre PRVÝ záznam profilu – pôvod je záznam tesne pred ním.
 *
 * Používa sa na tých istých miestach, kde sa značí nový vstup do profilu
 * (`markProfileFreshEntry`), aby obe veci hovorili o tom istom okamihu.
 */
export function withProfileOriginEntry(historyState: unknown): Record<string, unknown> {
  return withDepth(historyState, 0);
}

/**
 * Stav pre ďalší krok VNÚTRI profilu (prepnutie záložky).
 *
 * Mimo profilu stav nechá tak: bez markera niet čo prehlbovať a cudzí krok si
 * pôvod profilu privlastniť nemá.
 */
export function withProfileOriginStep(historyState: unknown): Record<string, unknown> {
  const marker = readMarker(historyState);
  if (!marker) return historyStateRecord(historyState);
  return withDepth(historyState, marker.depth + 1);
}

/** Adresa profilu, ktorý appka otvára cez router a ešte nemá svoj záznam. */
let pendingOriginPath: string | null = null;

/**
 * Otvorenie profilu cez `router.push` – pôvod sa doplní až po príchode.
 *
 * `router.push` stav histórie neprijíma a záznam vzniká až po dokončení
 * navigácie, takže marker sa naň nedá pripnúť dopredu. Rovnaký postup používa
 * detail portfólia (`openPortfolioDetail` / `adoptPortfolioDetailOrigin`).
 */
export function markProfileOriginPending(path: string): void {
  pendingOriginPath = path;
}

/**
 * Profil sa zobrazil: ak ho otvorila appka, označí jeho záznam pôvodom.
 *
 * Prevzatie je jednorazové a zahodí sa aj pri nezhode adries – inak by si ho
 * mohol privlastniť profil otvorený odkazom.
 */
export function adoptProfileOrigin(): void {
  if (typeof window === 'undefined') return;
  const path = pendingOriginPath;
  pendingOriginPath = null;
  if (!path || window.location.pathname !== path) return;
  // Záznam už pôvod niesť môže (návrat dopredu na ten istý profil) – vtedy sa
  // hĺbka neprepisuje, patrí tomu záznamu.
  if (readProfileOriginDepth(window.history.state) !== null) return;
  try {
    window.history.replaceState(withProfileOriginEntry(window.history.state), '', window.location.href);
  } catch {
    // Bez markera sa šípka správa ako doteraz – jeden krok späť.
  }
}

/** Len pre testy – vyčistí modulový stav medzi prípadmi. */
export function resetProfileOriginPending(): void {
  pendingOriginPath = null;
}

/** Hĺbka aktuálneho záznamu v profile; `null` keď pôvod nepoznáme. */
export function readProfileOriginDepth(historyState: unknown): number | null {
  return readMarker(historyState)?.depth ?? null;
}

/**
 * Skok na pôvod profilu jedným krokom.
 *
 * Vracia `false`, keď pôvod známy nie je – volajúci vtedy ostáva pri
 * doterajšom jednom kroku späť.
 */
export function returnToProfileOrigin(): boolean {
  if (typeof window === 'undefined') return false;
  const depth = readProfileOriginDepth(window.history.state);
  if (depth === null) return false;
  window.history.go(-(depth + 1));
  return true;
}
