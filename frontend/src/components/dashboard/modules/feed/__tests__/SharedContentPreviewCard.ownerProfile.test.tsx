/**
 * Riadok pôvodného autora nad kartou zdieľaného obsahu otvára jeho profil (nález 362, dávka K59).
 *
 * Avatar a meno pôvodného autora (repost, zdieľaná ponuka a portfólio) boli obyčajný `div`, takže sa po kliknutí nič
 * nestalo. Riadok má byť jeden ovládací prvok, ktorý otvorí profil, keď:
 *  - volajúci zadal `onOpenOwner`,
 *  - vlastník má id alebo adresu profilu (dáta z feed API; v dialógu zdieľania ich karta nedostane),
 *  - zdroj nie je nedostupný (vtedy backend vlastníka neposiela).
 * Inak ostáva obyčajný `div` ako doteraz. Riadok stojí MIMO tlačidla náhľadu (tlačidlo v tlačidle je neplatné HTML), takže
 * klik naň neotvorí zdroj ani náhľad príspevku. Vzhľad sa nemení: rovnaký riadok (`flex items-center gap-2`, `mb-2`),
 * bez podčiarkovania a s triedou `min-h-0`, lebo globálne pravidlo `button` by riadok natiahlo na 36 px.
 *
 * jsdom nemá štýly Tailwindu ani rozloženie, takže sa kontrolujú značky, triedy, atribúty a volania.
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import SharedContentPreviewCard from '../SharedContentPreviewCard';
import type { SharedContentCard, SharedContentCardOwner } from '../sharedContentCard';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_k: string, fallback: string) => fallback,
    locale: 'sk',
  }),
}));

jest.mock('../../shared/useProtectedImage', () => ({
  useProtectedImage: (src: string | null) => ({
    resolvedSrc: src,
    isProtected: false,
    isLoading: false,
    isError: false,
  }),
}));

const VLASTNIK: SharedContentCardOwner = { displayName: 'Peter Malý', avatarUrl: null, id: 21, slug: 'peter' };

function karta(typ: SharedContentCard['type'], prepisy: Partial<SharedContentCard> = {}): SharedContentCard {
  const zaklad: Record<SharedContentCard['type'], SharedContentCard> = {
    feed_post: { type: 'feed_post', caption: 'Pôvodný text príspevku', owner: VLASTNIK },
    offer: {
      type: 'offer',
      title: 'Programovanie',
      isSeeking: false,
      price: { price_from: '25', price_currency: '€' },
      owner: VLASTNIK,
    },
    portfolio_item: { type: 'portfolio_item', title: 'Weby', owner: VLASTNIK },
  };
  return { ...zaklad[typ], ...prepisy };
}

const KARTY: Array<[string, SharedContentCard['type']]> = [
  ['repost príspevku', 'feed_post'],
  ['zdieľaná ponuka', 'offer'],
  ['zdieľané portfólio', 'portfolio_item'],
];

describe('riadok pôvodného autora je tlačidlo, keď sa dá otvoriť profil', () => {
  it.each(KARTY)('%s: riadok je tlačidlo a klik na meno zavolá `onOpenOwner` raz', async (_popis, typ) => {
    const otvorVlastnika = jest.fn();
    render(<SharedContentPreviewCard data={karta(typ)} onOpenOwner={otvorVlastnika} />);

    const riadok = screen.getByTestId('feed-shared-card-owner');
    expect(riadok.tagName).toBe('BUTTON');
    expect(riadok).toHaveAttribute('type', 'button');

    await userEvent.click(within(riadok).getByText('Peter Malý'));

    expect(otvorVlastnika).toHaveBeenCalledTimes(1);
  });

  it.each(KARTY)('%s: klik na avatar (iniciály) zavolá `onOpenOwner` raz', async (_popis, typ) => {
    const otvorVlastnika = jest.fn();
    render(<SharedContentPreviewCard data={karta(typ)} onOpenOwner={otvorVlastnika} />);

    await userEvent.click(screen.getByText('PM'));

    expect(otvorVlastnika).toHaveBeenCalledTimes(1);
  });

  it('klik na avatar s fotkou zavolá `onOpenOwner` raz', async () => {
    const otvorVlastnika = jest.fn();
    render(
      <SharedContentPreviewCard
        data={karta('feed_post', { owner: { ...VLASTNIK, avatarUrl: 'http://api.test/peter.webp' } })}
        onOpenOwner={otvorVlastnika}
      />,
    );

    await userEvent.click(within(screen.getByTestId('feed-shared-card-owner')).getByRole('img'));

    expect(otvorVlastnika).toHaveBeenCalledTimes(1);
  });

  it.each(KARTY)('%s: klik na riadok neotvorí zdroj ani náhľad príspevku', async (_popis, typ) => {
    const otvorZdroj = jest.fn();
    const otvorNahlad = jest.fn();
    render(
      <SharedContentPreviewCard
        data={karta(typ)}
        onOpenOwner={jest.fn()}
        onOpenSource={otvorZdroj}
        onOpenPostPreview={otvorNahlad}
      />,
    );

    await userEvent.click(screen.getByText('Peter Malý'));

    expect(otvorZdroj).not.toHaveBeenCalled();
    expect(otvorNahlad).not.toHaveBeenCalled();
  });

  it.each(KARTY)('%s: riadok stojí mimo tlačidla náhľadu, takže tlačidlo nie je v tlačidle', (_popis, typ) => {
    render(
      <SharedContentPreviewCard
        data={karta(typ)}
        onOpenOwner={jest.fn()}
        onOpenSource={jest.fn()}
        onOpenPostPreview={jest.fn()}
      />,
    );

    const riadok = screen.getByTestId('feed-shared-card-owner');
    const nahlad = screen.queryByTestId('feed-shared-compact-preview') ?? screen.getByTestId('feed-shared-post-preview');
    expect(nahlad.contains(riadok)).toBe(false);
    expect(riadok.querySelector('button')).toBeNull();
    // Stojí NAD náhľadom, rovnako ako doteraz.
    expect(riadok.compareDocumentPosition(nahlad)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('riadok nemá žiadnu triedu s podčiarkovaním (ani vnútri) a drží výšku pôvodného riadka', () => {
    render(<SharedContentPreviewCard data={karta('feed_post')} onOpenOwner={jest.fn()} />);

    const riadok = screen.getByTestId('feed-shared-card-owner');
    const triedy = [riadok, ...Array.from(riadok.querySelectorAll('*'))]
      .flatMap((uzol) => (uzol.getAttribute('class') ?? '').split(/\s+/))
      .filter(Boolean);
    expect(triedy.filter((trieda) => trieda.includes('underline'))).toEqual([]);
    // Globálne pravidlo `button { min-height: 36px }` by riadok natiahlo: `min-h-0` ho vráti na výšku avatara.
    expect(riadok).toHaveClass('min-h-0', 'flex', 'items-center', 'gap-2', 'mb-2', 'text-left');
  });

  it('obsah riadka ostáva ako doteraz: avatar a meno s orezaním dlhého mena', () => {
    render(<SharedContentPreviewCard data={karta('feed_post')} onOpenOwner={jest.fn()} />);

    const riadok = screen.getByTestId('feed-shared-card-owner');
    expect(within(riadok).getByText('PM')).toBeInTheDocument();
    expect(within(riadok).getByText('Peter Malý')).toHaveClass(
      'truncate',
      'text-sm',
      'font-semibold',
      'text-gray-900',
      'dark:text-white',
    );
    // Dlhé meno sa musí orezať v tlačidle, nie pretiecť mimo kartu.
    expect(riadok).toHaveClass('max-w-full');
  });

  it('tlačidlo má prstenec fokusu a prístupný názov s menom vlastníka', () => {
    render(<SharedContentPreviewCard data={karta('feed_post')} onOpenOwner={jest.fn()} />);

    const riadok = screen.getByRole('button', { name: 'Otvoriť profil: Peter Malý' });
    expect(riadok).toBe(screen.getByTestId('feed-shared-card-owner'));
    expect(riadok).toHaveClass('focus:outline-none', 'focus-visible:ring-2', 'focus-visible:ring-purple-400/60');
  });

  it('Enter na tlačidle s fokusom otvorí profil', async () => {
    const otvorVlastnika = jest.fn();
    render(<SharedContentPreviewCard data={karta('feed_post')} onOpenOwner={otvorVlastnika} />);

    screen.getByTestId('feed-shared-card-owner').focus();
    await userEvent.keyboard('{Enter}');

    expect(otvorVlastnika).toHaveBeenCalledTimes(1);
  });

  it('repost s fotkou v pružnom stĺpci okna: riadok je tlačidlo bez `mb-2` ako doteraz', () => {
    render(
      <SharedContentPreviewCard
        data={karta('feed_post', { thumbnailUrl: 'http://api.test/foto.webp' })}
        onOpenOwner={jest.fn()}
        fillHeight
      />,
    );

    const riadok = screen.getByTestId('feed-shared-card-owner');
    expect(riadok.tagName).toBe('BUTTON');
    expect(riadok).not.toHaveClass('mb-2');
    expect(riadok).toHaveClass('min-h-0', 'flex', 'items-center', 'gap-2');
  });

  it.each([
    ['len adresa profilu', { displayName: 'Peter Malý', avatarUrl: null, slug: 'peter' }],
    ['len id', { displayName: 'Peter Malý', avatarUrl: null, id: 21 }],
    ['id a adresa `null`', { displayName: 'Peter Malý', avatarUrl: null, id: 21, slug: null }],
  ])('vlastník: %s stačí na tlačidlo', (_popis, vlastnik) => {
    render(<SharedContentPreviewCard data={karta('feed_post', { owner: vlastnik })} onOpenOwner={jest.fn()} />);

    expect(screen.getByTestId('feed-shared-card-owner').tagName).toBe('BUTTON');
  });
});

describe('riadok pôvodného autora ostáva obyčajný `div` bez prekliku', () => {
  it.each(KARTY)('%s: bez `onOpenOwner` (napríklad náhľad v dialógu zdieľania)', async (_popis, typ) => {
    const otvorZdroj = jest.fn();
    render(<SharedContentPreviewCard data={karta(typ)} onOpenSource={otvorZdroj} />);

    const riadok = screen.getByTestId('feed-shared-card-owner');
    expect(riadok.tagName).toBe('DIV');
    expect(riadok.querySelector('button')).toBeNull();
    expect(riadok).toHaveTextContent('Peter Malý');
    expect(riadok).toHaveClass('flex', 'items-center', 'gap-2', 'mb-2');
    expect(riadok).not.toHaveClass('min-h-0');

    await userEvent.click(screen.getByText('Peter Malý'));
    expect(otvorZdroj).not.toHaveBeenCalled();
  });

  it.each([
    ['len meno (bez id aj adresy profilu)', { displayName: 'Peter Malý', avatarUrl: null }],
    ['id 0 a prázdna adresa', { displayName: 'Peter Malý', avatarUrl: null, id: 0, slug: '' }],
    ['adresa z medzier a bez id', { displayName: 'Peter Malý', avatarUrl: null, slug: '   ' }],
  ])('vlastník: %s, aj keď je `onOpenOwner` zadané', async (_popis, vlastnik) => {
    const otvorVlastnika = jest.fn();
    render(<SharedContentPreviewCard data={karta('feed_post', { owner: vlastnik })} onOpenOwner={otvorVlastnika} />);

    const riadok = screen.getByTestId('feed-shared-card-owner');
    expect(riadok.tagName).toBe('DIV');

    await userEvent.click(screen.getByText('Peter Malý'));
    expect(otvorVlastnika).not.toHaveBeenCalled();
  });

  it.each(KARTY)('%s: nedostupný zdroj ostáva bez prekliku, aj keď dáta nesú id a adresu', async (_popis, typ) => {
    const otvorVlastnika = jest.fn();
    render(
      <SharedContentPreviewCard data={karta(typ, { unavailable: true })} onOpenOwner={otvorVlastnika} />,
    );

    const riadok = screen.getByTestId('feed-shared-card-owner');
    expect(riadok.tagName).toBe('DIV');
    expect(riadok).toHaveTextContent('Peter Malý');

    await userEvent.click(screen.getByText('Peter Malý'));
    expect(otvorVlastnika).not.toHaveBeenCalled();
  });

  it.each(KARTY)('%s: pri `hideOwner` sa riadok nekreslí vôbec', (_popis, typ) => {
    render(<SharedContentPreviewCard data={karta(typ)} onOpenOwner={jest.fn()} hideOwner />);

    expect(screen.queryByTestId('feed-shared-card-owner')).toBeNull();
  });

  it('bez vlastníka v dátach sa riadok nekreslí', () => {
    render(<SharedContentPreviewCard data={karta('offer', { owner: null })} onOpenOwner={jest.fn()} />);

    expect(screen.queryByTestId('feed-shared-card-owner')).toBeNull();
  });
});
