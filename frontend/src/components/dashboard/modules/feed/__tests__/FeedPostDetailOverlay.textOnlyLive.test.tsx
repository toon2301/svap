/**
 * Okno detailu sleduje ŽIVÝ stav fotiek aj pri texte príspevku (K58, krok 3, nález 367, R73).
 *
 * Autor má príspevok s jednou rozpracovanou fotkou a dlhým textom: okno je dvojstĺpcové s pevnou výškou a text má 10
 * riadkov s „Viac". Keď moderácia poslednú fotku zamietne počas otvoreného okna, ostáva dvojstĺpcové, no príspevok je
 * odvtedy len s textom: okno dostane výšku podľa obsahu a text sa ukáže celý. Karta pritom ostáva pripojená, takže stav
 * „rozbalené" z predošlého rozloženia by prežil a text by ostal v rámiku `max-h-[40vh]` s prepínačom „Menej": kľúč
 * v `FeedPostCardCaption` ho vynuluje.
 *
 * Vlastný súbor kvôli falošným časovačom (rovnako ako `FeedPostDetailOverlay.livePhotos.test.tsx`): zvyšné testy okna
 * bežia na reálnych a miešanie oboch v jednom module si v tejto appke už raz vypýtalo prekvapenia.
 *
 * jsdom nelayoutuje, takže sa kontrolujú triedy, ktoré o rozmeroch rozhodujú. „Presahuje text riadky?" sa nastavuje na
 * uzle (`scrollHeight` proti `clientHeight`): orezaný text presahuje, neorezaný sa zmestí, tak ako v prehliadači.
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeedPostDetailOverlay from '../FeedPostDetailOverlay';
import { resetOverlayLayers } from '../../shared/overlayLayers';
import { getFeedPost, type FeedPost } from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  getFeedPost: jest.fn(),
  listFeedPostComments: jest.fn(),
  listFeedCommentReplies: jest.fn(),
  createFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
  updateFeedPostComment: jest.fn(),
  likeFeedPostComment: jest.fn(),
  unlikeFeedPostComment: jest.fn(),
  likeFeedPost: jest.fn(),
  unlikeFeedPost: jest.fn(),
  deleteFeedPost: jest.fn(),
  deleteFeedPostImage: jest.fn(),
  updateFeedPost: jest.fn(),
  reportFeedPost: jest.fn(),
  shareFeedPost: jest.fn(),
  removeOwnFeedPostTag: jest.fn(),
  listFeedPostLikers: jest.fn(),
  listFeedCommentLikers: jest.fn(),
}));

jest.mock('@/lib/feedImageUpload', () => ({
  uploadFeedPostImages: jest.fn(),
  isAllowedFeedImageName: () => true,
  MAX_FEED_POST_IMAGES: 5,
  FEED_IMAGE_MAX_MB: 5,
  FEED_IMAGE_MAX_BYTES: 5 * 1024 * 1024,
  FEED_IMAGE_ACCEPT: '.jpg,.png',
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_k: string, fallback: string) => fallback,
    locale: 'sk',
  }),
}));

jest.mock('@/hooks', () => ({
  useIsMobile: () => false,
  useIsMobileState: () => ({ isMobile: false, isResolved: true }),
}));

jest.mock('../../shared/useProtectedImage', () => ({
  useProtectedImage: (src: string | null) => ({
    resolvedSrc: src,
    isProtected: false,
    isLoading: false,
    isError: false,
  }),
}));

jest.mock('../../messages/DesktopEmojiPickerButton', () => ({
  DesktopEmojiPickerButton: ({ ariaLabel }: { ariaLabel: string }) => (
    <button type="button" aria-label={ariaLabel}>
      emoji
    </button>
  ),
}));

jest.mock('../../messages/GroupUserPicker', () => ({
  GroupUserPicker: () => <div />,
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('framer-motion', () => ({
  motion: {
    article: ({ children, ...props }: React.ComponentProps<'article'>) => (
      <article {...props}>{children}</article>
    ),
  },
}));

const mockedGetPost = getFeedPost as jest.MockedFunction<typeof getFeedPost>;
const mockedListComments = jest.requireMock('@/lib/feedApi')
  .listFeedPostComments as jest.Mock;

/** Interval `usePendingFeedImages`: jedno kolo dosledovania fotiek. */
const IMAGE_POLL_MS = 2500;

const DLHY_TEXT = 'Dlhý text príspevku, ktorý by v okne s fotkou presahoval desať riadkov.';

const autor = {
  id: 10,
  display_name: 'Jana',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

/** Rozpracovaná fotka ešte NEMÁ URL: karusel z nej kreslí stavovú plochu. */
function rozpracovanaFotka(id: number) {
  return {
    id,
    status: 'pending',
    thumbnail_url: '',
    large_url: '',
  } as FeedPost['images'][number];
}

function vybavenaFotka(id: number, stav: 'approved' | 'rejected') {
  return {
    id,
    status: stav,
    thumbnail_url: `http://api.test/${id}-t.webp`,
    large_url: `http://api.test/${id}-l.webp`,
  } as FeedPost['images'][number];
}

function prispevok(overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    id: 7,
    post_type: 'free_post',
    caption: DLHY_TEXT,
    author: autor,
    images: [],
    shared_content: null,
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 2,
    comments_count: 1,
    is_liked_by_me: false,
    can_manage: true,
    created_at: '2026-01-01T10:00:00Z',
    ...overrides,
  } as FeedPost;
}

/**
 * Prvá odpoveď patrí načítaniu okna, ďalšie kolám pollingu; po nich už chodí posledná dokola. Fronta sa stavia od
 * nuly (`mockReset`), aby nespotrebované odpovede z predošlého testu nepretiekli do ďalšieho.
 */
function odpovedaj(prvy: FeedPost, ...dalsie: FeedPost[]) {
  mockedGetPost.mockReset();
  mockedGetPost.mockResolvedValue(dalsie[dalsie.length - 1] ?? prvy);
  mockedGetPost.mockResolvedValueOnce(prvy);
  dalsie.forEach((p) => mockedGetPost.mockResolvedValueOnce(p));
}

async function otvorOkno(p: FeedPost) {
  render(<FeedPostDetailOverlay postId={p.id} onClose={jest.fn()} />);
  // Odpoveď načítania je hotová hneď (mock), stačí ju nechať dobehnúť.
  await act(async () => {});
  await waitFor(() => expect(screen.getByTestId('feed-post-card')).toBeInTheDocument());
}

/** Nechá prebehnúť jedno kolo dosledovania fotiek. */
async function jednoKoloPollingu() {
  await act(async () => {
    jest.advanceTimersByTime(IMAGE_POLL_MS);
  });
}

/** Text príspevku presahuje, kým je orezaný; neorezaný sa zmestí. */
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

/** Obal textu: rodič odseku je koreň `FeedPostCaption`, jeho rodič je obal textu v karte. */
function obalTextu(): HTMLElement {
  return screen.getByTestId('feed-post-caption').parentElement
    ?.parentElement as HTMLElement;
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  resetOverlayLayers();
  mockedListComments.mockResolvedValue({
    results: [],
    next: null,
    previous: null,
    count: 0,
  });
  nastavVysky();
});

afterEach(() => {
  jest.useRealTimers();
  // Výšky sú nastavené na prototype: bez upratania by pretiekli do ďalšieho testu.
  Reflect.deleteProperty(HTMLParagraphElement.prototype, 'clientHeight');
  Reflect.deleteProperty(HTMLParagraphElement.prototype, 'scrollHeight');
});

describe('zamietnutie poslednej fotky pri rozbalenom texte', () => {
  it('kým sa fotka spracúva: pevná výška, text na 10 riadkoch s „Viac" a po rozbalení rámik s „Menej"', async () => {
    const p = prispevok({ images: [rozpracovanaFotka(11)] });
    odpovedaj(p);
    await otvorOkno(p);

    const okno = screen.getByTestId('feed-post-overlay');
    expect(okno).toHaveClass('h-[95vh]');
    expect(okno).not.toHaveClass('min-h-[min(20rem,95vh)]');
    expect(screen.getByTestId('feed-post-caption')).toHaveClass('line-clamp-[10]');
    const prepinac = screen.getByTestId('feed-post-caption-toggle');
    expect(prepinac).toHaveTextContent('Viac');

    fireEvent.click(prepinac);

    expect(screen.getByTestId('feed-post-caption')).toHaveClass('max-h-[40vh]');
    expect(screen.getByTestId('feed-post-caption-toggle')).toHaveTextContent('Menej');
  });

  it('moderácia fotku zamietne: okno ostane dvojstĺpcové a text je celý, bez rámika a bez prepínača', async () => {
    const p = prispevok({ images: [rozpracovanaFotka(11)] });
    odpovedaj(p, prispevok({ images: [vybavenaFotka(11, 'rejected')] }));
    await otvorOkno(p);
    fireEvent.click(screen.getByTestId('feed-post-caption-toggle'));
    expect(screen.getByTestId('feed-post-caption')).toHaveClass('max-h-[40vh]');
    expect(screen.getByTestId('feed-post-caption-toggle')).toHaveTextContent('Menej');

    await jednoKoloPollingu();

    await waitFor(() =>
      expect(screen.getByTestId('feed-post-caption').className).not.toContain('max-h-'),
    );
    const odsek = screen.getByTestId('feed-post-caption');
    expect(odsek.className).not.toContain('line-clamp');
    expect(odsek).not.toHaveAttribute('role');
    expect(odsek).toHaveTextContent(DLHY_TEXT);
    expect(screen.queryByTestId('feed-post-caption-toggle')).toBeNull();
    expect(screen.getByTestId('feed-post-overlay-split')).toBeInTheDocument();
    expect(screen.queryByTestId('feed-post-overlay-fixed')).toBeNull();
  });

  it('po zamietnutí fotky má okno výšku podľa obsahu a text sa posúva v obale', async () => {
    const p = prispevok({ images: [rozpracovanaFotka(11)] });
    odpovedaj(p, prispevok({ images: [vybavenaFotka(11, 'rejected')] }));
    await otvorOkno(p);

    await jednoKoloPollingu();

    await waitFor(() =>
      expect(screen.getByTestId('feed-post-overlay')).toHaveClass('min-h-[min(20rem,95vh)]'),
    );
    const okno = screen.getByTestId('feed-post-overlay');
    expect(okno).toHaveClass('max-h-[95vh]', 'max-w-[54rem]');
    expect(okno).not.toHaveClass('h-[95vh]');
    expect(obalTextu()).toHaveClass('subtle-scrollbar', 'min-h-0', 'flex-1', 'overflow-y-auto');
    expect(obalTextu()).not.toHaveClass('shrink-0');
  });

  it('po zamietnutí fotky komentáre prejdú na výšku cez flex', async () => {
    const p = prispevok({ images: [rozpracovanaFotka(11)] });
    odpovedaj(p, prispevok({ images: [vybavenaFotka(11, 'rejected')] }));
    await otvorOkno(p);
    expect(screen.getByTestId('feed-post-comments')).toHaveClass('h-full');

    await jednoKoloPollingu();

    await waitFor(() =>
      expect(screen.getByTestId('feed-post-comments')).toHaveClass('flex-1'),
    );
    // Komentáre ostávajú vpravo vedľa karty: okno sa po zamietnutí nezmenilo na jeden stĺpec.
    expect(screen.getByTestId('feed-post-overlay-split')).toContainElement(
      screen.getByTestId('feed-post-comments'),
    );
    expect(screen.getByTestId('feed-post-comments')).not.toHaveClass('h-full');
    expect(screen.getByTestId('feed-comments-scroll')).toHaveClass('min-h-0', 'flex-1');
    expect(screen.getByTestId('feed-comments-scroll')).not.toHaveClass('h-full');
  });
});

describe('fotka prejde alebo ostane iná fotka', () => {
  it('fotka prejde: rozbalený text ostáva rozbalený, okno ostáva na pevnej výške', async () => {
    const p = prispevok({ images: [rozpracovanaFotka(11)] });
    odpovedaj(p, prispevok({ images: [vybavenaFotka(11, 'approved')] }));
    await otvorOkno(p);
    fireEvent.click(screen.getByTestId('feed-post-caption-toggle'));

    await jednoKoloPollingu();

    await waitFor(() =>
      expect(screen.queryByTestId('feed-image-status')).not.toBeInTheDocument(),
    );
    expect(screen.getByTestId('feed-post-caption')).toHaveClass('max-h-[40vh]');
    expect(screen.getByTestId('feed-post-caption-toggle')).toHaveTextContent('Menej');
    const okno = screen.getByTestId('feed-post-overlay');
    expect(okno).toHaveClass('h-[95vh]');
    expect(okno).not.toHaveClass('min-h-[min(20rem,95vh)]');
  });

  it('zamietnutá je len jedna z dvoch fotiek: text ostáva rozbalený a okno na pevnej výške', async () => {
    const p = prispevok({
      images: [vybavenaFotka(11, 'approved'), rozpracovanaFotka(12)],
    });
    odpovedaj(
      p,
      prispevok({ images: [vybavenaFotka(11, 'approved'), vybavenaFotka(12, 'rejected')] }),
    );
    await otvorOkno(p);
    fireEvent.click(screen.getByTestId('feed-post-caption-toggle'));

    await jednoKoloPollingu();

    await waitFor(() =>
      expect(screen.getByTestId('feed-image-rejected-note')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('feed-post-caption')).toHaveClass('max-h-[40vh]');
    expect(screen.getByTestId('feed-post-caption-toggle')).toHaveTextContent('Menej');
    expect(screen.getByTestId('feed-post-overlay')).toHaveClass('h-[95vh]');
    expect(screen.getByTestId('feed-post-overlay')).not.toHaveClass('min-h-[min(20rem,95vh)]');
  });
});
