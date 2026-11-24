/**
 * Repost s fotkou v ľavom stĺpci dvojstĺpcového okna (`fillHeight`): K58, krok 2, nález 366.
 *
 * Pružné zmenšovanie funguje len medzi priamymi súrodencami jedného flex stĺpca. Obal karty a rám zdieľaného
 * príspevku sú vnorené kontajnery, ktorých minimum je celý obsah, takže pri reposte s fotkou sa rozpustia
 * (`display: contents`): text zdieľajúceho (v bloku), meno pôvodného autora, pôvodný text a plocha fotky sú súrodenci
 * v bloku a plocha fotky (najmenej 128 px) aj texty ustupujú. Bez fotky, so zlyhaným náhľadom a bez `fillHeight` je
 * všetko ako predtým; ponuka a portfólio majú vnorenú kartu ako v K57.
 *
 * jsdom nelayoutuje, takže sa kontrolujú triedy, ktoré o rozložení rozhodujú; výšky v pixeloch ukazuje prehliadač.
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
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

const REPOST: SharedContentCard = {
  type: 'feed_post',
  title: '',
  caption: 'Pôvodný text príspevku, ktorý presahuje tri riadky.',
  thumbnailUrl: FOTKA,
  owner: { displayName: 'Peter', avatarUrl: null },
};

const PONUKA: SharedContentCard = {
  type: 'offer',
  title: 'Programovanie',
  thumbnailUrl: FOTKA,
  isSeeking: false,
  price: { price_from: '25', price_currency: '€' },
  owner: { displayName: 'Peter', avatarUrl: null },
};

const PORTFOLIO: SharedContentCard = {
  type: 'portfolio_item',
  title: 'Weby',
  thumbnailUrl: FOTKA,
  owner: { displayName: 'Peter', avatarUrl: null },
};

/** Zbalený pôvodný text presahuje, rozbalený sa zmestí. */
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
  // Výšky sú nastavené na prototype – bez upratania by pretiekli inam.
  Reflect.deleteProperty(HTMLParagraphElement.prototype, 'clientHeight');
  Reflect.deleteProperty(HTMLParagraphElement.prototype, 'scrollHeight');
});

describe('repost s fotkou a fillHeight', () => {
  it('obal karty aj rám príspevku sú `contents`', () => {
    render(<SharedContentPreviewCard data={REPOST} fillHeight />);

    expect(screen.getByTestId('feed-shared-card')).toHaveClass('contents');
    expect(screen.getByTestId('feed-shared-card')).not.toHaveClass('flex-col');
    const ram = screen.getByTestId('feed-shared-post-preview');
    expect(ram).toHaveClass('contents');
    expect(ram).not.toHaveClass('space-y-2');
  });

  it('plocha fotky je pružná a nezmenší sa pod 128 px, obsah vypĺňa rám absolútne', () => {
    render(<SharedContentPreviewCard data={REPOST} fillHeight />);

    const plocha = screen.getByTestId('feed-shared-card-media');
    expect(plocha).toHaveClass('min-h-32', 'flex-1');
    expect(plocha).not.toHaveClass('h-64');
    expect(plocha.firstElementChild).toHaveClass('absolute', 'inset-0');
  });

  it('riadok s menom pôvodného autora nemá `mb-2` (medzeru dáva `gap-3` bloku)', () => {
    render(<SharedContentPreviewCard data={REPOST} fillHeight />);

    const meno = screen.getByTestId('feed-shared-card-owner');
    expect(meno).toHaveClass('flex', 'items-center', 'gap-2');
    expect(meno).not.toHaveClass('mb-2');
    expect(meno).toHaveTextContent('Peter');
  });

  it('meno, pôvodný text a plocha fotky idú v obale karty v tomto poradí', () => {
    render(<SharedContentPreviewCard data={REPOST} fillHeight />);

    const obal = screen.getByTestId('feed-shared-card');
    const meno = screen.getByTestId('feed-shared-card-owner');
    const text = screen.getByTestId('feed-shared-caption');
    const plocha = screen.getByTestId('feed-shared-card-media');
    expect(obal.contains(meno) && obal.contains(text) && obal.contains(plocha)).toBe(true);
    expect(meno.compareDocumentPosition(text)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(text.compareDocumentPosition(plocha)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('zbalený pôvodný text má tri riadky', () => {
    nastavVysky();
    render(<SharedContentPreviewCard data={REPOST} fillHeight />);

    expect(screen.getByTestId('feed-shared-caption')).toHaveClass('line-clamp-3');
  });

  it('rozbalený pôvodný text je pružný: `min-h-0 flex-1`, vlastné posúvanie, koreň s podlahou', async () => {
    nastavVysky();
    render(<SharedContentPreviewCard data={REPOST} fillHeight />);

    await userEvent.click(await screen.findByTestId('feed-shared-caption-toggle'));

    const text = screen.getByTestId('feed-shared-caption');
    expect(text).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto', 'subtle-scrollbar');
    expect(text).toHaveAttribute('role', 'region');
    expect(text.className).not.toMatch(/max-h-/);
    expect(text.parentElement).toHaveClass('flex', 'flex-col', 'min-h-[8.6rem]');
    expect(screen.getByTestId('feed-shared-caption-toggle')).toHaveClass('shrink-0', 'self-start');
  });

  it('ťuk na fotku otvára fotoprehliadač pôvodného príspevku', async () => {
    const otvorFotku = jest.fn();
    render(<SharedContentPreviewCard data={REPOST} fillHeight onOpenPostPhoto={otvorFotku} />);

    const plocha = screen.getByTestId('feed-shared-card-media');
    await userEvent.click(within(plocha).getByTestId('feed-shared-post-photo'));

    expect(otvorFotku).toHaveBeenCalledTimes(1);
    expect(plocha.firstElementChild).toHaveClass('absolute', 'inset-0');
  });
});

describe('repost bez fotky, so zlyhaným náhľadom a bez fillHeight', () => {
  it('bez fotky nie je plocha, obal karty je bez tried a rám je `space-y-2`', () => {
    render(<SharedContentPreviewCard data={{ ...REPOST, thumbnailUrl: null }} fillHeight />);

    expect(screen.queryByTestId('feed-shared-card-media')).toBeNull();
    expect(screen.getByTestId('feed-shared-card')).not.toHaveAttribute('class');
    const ram = screen.getByTestId('feed-shared-post-preview');
    expect(ram).toHaveClass('space-y-2');
    expect(ram).not.toHaveClass('contents');
    expect(screen.getByTestId('feed-shared-card-owner')).toHaveClass('mb-2');
  });

  it('bez fotky je pôvodný text po rozbalení bez `fillParent`', async () => {
    nastavVysky();
    render(<SharedContentPreviewCard data={{ ...REPOST, thumbnailUrl: null }} fillHeight />);

    await userEvent.click(await screen.findByTestId('feed-shared-caption-toggle'));

    const text = screen.getByTestId('feed-shared-caption');
    expect(text).not.toHaveClass('min-h-0');
    expect(text).not.toHaveClass('flex-1');
    expect(text).not.toHaveClass('overflow-y-auto');
    expect(text.parentElement).not.toHaveAttribute('class');
  });

  it('keď sa fotka nenačíta, plocha zmizne a obal sa vráti do `space-y-2`', () => {
    const { container } = render(<SharedContentPreviewCard data={REPOST} fillHeight />);
    expect(screen.getByTestId('feed-shared-card')).toHaveClass('contents');

    container.querySelectorAll('img').forEach((obrazok) => fireEvent.error(obrazok));

    expect(screen.queryByTestId('feed-shared-card-media')).toBeNull();
    expect(screen.getByTestId('feed-shared-card')).not.toHaveAttribute('class');
    expect(screen.getByTestId('feed-shared-post-preview')).toHaveClass('space-y-2');
    expect(screen.getByTestId('feed-shared-card-owner')).toHaveClass('mb-2');
  });

  it('bez fillHeight má plocha 256 px, obal karty je bez tried a rám je `space-y-2`', () => {
    render(<SharedContentPreviewCard data={REPOST} />);

    const plocha = screen.getByTestId('feed-shared-card-media');
    expect(plocha).toHaveClass('h-64');
    expect(plocha).not.toHaveClass('flex-1');
    expect(plocha.firstElementChild).not.toHaveClass('absolute');
    expect(screen.getByTestId('feed-shared-card')).not.toHaveAttribute('class');
    expect(screen.getByTestId('feed-shared-post-preview')).toHaveClass('space-y-2');
    expect(screen.getByTestId('feed-shared-card-owner')).toHaveClass('mb-2');
  });

  it('bez fillHeight je pôvodný text po rozbalení bez `fillParent`', async () => {
    nastavVysky();
    render(<SharedContentPreviewCard data={REPOST} />);

    await userEvent.click(await screen.findByTestId('feed-shared-caption-toggle'));

    const text = screen.getByTestId('feed-shared-caption');
    expect(text).not.toHaveClass('flex-1');
    expect(text).not.toHaveClass('overflow-y-auto');
    expect(text.parentElement).not.toHaveAttribute('class');
  });

  it('nedostupný zdroj bez fotky ostáva stlmený a bez zmeny rozloženia', () => {
    render(
      <SharedContentPreviewCard
        data={{ ...REPOST, thumbnailUrl: null, unavailable: true, caption: '' }}
        fillHeight
      />,
    );

    expect(screen.getByTestId('feed-shared-card')).not.toHaveAttribute('class');
    const ram = screen.getByTestId('feed-shared-unavailable');
    expect(ram).toHaveClass('space-y-2', 'opacity-60');
    expect(ram).not.toHaveClass('contents');
  });
});

describe('ponuka a portfólio s fillHeight (bez zmeny oproti K57)', () => {
  it.each<[string, SharedContentCard]>([
    ['ponuka', PONUKA],
    ['portfólio', PORTFOLIO],
  ])('%s: karta ostáva vnorená, nie `contents`, a meno má `mb-2`', (_nazov, data) => {
    render(<SharedContentPreviewCard data={data} fillHeight />);

    const obal = screen.getByTestId('feed-shared-card');
    expect(obal).toHaveClass('flex', 'flex-1', 'flex-col');
    expect(obal).not.toHaveClass('contents');
    expect(screen.getByTestId('feed-shared-card-owner')).toHaveClass('mb-2');
    const plocha = screen.getByTestId('feed-shared-card-media');
    expect(plocha).toHaveClass('min-h-32', 'flex-1');
    expect(plocha).not.toHaveClass('h-64');
    const ram = screen.getByTestId('feed-shared-compact-preview');
    expect(ram).toHaveClass('flex', 'flex-1', 'flex-col');
    expect(ram).not.toHaveClass('contents');
  });

  it.each<[string, SharedContentCard]>([
    ['ponuka', PONUKA],
    ['portfólio', PORTFOLIO],
  ])('%s: popis, ak by prišiel, ostáva obyčajný odsek bez `fillParent`', async (_nazov, data) => {
    nastavVysky();
    render(
      <SharedContentPreviewCard
        data={{ ...data, caption: 'Popis, ktorý presahuje tri riadky.' }}
        fillHeight
      />,
    );

    await userEvent.click(await screen.findByTestId('feed-shared-caption-toggle'));

    const text = screen.getByTestId('feed-shared-caption');
    expect(text).not.toHaveClass('min-h-0');
    expect(text).not.toHaveClass('flex-1');
    expect(text).not.toHaveClass('overflow-y-auto');
    expect(text.parentElement).not.toHaveAttribute('class');
  });
});
