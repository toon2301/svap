import { expect, test } from '@playwright/test';
import { formatPeerConversationCounts, readPeerConversationInBrowser } from '../support/peer-conversation-diagnostics';

process.env.PLAYWRIGHT_NO_COPY_PROMPT = '1';

test('prvá stránka a počty fungujú aj po serializácii do prehliadača', async ({ page }) => {
  let apiCalls = 0;
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== 'https://diagnostic.invalid') return route.abort();
    if (url.pathname === '/api/auth/messaging/conversations/') {
      apiCalls += 1;
      expect(request.method()).toBe('GET');
      return route.fulfill({ json: { results: [
        { id: 123, other_user: { slug: 'synteticky-ciel', display_name: 'Syntetické meno' } },
        { id: 456, other_user: { slug: 'synteticky-ciel', display_name: 'Syntetické meno', is_deleted: true } },
      ], next: '/NESMIE_NACITAT_DRUHU_STRANKU' } });
    }
    return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Syntetická diagnostika</title>' });
  });
  await page.goto('/');
  const snapshot = await page.evaluate(readPeerConversationInBrowser, 'synteticky-ciel');
  expect(snapshot.counts).toEqual({ firstPage: 2, slugMatches: 2, deletedMatches: 1, namedMatches: 1, nameMatches: 1 });
  expect(snapshot.peer?.sameTitle).toBe(1);
  expect(apiCalls).toBe(1);
  expect(formatPeerConversationCounts(snapshot.counts)).toBe(
    '[E2E-PEER] firstPage=2 slugMatches=2 deletedMatches=1 namedMatches=1 nameMatches=1',
  );
});
