/**
 * Zdieľaný blok v okne príspevku len s textom (K58, krok 3, R73).
 *
 * V okne len s textom (repost textového príspevku) sa texty reposta ukážu celé, bez „Viac“. Blok so zdieľaným obsahom
 * ostáva pružný; blok s označenými pri voľnom príspevku nemá zdieľaný obsah, preto je pevný (prirodzenej výšky) a
 * nesúperí s textom o miesto. S fotkou, s ponukou a v karte vo feede sa nič nemení (nález 368 sa v K58 nerieši).
 *
 * jsdom nelayoutuje, takže „presahuje text riadky?“ sa nastavuje na uzle (`scrollHeight` proti `clientHeight`).
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeedPostSharedBlock from '../FeedPostSharedBlock';
import { FeedDetailSplitProvider } from '../FeedDetailSplitContext';
import { FeedDetailTextOnlyProvider } from '../FeedDetailTextOnlyContext';
import type { FeedPost, FeedTaggedUser } from '@/lib/feedApi';

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

const DLHY_TEXT = 'Veľmi dlhý text, ktorý by v okne s fotkou presahoval päť aj desať riadkov.';

const ZAKLAD = {
  id: 7,
  author: autor,
  caption: DLHY_TEXT,
  images: [],
  tagged_users: [],
  likes_count: 0,
  comments_count: 0,
  is_liked_by_me: false,
  can_manage: false,
  created_at: '2026-01-01T10:00:00Z',
  shared_content_unavailable: false,
};

/** Repost textového príspevku: pôvodný príspevok nemá fotku. */
const REPOST_TEXTU = {
  ...ZAKLAD,
  post_type: 'shared_feed_post',
  shared_content: {
    type: 'feed_post',
    title: '',
    category: '',
    caption: DLHY_TEXT,
    id: 9,
    owner: povodnyAutor,
    owner_display_name: 'Peter',
    thumbnail_url: null,
    is_seeking: null,
    price_negotiable: null,
    price_from: null,
    price_currency: '',
  },
} as unknown as FeedPost;

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

const VOLNY_PRISPEVOK = {
  ...ZAKLAD,
  post_type: 'free_post',
  shared_content: null,
} as unknown as FeedPost;

const OZNACENY: FeedTaggedUser = {
  id: 51,
  display_name: 'Marta',
  slug: 'marta',
  user_type: 'individual',
  avatar_url: null,
  can_remove_tag: false,
} as FeedTaggedUser;

type Moznosti = {
  post: FeedPost;
  isShared: boolean;
  lenText: boolean;
  vStlpci?: boolean;
  fillHeight?: boolean;
  isDetail?: boolean;
  oznaceni?: FeedTaggedUser[];
};

function blok({
  post,
  isShared,
  lenText,
  vStlpci = true,
  fillHeight = true,
  isDetail = true,
  oznaceni = [],
}: Moznosti) {
  const obsah = (
    <FeedPostSharedBlock
      fillHeight={fillHeight}
      fixedBlock={fillHeight ? 'shrink-0' : ''}
      isShared={isShared}
      isDetail={isDetail}
      caption={DLHY_TEXT}
      opensMobileDetail={false}
      setMobileDetailOpen={jest.fn()}
      post={post}
      isSelfShare={false}
      handleOpenSharedSource={undefined}
      handleOpenSharedPostPreview={undefined}
      sharedPhotoPostId={null}
      setSharedPhotoOpen={jest.fn()}
      taggedUsers={oznaceni}
      setTagRemoveOpen={jest.fn()}
      t={(_kluc: string, nahradny?: string) => nahradny ?? ''}
    />
  );
  return render(
    <FeedDetailSplitProvider value={vStlpci}>
      <FeedDetailTextOnlyProvider value={lenText}>{obsah}</FeedDetailTextOnlyProvider>
    </FeedDetailSplitProvider>,
  );
}

/** Koreň bloku: rodič odseku s textom zdieľajúceho je koreň `FeedPostCaption`, jeho rodič je koreň bloku. */
function koren(): HTMLElement {
  return screen.getByTestId('feed-post-caption').parentElement?.parentElement as HTMLElement;
}

/** Texty presahujú, kým sú orezané; rozbalené sa zmestia. */
function nastavVysky() {
  const idecka = ['feed-post-caption', 'feed-shared-caption'];
  Object.defineProperty(HTMLParagraphElement.prototype, 'clientHeight', {
    configurable: true,
    get() {
      return idecka.includes(this.dataset.testid) ? 60 : 0;
    },
  });
  Object.defineProperty(HTMLParagraphElement.prototype, 'scrollHeight', {
    configurable: true,
    get() {
      if (!idecka.includes(this.dataset.testid)) return 0;
      return this.className.includes('line-clamp') ? 900 : 60;
    },
  });
}

afterEach(() => {
  // Výšky sú nastavené na prototype – bez upratania by pretiekli inam.
  Reflect.deleteProperty(HTMLParagraphElement.prototype, 'clientHeight');
  Reflect.deleteProperty(HTMLParagraphElement.prototype, 'scrollHeight');
});

describe('repost textového príspevku v okne len s textom', () => {
  it('text zdieľajúceho aj pôvodný text sú celé, bez orezania a bez „Viac“', () => {
    nastavVysky();
    blok({ post: REPOST_TEXTU, isShared: true, lenText: true });

    const text = screen.getByTestId('feed-post-caption');
    const povodny = screen.getByTestId('feed-shared-caption');
    expect(text.className).not.toContain('line-clamp');
    expect(povodny.className).not.toContain('line-clamp');
    expect(text).toHaveTextContent(DLHY_TEXT);
    expect(povodny).toHaveTextContent(DLHY_TEXT);
    expect(screen.queryByTestId('feed-post-caption-toggle')).toBeNull();
    expect(screen.queryByTestId('feed-shared-caption-toggle')).toBeNull();
  });

  it('text zdieľajúceho nie je pružný: bez `fillParent` a bez stropu', () => {
    nastavVysky();
    blok({ post: REPOST_TEXTU, isShared: true, lenText: true });

    const text = screen.getByTestId('feed-post-caption');
    expect(text.className).not.toMatch(/max-h-/);
    expect(text).not.toHaveClass('min-h-0');
    expect(text).not.toHaveClass('flex-1');
    expect(text.parentElement).not.toHaveAttribute('class');
  });

  it('blok so zdieľaným obsahom ostáva pružný a medzery dáva `gap-3`', () => {
    blok({ post: REPOST_TEXTU, isShared: true, lenText: true });

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
    expect(koren()).not.toHaveClass('shrink-0');
  });

  it('ponuka v okne len s textom (nemožný stav) má tiež celé texty', () => {
    blok({ post: PONUKA, isShared: true, lenText: true });

    expect(screen.getByTestId('feed-post-caption').className).not.toContain('line-clamp');
  });
});

describe('voľný príspevok len s textom a označenými', () => {
  it('blok s označenými je pevný: `shrink-0`, bez `flex-1` a bez posúvania', () => {
    blok({ post: VOLNY_PRISPEVOK, isShared: false, lenText: true, oznaceni: [OZNACENY] });

    const stitky = screen.getByTestId('feed-post-tags');
    const obal = stitky.parentElement as HTMLElement;
    expect(obal).toHaveClass('space-y-3', 'px-4', 'py-3', 'shrink-0');
    expect(obal).not.toHaveClass('flex-1');
    expect(obal).not.toHaveClass('overflow-y-auto');
    expect(obal).not.toHaveClass('flex-col');
    expect(obal).not.toHaveClass('gap-3');
    expect(screen.getByTestId('feed-post-tag-51')).toHaveTextContent('@Marta');
  });

  it('voľný príspevok bez označených nekreslí žiadny blok', () => {
    const { container } = blok({ post: VOLNY_PRISPEVOK, isShared: false, lenText: true });

    expect(container).toBeEmptyDOMElement();
  });
});

describe('mimo okna len s textom sa nič nemení', () => {
  it('ponuka v ľavom stĺpci s fotkou: text zdieľajúceho má 5 riadkov a je pružný', async () => {
    nastavVysky();
    blok({ post: PONUKA, isShared: true, lenText: false });

    expect(screen.getByTestId('feed-post-caption')).toHaveClass('line-clamp-5');
    expect(koren()).toHaveClass('gap-3', 'flex-1', 'overflow-y-auto', 'flex-col');
    expect(await screen.findByTestId('feed-post-caption-toggle')).toHaveTextContent('Viac');
  });

  it('repost textu v ľavom stĺpci mimo okna len s textom: pôvodný text má 3 riadky a „Viac“', async () => {
    nastavVysky();
    blok({ post: REPOST_TEXTU, isShared: true, lenText: false });

    expect(screen.getByTestId('feed-shared-caption')).toHaveClass('line-clamp-3');
    expect(await screen.findByTestId('feed-shared-caption-toggle')).toHaveTextContent('Viac');
  });

  it('označení pri príspevku s fotkou: blok je pružný ako doteraz (nález 368 sa nerieši)', () => {
    blok({ post: VOLNY_PRISPEVOK, isShared: false, lenText: false, oznaceni: [OZNACENY] });

    const obal = screen.getByTestId('feed-post-tags').parentElement as HTMLElement;
    expect(obal).toHaveClass('subtle-scrollbar', 'min-h-0', 'flex-1', 'overflow-y-auto', 'gap-3');
    expect(obal).not.toHaveClass('shrink-0');
  });

  it('karta vo feede: 3 riadky a `space-y-3`', () => {
    nastavVysky();
    blok({
      post: REPOST_TEXTU,
      isShared: true,
      lenText: false,
      vStlpci: false,
      fillHeight: false,
      isDetail: false,
    });

    expect(screen.getByTestId('feed-post-caption')).toHaveClass('line-clamp-3');
    expect(screen.getByTestId('feed-shared-caption')).toHaveClass('line-clamp-3');
    expect(koren()).toHaveClass('space-y-3');
    expect(koren()).not.toHaveClass('gap-3');
  });
});
