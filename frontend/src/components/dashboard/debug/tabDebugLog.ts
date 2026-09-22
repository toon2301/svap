'use client';

/**
 * DOČASNÉ LADENIE – NA ODSTRÁNENIE.
 *
 * Zbiera udalosti okolo profilových záložiek a prepínania modulov, aby sa dali
 * prečítať priamo na telefóne (konzola tam po ruke nie je). Celé je to vypnuté,
 * kým v adrese nie je `?debugtabs=1` – bežný používateľ o tom nevie.
 *
 * Patrí k nálezu „prvý Back medzi záložkami vlastného profilu sa na mobile
 * spotrebuje bez viditeľnej zmeny". Po vyriešení zmazať celý priečinok `debug`
 * aj volania, ktoré naň odkazujú (hľadaj `DEBUG ?debugtabs=1`).
 */

const QUERY_FLAG = 'debugtabs';
const STORAGE_KEY = '__svaplyDebugTabs';
const MAX_LINES = 10;

let enabled: boolean | null = null;
let lines: string[] = [];
const listeners = new Set<(lines: string[]) => void>();

/**
 * Je ladenie zapnuté?
 *
 * Raz zapnuté ostáva zapnuté po celú reláciu karty – drží sa v `sessionStorage`.
 * Samotný parameter v adrese totiž neprežije: prechod na inú obrazovku skladá
 * adresu nanovo (`dashboardSectionPath`, `dashboardProfilePath`) a query
 * predošlej obrazovky zámerne zahadzuje. Bez tohto podržania panel zmizol
 * uprostred meraného scenára.
 */
export function isTabDebugEnabled(): boolean {
  if (enabled !== null) return enabled;
  if (typeof window === 'undefined') return false;

  const fromUrl = new URLSearchParams(window.location.search).get(QUERY_FLAG) === '1';
  let stored = false;
  try {
    stored = window.sessionStorage.getItem(STORAGE_KEY) === '1';
    if (fromUrl && !stored) window.sessionStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // Súkromné okno a pod. – ladenie vtedy platí len pre túto adresu.
  }

  enabled = fromUrl || stored;
  return enabled;
}

function timestamp(): string {
  const now = new Date();
  const pad = (value: number, size = 2) => String(value).padStart(size, '0');
  return `${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}`;
}

/** Pridá riadok (neprepisuje) – poradie udalostí je to, čo sa skúma. */
export function logTabDebug(message: string): void {
  if (!isTabDebugEnabled()) return;
  lines = [...lines, `${timestamp()} ${message}`].slice(-MAX_LINES);
  listeners.forEach((listener) => listener(lines));
}

export function subscribeTabDebug(listener: (lines: string[]) => void): () => void {
  listeners.add(listener);
  listener(lines);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Čím bola navigácia SPUSTENÁ – podľa prehliadača, nie podľa dohadu.
 *
 * `reload` = obnovenie, `back_forward` = krok históriou, `navigate` = bežný
 * vstup. Pozor na hranicu tohto údaja: `back_forward` hovorí len to, že to
 * spustilo tlačidlo Späť/Dopredu – NIE že prehliadač stránku naozaj obnovil
 * z bfcache. Pri zablokovanej bfcache (napr. `Cache-Control: no-store`) sa
 * rovnako hlási `back_forward`, hoci prebehlo plné načítanie. Na otázku
 * „obnovilo sa z pamäte?" odpovedá až `pageshow.persisted` nižšie.
 */
function navigationType(): string {
  if (typeof performance === 'undefined') return 'neznámy';
  try {
    const entry = performance.getEntriesByType('navigation')[0] as
      | { type?: string }
      | undefined;
    return entry?.type ?? 'neznámy';
  } catch {
    return 'neznámy';
  }
}

/**
 * Prvý riadok po štarte skriptu.
 *
 * Keby sa stránka pri kroku späť celá znovu načítala, zoznam riadkov by sa
 * vymazal a v paneli by ostalo len to, čo prišlo po reloade – čo vyzerá ako
 * „udalosť sa nestala". Tento riadok ten rozdiel ukáže priamo, aj s tým, čím
 * to načítanie bolo.
 */
if (typeof window !== 'undefined') {
  logTabDebug(
    `— štart stránky — typ=${navigationType()} url=${window.location.pathname}${window.location.search}`,
  );

  // `pageshow.persisted` je jediný autoritatívny signál „táto stránka bola
  // práve obnovená z bfcache".
  //
  // Listener to musí byť práve preto: pri skutočnom obnovení sa modulový kód
  // vyššie NESPUSTÍ znova (beh skriptu prežije zmrazenie), takže štartovací
  // riadok by nepribudol – ale `pageshow` áno. Obe hodnoty sa zapisujú vedľa
  // seba, nech sa dá porovnať, čo navigáciu spustilo a čo sa naozaj stalo.
  window.addEventListener('pageshow', (event) => {
    logTabDebug(
      `pageshow: persisted=${(event as PageTransitionEvent).persisted} typ=${navigationType()}`,
    );
  });
}
