'use client';

/**
 * Pamäť scrollu profilu pre návrat z recenzií.
 *
 * Každá stránka appky má vlastný `Dashboard`: po kroku späť sa profil postaví
 * nanovo a jeho scrollovateľná plocha je od vrchu. Pozícia sa preto uloží do
 * `history.state` záznamu profilu v okamihu, keď sa z neho odchádza do recenzií
 * (tam ju prehliadač drží aj cez F5), a po návrate sa obnoví.
 *
 * Zoznam ponúk dorastá až po načítaní profilu a ponúk (skeleton → hlavička →
 * zoznam), preto sa obnova nerobí hneď: čaká, kým je obsah dosť vysoký, a
 * pozíciu zapíše jednorazovo v snímke, v ktorej zoznam vznikne – ešte pred
 * vykreslením, takže zoznam sa nikdy neukáže na vrchu a nepreskočí.
 *
 * Obnova sa vzdá pri vstupe používateľa (ťah, koleso, klávesnica, myš), po
 * vypršaní času a keď obsah nikdy nenarastie (napr. ponuka medzitým zmazaná) –
 * vtedy ostane profil na vrchu ako doteraz. Po obnove aj po vzdaní sa záznam
 * zmaže, aby neskoršie F5 na profile neskočilo na starú pozíciu. Pri odmountovaní
 * (iná stránka, vývojový remount) sa záznam ponecháva.
 */

const SCROLL_HISTORY_KEY = '__svaplyProfileScroll';

/** Scrollovateľná plocha dashboardu – tá istá, akú používa feed aj profil. */
const DASHBOARD_MAIN_SELECTOR = '[data-dashboard-main]';

/** Ako dlho obnova čaká na dorastenie obsahu; potom sa vzdá. */
export const PROFILE_SCROLL_RESTORE_TIMEOUT_MS = 6000;

/** Vstupy používateľa, ktoré obnovu zrušia – používateľ si scrolluje sám. */
const USER_INPUT_EVENTS = ['touchstart', 'wheel', 'keydown', 'mousedown'] as const;

type ProfileScrollMarker = { version: 1; top: number };

function historyStateRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function dashboardMain(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.querySelector<HTMLElement>(DASHBOARD_MAIN_SELECTOR);
}

/**
 * Uloží aktuálny scroll plochy dashboardu do záznamu histórie, v ktorom sa
 * nachádzame (profil). Na vrchu nič nezapíše – a starú pozíciu zmaže.
 */
export function rememberProfileScroll(): void {
  if (typeof window === 'undefined') return;
  const main = dashboardMain();
  if (!main) return;
  const top = Math.round(main.scrollTop);
  if (!(top > 0)) {
    clearRememberedProfileScroll();
    return;
  }
  try {
    window.history.replaceState(
      {
        ...historyStateRecord(window.history.state),
        [SCROLL_HISTORY_KEY]: { version: 1, top } satisfies ProfileScrollMarker,
      },
      '',
      window.location.href,
    );
  } catch {
    // Bez zápisu sa profil po návrate otvorí od vrchu ako doteraz.
  }
}

/** Pozícia zo záznamu stavu histórie; `null`, keď žiadna (alebo poškodená) nie je. */
function scrollOfState(state: unknown): number | null {
  const marker = historyStateRecord(state)[SCROLL_HISTORY_KEY] as
    | Partial<ProfileScrollMarker>
    | null
    | undefined;
  if (!marker) return null;
  const { version, top } = marker;
  return version === 1 && typeof top === 'number' && top > 0 && top < Infinity ? top : null;
}

/** Zapamätaná pozícia v aktuálnom zázname; `null`, keď žiadna (alebo poškodená) nie je. */
export function readRememberedProfileScroll(): number | null {
  if (typeof window === 'undefined') return null;
  return scrollOfState(window.history.state);
}

/**
 * Pozícia zo záznamu, na ktorý sa práve vrátil krok histórie.
 *
 * Po F5 na recenziách router po kroku späť prepíše `history.state` bez vlastných kľúčov
 * skôr, než profil stihne zmontovať svoj efekt. `event.state` ostáva nedotknutý, preto sa
 * pozícia zachytí z neho. Patrí adrese, na ktorú krok viedol, a drží do dokončenia obnovy,
 * jej vzdania alebo nového vstupu do profilu (zastavenie pri odmountovaní ju ponecháva).
 */
let carried: { top: number; path: string } | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener(
    'popstate',
    (event) => {
      const top = scrollOfState(event.state);
      carried = top === null ? null : { top, path: window.location.pathname };
    },
    true,
  );
}

/** Pozícia, ktorú má obnova použiť: tá v aktuálnom zázname, inak zachytená z kroku histórie. */
function scrollToRestore(): number | null {
  return (
    readRememberedProfileScroll() ??
    (carried?.path === window.location.pathname ? carried.top : null)
  );
}

/**
 * Zmaže zapamätanú pozíciu (aj zachytenú z kroku histórie); cudzie kľúče záznamu ostanú,
 * bez kľúča sa história nezapisuje.
 */
export function clearRememberedProfileScroll(): void {
  carried = null;
  if (typeof window === 'undefined') return;
  const state = historyStateRecord(window.history.state);
  if (!(SCROLL_HISTORY_KEY in state)) return;
  const rest = { ...state };
  delete rest[SCROLL_HISTORY_KEY];
  try {
    window.history.replaceState(rest, '', window.location.href);
  } catch {
    // Zlyhanie zápisu nesmie rozbiť profil.
  }
}

/**
 * Obnoví zapamätanú pozíciu, keď je obsah dosť vysoký. Bez zapamätanej pozície
 * nerobí nič. Vráti funkciu, ktorá čakanie zastaví BEZ zmazania pozície
 * (odmountovanie).
 */
export function startProfileScrollRestore(): () => void {
  if (typeof window === 'undefined') return () => {};
  const target = scrollToRestore();
  if (target === null) return () => {};

  let frameId = 0;
  const timeoutId = setTimeout(giveUp, PROFILE_SCROLL_RESTORE_TIMEOUT_MS);

  /** Opakované volanie je neškodné – nič už nebeží. */
  const stop = () => {
    window.cancelAnimationFrame(frameId);
    clearTimeout(timeoutId);
    USER_INPUT_EVENTS.forEach((name) => window.removeEventListener(name, giveUp, true));
  };

  /** Používateľ prevzal scroll alebo čas vypršal: nič sa nezapíše a pozícia sa zabudne. */
  function giveUp() {
    stop();
    clearRememberedProfileScroll();
  }

  const attempt = () => {
    // Element sa pri načítaní môže vymeniť – každú snímku sa hľadá znova.
    const main = dashboardMain();
    if (main && main.scrollHeight - main.clientHeight >= target) {
      main.scrollTop = target;
      stop();
      clearRememberedProfileScroll();
      return;
    }
    frameId = window.requestAnimationFrame(attempt);
  };

  USER_INPUT_EVENTS.forEach((name) =>
    window.addEventListener(name, giveUp, { capture: true, passive: true }),
  );
  attempt();

  return stop;
}
