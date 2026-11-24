/**
 * Text pôvodného príspevku v zdieľanom príspevku (reposte), K58, krok 1, nález 357.
 *
 * Text má rovnaké „Viac“ a „Menej“ ako text karty: tri riadky, „Viac“ len pri presahu. Obal s prekliknutím na pôvodný
 * príspevok je len okolo ODSEKU; prepínač stojí mimo neho, lebo tlačidlo v tlačidle je neplatné HTML a ťuk na „Viac“
 * nemá nič otvárať. Ponuka a portfólio posielajú text prázdny, ich karta sa nemení.
 *
 * jsdom nelayoutuje, takže „presahuje text tri riadky?“ sa nastavuje na uzle (`scrollHeight` proti `clientHeight`).
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import SharedContentPreviewCard from '../SharedContentPreviewCard';
import type { SharedContentCard } from '../sharedContentCard';

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

const FOTKA = 'https://cdn.example.com/media/feed/1/x.webp';
const DLHY_TEXT = 'Pôvodný text príspevku, ktorý presahuje tri riadky.';

const REPOST: SharedContentCard = {
  type: 'feed_post',
  title: '',
  caption: DLHY_TEXT,
  thumbnailUrl: null,
};

/** Zbalený odsek presahuje, rozbalený sa zmestí. Bez `presahuje` sa zmestí aj zbalený. */
function nastavVysky({ presahuje }: { presahuje: boolean }) {
  Object.defineProperty(HTMLParagraphElement.prototype, 'clientHeight', {
    configurable: true,
    get() {
      return this.dataset.testid === 'feed-shared-caption' ? 60 : 0;
    },
  });
  Object.defineProperty(HTMLParagraphElement.prototype, 'scrollHeight', {
    configurable: true,
    get() {
      if (this.dataset.testid !== 'feed-shared-caption') return 0;
      return presahuje && this.className.includes('line-clamp') ? 900 : 60;
    },
  });
}

afterEach(() => {
  // Výšky sú nastavené na prototype – bez upratania by pretiekli inam.
  Reflect.deleteProperty(HTMLParagraphElement.prototype, 'clientHeight');
  Reflect.deleteProperty(HTMLParagraphElement.prototype, 'scrollHeight');
});

describe('text pôvodného príspevku v reposte', () => {
  it('má tri riadky a staré orezanie na štyri riadky zaniklo', () => {
    nastavVysky({ presahuje: true });
    render(<SharedContentPreviewCard data={REPOST} />);

    const text = screen.getByTestId('feed-shared-caption');
    expect(text).toHaveTextContent(DLHY_TEXT);
    expect(text).toHaveClass('line-clamp-3');
    expect(text).not.toHaveClass('line-clamp-4');
  });

  it('pri presahu má „Viac“, po ťuku „Menej“ a po ďalšom ťuku je text zase zbalený', async () => {
    nastavVysky({ presahuje: true });
    render(<SharedContentPreviewCard data={REPOST} />);

    const prepinac = await screen.findByTestId('feed-shared-caption-toggle');
    expect(prepinac).toHaveTextContent('Viac');
    expect(prepinac).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(prepinac);
    expect(screen.getByTestId('feed-shared-caption-toggle')).toHaveTextContent('Menej');
    expect(screen.getByTestId('feed-shared-caption')).not.toHaveClass('line-clamp-3');

    await userEvent.click(screen.getByTestId('feed-shared-caption-toggle'));
    expect(screen.getByTestId('feed-shared-caption-toggle')).toHaveTextContent('Viac');
    expect(screen.getByTestId('feed-shared-caption')).toHaveClass('line-clamp-3');
  });

  it('krátky text, ktorý sa zmestí, prepínač nemá', () => {
    nastavVysky({ presahuje: false });
    render(<SharedContentPreviewCard data={{ ...REPOST, caption: 'Krátky text' }} />);

    expect(screen.getByTestId('feed-shared-caption')).toHaveTextContent('Krátky text');
    expect(screen.queryByTestId('feed-shared-caption-toggle')).toBeNull();
  });

  it('zdieľaný príspevok bez textu nekreslí ani text, ani prepínač', () => {
    nastavVysky({ presahuje: true });
    render(<SharedContentPreviewCard data={{ ...REPOST, caption: '' }} />);

    expect(screen.queryByTestId('feed-shared-caption')).toBeNull();
    expect(screen.queryByTestId('feed-shared-caption-toggle')).toBeNull();
  });

  it('text stojí pred fotkou pôvodného príspevku', () => {
    nastavVysky({ presahuje: true });
    render(<SharedContentPreviewCard data={{ ...REPOST, thumbnailUrl: FOTKA }} />);

    const text = screen.getByTestId('feed-shared-caption');
    const fotka = screen.getByTestId('feed-shared-card-media');
    expect(text.compareDocumentPosition(fotka)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('bez názvu, meta a ceny sa prázdne telo karty nekreslí', () => {
    nastavVysky({ presahuje: true });
    render(<SharedContentPreviewCard data={{ ...REPOST, thumbnailUrl: FOTKA }} />);

    const ram = screen.getByTestId('feed-shared-post-preview');
    expect(ram.querySelector('.space-y-1')).toBeNull();
    expect(ram.firstElementChild).toContainElement(screen.getByTestId('feed-shared-caption'));
  });

  it('text sa zalamuje rovnako ako text karty a zhluk prázdnych riadkov sa scvrkne', () => {
    nastavVysky({ presahuje: false });
    render(
      <SharedContentPreviewCard
        data={{ ...REPOST, caption: 'Prvý odsek\n\n\n\n\nDruhý odsek' }}
      />,
    );

    const text = screen.getByTestId('feed-shared-caption');
    expect(text).toHaveClass('whitespace-pre-wrap', 'break-words');
    expect(text.textContent).toBe('Prvý odsek\nDruhý odsek');
  });
});

describe('ťuk na text reposta', () => {
  it('ťuk na text otvorí pôvodný príspevok', async () => {
    nastavVysky({ presahuje: true });
    const otvor = jest.fn();
    render(<SharedContentPreviewCard data={REPOST} onOpenPostPreview={otvor} />);

    await userEvent.click(screen.getByTestId('feed-shared-caption'));

    expect(otvor).toHaveBeenCalledTimes(1);
  });

  it('ťuk na prepínač nič neotvára a prepínač nie je vnútri tlačidla', async () => {
    nastavVysky({ presahuje: true });
    const otvor = jest.fn();
    render(<SharedContentPreviewCard data={REPOST} onOpenPostPreview={otvor} />);

    const prepinac = await screen.findByTestId('feed-shared-caption-toggle');
    await userEvent.click(prepinac);

    expect(otvor).not.toHaveBeenCalled();
    expect(screen.getByTestId('feed-shared-caption-toggle')).toHaveTextContent('Menej');
    expect(prepinac.closest('[data-testid="feed-shared-post-preview-open"]')).toBeNull();
  });

  it('tlačidlo obaľuje len odsek a neobsahuje iné tlačidlo', async () => {
    nastavVysky({ presahuje: true });
    render(<SharedContentPreviewCard data={REPOST} onOpenPostPreview={jest.fn()} />);

    await screen.findByTestId('feed-shared-caption-toggle');
    const tlacidlo = screen.getByTestId('feed-shared-post-preview-open');
    expect(tlacidlo).toHaveClass('block', 'w-full', 'rounded-lg', 'text-left');
    expect(tlacidlo).toContainElement(screen.getByTestId('feed-shared-caption'));
    expect(tlacidlo).not.toContainElement(screen.getByTestId('feed-shared-caption-toggle'));
    expect(tlacidlo.querySelector('button')).toBeNull();
  });

  it('bez onOpenPostPreview tlačidlo nie je a text je obyčajný odsek', async () => {
    nastavVysky({ presahuje: true });
    render(<SharedContentPreviewCard data={REPOST} />);

    expect(screen.queryByTestId('feed-shared-post-preview-open')).toBeNull();
    const text = screen.getByTestId('feed-shared-caption');
    expect(text.closest('button')).toBeNull();
    // „Viac“ funguje aj bez prekliknutia.
    await userEvent.click(await screen.findByTestId('feed-shared-caption-toggle'));
    expect(screen.getByTestId('feed-shared-caption-toggle')).toHaveTextContent('Menej');
  });

  it('pri nedostupnom zdroji tlačidlo nie je, ani keď je onOpenPostPreview', () => {
    nastavVysky({ presahuje: true });
    render(
      <SharedContentPreviewCard
        data={{ ...REPOST, unavailable: true }}
        onOpenPostPreview={jest.fn()}
      />,
    );

    expect(screen.getByTestId('feed-shared-unavailable')).toBeInTheDocument();
    expect(screen.queryByTestId('feed-shared-post-preview-open')).toBeNull();
    expect(screen.getByText('Tento príspevok už nie je dostupný')).toBeInTheDocument();
    expect(screen.getByTestId('feed-shared-caption').closest('button')).toBeNull();
  });

  it('ťuk na fotku reposta ostáva samostatný cieľ a text neotvára', async () => {
    nastavVysky({ presahuje: true });
    const otvorPrispevok = jest.fn();
    const otvorFotku = jest.fn();
    render(
      <SharedContentPreviewCard
        data={{ ...REPOST, thumbnailUrl: FOTKA }}
        onOpenPostPreview={otvorPrispevok}
        onOpenPostPhoto={otvorFotku}
      />,
    );

    await userEvent.click(screen.getByTestId('feed-shared-post-photo'));

    expect(otvorFotku).toHaveBeenCalledTimes(1);
    expect(otvorPrispevok).not.toHaveBeenCalled();
    expect(
      within(screen.getByTestId('feed-shared-post-preview-open')).queryByTestId(
        'feed-shared-post-photo',
      ),
    ).toBeNull();
  });
});

describe('ponuka a portfólio bez textu', () => {
  const PONUKA: SharedContentCard = {
    type: 'offer',
    title: 'Programovanie',
    thumbnailUrl: FOTKA,
    isSeeking: false,
    price: { price_from: '25', price_currency: '€' },
  };
  const PORTFOLIO: SharedContentCard = {
    type: 'portfolio_item',
    title: 'Weby',
    thumbnailUrl: FOTKA,
  };

  it.each<[string, SharedContentCard]>([
    ['ponuka', PONUKA],
    ['portfólio', PORTFOLIO],
  ])('%s: nekreslí text ani prepínač a ostáva jedna dlaždica s názvom', (_nazov, data) => {
    nastavVysky({ presahuje: true });
    render(<SharedContentPreviewCard data={data} onOpenSource={jest.fn()} />);

    expect(screen.queryByTestId('feed-shared-caption')).toBeNull();
    expect(screen.queryByTestId('feed-shared-caption-toggle')).toBeNull();
    expect(screen.queryByTestId('feed-shared-post-preview-open')).toBeNull();
    const dlazdica = screen.getByTestId('feed-shared-compact-preview');
    expect(dlazdica.tagName).toBe('BUTTON');
    expect(dlazdica).toHaveTextContent(data.title as string);
    expect(dlazdica.querySelector('.space-y-1')).not.toBeNull();
  });

  it.each<[string, SharedContentCard]>([
    ['ponuka', PONUKA],
    ['portfólio', PORTFOLIO],
  ])('%s: obal na prekliknutie na príspevok sa nekreslí, ani keď popis je', (_nazov, data) => {
    nastavVysky({ presahuje: false });
    render(
      <SharedContentPreviewCard
        data={{ ...data, caption: 'Popis' }}
        onOpenSource={jest.fn()}
        onOpenPostPreview={jest.fn()}
      />,
    );

    expect(screen.queryByTestId('feed-shared-post-preview-open')).toBeNull();
  });

  it.each<[string, SharedContentCard]>([
    ['ponuka', PONUKA],
    ['portfólio', PORTFOLIO],
  ])('%s: popis, ak by prišiel, ostáva v tele dlaždice', (_nazov, data) => {
    nastavVysky({ presahuje: false });
    render(<SharedContentPreviewCard data={{ ...data, caption: 'Popis' }} onOpenSource={jest.fn()} />);

    const dlazdica = screen.getByTestId('feed-shared-compact-preview');
    expect(within(dlazdica).getByTestId('feed-shared-caption')).toHaveTextContent('Popis');
  });

  it.each<[string, SharedContentCard]>([
    ['ponuka', PONUKA],
    ['portfólio', PORTFOLIO],
  ])('%s: ťuk na dlaždicu vedie na zdroj', async (_nazov, data) => {
    const otvorZdroj = jest.fn();
    render(<SharedContentPreviewCard data={data} onOpenSource={otvorZdroj} />);

    await userEvent.click(screen.getByTestId('feed-shared-compact-preview'));

    expect(otvorZdroj).toHaveBeenCalledTimes(1);
  });
});
