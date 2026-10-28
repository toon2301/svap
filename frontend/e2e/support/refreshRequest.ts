/**
 * Čistá časť obnovy prihlásenia pre E2E testy (nález 202), bez Playwrightu.
 *
 * Playwright 1.63 sa na Node 18 pri načítaní sám ukončí (vyžaduje Node 20 alebo novší), a práve Node 18 používa CI. Preto sú
 * pravidlá požiadavky na obnovu v samostatnom module, ktorý Jest načíta všade, a s Playwrightom sa spája až
 * `refreshStorageState.ts`.
 */

/** Cesta obnovy prihlásenia na backende: tú istú volá aj appka v prehliadači. */
export const REFRESH_PATH = '/api/token/refresh/';

/**
 * Hlavičky obnovy: backend pri zmene stavu vyžaduje zhodu `X-CSRFToken` s cookie `csrftoken` a overuje pôvod požiadavky,
 * preto posielame aj `Origin` a `Referer` (prehliadač ich pridáva sám, Playwrightov API klient nie).
 */
export function buildRefreshHeaders(baseURL: string, csrfToken?: string): Record<string, string> {
  const origin = new URL(baseURL).origin;
  return {
    Origin: origin,
    Referer: `${origin}/`,
    ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
  };
}
