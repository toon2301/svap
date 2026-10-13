import type { Page } from '@playwright/test';

const WATCHES_API = '/api/auth/offer-watches/';

export type SavedWatch = {
  id: number;
  category: string;
  subcategory: string;
  is_seeking: boolean;
  country_code: string;
  district_code: string;
  price_min: string | null;
  price_max: string | null;
  price_currency: string;
  updated_at: string;
};

/** Use the app's same-origin session and CSRF contract, never bypass permissions. */
async function callWatchApi(page: Page, method: 'GET' | 'DELETE', id?: number) {
  return page.evaluate(async ({ method, path }) => {
    const csrf = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/)?.[1] ?? '';
    const response = await fetch(path, {
      method, credentials: 'include',
      headers: { 'X-CSRFToken': decodeURIComponent(csrf) },
    });
    const data: unknown = response.status === 204 ? null : await response.json().catch(() => null);
    return { status: response.status, data };
  }, { method, path: id === undefined ? WATCHES_API : `${WATCHES_API}${id}/` });
}

/** Read only the authenticated test account's watches through the app's same-origin API. */
export async function readWatches(page: Page): Promise<SavedWatch[]> {
  const response = await callWatchApi(page, 'GET');
  if (response.status !== 200 || !Array.isArray(response.data)) {
    throw new Error(`Read watches failed: HTTP ${response.status}.`);
  }
  return response.data as SavedWatch[];
}

/** Delete only IDs captured from a successful POST made by this test. */
export async function cleanupCreatedWatches(page: Page, createdIds: Set<number>): Promise<void> {
  for (const id of createdIds) {
    const { status } = await callWatchApi(page, 'DELETE', id);
    if (status !== 204 && status !== 404) {
      throw new Error(`Test watch cleanup failed: HTTP ${status}; manual cleanup is required.`);
    }
    createdIds.delete(id);
  }
}
