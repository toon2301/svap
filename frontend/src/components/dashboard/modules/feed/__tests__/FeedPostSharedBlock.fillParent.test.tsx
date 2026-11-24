/**
 * Zdieľaný blok: text zdieľajúceho v ľavom stĺpci dvojstĺpcového okna (K58, krok 2, nález 366).
 *
 * Karta ponuky, portfólia a reposta s fotkou je hlavný obsah a text zdieľajúceho je jej komentár, preto má v ľavom
 * stĺpci päť riadkov a po rozbalení nemá pevný strop: vyplní zvyšok stĺpca, ustúpi karte a posúva sa vo vlastnom
 * rámčeku. Medzery medzi súrodencami dáva `gap-3` (repost s fotkou rozpúšťa obal a rám, `space-y-3` by sa na nich
 * stratilo). Mimo ľavého stĺpca (feed, dialóg zdieľania, jednostĺpcové okno) ostáva všetko ako predtým.
 *
 * jsdom nelayoutuje, takže „presahuje text riadky?“ sa nastavuje na uzle (`scrollHeight` proti `clientHeight`).
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostSharedBlock from '../FeedPostSharedBlock';
import { FeedDetailSplitProvider } from '../FeedDetailSplitContext';
import type { FeedPost } from '@/lib/feedApi';

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

const autor = {
  id: 10,
  display_name: 'Jana',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};
const povodnyAutor = { ...autor, id: 30, display_name: 'Peter', slug: 'peter' };

const ZAKLAD = {
  id: 7,
  author: autor,
  caption: 'Odporúčam.',
  images: [],
  tagged_users: [],
  likes_count: 0,
  comments_count: 0,
  is_liked_by_me: false,
  can_manage: false,
  created_at: '2026-01-01T10:00:00Z',
  shared_content_unavailable: false,
};

const PONUKA = {
  ...ZAKLAD,
  post_type: 'shared_offer',
  shared_content: {
    type: 'offer',
    title: 'Programovanie',
    category: 'it',
    caption: '',
    id: 42,
    owner: povodnyAutor,
    owner_display_name: 'Peter',
    thumbnail_url: null,
    is_seeking: false,
    price_negotiable: false,
    price_from: '25',
    price_currency: '€',
  },
} as unknown as FeedPost;

/** Repost s fotkou pôvodného príspevku. */
const REPOST_S_FOTKOU = {
  ...ZAKLAD,
  post_type: 'shared_feed_post',
  shared_content: {
    type: 'feed_post',
    title: '',
    category: '',
    caption: 'Pôvodný text',
    id: 9,
    owner: povodnyAutor,
    owner_display_name: 'Peter',
    thumbnail_url: 'http://api.test/shared-9.webp',
    is_seeking: null,
    price_negotiable: null,
    price_from: null,
    price_currency: '',
  },
} as unknown as FeedPost;

type Moznosti = {
  fillHeight: boolean;
  vStlpci: boolean;
  isDetail?: boolean;
  post?: FeedPost;
};

function blok({ fillHeight, vStlpci, isDetail = true, post = PONUKA }: Moznosti) {
  const obsah = (
    <FeedPostSharedBlock
      fillHeight={fillHeight}
      fixedBlock={fillHeight ? 'shrink-0' : ''}
      isShared
      isDetail={isDetail}
      caption="Odporúčam. Veľmi dlhý text zdieľajúceho, ktorý presahuje päť riadkov."
      opensMobileDetail={false}
      setMobileDetailOpen={jest.fn()}
      post={post}
      isSelfShare={false}
      handleOpenSharedSource={undefined}
      handleOpenSharedPostPreview={undefined}
      sharedPhotoPostId={null}
      setSharedPhotoOpen={jest.fn()}
      taggedUsers={[]}
      setTagRemoveOpen={jest.fn()}
      t={(_kluc: string, nahradny?: string) => nahradny ?? ''}
    />
  );
  return render(vStlpci ? <FeedDetailSplitProvider value>{obsah}</FeedDetailSplitProvider> : obsah);
}

/** Koreň bloku: rodič karty zdieľaného obsahu. */
function koren(): HTMLElement {
  return screen.getByTestId('feed-shared-card').parentElement as HTMLElement;
}

/** Zbalený text zdieľajúceho presahuje, rozbalený sa zmestí. */
function nastavVysky() {
  Object.defineProperty(HTMLParagraphElement.prototype, 'clientHeight', {
    configurable: true,
    get() {
      return this.dataset.testid === 'feed-post-caption' ? 60 : 0;
    },
  });
  Object.defineProperty(HTMLParagraphElement.prototype, 'scrollHeight', {
    configurable: true,
    get() {
      if (this.dataset.testid !== 'feed-post-caption') return 0;
      return this.className.includes('line-clamp') ? 900 : 60;
    },
  });
}

afterEach(() => {
  // Výšky sú nastavené na prototype – bez upratania by pretiekli inam.
  Reflect.deleteProperty(HTMLParagraphElement.prototype, 'clientHeight');
  Reflect.deleteProperty(HTMLParagraphElement.prototype, 'scrollHeight');
});

describe.each<[string, FeedPost]>([
  ['ponuka', PONUKA],
  ['repost s fotkou', REPOST_S_FOTKOU],
])('%s: text zdieľajúceho v ľavom stĺpci okna', (_nazov, post) => {
  it('má päť riadkov a „Viac“', async () => {
    nastavVysky();
    blok({ fillHeight: true, vStlpci: true, post });

    const text = screen.getByTestId('feed-post-caption');
    expect(text).toHaveClass('line-clamp-5');
    expect(text).not.toHaveClass('line-clamp-[10]');
    expect(await screen.findByTestId('feed-post-caption-toggle')).toHaveTextContent('Viac');
  });

  it('po rozbalení nemá pevný strop a vyplní zvyšok stĺpca', async () => {
    nastavVysky();
    blok({ fillHeight: true, vStlpci: true, post });

    await userEvent.click(await screen.findByTestId('feed-post-caption-toggle'));

    const text = screen.getByTestId('feed-post-caption');
    expect(text).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto', 'subtle-scrollbar');
    expect(text.className).not.toMatch(/max-h-/);
    expect(text.parentElement).toHaveClass('flex', 'flex-col', 'min-h-[8.6rem]');
    expect(screen.getByTestId('feed-post-caption-toggle')).toHaveClass('shrink-0', 'self-start');
  });

  it('medzery medzi súrodencami dáva `gap-3` a nie `space-y-3`', () => {
    blok({ fillHeight: true, vStlpci: true, post });

    expect(koren()).toHaveClass(
      'gap-3',
      'px-4',
      'py-3',
      'subtle-scrollbar',
      'min-h-0',
      'flex-1',
      'overflow-y-auto',
      'flex',
      'flex-col',
    );
    expect(koren()).not.toHaveClass('space-y-3');
  });
});

describe('mimo ľavého stĺpca ostáva všetko ako predtým', () => {
  it('okno bez ľavého stĺpca: 10 riadkov, strop `40vh`, blok `space-y-3` bez `gap-3`', async () => {
    nastavVysky();
    blok({ fillHeight: true, vStlpci: false });

    const text = screen.getByTestId('feed-post-caption');
    expect(text).toHaveClass('line-clamp-[10]');
    expect(koren()).toHaveClass('space-y-3', 'overflow-y-auto');
    expect(koren()).not.toHaveClass('gap-3');

    await userEvent.click(await screen.findByTestId('feed-post-caption-toggle'));

    const rozbaleny = screen.getByTestId('feed-post-caption');
    expect(rozbaleny).toHaveClass('max-h-[40vh]', 'overflow-y-auto');
    expect(rozbaleny).not.toHaveClass('min-h-0');
    expect(rozbaleny).not.toHaveClass('flex-1');
    expect(rozbaleny.parentElement).not.toHaveAttribute('class');
  });

  it('okno bez pružného stĺpca: 10 riadkov, strop `max(25vh,14rem)`, blok `space-y-3`', async () => {
    nastavVysky();
    blok({ fillHeight: false, vStlpci: true });

    expect(screen.getByTestId('feed-post-caption')).toHaveClass('line-clamp-[10]');
    expect(koren()).toHaveClass('space-y-3');
    expect(koren()).not.toHaveClass('gap-3');

    await userEvent.click(await screen.findByTestId('feed-post-caption-toggle'));

    expect(screen.getByTestId('feed-post-caption')).toHaveClass('max-h-[max(25vh,14rem)]');
    expect(screen.getByTestId('feed-post-caption')).not.toHaveClass('flex-1');
  });

  it('karta vo feede: 3 riadky, rozbalený text bez stropu, blok `space-y-3`', async () => {
    nastavVysky();
    blok({ fillHeight: false, vStlpci: false, isDetail: false });

    expect(screen.getByTestId('feed-post-caption')).toHaveClass('line-clamp-3');
    expect(koren()).toHaveClass('space-y-3');
    expect(koren()).not.toHaveClass('gap-3');

    await userEvent.click(await screen.findByTestId('feed-post-caption-toggle'));

    const rozbaleny = screen.getByTestId('feed-post-caption');
    expect(rozbaleny.className).not.toMatch(/max-h-/);
    expect(rozbaleny).not.toHaveClass('min-h-0');
    expect(rozbaleny).not.toHaveClass('flex-1');
    expect(rozbaleny.parentElement).not.toHaveAttribute('class');
  });

  it('repost s fotkou mimo ľavého stĺpca: plocha 256 px, obal karty bez tried, rám `space-y-2`', () => {
    blok({ fillHeight: true, vStlpci: false, post: REPOST_S_FOTKOU });

    expect(screen.getByTestId('feed-shared-card-media')).toHaveClass('h-64');
    expect(screen.getByTestId('feed-shared-card')).not.toHaveAttribute('class');
    expect(screen.getByTestId('feed-shared-post-preview')).toHaveClass('space-y-2');
    expect(screen.getByTestId('feed-shared-post-preview')).not.toHaveClass('contents');
  });
});
