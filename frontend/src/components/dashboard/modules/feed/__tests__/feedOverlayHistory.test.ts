/**
 * História pri otváraní a zatváraní okna detailu.
 *
 * Otvorenie smie pridať PRESNE JEDEN záznam a bežné zatvorenie (Escape / „X" /
 * klik mimo) ho musí zase ODOBRAŤ. Keby zatvorenie namiesto toho pushlo
 * pôvodnú adresu, história by vyzerala takto:
 *
 *   stránka A → stránka B → /dashboard/feed/7 → stránka B
 *
 * a „späť" po zatvorení okna by používateľa poslalo naspäť DO PRÍSPEVKU
 * namiesto na stránku A. Pri opakovanom otváraní by sa takých krokov navyše
 * nazbieralo toľko, koľko klikov.
 *
 * `history.length` sa zámerne netestuje – v jsdom sa session história medzi
 * testami nevynuluje, takže by číslo hovorilo skôr o poradí testov než o
 * správaní. Testuje sa to, čo používateľ naozaj zažije: kde skončí po
 * stlačení „späť".
 */

import {
  forgetFeedOverlayHistory,
  popFeedOverlayHistory,
  pushFeedOverlayHistory,
  resetFeedOverlayHistory,
} from '../feedOverlayHistory';

/**
 * Krok v histórii nie je okamžitý (ani v prehliadači, ani v jsdom) – vybaví
 * sa až v ďalších kolách slučky, preto sa naň čaká viackrát.
 */
async function flushHistory(): Promise<void> {
  for (let tick = 0; tick < 3; tick += 1) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

/** Stopa, akú má používateľ po bežnom pohybe po appke: A → B. */
function enterAppTrail(): void {
  window.history.replaceState(null, '', '/dashboard/profile');
  window.history.pushState(null, '', '/dashboard');
}

async function pressBrowserBack(): Promise<void> {
  window.history.back();
  await flushHistory();
}

beforeEach(() => {
  resetFeedOverlayHistory();
  enterAppTrail();
});

it('sends the user to the page before the window, not back into the post', async () => {
  pushFeedOverlayHistory('/dashboard/feed/7');
  expect(window.location.pathname).toBe('/dashboard/feed/7');

  popFeedOverlayHistory();
  await flushHistory();
  expect(window.location.pathname).toBe('/dashboard');

  await pressBrowserBack();

  // Jedno stlačenie „späť" = stránka PRED oknom. So záznamom navyše by sa
  // používateľ vrátil na /dashboard/feed/7.
  expect(window.location.pathname).toBe('/dashboard/profile');
});

it('stays balanced across repeated opening and closing', async () => {
  for (let round = 1; round <= 3; round += 1) {
    pushFeedOverlayHistory(`/dashboard/feed/${round}`);
    expect(window.location.pathname).toBe(`/dashboard/feed/${round}`);

    popFeedOverlayHistory();
    // eslint-disable-next-line no-await-in-loop
    await flushHistory();
    expect(window.location.pathname).toBe('/dashboard');
  }

  await pressBrowserBack();

  // Ani po troch otvoreniach nepribudol jediný krok navyše.
  expect(window.location.pathname).toBe('/dashboard/profile');
});

it('does not add a second entry when the window switches posts', async () => {
  pushFeedOverlayHistory('/dashboard/feed/7');
  pushFeedOverlayHistory('/dashboard/feed/9');
  expect(window.location.pathname).toBe('/dashboard/feed/9');

  popFeedOverlayHistory();
  await flushHistory();

  expect(window.location.pathname).toBe('/dashboard');
});

it('does not step back when the entry is already gone', async () => {
  pushFeedOverlayHistory('/dashboard/feed/7');
  // Používateľ dal „späť" sám – záznam okna už neexistuje.
  forgetFeedOverlayHistory();

  popFeedOverlayHistory();
  await flushHistory();

  // Bez tejto poistky by appka odskočila o krok NAVYŠE, teda preč zo stránky,
  // na ktorej používateľ zostal.
  expect(window.location.pathname).toBe('/dashboard/feed/7');
});

it('does nothing when the window was never opened', async () => {
  popFeedOverlayHistory();
  await flushHistory();

  expect(window.location.pathname).toBe('/dashboard');
});
