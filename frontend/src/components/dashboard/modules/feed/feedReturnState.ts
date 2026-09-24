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
 * Preto snímka mimo komponentu – a v `sessionStorage`, nie v modulovej
 * premennej. Pôvodne tu premenná bola, s predpokladom, že medzi odchodom a
 * návratom nikdy nie je reload. Manuálny test ten predpoklad vyvrátil:
 * detail portfólia je vlastná Next stránka, takže Späť z neho vedie cez hranicu
 * stránky, a `middleware.ts` posiela na každý HTML dokument
 * `Cache-Control: no-store` – Safari pri takej hlavičke bfcache nepoužije a
 * dokument načíta nanovo. Tým zanikne CELÝ modulový stav, nielen jeden zahodený
 * render. `sessionStorage` reload prežije, je viazaný na jednu kartu (snímka
 * nikam nepretečie a zanikne s jej zatvorením) a TTL nižšie drží to, že snímka
 * ostáva návratom, nie archívom.
 *
 * `sessionStorage` však patrí KARTE, nie účtu, a jedna karta ich za tú istú
 * session vystrieda viac. Snímka preto nesie `ownerId` a vydá sa len účtu,
 * ktorý ju vytvoril – vek záznamu na to nestačí. Druhá, nezávislá vrstva je
 * `clearFeedReturn()` pri odhlásení v `AuthContext`.
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
import { getCurrentAccountId } from '@/lib/currentAccount';

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

const STORAGE_KEY = 'svaplyFeedReturn';

/**
 * Tvar záznamu. Iné číslo = záznam z inej verzie appky, ignoruje sa.
 *
 * 2: pribudol `ownerId`. Záznamy bez neho sa nedajú priradiť k účtu, takže sa
 *    zahadzujú – nie sú „staré", sú neoveriteľné.
 */
const STORAGE_VERSION = 2;

/**
 * Strop na veľkosť zápisu (v znakoch serializovaného JSON).
 *
 * Merané na ťažkom príspevku (tri fotky, zdieľaný obsah, označení používatelia)
 * vyjde ~2,4 kB na kus, takže 500 donačítaných príspevkov je ~1,2 MB. Bežné
 * `sessionStorage` má ~5 MB na origin a delíme sa oň so zvyškom appky; nad
 * týmto stropom sa snímka radšej neuloží a návrat prebehne ako bežné otvorenie
 * Nástenky. Kvótu aj tak ešte chytá `try/catch` nižšie – strop je tu preto,
 * aby sa o ňu Nástenka nepokúšala opierať.
 */
const MAX_STORED_CHARS = 2 * 1024 * 1024;

type StoredSnapshot = FeedReturnSnapshot & {
  version: number;
  /** Ktorá snímka to je – potvrdenie nesmie zmazať tú, čo vznikla medzitým. */
  id: string;
  /**
   * Čí je obsah.
   *
   * `sessionStorage` patrí KARTE, nie účtu, a jedna karta ich za tú istú
   * session vystrieda viac (odhlásenie a prihlásenie niekoho iného, vypršanie
   * session). Feed pritom nesie aj osobné polia (`is_liked_by_me`,
   * `can_manage`), takže bez tohto by ich druhý účet videl ako svoje.
   */
  ownerId: number;
  savedAt: number;
};

/**
 * `sessionStorage`, keď je k dispozícii.
 *
 * Mimo prehliadača (SSR, build) neexistuje a v zamknutom úložisku (súkromné
 * okno, prísne nastavenia) môže samotný prístup hodiť výnimku. Návrat na
 * presné miesto je pohodlie – bez neho sa feed načíta odznova, appka stojí.
 */
function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Uložený záznam, alebo `null` pri chýbajúcom, cudzom či poškodenom. */
function readStored(): StoredSnapshot | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSnapshot> | null;
    if (!parsed || parsed.version !== STORAGE_VERSION) return null;
    if (typeof parsed.id !== 'string' || typeof parsed.savedAt !== 'number') return null;
    if (typeof parsed.ownerId !== 'number') return null;
    // Prázdny zoznam sa neukladá, takže záznam bez príspevkov je poškodený.
    if (!Array.isArray(parsed.posts) || parsed.posts.length === 0) return null;
    return {
      version: STORAGE_VERSION,
      id: parsed.id,
      ownerId: parsed.ownerId,
      savedAt: parsed.savedAt,
      posts: parsed.posts as FeedPost[],
      nextUrl: typeof parsed.nextUrl === 'string' ? parsed.nextUrl : null,
      scrollTop: typeof parsed.scrollTop === 'number' ? parsed.scrollTop : 0,
    };
  } catch {
    // Poškodený záznam je to isté ako žiadny.
    return null;
  }
}

function removeStored(): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(STORAGE_KEY);
  } catch {
    // Nedá sa zmazať – obnovu ustráži TTL.
  }
}

/**
 * Identita snímky, ktorú volajúci dostal z `peekFeedReturn`.
 *
 * Do verejného tvaru nepatrí; `peek` ju vracia navyše, rovnako ako `savedAt`.
 * Kto snímku nedostal odtiaľ, nemá čo potvrdzovať.
 */
function snapshotId(snapshot: FeedReturnSnapshot | null): string | null {
  const id = (snapshot as Partial<StoredSnapshot> | null)?.id;
  return typeof id === 'string' ? id : null;
}

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

/**
 * Nástenka ukladá svoj stav. Prázdny zoznam sa neukladá – nie je čo obnoviť.
 *
 * Zápis môže zlyhať (kvóta, zamknuté úložisko). Orezať zoznam a uložiť aspoň
 * časť sa NEDÁ: kurzor `nextUrl` patrí za posledný príspevok a `scrollTop` k
 * celej výške zoznamu, takže osekaná snímka by obnovila feed nesprávne. Preto
 * sa pri zlyhaní zahodí celá a návrat prebehne ako bežné otvorenie Nástenky.
 */
export function saveFeedReturn(snapshot: FeedReturnSnapshot): void {
  if (!snapshot.posts.length) {
    removeStored();
    return;
  }
  const ownerId = getCurrentAccountId();
  if (ownerId === null) {
    // Bez známeho účtu sa snímka nedá neskôr priradiť. Radšej žiadna než taká,
    // ktorú by si mohol privlastniť ktokoľvek ďalší v tej istej karte.
    removeStored();
    return;
  }
  const store = storage();
  if (!store) return;

  const record: StoredSnapshot = {
    version: STORAGE_VERSION,
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
    ownerId,
    savedAt: Date.now(),
    posts: snapshot.posts,
    nextUrl: snapshot.nextUrl,
    scrollTop: snapshot.scrollTop,
  };

  let serialized: string;
  try {
    serialized = JSON.stringify(record);
  } catch {
    removeStored();
    return;
  }
  if (serialized.length > MAX_STORED_CHARS) {
    removeStored();
    return;
  }
  try {
    store.setItem(STORAGE_KEY, serialized);
  } catch {
    // Kvóta alebo zamknutý zápis: nech po sebe neostane starší záznam, ktorý
    // už neplatí – obnovil by feed do stavu spred tohto odchodu.
    removeStored();
  }
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
  const record = readStored();
  if (!record) return null;

  const viewerId = getCurrentAccountId();
  if (viewerId === null) {
    // Účet sa ešte nezistil – po znovunačítaní dokumentu to trvá, kým dobehne
    // `/me`. Záznam sa NEZAHADZUJE: patrí niekomu, kto sa o chvíľu ozve.
    return null;
  }
  if (record.ownerId !== viewerId) {
    // Snímka iného účtu v tej istej karte. Cudzí feed sa nesmie zobraziť ani
    // ostať ležať – zahadzuje sa hneď, nie až po vypršaní TTL.
    removeStored();
    return null;
  }

  if (Date.now() - record.savedAt > FEED_RETURN_TTL_MS) {
    // Expirovaná snímka je nepoužiteľná pre kohokoľvek, takže ju smie zahodiť
    // aj samotné nazretie – opakovaný render tým o nič nepríde.
    removeStored();
    return null;
  }
  return record;
}

/**
 * Snímka je naozaj prevzatá: render, ktorý ju dostal, sa commitol.
 *
 * Zahodí VÝHRADNE tú snímku, ktorú volajúci dostal. Keby medzitým vznikla
 * nová, patrí už ďalšiemu návratu a spotrebovať sa nesmie.
 *
 * Účet sa tu neoveruje zámerne: potvrdenie iba MAŽE, takže ním nič nevyjde
 * von, a snímku cudzieho účtu volajúci nemá odkiaľ dostať – `peek` ju nevydá.
 */
export function consumeFeedReturn(snapshot: FeedReturnSnapshot | null): void {
  const id = snapshotId(snapshot);
  if (!id) return;
  const current = readStored();
  if (current && current.id === id) removeStored();
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
  removeStored();
}

/** Len pre testy – vyčistí uložený stav medzi prípadmi. */
export function resetFeedReturnState(): void {
  removeStored();
}
