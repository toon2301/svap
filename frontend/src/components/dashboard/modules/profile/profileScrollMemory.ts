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
 * pozíciu zapíše v snímke, v ktorej zoznam vznikne – ešte pred vykreslením,
 * takže zoznam sa nikdy neukáže na vrchu a nepreskočí.
 *
 * Po zápise obnova pozíciu ešte STRÁŽI. Po F5 na recenziách a kroku späť Next 16 vymení stránku
 * profilu ešte dvakrát (po zápise, vždy o to neskôr, čím pomalší je procesor): nový `<main>` je od
 * vrchu a jednorazový zápis by sa stratil. Obnova preto po zápise nekončí – nový `<main>` (alebo
 * scroll vrátený nahor) ju dostane znova, a to až do vypršania času alebo do vstupu používateľa.
 * Záznam histórie sa maže hneď po prvom zápise (F5 na profile nemá skočiť na starú pozíciu), no
 * pozícia ostáva v pamäti modulu (`carried`), aby ju prevzala aj stránka, ktorá tú zapísanú nahradí.
 *
 * Obnova sa vzdá pri vstupe používateľa (ťah, koleso, klávesnica, myš), po
 * vypršaní času a keď obsah nikdy nenarastie (napr. ponuka medzitým zmazaná) –
 * vtedy ostane profil na vrchu ako doteraz. Po vzdaní aj po vypršaní času sa pozícia zabudne.
 * Pri odmountovaní (iná stránka, vývojový remount) sa ponecháva – nová stránka profilu ju prevezme,
 * no len na čas `PROFILE_SCROLL_CARRY_TTL_MS`, aby nepreležala do neskoršej návštevy.
 */

const SCROLL_HISTORY_KEY = '__svaplyProfileScroll';

/** Scrollovateľná plocha dashboardu – tá istá, akú používa feed aj profil. */
const DASHBOARD_MAIN_SELECTOR = '[data-dashboard-main]';

/** Ako dlho obnova čaká na dorastenie obsahu; potom sa vzdá. */
export const PROFILE_SCROLL_RESTORE_TIMEOUT_MS = 6000;

/**
 * Ako dlho platí pozícia v pamäti modulu, keď ju nikto nepoužije (odmountovaná stránka, ktorú
 * nenahradila nová). Počíta sa od zachytenia kroku histórie alebo od posledného zápisu, takže
 * musí pokryť aj pomalé prekreslenie stránky routerom.
 */
export const PROFILE_SCROLL_CARRY_TTL_MS = 2 * PROFILE_SCROLL_RESTORE_TIMEOUT_MS;

/** O koľko px sa môže skutočný scroll líšiť od pozície (zaokrúhlenie, fyzické pixely). */
const SCROLL_TOLERANCE_PX = 1;

/** Vstupy používateľa, ktoré obnovu zrušia – používateľ si scrolluje sám. */
const USER_INPUT_EVENTS = ['touchstart', 'wheel', 'keydown', 'mousedown', 'pointerdown'] as const;

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
 * pozícia zachytí z neho. Patrí adrese, na ktorú krok viedol, a drží do vypršania obnovy, jej
 * vzdania, nového vstupu do profilu alebo `PROFILE_SCROLL_CARRY_TTL_MS` (zastavenie pri odmountovaní
 * ju ponecháva). Po prvom zápise sa v nej drží aj pozícia zo záznamu histórie, ktorý sa vtedy maže.
 */
let carried: { top: number; path: string; at: number } | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener(
    'popstate',
    (event) => {
      const top = scrollOfState(event.state);
      carried = top === null ? null : { top, path: window.location.pathname, at: Date.now() };
    },
    true,
  );
}

/** Pozícia, ktorú má obnova použiť: tá v aktuálnom zázname, inak zachytená z kroku histórie. */
function scrollToRestore(): number | null {
  const fromHistory = readRememberedProfileScroll();
  if (fromHistory !== null) return fromHistory;
  if (!carried || carried.path !== window.location.pathname) return null;
  return Date.now() - carried.at <= PROFILE_SCROLL_CARRY_TTL_MS ? carried.top : null;
}

/**
 * Zmaže zapamätanú pozíciu (aj zachytenú z kroku histórie); cudzie kľúče záznamu ostanú,
 * bez kľúča sa história nezapisuje.
 */
export function clearRememberedProfileScroll(): void {
  carried = null;
  clearHistoryMarker();
}

/** Zmaže len pozíciu v zázname histórie (pamäť modulu ostáva). */
function clearHistoryMarker(): void {
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
 * Obnoví zapamätanú pozíciu, keď je obsah dosť vysoký, a potom ju stráži do vypršania času
 * alebo do vstupu používateľa: nový `<main>` (stránka sa pri načítaní vymenila) alebo scroll
 * vrátený nahor dostanú pozíciu znova. Bez zapamätanej pozície nerobí nič.
 * Vráti funkciu, ktorá obnovu zastaví BEZ zmazania pozície (odmountovanie) – profil, ktorý
 * stránku nahradí, ju prevezme.
 */
export function startProfileScrollRestore(): () => void {
  if (typeof window === 'undefined') return () => {};
  const target = scrollToRestore();
  if (target === null) return () => {};

  let frameId = 0;
  /** `<main>`, do ktorého sa pozícia naposledy zapísala; `null`, kým sa nezapísala nikam. */
  let held: HTMLElement | null = null;
  const timeoutId = setTimeout(finish, PROFILE_SCROLL_RESTORE_TIMEOUT_MS);

  /** Opakované volanie je neškodné – nič už nebeží. */
  const stop = () => {
    window.cancelAnimationFrame(frameId);
    clearTimeout(timeoutId);
    USER_INPUT_EVENTS.forEach((name) => window.removeEventListener(name, finish, true));
  };

  /** Používateľ prevzal scroll alebo čas vypršal: nič sa už nezapíše a pozícia sa zabudne. */
  function finish() {
    stop();
    clearRememberedProfileScroll();
  }

  const attempt = () => {
    // Element sa pri načítaní môže vymeniť – každú snímku sa hľadá znova. Kým obsah nie je dosť
    // vysoký, nič sa nezapisuje (pozícia by sa orezala).
    const main = dashboardMain();
    if (main && main.scrollHeight - main.clientHeight >= target) {
      // Nový element, alebo scroll sa vrátil nahor (napr. obsah sa na chvíľu zmenšil a prehliadač
      // ho orezal): pozícia sa zapíše znova.
      if (main !== held || main.scrollTop < target - SCROLL_TOLERANCE_PX) {
        main.scrollTop = target;
        held = main;
        // Záznam histórie sa maže hneď, F5 na profile nemá skočiť na starú pozíciu; v pamäti modulu
        // pozícia ostáva pre stránku, ktorú router ešte vymení.
        carried = { top: target, path: window.location.pathname, at: Date.now() };
        clearHistoryMarker();
      }
    }
    frameId = window.requestAnimationFrame(attempt);
  };

  USER_INPUT_EVENTS.forEach((name) =>
    window.addEventListener(name, finish, { capture: true, passive: true }),
  );
  attempt();

  return stop;
}
