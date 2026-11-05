import assert from 'node:assert/strict';
import type { Request, Response } from '@playwright/test';

type DocumentResponse = Pick<Response, 'status' | 'url' | 'headerValue' | 'fromServiceWorker'> & {
  request(): Pick<Request, 'method' | 'resourceType' | 'isNavigationRequest'>;
};

/** Rozpozná samostatnú direktívu, nie text no-store v názve či citovanej hodnote. */
export function hasNoStoreDirective(value: string | null): boolean {
  if (!value || /[\r\n]/.test(value)) return false;
  let quoted = false;
  let escaped = false;
  let start = 0;
  let found = false;
  for (let index = 0; index <= value.length; index += 1) {
    const character = value[index];
    if (escaped) { escaped = false; continue; }
    if (quoted && character === '\\') { escaped = true; continue; }
    if (character === '"') { quoted = !quoted; continue; }
    if ((character === ',' && !quoted) || index === value.length) {
      if (value.slice(start, index).trim().toLowerCase() === 'no-store') found = true;
      start = index + 1;
    }
  }
  return !quoted && !escaped && found;
}

/** Overí skutočný HTML dokument; chyba smie obsahovať iba stav a bezpečné príznaky. */
export async function assertHtmlNoStore(response: DocumentResponse | null, expectedUrl: string): Promise<void> {
  assert.ok(response !== null, 'Chýba HTTP odpoveď HTML dokumentu.');
  const [cacheControl, contentType] = await Promise.all([
    response.headerValue('cache-control'), response.headerValue('content-type'),
  ]);
  let sameDocument = false;
  try { sameDocument = new URL(response.url()).href === new URL(expectedUrl).href; } catch {
    // Neplatná či iná adresa nesmie prejsť; jej hodnota sa nevypisuje.
  }
  const request = response.request();
  assert.deepEqual({
    status: response.status(),
    sameDocument,
    html: /^text\/html(?:\s*;|$)/i.test(contentType?.trim() ?? ''),
    get: request.method() === 'GET',
    navigation: request.isNavigationRequest(),
    document: request.resourceType() === 'document',
    fromServiceWorker: response.fromServiceWorker(),
    noStore: hasNoStoreDirective(cacheControl),
  }, {
    status: 200, sameDocument: true, html: true, get: true, navigation: true,
    document: true, fromServiceWorker: false, noStore: true,
  }, 'HTML dokument musí prísť zo servera s direktívou Cache-Control: no-store.');
}
