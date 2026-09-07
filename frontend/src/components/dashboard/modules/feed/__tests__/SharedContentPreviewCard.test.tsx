/**
 * Jedna karta zdieľaného obsahu vo VŠETKÝCH kontextoch Nástenky.
 *
 * Kartu kreslí feed zoznam, detail príspevku (desktopové okno aj mobilná
 * obrazovka) a dialóg zdieľania. Predtým to boli tri nezávislé kusy značiek,
 * takže sa dali rozísť bez toho, aby si to niekto všimol – tento súbor drží
 * pokope to, čo z nich urobilo jednu kartu:
 *
 *   1. rovnaké vykreslenie vo všetkých kontextoch,
 *   2. Ponúkam/Hľadám pri ponuke,
 *   3. cena, respektíve „Dohodou",
 *   4. pôvodný vlastník NAD kartou a len keď to nie je ten, kto zdieľa,
 *   5. nedostupný zdroj = TÁ ISTÁ karta, len stlmená.
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostCard from '../FeedPostCard';
import FeedShareDialog from '../FeedShareDialog';
import { sharedContentCardFromPost } from '../sharedContentCard';
import { resetOverlayLayers } from '../../shared/overlayLayers';
import type { FeedPost } from '@/lib/feedApi';

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

let mockIsMobile = false;
jest.mock('@/hooks', () => ({
  useIsMobile: () => mockIsMobile,
  useIsMobileState: () => ({ isMobile: mockIsMobile, isResolved: true }),
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

const mockedListComments = jest.requireMock('@/lib/feedApi')
  .listFeedPostComments as jest.Mock;

/** Ten, kto zdieľa. */
const sharer = {
  id: 10,
  display_name: 'Jana Nováková',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

/** Pôvodný vlastník zdieľaného obsahu – iný človek než `sharer`. */
const owner = {
  id: 21,
  display_name: 'Peter Malý',
  slug: 'peter',
  user_type: 'individual',
  avatar_url: null,
};

type SharedOverrides = Record<string, unknown>;

function offerPost(shared: SharedOverrides = {}, post: SharedOverrides = {}): FeedPost {
  return {
    id: 7,
    post_type: 'shared_offer',
    caption: 'Odporúčam.',
    author: sharer,
    images: [],
    shared_content: {
      type: 'offer',
      title: 'Programovanie',
      category: 'it-a-technologie',
      caption: '',
      id: 42,
      owner,
      owner_display_name: owner.display_name,
      thumbnail_url: 'http://api.test/offer-t.webp',
      is_seeking: false,
      price_negotiable: false,
      price_from: '25',
      price_currency: '€',
      ...shared,
    },
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 0,
    comments_count: 0,
    is_liked_by_me: false,
    can_manage: false,
    created_at: '2026-01-01T10:00:00Z',
    ...post,
  } as unknown as FeedPost;
}

/**
 * Karta bez toho, čím sa kontext líšiť SMIE.
 *
 * Jediný povolený rozdiel je `disabled` na klikacom ráme: v dialógu sa nikam
 * neodchádza, takže karta tam cieľ kliku nemá. Všetko ostatné – rám, náhľad,
 * štítok, cena aj riadok vlastníka – musí sedieť znak po znaku.
 */
function cardMarkup(scope: HTMLElement): string {
  return within(scope)
    .getByTestId('feed-shared-card')
    .outerHTML.replace(/ disabled=""/g, '');
}

beforeEach(() => {
  jest.clearAllMocks();
  resetOverlayLayers();
  mockIsMobile = false;
  mockedListComments.mockResolvedValue({
    results: [],
    next: null,
    previous: null,
    count: 0,
  });
});

describe('tá istá karta vo všetkých kontextoch Nástenky', () => {
  it('draws the identical card in the feed list, both detail variants and the share dialog', async () => {
    const post = offerPost();

    // 1. feed zoznam
    const list = render(<FeedPostCard post={post} />);
    const fromList = cardMarkup(list.container);
    list.unmount();

    // 2. desktopový detail (karta v okne – dvojstĺpcový aj jednostĺpcový
    //    layout kreslia tento istý blok, delí sa len fotka príspevku)
    const detail = render(<FeedPostCard post={post} variant="detail" />);
    const fromDetail = cardMarkup(detail.container);
    detail.unmount();

    // 3. mobilná obrazovka detailu
    mockIsMobile = true;
    const mobile = render(<FeedPostCard post={post} />);
    await userEvent.click(screen.getByTestId('feed-comments-button'));
    const mobileDetail = await screen.findByTestId('feed-mobile-detail');
    const fromMobileDetail = cardMarkup(
      within(mobileDetail).getByTestId('feed-mobile-detail-shared'),
    );
    mobile.unmount();
    mockIsMobile = false;

    // 4. dialóg zdieľania – tie isté dáta, teda tá istá karta
    const dialog = render(
      <FeedShareDialog
        open
        onClose={jest.fn()}
        preview={sharedContentCardFromPost(post)!}
        onShare={jest.fn()}
      />,
    );
    const fromDialog = cardMarkup(screen.getByTestId('feed-share-preview'));
    dialog.unmount();

    expect(fromDetail).toBe(fromList);
    expect(fromMobileDetail).toBe(fromList);
    expect(fromDialog).toBe(fromList);
  });
});

describe('Ponúkam / Hľadám', () => {
  it('labels an offer as Ponúkam', () => {
    render(<FeedPostCard post={offerPost({ is_seeking: false })} />);

    expect(screen.getByTestId('feed-shared-card-kind')).toHaveTextContent('Ponúkam');
  });

  it('labels a seeking offer as Hľadám', () => {
    render(<FeedPostCard post={offerPost({ is_seeking: true })} />);

    expect(screen.getByTestId('feed-shared-card-kind')).toHaveTextContent('Hľadám');
  });

  it('says nothing about the kind on a portfolio card', () => {
    render(
      <FeedPostCard
        post={offerPost(
          {
            type: 'portfolio_item',
            title: 'Weby',
            is_seeking: null,
            price_negotiable: null,
            price_from: null,
            price_currency: '',
          },
          { post_type: 'shared_portfolio_item' },
        )}
      />,
    );

    // Portfólio sa neponúka ani nehľadá – štítok by tam bol výmysel.
    expect(screen.queryByTestId('feed-shared-card-kind')).toBeNull();
    expect(screen.getByTestId('feed-shared-card')).toHaveTextContent('Weby');
  });
});

describe('cena na karte', () => {
  it('shows the amount with its currency', () => {
    render(<FeedPostCard post={offerPost({ price_from: '25' })} />);

    expect(screen.getByTestId('feed-shared-card-price')).toHaveTextContent('25 €');
  });

  it('shows Dohodou when the price is negotiable and no amount is set', () => {
    render(
      <FeedPostCard
        post={offerPost({ price_negotiable: true, price_from: null })}
      />,
    );

    expect(screen.getByTestId('feed-shared-card-price')).toHaveTextContent('Dohodou');
  });

  it('leaves the badge out when there is no price at all', () => {
    render(
      <FeedPostCard
        post={offerPost({ price_negotiable: false, price_from: null })}
      />,
    );

    // Prázdny odznak by vyzeral ako cena nula.
    expect(screen.queryByTestId('feed-shared-card-price')).toBeNull();
  });
});

describe('pôvodný vlastník nad kartou', () => {
  it('names the owner above the card when someone else shares his content', () => {
    render(<FeedPostCard post={offerPost()} />);

    const card = screen.getByTestId('feed-shared-card');
    const ownerRow = within(card).getByTestId('feed-shared-card-owner');
    expect(ownerRow).toHaveTextContent('Peter Malý');
    // Meno aj avatar – vlastník bez fotky má iniciály, nie prázdne miesto.
    expect(ownerRow).toHaveTextContent('PM');

    // Stojí NAD rámom karty, nie v ňom.
    const frame = within(card).getByTestId('feed-shared-compact-preview');
    expect(frame.contains(ownerRow)).toBe(false);
    expect(ownerRow.compareDocumentPosition(frame)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('omits the owner when the sharer IS the owner', () => {
    render(
      <FeedPostCard
        post={offerPost({ owner: sharer, owner_display_name: sharer.display_name })}
      />,
    );

    // Meno zdieľajúceho už nesie hlavička karty – druhýkrát hneď pod ňou by
    // vyzeralo ako chyba.
    expect(screen.queryByTestId('feed-shared-card-owner')).toBeNull();
    expect(screen.getAllByText(sharer.display_name)).toHaveLength(1);
  });

  it('leans on the existing "Znovu zdieľané" header for a reshared own post', () => {
    render(
      <FeedPostCard
        post={offerPost(
          {
            type: 'feed_post',
            title: '',
            caption: 'Môj pôvodný text',
            owner: sharer,
            owner_display_name: sharer.display_name,
            thumbnail_url: null,
            is_seeking: null,
            price_negotiable: null,
            price_from: null,
          },
          { post_type: 'shared_feed_post' },
        )}
      />,
    );

    expect(screen.queryByTestId('feed-shared-card-owner')).toBeNull();
    expect(screen.getByText('Znovu zdieľané')).toBeInTheDocument();
  });
});

describe('nedostupný zdroj', () => {
  /** Ten istý obsah raz živý a raz zmiznutý. */
  function renderBoth() {
    const available = render(<FeedPostCard post={offerPost()} />);
    const availableCard = available.container.querySelector(
      '[data-testid="feed-shared-card"]',
    ) as HTMLElement;
    const availableFrame = within(availableCard).getByTestId(
      'feed-shared-compact-preview',
    );

    const gone = render(
      <FeedPostCard post={offerPost({}, { shared_content_unavailable: true })} />,
      { container: document.body.appendChild(document.createElement('div')) },
    );
    const goneCard = gone.container.querySelector(
      '[data-testid="feed-shared-card"]',
    ) as HTMLElement;
    const goneFrame = within(goneCard).getByTestId('feed-shared-unavailable');

    return { availableCard, availableFrame, goneCard, goneFrame };
  }

  it('keeps the same card and only mutes it', () => {
    const { availableCard, availableFrame, goneCard, goneFrame } = renderBoth();

    // Ten istý rám: rovnaké orámovanie, rovnaké zaoblenie, rovnaké pozadie…
    for (const token of [
      'overflow-hidden',
      'rounded-2xl',
      'border-purple-200/70',
      'bg-white/80',
      'shadow-sm',
    ]) {
      expect(availableFrame.className).toContain(token);
      expect(goneFrame.className).toContain(token);
    }

    // …a to isté rozloženie vnútri: náhľad na celú šírku plus telo s názvom.
    expect(availableCard.querySelector('.h-64')).not.toBeNull();
    expect(goneCard.querySelector('.h-64')).not.toBeNull();
    expect(goneFrame).toHaveTextContent('Programovanie');
    expect(goneFrame).toHaveTextContent('Táto ponuka už nie je dostupná');

    // Jediný rozdiel je stlmenie.
    expect(goneFrame.className).toContain('opacity-60');
    expect(goneFrame.className).toContain('saturate-50');
    expect(availableFrame.className).not.toContain('opacity-60');
    expect(availableFrame.className).not.toContain('saturate-50');
  });

  it('is not clickable any more', () => {
    const { goneCard } = renderBoth();

    // Zdroj neexistuje – karta preto nie je cieľ kliku, ale ani iný blok.
    expect(within(goneCard).queryByRole('button')).toBeNull();
    expect(within(goneCard).queryByTestId('feed-shared-compact-preview')).toBeNull();
  });
});

describe('podklad karty prispevku', () => {
  it('gives a shared post the same surface as an ordinary one', () => {
    const shared = render(<FeedPostCard post={offerPost()} />);
    const sharedClass = shared.container.querySelector(
      '[data-testid="feed-post-card"]',
    )!.className;
    shared.unmount();

    const free = render(
      <FeedPostCard
        post={
          {
            ...offerPost(),
            post_type: 'free_post',
            shared_content: null,
          } as unknown as FeedPost
        }
      />,
    );
    const freeClass = free.container.querySelector(
      '[data-testid="feed-post-card"]',
    )!.className;

    // Ze ide o zdielanie, hovori hlavicka „zdiela dalej" a vnorena karta –
    // nie ina farba celej dlazdice. Fialovy podklad rozbijal jednotny feed.
    expect(sharedClass).toBe(freeClass);
    expect(sharedClass).toContain('bg-white');
    expect(sharedClass).not.toContain('#EEEDFE');
  });
});

describe('nahrada za chybajuci obrazok', () => {
  it('uses the offer card fallback for an offer without a photo', () => {
    render(<FeedPostCard post={offerPost({ thumbnail_url: null })} />);

    const card = screen.getByTestId('feed-shared-card');
    // Ten isty popisok, aky ma ponuka bez fotky na profile.
    expect(within(card).getByText('Bez fotografie')).toBeInTheDocument();
    // Stitok Ponukam/Hladam ostava citatelny aj nad nahradou.
    expect(within(card).getByTestId('feed-shared-card-kind')).toHaveTextContent(
      'Ponúkam',
    );
  });

  it('uses the portfolio card fallback for a portfolio item without a cover', () => {
    render(
      <FeedPostCard
        post={offerPost(
          {
            type: 'portfolio_item',
            title: 'Weby',
            thumbnail_url: null,
            is_seeking: null,
            price_negotiable: null,
            price_from: null,
            price_currency: '',
          },
          { post_type: 'shared_portfolio_item' },
        )}
      />,
    );

    const card = screen.getByTestId('feed-shared-card');
    expect(within(card).getByText('Bez titulnej fotky')).toBeInTheDocument();
    // Ponuka a portfolio maju kazde svoju nahradu – nie jednu spolocnu.
    expect(within(card).queryByText('Bez fotografie')).toBeNull();
  });
});

describe('repost obycajneho prispevku', () => {
  function repost() {
    return offerPost(
      {
        type: 'feed_post',
        title: '',
        caption: 'Pôvodný text príspevku',
        thumbnail_url: null,
        is_seeking: null,
        price_negotiable: null,
        price_from: null,
        price_currency: '',
      },
      { post_type: 'shared_feed_post' },
    );
  }

  it('drops the label and the inner frame', () => {
    render(<FeedPostCard post={repost()} />);

    const preview = screen.getByTestId('feed-shared-post-preview');
    // Ziadny nadpis nad obsahom…
    expect(screen.queryByText('Pôvodný príspevok')).toBeNull();
    // …a ziadna bublina v bubline: repost sa cita ako pokracovanie karty.
    expect(preview.className).not.toContain('rounded-2xl');
    expect(preview.className).not.toContain('border');
    expect(preview.className).not.toContain('shadow-sm');
  });

  it('still names the original author above it', () => {
    render(<FeedPostCard post={repost()} />);

    const owner = screen.getByTestId('feed-shared-card-owner');
    expect(owner).toHaveTextContent('Peter Malý');
    // Meno stoji NAD obsahom, nie v ramceku okolo neho.
    const preview = screen.getByTestId('feed-shared-post-preview');
    expect(preview.contains(owner)).toBe(false);
    expect(owner.compareDocumentPosition(preview)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(preview).toHaveTextContent('Pôvodný text príspevku');
  });

  it('keeps the offer tile framed – only the post loses its frame', () => {
    render(<FeedPostCard post={offerPost()} />);

    // Ponuka JE samostatna vec, na ktoru sa preklikava, takze dlazdicu
    // s ramom si drzi.
    const tile = screen.getByTestId('feed-shared-compact-preview');
    expect(tile.className).toContain('rounded-2xl');
    expect(tile.className).toContain('border');
  });
});
