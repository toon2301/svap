'use client';

/**
 * Návrat na Nástenku tam, kde ju používateľ opustil.
 *
 * Nástenka sa pri odchode na profil, ponuku či portfólio ODMOUNTUJE –
 * `ModuleRouter` je `switch` nad `activeModule`, takže sa celý podstrom vymení.
 * S ňou zmizne aj stav `useFeedInfiniteScroll` (načítané príspevky a kurzor
 * ďalšej stránky) a pri návrate sa feed načítava od začiatku: používateľ
 * pristane na vrchu, o donačítané stránky príde a obsah sa mu pod rukami
 * posunie.
 *
 * Preto snímka mimo komponentu. Modulový stav, nie `sessionStorage`: medzi
 * odchodom a návratom v rámci jednej SPA session nikdy nie je reload, a po F5
 * sa má feed načítať normálne (prežitie cez reload je mimo rozsahu).
 *
 * DVE ROLE, zámerne oddelené:
 *
 *  - `requestFeedReturnCapture()` volá NAVIGÁCIA tesne pred odchodom. Hovorí
 *    „idem preč, ulož si stav" – nič viac. Nemusí vedieť, či je Nástenka vôbec
 *    na obrazovke; keď nie je, žiadosť sa ticho stratí.
 *  - `saveFeedReturn()` / `peekFeedReturn()` + `consumeFeedReturn()` používa
 *    SAMA Nástenka. Len ona vie, čo má jej stav obsahovať – a len ona vie
 *    povedať, kedy je obnova naozaj na obrazovke.
 */

import type { FeedPost } from '@/lib/feedApi';

export const FEED_RETURN_CAPTURE_EVENT = 'feed-return-capture';

/**
 * Koľko je snímka použiteľná.
 *
 * Snímka je NÁVRAT, nie archív. Bez stropu by sa obnovila aj po dlhej odbočke
 * inam (profil → správy → Nástenka) a používateľ by dostal feed spred desiatok
 * minút bez akéhokoľvek náznaku, že je starý.
 */
export const FEED_RETURN_TTL_MS = 5 * 60 * 1000;

export type FeedReturnSnapshot = {
  /** Príspevky vrátane donačítaných stránok, v poradí, v akom boli. */
  posts: FeedPost[];
  /** Kurzor ďalšej stránky – bez neho by donačítavanie začalo odznova. */
  nextUrl: string | null;
  /** Pozícia v scrollovateľnom `<main>`. */
  scrollTop: number;
};

type StoredSnapshot = FeedReturnSnapshot & { savedAt: number };

let stored: StoredSnapshot | null = null;

/**
 * Odchádza sa z Nástenky – nech si uloží stav.
 *
 * Volá navigácia (preklik na profil, ponuku, portfólio) TESNE pred zmenou
 * modulu, kým je Nástenka ešte v DOM a vie sa odmerať.
 */
export function requestFeedReturnCapture(): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new Event(FEED_RETURN_CAPTURE_EVENT));
  } catch {
    // Návrat na presné miesto je pohodlie – bez neho sa feed načíta odznova.
  }
}

/** Nástenka počúva na žiadosť o snímku. */
export function onFeedReturnCapture(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(FEED_RETURN_CAPTURE_EVENT, handler);
  return () => window.removeEventListener(FEED_RETURN_CAPTURE_EVENT, handler);
}

/** Nástenka ukladá svoj stav. Prázdny zoznam sa neukladá – nie je čo obnoviť. */
export function saveFeedReturn(snapshot: FeedReturnSnapshot): void {
  if (!snapshot.posts.length) {
    stored = null;
    return;
  }
  stored = { ...snapshot, savedAt: Date.now() };
}

/**
 * Nástenka nazrie do snímky počas vykresľovania – ČÍTA, nespotrebúva.
 *
 * Spotreba patrí až za commit (`consumeFeedReturn`). React rozpracovaný render
 * zahadzuje a opakuje – nad dashboardom je `Suspense` a `DashboardContent` číta
 * `useSearchParams()` – a zahodený pokus nesmie snímku vziať so sebou: druhý
 * pokus by dostal prázdno a feed by sa načítal od vrchu.
 */
export function peekFeedReturn(): FeedReturnSnapshot | null {
  if (!stored) return null;
  if (Date.now() - stored.savedAt > FEED_RETURN_TTL_MS) {
    // Expirovaná snímka je nepoužiteľná pre kohokoľvek, takže ju smie zahodiť
    // aj samotné nazretie – opakovaný render tým o nič nepríde.
    stored = null;
    return null;
  }
  return stored;
}

/**
 * Snímka je naozaj prevzatá: render, ktorý ju dostal, sa commitol.
 *
 * Zahodí VÝHRADNE tú snímku, ktorú volajúci dostal. Keby medzitým vznikla
 * nová, patrí už ďalšiemu návratu a spotrebovať sa nesmie.
 */
export function consumeFeedReturn(snapshot: FeedReturnSnapshot | null): void {
  if (snapshot && stored === snapshot) stored = null;
}

/**
 * Prečítanie aj spotreba naraz.
 *
 * Len MIMO vykresľovacej fázy. Vo vykresľovaní patrí `peekFeedReturn` a
 * potvrdenie `consumeFeedReturn` v efekte – dôvod je vysvetlený pri `peek`
 * a stráži ho test „nikto nespotrebúva snímku počas vykresľovania".
 */
export function takeFeedReturn(): FeedReturnSnapshot | null {
  const snapshot = peekFeedReturn();
  consumeFeedReturn(snapshot);
  return snapshot;
}

/** Zahodí snímku bez prevzatia (napr. keď si používateľ feed vedome obnovil). */
export function clearFeedReturn(): void {
  stored = null;
}

/** Len pre testy – vyčistí modulový stav medzi prípadmi. */
export function resetFeedReturnState(): void {
  stored = null;
}
