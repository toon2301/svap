'use client';

/**
 * Pôvod konverzácie otvorenej z profilu – pre šípku „späť" v mobilných Správach.
 *
 * Konverzáciu z profilu otvára „Poslať správu" (ikona bubliny, tlačidlo správy na
 * karte ponuky). Šípka v nej predtým vždy otvorila zoznam konverzácií, hoci sa
 * používateľ prišiel z profilu; krok späť v prehliadači pritom vedie správne na
 * profil. Pri známom pôvode je správny skutočný krok späť – profil ostane tam,
 * kde bol, a história nerastie.
 *
 * Pôvod sa píše do `history.state` záznamu konverzácie – rovnaký vzor ako
 * `offerReviewsOrigin` (recenzie). Dvojkrokovo, lebo záznam vytvára až Next router
 * pri commite novej stránky: otvorenie si cieľ zapamätá a zobrazený modul Správy
 * ho prevezme (`adoptMessagesProfileOrigin`).
 *
 * Značka patrí ZÁZNAMU histórie, nie načítaniu stránky, takže prežije F5. Ďalšie
 * vstupy do Správ (zoznam, notifikácie, žiadosti, Obľúbené) ju nedostanú a šípka
 * z nich ide na zoznam ako doteraz. Pri zmene adresy konverzácie nahradením
 * záznamu (prvá správa, existujúca konverzácia) ju prenáša `carryMessagesProfileOrigin`.
 *
 * Súbor zámerne neimportuje `messagesRouting` (ten importuje jeho) – adresu dostane
 * od volajúceho a potrebné časti si z nej prečíta sám.
 */

const ORIGIN_HISTORY_KEY = '__svaplyMessagesProfileOrigin';

/** Ako dlho po otvorení smie zobrazený modul Správy ešte prevziať pôvod. */
const PENDING_TTL_MS = 10_000;

/** Rýchly druhý klik na to isté tlačidlo nemá otvoriť konverzáciu dvakrát. */
const DOUBLE_OPEN_WINDOW_MS = 1_000;

/** Poistka: ak `popstate` po kroku späť nepríde, ďalšie ťuknutie sa opäť uvoľní. */
const BACK_SETTLE_MS = 1_500;

type MessagesProfileOriginMarker = { version: 1 };

/** Konverzácia, ktorú appka práve otvára z profilu a ešte nemá svoj záznam. */
type PendingOpen = { path: string; targetUserId: string; at: number };

let pending: PendingOpen | null = null;
let backInFlight = false;

function historyStateRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function hasMarker(state: unknown): boolean {
  const marker = historyStateRecord(state)[ORIGIN_HISTORY_KEY] as
    | Partial<MessagesProfileOriginMarker>
    | undefined;
  return marker?.version === 1;
}

function parseHref(href: string): URL | null {
  try {
    return new URL(href, 'http://localhost');
  } catch {
    return null;
  }
}

/**
 * Otvor konverzáciu z profilu – s pôvodom pre šípku späť.
 *
 * `href` je adresa rozpísanej konverzácie (`?targetUserId=…`). Bez cieľa v adrese
 * sa len naviguje, pôvod sa nezapamätá. Druhé volanie pre toho istého používateľa
 * hneď po prvom sa ignoruje (dvojklik), inak by druhá navigácia mohla značku zmazať.
 */
export function openMessagesFromProfile(
  router: { push: (url: string) => void },
  href: string,
): void {
  const parsed = parseHref(href);
  const targetUserId = parsed?.searchParams.get('targetUserId') ?? null;
  if (!parsed || !targetUserId) {
    router.push(href);
    return;
  }

  const now = Date.now();
  if (
    pending &&
    pending.targetUserId === targetUserId &&
    now - pending.at < DOUBLE_OPEN_WINDOW_MS
  ) {
    return;
  }

  pending = { path: parsed.pathname, targetUserId, at: now };
  try {
    router.push(href);
  } catch (error) {
    // Navigácia sa nespustila – nech čakajúci pôvod nemá kto prevziať omylom.
    pending = null;
    throw error;
  }
}

/**
 * Správy sa zobrazili: ak ich z profilu otvorila appka, označí záznam pôvodom.
 *
 * Prevzatie je jednorazové a zahodí sa aj pri nezhode (iná cesta, iný používateľ,
 * príliš starý zápis) – inak by si ho mohla privlastniť stránka otvorená inou cestou.
 */
export function adoptMessagesProfileOrigin(): void {
  if (typeof window === 'undefined') return;
  const open = pending;
  pending = null;
  if (!open || Date.now() - open.at > PENDING_TTL_MS) return;
  if (window.location.pathname !== open.path) return;
  const current = new URLSearchParams(window.location.search).get('targetUserId');
  if (current !== open.targetUserId) return;
  try {
    window.history.replaceState(
      {
        ...historyStateRecord(window.history.state),
        [ORIGIN_HISTORY_KEY]: { version: 1 } satisfies MessagesProfileOriginMarker,
      },
      '',
      window.location.href,
    );
  } catch {
    // Bez značky sa šípka správa ako pri iných vstupoch (zoznam konverzácií).
  }
}

/**
 * Stav histórie pre nahradenie záznamu konverzácie (zmena jej adresy).
 *
 * Vracia LEN značku, nikdy celý stav: Next si doplní svoje vnútorné kľúče sám a
 * keby mu prišli hotové, preskočil by aktualizáciu adresy (`useSearchParams`).
 * Bez značky vráti `null`.
 */
export function carryMessagesProfileOrigin(): Record<string, MessagesProfileOriginMarker> | null {
  if (typeof window === 'undefined') return null;
  if (!hasMarker(window.history.state)) return null;
  return { [ORIGIN_HISTORY_KEY]: { version: 1 } };
}

/**
 * Krok späť na profil, z ktorého sa konverzácia otvorila.
 *
 * Vracia `false`, keď pôvod známy nie je – volajúci ostáva pri zozname konverzácií.
 * Krok späť je asynchrónny, preto druhé ťuknutie, kým neprebehne, nič nerobí
 * (inak by sa vrátilo o záznam ďalej, mimo profilu).
 */
export function returnToMessagesProfileOrigin(): boolean {
  if (typeof window === 'undefined') return false;
  if (!hasMarker(window.history.state)) return false;
  if (backInFlight) return true;

  backInFlight = true;
  const release = () => {
    backInFlight = false;
    window.removeEventListener('popstate', release);
    clearTimeout(timer);
  };
  const timer = setTimeout(release, BACK_SETTLE_MS);
  window.addEventListener('popstate', release);
  window.history.back();
  return true;
}

/** Len pre testy – vyčistí modulový stav medzi prípadmi. */
export function resetMessagesProfileOrigin(): void {
  pending = null;
  backInFlight = false;
}
