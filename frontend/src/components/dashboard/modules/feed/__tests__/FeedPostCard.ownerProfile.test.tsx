/**
 * Preklik na profil pôvodného autora zo zdieľaného obsahu v karte (nález 362, dávka K59).
 *
 * Riadok s avatarom a menom pôvodného autora nad náhľadom (repost, zdieľaná ponuka a portfólio) neviedol nikam. Po oprave
 * ho karta (`FeedPostSharedBlock`) napojí na `openUserProfile` s údajmi z feed API (`shared_content.owner`): klik na avatar
 * aj meno otvorí profil (signál `goToUserProfile` s adresou profilu, inak s id) a v okne detailu sa okno pred odchodom
 * zatvorí bez zásahu do histórie, rovnako ako pri hlavičke karty. Náhľad v dialógu zdieľania riadok ako tlačidlo nekreslí,
 * nedostupný zdroj (backend vlastníka neposiela) a autor bez profilu ostávajú bez prekliku. Testy idú cez verejné rozhranie
 * karty (vlastnosti, DOM, `data-testid`, kontext okna, udalosť na `window`), rovnako ako `FeedPostCard.headerProfile.test.tsx`.
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostCard from '../FeedPostCard';
import FeedPostShareModal from '../FeedPostShareModal';
import { FeedPostOverlayProvider } from '../../../contexts/FeedPostOverlayContext';
import { type FeedPost } from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  updateFeedPost: jest.fn(),
  deleteFeedPostImage: jest.fn(),
  deleteFeedPost: jest.fn(),
  getFeedPost: jest.fn(),
  likeFeedPost: jest.fn(),
  unlikeFeedPost: jest.fn(),
  listFeedPostComments: jest.fn(),
  createFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
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

const mockRouterPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

jest.mock('framer-motion', () => ({
  motion: {
    article: ({ children, ...props }: React.ComponentProps<'article'>) => (
      <article {...props}>{children}</article>
    ),
  },
}));

const zdielajuci = {
  id: 10,
  display_name: 'Jana',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};
const vlastnik = {
  id: 21,
  display_name: 'Peter Malý',
  slug: 'peter',
  user_type: 'individual',
  avatar_url: null,
};

const ponuka = {
  type: 'offer',
  title: 'Doučovanie matematiky',
  category: 'vzdelavanie',
  caption: '',
  id: 5,
  owner: vlastnik,
  owner_display_name: 'Peter Malý',
  thumbnail_url: null,
  is_seeking: false,
  price_negotiable: false,
  price_from: '15',
  price_currency: 'EUR',
};
const portfolio = { ...ponuka, type: 'portfolio_item', title: 'Moje portfólio', id: 6 };
const repost = {
  ...ponuka,
  type: 'feed_post',
  title: '',
  category: '',
  caption: 'Pôvodný text zdieľaného príspevku.',
  id: 77,
  is_seeking: null,
  price_negotiable: null,
  price_from: null,
};

const TYPY: Array<[string, string, Record<string, unknown>]> = [
  ['repost príspevku', 'shared_feed_post', repost],
  ['zdieľaná ponuka', 'shared_offer', ponuka],
  ['zdieľané portfólio', 'shared_portfolio_item', portfolio],
];

function prispevok(postType: string, zdielany: Record<string, unknown> | null, ostatne: Record<string, unknown> = {}): FeedPost {
  return {
    id: 7,
    post_type: postType,
    caption: 'Môj komentár',
    author: zdielajuci,
    images: [],
    shared_content: zdielany,
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 1,
    comments_count: 0,
    is_liked_by_me: false,
    can_manage: false,
    created_at: '2026-01-01T10:00:00Z',
    ...ostatne,
  } as unknown as FeedPost;
}

/** Preklik na profil: udalosť `goToUserProfile` bez `offerId` (adresa profilu). */
const profileEvent = jest.fn();
/** Otvorenie zdroja zdieľanej ponuky: tá istá udalosť, ale s `offerId` (kliknutie na kartu ponuky, nie na jej autora). */
const sourceEvent = jest.fn();
const listenProfile = (event: Event) => {
  const { identifier, offerId } = (event as CustomEvent<{ identifier: string; offerId?: number }>).detail;
  if (offerId != null) sourceEvent(identifier, offerId);
  else profileEvent(identifier);
};

beforeEach(() => {
  jest.clearAllMocks();
  mockIsMobile = false;
  document.body.innerHTML = '';
  window.addEventListener('goToUserProfile', listenProfile);
});

afterEach(() => {
  window.removeEventListener('goToUserProfile', listenProfile);
});

describe('karta vo feede: klik na pôvodného autora otvorí jeho profil', () => {
  it.each(TYPY)('%s: klik na meno otvorí profil pôvodného autora a nezasahuje do okna detailu ani do zdroja', async (_popis, postType, zdielany) => {
    const onTargetChange = jest.fn();
    render(
      <FeedPostOverlayProvider onTargetChange={onTargetChange}>
        <FeedPostCard post={prispevok(postType, zdielany)} />
      </FeedPostOverlayProvider>,
    );

    const riadok = screen.getByTestId('feed-shared-card-owner');
    expect(riadok.tagName).toBe('BUTTON');

    await userEvent.click(within(riadok).getByText('Peter Malý'));

    expect(profileEvent).toHaveBeenCalledTimes(1);
    expect(profileEvent).toHaveBeenLastCalledWith('peter');
    expect(onTargetChange).not.toHaveBeenCalled();
    expect(sourceEvent).not.toHaveBeenCalled();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it.each(TYPY)('%s: klik na avatar otvorí ten istý profil', async (_popis, postType, zdielany) => {
    render(<FeedPostCard post={prispevok(postType, zdielany)} />);

    await userEvent.click(within(screen.getByTestId('feed-shared-card-owner')).getByText('PM'));

    expect(profileEvent).toHaveBeenCalledTimes(1);
    expect(profileEvent).toHaveBeenLastCalledWith('peter');
  });

  it('vlastník bez adresy profilu sa otvorí podľa id', async () => {
    render(
      <FeedPostCard post={prispevok('shared_feed_post', { ...repost, owner: { ...vlastnik, slug: null } })} />,
    );

    await userEvent.click(screen.getByText('Peter Malý'));

    expect(profileEvent).toHaveBeenCalledTimes(1);
    expect(profileEvent).toHaveBeenLastCalledWith('21');
  });

  it('na mobile vo feede klik na pôvodného autora otvorí profil a neotvorí obrazovku detailu', async () => {
    mockIsMobile = true;
    render(<FeedPostCard post={prispevok('shared_feed_post', repost)} />);

    await userEvent.click(screen.getByText('Peter Malý'));

    expect(profileEvent).toHaveBeenCalledTimes(1);
    expect(profileEvent).toHaveBeenLastCalledWith('peter');
    expect(screen.queryByTestId('feed-mobile-detail')).not.toBeInTheDocument();
  });

  it('klik na kartu zdieľanej ponuky mimo riadka autora naďalej otvára zdroj ponuky, nie profil autora', async () => {
    render(<FeedPostCard post={prispevok('shared_offer', ponuka)} />);

    await userEvent.click(screen.getByTestId('feed-shared-compact-preview'));

    expect(sourceEvent).toHaveBeenCalledTimes(1);
    expect(sourceEvent).toHaveBeenLastCalledWith('peter', 5);
    expect(profileEvent).not.toHaveBeenCalled();
  });
});

describe('okno detailu: pred odchodom na profil pôvodného autora sa okno zatvorí', () => {
  it.each(TYPY)('%s: klik na meno najprv zatvorí okno bez zásahu do histórie a až potom otvorí profil', async (_popis, postType, zdielany) => {
    const onTargetChange = jest.fn();
    render(
      <FeedPostOverlayProvider onTargetChange={onTargetChange}>
        <FeedPostCard post={prispevok(postType, zdielany)} variant="detail" />
      </FeedPostOverlayProvider>,
    );

    await userEvent.click(screen.getByText('Peter Malý'));

    expect(onTargetChange).toHaveBeenCalledTimes(1);
    expect(onTargetChange).toHaveBeenCalledWith(null, { keepHistory: true });
    expect(profileEvent).toHaveBeenCalledTimes(1);
    expect(profileEvent).toHaveBeenLastCalledWith('peter');
    expect(onTargetChange.mock.invocationCallOrder[0]).toBeLessThan(profileEvent.mock.invocationCallOrder[0]);
  });

  it('klik na avatar v okne detailu zatvorí okno rovnako', async () => {
    const onTargetChange = jest.fn();
    render(
      <FeedPostOverlayProvider onTargetChange={onTargetChange}>
        <FeedPostCard post={prispevok('shared_feed_post', repost)} variant="detail" />
      </FeedPostOverlayProvider>,
    );

    await userEvent.click(within(screen.getByTestId('feed-shared-card-owner')).getByText('PM'));

    expect(onTargetChange).toHaveBeenCalledWith(null, { keepHistory: true });
    expect(profileEvent).toHaveBeenLastCalledWith('peter');
    expect(onTargetChange.mock.invocationCallOrder[0]).toBeLessThan(profileEvent.mock.invocationCallOrder[0]);
  });
});

describe('riadok pôvodného autora ostáva bez prekliku', () => {
  it('autor bez profilu (id 0 a prázdna adresa): riadok je `div` a klik nič neotvorí', async () => {
    render(
      <FeedPostCard
        post={prispevok('shared_feed_post', {
          ...repost,
          owner: { ...vlastnik, id: 0, slug: '', display_name: 'Bývalý používateľ' },
          owner_display_name: 'Bývalý používateľ',
        })}
      />,
    );

    const riadok = screen.getByTestId('feed-shared-card-owner');
    expect(riadok.tagName).toBe('DIV');

    await userEvent.click(screen.getByText('Bývalý používateľ'));
    expect(profileEvent).not.toHaveBeenCalled();
    expect(sourceEvent).not.toHaveBeenCalled();
  });

  it.each(TYPY)('%s: nedostupný zdroj (vlastník `null`, meno zo snapshotu) je `div` a klik nič neotvorí', async (_popis, postType, zdielany) => {
    render(
      <FeedPostCard
        post={prispevok(
          postType,
          { ...zdielany, id: null, owner: null, owner_display_name: 'Peter Malý' },
          { shared_content_unavailable: true },
        )}
      />,
    );

    const riadok = screen.getByTestId('feed-shared-card-owner');
    expect(riadok.tagName).toBe('DIV');
    expect(riadok).toHaveTextContent('Peter Malý');

    await userEvent.click(screen.getByText('Peter Malý'));
    expect(profileEvent).not.toHaveBeenCalled();
    expect(sourceEvent).not.toHaveBeenCalled();
  });

  it('keď zdieľajúci je pôvodný autor, riadok sa nekreslí vôbec', () => {
    render(
      <FeedPostCard
        post={prispevok('shared_feed_post', { ...repost, owner: zdielajuci, owner_display_name: 'Jana' })}
      />,
    );

    expect(screen.queryByTestId('feed-shared-card-owner')).not.toBeInTheDocument();
  });

  it('voľný príspevok nemá riadok pôvodného autora', () => {
    render(<FeedPostCard post={prispevok('free_post', null)} />);

    expect(screen.queryByTestId('feed-shared-card-owner')).not.toBeInTheDocument();
  });

  it.each(TYPY)('náhľad v dialógu zdieľania (%s) kreslí riadok autora ako `div` a klik nič neotvorí', async (_popis, postType, zdielany) => {
    render(<FeedPostShareModal open onClose={jest.fn()} post={prispevok(postType, zdielany)} />);

    const nahlad = screen.getByTestId('feed-share-preview');
    const riadok = within(nahlad).getByTestId('feed-shared-card-owner');
    expect(riadok.tagName).toBe('DIV');
    expect(riadok).toHaveTextContent('Peter Malý');

    await userEvent.click(within(riadok).getByText('Peter Malý'));
    expect(profileEvent).not.toHaveBeenCalled();
    expect(sourceEvent).not.toHaveBeenCalled();
  });
});
