import { expect, test, type Page } from '@playwright/test';

import {
  bottomNav,
  expectNewMain,
  gotoDashboardHome,
  mainInstance,
  pathOf,
  recordMainInstance,
  searchOf,
  topBarBack,
  visiblePlaceholder,
} from './support/dashboard';

// Správy → konverzácia → profil druhého testovacieho účtu a späť (iPhone).
// Beží len s E2E_PEER_SLUG (slug TVOJHO druhého testovacieho účtu; medzi účtami musí byť prijatá priama
// konverzácia – pozri .env.e2e.example). Dôsledky na produkcii: ak je v konverzácii správa od druhého
// účtu, jej otvorenie ju označí za prečítanú (druhý účet uvidí „Videné"); otvorenie jeho profilu zapíše
// 1 návštevu profilu na účet a deň. Nič sa neodosiela, nemaže ani neprepína. Meno ani slug druhého účtu
// sa nedostane do správ o chybe.

const PEER_SLUG = (process.env.E2E_PEER_SLUG ?? '').trim();
const PEER_HEADER = 'button[aria-label="Otvoriť profil používateľa"]';
const LIST_SEARCH = /Hľadať podľa mena/;

type PeerConversation = { id: number; displayName: string };

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'webkit-mobile', 'Hlavička konverzácie s menom je len na iPhone – webkit-mobile.');
  test.skip(!PEER_SLUG, 'E2E_PEER_SLUG nie je nastavené – test potrebuje druhý testovací účet (pozri .env.e2e.example).');
  await recordMainInstance(page);
  await gotoDashboardHome(page);
});

/** Čisté čítanie zoznamu konverzácií (rovnaké volanie ako pri otvorení Správ) – nič sa neotvára. */
async function requirePeerConversation(page: Page): Promise<PeerConversation> {
  const peer = await page.evaluate(async (slug) => {
    const response = await fetch('/api/auth/messaging/conversations/', { credentials: 'include' });
    if (!response.ok) return null;
    const data = await response.json().catch(() => null);
    const items: Array<{
      id?: number;
      is_group?: boolean;
      other_user?: { slug?: string | null; display_name?: string; is_deleted?: boolean } | null;
    }> = Array.isArray(data) ? data : (data?.results ?? []);
    const match = items.find(
      (item) => !item.is_group && !item.other_user?.is_deleted && item.other_user?.slug === slug,
    );
    const displayName = (match?.other_user?.display_name ?? '').trim();
    return match && typeof match.id === 'number' && displayName ? { id: match.id, displayName } : null;
  }, PEER_SLUG);

  if (!peer) {
    throw new Error(
      'Príprava: v zozname Správ nie je prijatá priama konverzácia s účtom z E2E_PEER_SLUG (alebo ten účet nemá zobrazované meno).',
    );
  }
  return peer;
}

/** Označí viditeľné tlačidlo riadku s daným menom; označí len pri presne jednej zhode. Vráti počet zhôd. */
async function tagPeerRow(page: Page, displayName: string): Promise<number> {
  return page.evaluate((name) => {
    const attribute = 'data-e2e-peer-row';
    document.querySelectorAll(`[${attribute}]`).forEach((element) => element.removeAttribute(attribute));
    const matches = Array.from(document.querySelectorAll('button')).filter(
      (button) =>
        button.getClientRects().length > 0 &&
        Array.from(button.querySelectorAll('*')).some(
          (element) => element.children.length === 0 && (element.textContent ?? '').trim() === name,
        ),
    );
    if (matches.length === 1) matches[0].setAttribute(attribute, '');
    return matches.length;
  }, displayName);
}

async function openPeerConversation(page: Page, peer: PeerConversation): Promise<void> {
  await bottomNav(page, 'Správy').tap();
  await expect.poll(() => pathOf(page), { message: 'Správy: nesprávna adresa' }).toBe('/dashboard/messages');
  await expect(visiblePlaceholder(page, LIST_SEARCH)).toBeVisible();

  await expect
    .poll(() => tagPeerRow(page, peer.displayName), {
      message: 'V zozname Správ nie je presne jedna konverzácia s druhým testovacím účtom',
    })
    .toBe(1);
  await page.locator('[data-e2e-peer-row]').tap();

  await expect.poll(() => pathOf(page), { message: 'Konverzácia: nesprávna adresa' }).toBe('/dashboard/messages');
  await expect
    .poll(() => searchOf(page), { message: 'Konverzácia: v adrese nie je ID otvorenej konverzácie' })
    .toBe(`?conversationId=${peer.id}`);
}

/** Konverzácia je otvorená: vo vrchnej lište je meno druhého účtu (porovnanie bez vypisovania mena) a vlákno správ. */
async function expectConversationOpen(page: Page, peer: PeerConversation, label: string): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(
          (selector) => document.querySelector(selector)?.textContent?.trim() ?? '',
          `${PEER_HEADER} h1`,
        ).then((name) => name === peer.displayName),
      { message: `${label}: hlavička konverzácie nezobrazuje meno druhého testovacieho účtu` },
    )
    .toBe(true);
  await expect(page.locator(PEER_HEADER), `${label}: hlavička konverzácie nie je klikateľná`).toBeEnabled();
  await expect(page.getByTestId('conversation-messages-scroll'), `${label}: vlákno správ sa nevykreslilo`).toBeVisible();
}

function isPeerProfilePath(page: Page): boolean {
  try {
    return decodeURIComponent(pathOf(page)) === `/dashboard/users/${PEER_SLUG}`;
  } catch {
    return false;
  }
}

test('opening a conversation shows the peer name in the top bar, Späť returns to the list, a cold load restores it', async ({
  page,
}) => {
  const peer = await requirePeerConversation(page);
  await openPeerConversation(page, peer);
  await expectConversationOpen(page, peer, 'Otvorenie konverzácie');

  await topBarBack(page).tap();
  await expect
    .poll(() => pathOf(page) + searchOf(page), { message: 'Späť z konverzácie: nevrátilo na zoznam Správ' })
    .toBe('/dashboard/messages');
  await expect(visiblePlaceholder(page, LIST_SEARCH)).toBeVisible();
  await expect(page.locator(PEER_HEADER), 'Späť z konverzácie: hlavička konverzácie ostala').toHaveCount(0);

  await page.goto(`/dashboard/messages?conversationId=${peer.id}`);
  await expectConversationOpen(page, peer, 'Priame otvorenie adresy konverzácie');
});

test('the top bar of a conversation opens the peer profile, Späť and the browser Back return to the same conversation', async ({
  page,
}) => {
  const peer = await requirePeerConversation(page);
  await openPeerConversation(page, peer);
  await expectConversationOpen(page, peer, 'Otvorenie konverzácie');

  const openProfile = async (label: string) => {
    const before = await mainInstance(page);
    await page.locator(PEER_HEADER).tap();
    await expect
      .poll(() => isPeerProfilePath(page), { message: `${label}: adresa nie je profil druhého testovacieho účtu` })
      .toBe(true);
    await expect(
      page.getByRole('tablist', { name: 'Sekcie profilu' }),
      `${label}: profil sa nevykreslil`,
    ).toBeVisible();
    await expectNewMain(page, before, label);
  };
  const backToConversation = async (label: string, act: () => Promise<unknown>) => {
    const before = await mainInstance(page);
    await act();
    await expect
      .poll(() => pathOf(page) + searchOf(page), { message: `${label}: nevrátilo do konverzácie` })
      .toBe(`/dashboard/messages?conversationId=${peer.id}`);
    await expectConversationOpen(page, peer, label);
    await expectNewMain(page, before, label);
  };

  await openProfile('Hlavička konverzácie');
  await backToConversation('Späť v hornej lište', () => topBarBack(page).tap());

  await openProfile('Hlavička konverzácie (druhýkrát)');
  await backToConversation('Späť prehliadača', () => page.goBack());
});
