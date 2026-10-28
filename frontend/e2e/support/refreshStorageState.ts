import { request } from '@playwright/test';
import type { StoredBrowserState } from './sessionKeeper';

/** Cesta obnovy prihlásenia na backende: tú istú volá aj appka v prehliadači. */
export const REFRESH_PATH = '/api/token/refresh/';

/**
 * Obnoví prihlásenie rovnako ako appka v prehliadači a vráti nový uložený stav (cookies po rotácii tokenov).
 *
 * Backend pri zmene stavu vyžaduje zhodu hlavičky `X-CSRFToken` s cookie `csrftoken` a overuje pôvod požiadavky, preto
 * posielame aj `Origin` a `Referer` (prehliadač ich pridáva sám, Playwrightov API klient nie). Chyba nesie len stavový
 * kód: ani cookies, ani telo odpovede sa do výstupu testov nedostanú.
 */
export async function refreshStorageState(options: {
  baseURL: string;
  storageStatePath: string;
}): Promise<StoredBrowserState> {
  const context = await request.newContext({
    baseURL: options.baseURL,
    storageState: options.storageStatePath,
  });
  try {
    const { cookies } = await context.storageState();
    const csrfToken = cookies.find((cookie) => cookie.name === 'csrftoken')?.value;
    const origin = new URL(options.baseURL).origin;
    const response = await context.post(REFRESH_PATH, {
      headers: {
        Origin: origin,
        Referer: `${origin}/`,
        ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
      },
    });
    if (!response.ok()) {
      throw new Error(`HTTP ${response.status()}`);
    }
    return await context.storageState();
  } finally {
    await context.dispose();
  }
}
