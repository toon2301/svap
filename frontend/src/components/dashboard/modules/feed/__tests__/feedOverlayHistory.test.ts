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
  adoptFeedOverlayHistory,
  forgetFeedOverlayHistory,
  isFeedOverlayHistoryBusy,
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

describe('komu patrí cesta príspevku', () => {
  it('keeps the path owned while the step back is still running', async () => {
    pushFeedOverlayHistory('/dashboard/feed/7');
    expect(isFeedOverlayHistoryBusy()).toBe(true);

    popFeedOverlayHistory();

    // Toto je jadro chyby: krok späť ešte nedobehol, takže appka VIDÍ cestu
    // príspevku, hoci okno je už zavreté. Keby si ju v tej chvíli privlastnila,
    // otvorí pod zavretým oknom celoobrazovkovú stránku – a tá po dobehnutí
    // kroku ostane bez identifikátora, čiže ohlási nedostupný príspevok.
    expect(window.location.pathname).toBe('/dashboard/feed/7');
    expect(isFeedOverlayHistoryBusy()).toBe(true);

    await flushHistory();

    // Až keď je adresa naozaj späť, prestáva cesta patriť oknu.
    expect(window.location.pathname).toBe('/dashboard');
    expect(isFeedOverlayHistoryBusy()).toBe(false);
  });

  it('releases the path when the user steps back themselves', async () => {
    pushFeedOverlayHistory('/dashboard/feed/7');

    // Používateľ dal „späť" pri otvorenom okne – appka to zaznamená.
    forgetFeedOverlayHistory();

    expect(isFeedOverlayHistoryBusy()).toBe(false);
  });

  it('does not own anything without an open window', () => {
    // Priamy vstup na permalink: cesta patrí celoobrazovkovej stránke.
    expect(isFeedOverlayHistoryBusy()).toBe(false);
  });

  it('stays released after repeated opening and closing', async () => {
    for (let round = 0; round < 3; round += 1) {
      pushFeedOverlayHistory('/dashboard/feed/7');
      popFeedOverlayHistory();
      // eslint-disable-next-line no-await-in-loop
      await flushHistory();
      expect(isFeedOverlayHistoryBusy()).toBe(false);
    }
  });
});

describe('okno otvorené priamym vstupom', () => {
  beforeEach(() => {
    // Chladný vstup: prehliadač otvoril rovno adresu príspevku.
    window.history.replaceState(null, '', '/dashboard/feed/7');
  });

  it('adds no history entry – the address is already there', () => {
    adoptFeedOverlayHistory();

    expect(window.location.pathname).toBe('/dashboard/feed/7');
    expect(isFeedOverlayHistoryBusy()).toBe(false);
  });

  it('leaves the user on the feed when the window closes', async () => {
    adoptFeedOverlayHistory();

    popFeedOverlayHistory();
    await flushHistory();

    // Predošlý stav appky neexistuje, takže sa niet kam vracať – adresa sa
    // zrovná s tým, čo používateľ vidí pod oknom.
    expect(window.location.pathname).toBe('/dashboard');
  });

  it('does not step back out of the app', async () => {
    // Krok späť by pri chladnom vstupe viedol MIMO appky (predošlá stránka
    // prehliadača), preto sa tu adresa nahrádza, nie odvíja.
    const before = window.history.length;
    adoptFeedOverlayHistory();

    popFeedOverlayHistory();
    await flushHistory();

    expect(window.history.length).toBe(before);
    expect(window.location.pathname).toBe('/dashboard');
  });
});

it('does nothing when the window was never opened', async () => {
  popFeedOverlayHistory();
  await flushHistory();

  expect(window.location.pathname).toBe('/dashboard');
});
