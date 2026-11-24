/**
 * Popis ponuky a portfólia v dlaždici (PR #326, nález CodeRabbitu ku K58, krok 1).
 *
 * Dlaždica ponuky a portfólia je TLAČIDLO (`feed-shared-compact-preview`, ťuk vedie na zdroj). Popis, ak by prišiel
 * (backend ho pri ponuke a portfóliu posiela prázdny), preto nesmie niesť ďalšie tlačidlo: „Viac“ v tlačidle je neplatné
 * HTML a jeho ťuk by prešiel na dlaždicu a otvoril zdroj namiesto rozbalenia textu. Popis je tu obyčajný odsek so štyrmi
 * riadkami, rovnaký ako pred K58; „Viac“ a „Menej“ má len text pôvodného príspevku v reposte, a to mimo obalu s prekliknutím.
 *
 * jsdom nelayoutuje, takže „presahuje text riadky?“ sa nastavuje na uzle (`scrollHeight` proti `clientHeight`): odsek s
 * orezaním presahuje vždy.
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

const DLHY_POPIS = 'Dlhý popis, ktorý by presahoval tri aj štyri riadky.';

const PONUKA: SharedContentCard = {
  type: 'offer',
  title: 'Programovanie',
  isSeeking: false,
  price: { price_from: '25', price_currency: '€' },
  caption: DLHY_POPIS,
};

const PORTFOLIO: SharedContentCard = {
  type: 'portfolio_item',
  title: 'Weby',
  caption: DLHY_POPIS,
};

/** Odsek s orezaním presahuje, neorezaný sa zmestí. */
function nastavVysky() {
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
      return this.className.includes('line-clamp') ? 900 : 60;
    },
  });
}

afterEach(() => {
  // Výšky sú nastavené na prototype: bez upratania by pretiekli do ďalšieho testu.
  Reflect.deleteProperty(HTMLParagraphElement.prototype, 'clientHeight');
  Reflect.deleteProperty(HTMLParagraphElement.prototype, 'scrollHeight');
});

const DLAZDICE: Array<[string, SharedContentCard]> = [
  ['ponuka', PONUKA],
  ['portfólio', PORTFOLIO],
];

describe('popis ponuky a portfólia v dlaždici, ktorá je tlačidlo', () => {
  it.each(DLAZDICE)('%s: dlhý popis nemá prepínač a v dlaždici nie je žiadne ďalšie tlačidlo', (_nazov, data) => {
    nastavVysky();
    render(<SharedContentPreviewCard data={data} onOpenSource={jest.fn()} />);

    const dlazdica = screen.getByTestId('feed-shared-compact-preview');
    expect(dlazdica.tagName).toBe('BUTTON');
    expect(within(dlazdica).queryByTestId('feed-shared-caption-toggle')).toBeNull();
    expect(dlazdica.querySelectorAll('button')).toHaveLength(0);
  });

  it.each(DLAZDICE)('%s: popis je obyčajný odsek so štyrmi riadkami ako pred K58', (_nazov, data) => {
    nastavVysky();
    render(<SharedContentPreviewCard data={data} onOpenSource={jest.fn()} />);

    const popis = screen.getByTestId('feed-shared-caption');
    expect(popis.tagName).toBe('P');
    expect(popis).toHaveClass(
      'line-clamp-4',
      'whitespace-pre-wrap',
      'break-words',
      'text-sm',
      'text-gray-700',
    );
    expect(popis).toHaveTextContent(DLHY_POPIS);
    expect(screen.getByTestId('feed-shared-compact-preview')).toContainElement(popis);
  });

  it.each(DLAZDICE)('%s: ťuk na popis otvorí zdroj práve raz', async (_nazov, data) => {
    nastavVysky();
    const otvorZdroj = jest.fn();
    render(<SharedContentPreviewCard data={data} onOpenSource={otvorZdroj} />);

    await userEvent.click(screen.getByTestId('feed-shared-caption'));

    expect(otvorZdroj).toHaveBeenCalledTimes(1);
  });

  it.each(DLAZDICE)('%s: krátky popis ostáva v tele dlaždice a dlaždica sa dá otvoriť', async (_nazov, data) => {
    nastavVysky();
    const otvorZdroj = jest.fn();
    render(
      <SharedContentPreviewCard data={{ ...data, caption: 'Krátky popis' }} onOpenSource={otvorZdroj} />,
    );

    const dlazdica = screen.getByTestId('feed-shared-compact-preview');
    expect(within(dlazdica).getByTestId('feed-shared-caption')).toHaveTextContent('Krátky popis');
    await userEvent.click(dlazdica);

    expect(otvorZdroj).toHaveBeenCalledTimes(1);
  });

  it.each(DLAZDICE)('%s bez dostupného zdroja: popis je tiež obyčajný odsek bez prepínača', (_nazov, data) => {
    nastavVysky();
    render(<SharedContentPreviewCard data={{ ...data, unavailable: true }} />);

    const popis = screen.getByTestId('feed-shared-caption');
    expect(popis.tagName).toBe('P');
    expect(popis).toHaveClass('line-clamp-4');
    expect(screen.queryByTestId('feed-shared-caption-toggle')).toBeNull();
  });
});

describe('text pôvodného príspevku v reposte ostáva s prepínačom', () => {
  it('má 3 riadky a „Viac“ mimo akéhokoľvek tlačidla s prekliknutím', async () => {
    nastavVysky();
    const otvorNahlad = jest.fn();
    render(
      <SharedContentPreviewCard
        data={{ type: 'feed_post', caption: DLHY_POPIS, owner: { displayName: 'Peter' } }}
        onOpenPostPreview={otvorNahlad}
      />,
    );

    expect(screen.getByTestId('feed-shared-caption')).toHaveClass('line-clamp-3');
    const prepinac = await screen.findByTestId('feed-shared-caption-toggle');
    expect(prepinac).toHaveTextContent('Viac');
    expect(screen.getByTestId('feed-shared-post-preview-open')).not.toContainElement(prepinac);

    await userEvent.click(prepinac);

    expect(otvorNahlad).not.toHaveBeenCalled();
  });
});
