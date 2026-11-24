/**
 * Pôvodný text reposta v okne príspevku len s textom (K58, krok 3, R73).
 *
 * V ľavom stĺpci okna len s textom sa aj pôvodný text zdieľaného príspevku ukáže celý (bez orezania a bez „Viac“).
 * Inde (karta vo feede, dialóg zdieľania, okno s fotkou, jednostĺpcové okno) ostáva 3 riadky s „Viac“ a „Menej“.
 *
 * jsdom nelayoutuje, takže „presahuje text riadky?“ sa nastavuje na uzle (`scrollHeight` proti `clientHeight`).
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SharedContentPreviewCard from '../SharedContentPreviewCard';
import { FeedDetailTextOnlyProvider } from '../FeedDetailTextOnlyContext';
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

const DLHY_TEXT = 'Pôvodný text príspevku, ktorý presahuje tri riadky.';

const REPOST_TEXTU: SharedContentCard = {
  type: 'feed_post',
  title: '',
  caption: DLHY_TEXT,
  thumbnailUrl: null,
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

describe('pôvodný text reposta v okne len s textom', () => {
  it('je celý: bez orezania a bez „Viac“, aj keď by presahoval', () => {
    nastavVysky();
    render(
      <FeedDetailTextOnlyProvider value>
        <SharedContentPreviewCard data={REPOST_TEXTU} fillHeight />
      </FeedDetailTextOnlyProvider>,
    );

    const text = screen.getByTestId('feed-shared-caption');
    expect(text.className).not.toContain('line-clamp');
    expect(text).toHaveTextContent(DLHY_TEXT);
    expect(screen.queryByTestId('feed-shared-caption-toggle')).toBeNull();
  });

  it('nie je pružný: bez `fillParent`, rám ostáva `space-y-2` a obal karty bez tried', () => {
    render(
      <FeedDetailTextOnlyProvider value>
        <SharedContentPreviewCard data={REPOST_TEXTU} fillHeight />
      </FeedDetailTextOnlyProvider>,
    );

    const text = screen.getByTestId('feed-shared-caption');
    expect(text).not.toHaveClass('flex-1');
    expect(text.parentElement).not.toHaveAttribute('class');
    expect(screen.getByTestId('feed-shared-post-preview')).toHaveClass('space-y-2');
    expect(screen.getByTestId('feed-shared-card')).not.toHaveAttribute('class');
  });

  it('ťuk na text otvára pôvodný príspevok aj bez orezania', () => {
    const otvor = jest.fn();
    render(
      <FeedDetailTextOnlyProvider value>
        <SharedContentPreviewCard data={REPOST_TEXTU} onOpenPostPreview={otvor} />
      </FeedDetailTextOnlyProvider>,
    );

    screen.getByTestId('feed-shared-caption').click();

    expect(otvor).toHaveBeenCalledTimes(1);
  });
});

describe('pôvodný text reposta mimo okna len s textom', () => {
  it('bez poskytovateľa má 3 riadky a „Viac“', async () => {
    nastavVysky();
    render(<SharedContentPreviewCard data={REPOST_TEXTU} fillHeight />);

    expect(screen.getByTestId('feed-shared-caption')).toHaveClass('line-clamp-3');
    expect(await screen.findByTestId('feed-shared-caption-toggle')).toHaveTextContent('Viac');
  });

  it('s poskytovateľom false má 3 riadky a „Viac“', async () => {
    nastavVysky();
    render(
      <FeedDetailTextOnlyProvider value={false}>
        <SharedContentPreviewCard data={REPOST_TEXTU} fillHeight />
      </FeedDetailTextOnlyProvider>,
    );

    expect(screen.getByTestId('feed-shared-caption')).toHaveClass('line-clamp-3');
    expect(await screen.findByTestId('feed-shared-caption-toggle')).toHaveTextContent('Viac');
  });

  it('repost s fotkou má v okne tiež 3 riadky a „Viac“', async () => {
    nastavVysky();
    render(
      <FeedDetailTextOnlyProvider value={false}>
        <SharedContentPreviewCard
          data={{ ...REPOST_TEXTU, thumbnailUrl: 'https://cdn.example.com/media/feed/1/x.webp' }}
          fillHeight
        />
      </FeedDetailTextOnlyProvider>,
    );

    expect(screen.getByTestId('feed-shared-caption')).toHaveClass('line-clamp-3');
    expect(await screen.findByTestId('feed-shared-caption-toggle')).toHaveTextContent('Viac');
  });
});
