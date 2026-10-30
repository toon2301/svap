import { request } from '@playwright/test';
import { REFRESH_PATH, buildRefreshHeaders } from './refreshRequest';
import type { StoredBrowserState } from './sessionKeeper';

/**
 * Obnoví prihlásenie rovnako ako appka v prehliadači a vráti nový uložený stav (cookies po rotácii tokenov); hlavičky
 * požiadavky určuje `buildRefreshHeaders`. Chyba nesie len stavový kód: ani cookies, ani telo odpovede sa do výstupu
 * testov nedostanú.
 */
export async function refreshStorageState(options: {
  baseURL: string;
  storageStatePath: string;
  /** Len HTTP stav; nesmie zmeniť výsledok požiadavky ani vracať telo odpovede. */
  onResponseStatus?: (status: number) => void;
}): Promise<StoredBrowserState> {
  const context = await request.newContext({
    baseURL: options.baseURL,
    storageState: options.storageStatePath,
  });
  try {
    const { cookies } = await context.storageState();
    const csrfToken = cookies.find((cookie) => cookie.name === 'csrftoken')?.value;
    const response = await context.post(REFRESH_PATH, {
      headers: buildRefreshHeaders(options.baseURL, csrfToken),
    });
    try { options.onResponseStatus?.(response.status()); } catch { /* Pozorovateľ nemení obnovu. */ }
    if (!response.ok()) {
      throw new Error(`HTTP ${response.status()}`);
    }
    return await context.storageState();
  } finally {
    await context.dispose();
  }
}
