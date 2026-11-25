/**
 * Meno autora príspevku sa nepodčiarkuje (nález 361, dávka K59).
 *
 * Ručný test majiteľa po K53: na Nástenke aj v okne detailu sa meno autora príspevku podčiarkovalo pri prejdení kurzorom
 * (počítač) a na mobile po ťuknutí (stav `hover` po ťuknutí ostáva). Požiadavka: meno sa nepodčiarkuje pri žiadnej
 * interakcii (kurzor, ťuk, kliknutie), kliknutie na ňu naďalej otvára profil autora a tlačidlo je vypnuté, keď sa autor
 * otvoriť nedá. Podčiarkovanie robili triedy tlačidla `hover:underline`, `underline-offset-2` a `disabled:no-underline`.
 *
 * jsdom nemá štýly Tailwindu, takže „nepodčiarkuje sa“ sa kontroluje na úrovni tried: žiadna trieda tlačidla nesmie niesť
 * `underline` (ani `hover:`, `focus:`, `active:` či `group-hover:` variant, ani `underline-offset-*` a `no-underline`).
 * Hlavička je tá istá v karte vo feede aj v okne detailu na počítači, preto idú testy cez celú kartu (vlastnosti, DOM,
 * `data-testid`, kontext okna, udalosť `goToUserProfile` na `window`), rovnako ako `FeedPostCard.headerProfile.test.tsx`.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostCard from '../FeedPostCard';
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

const author = {
  id: 10,
  display_name: 'Jana',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

function makePost(overrides: Record<string, unknown> = {}): FeedPost {
  return {
    id: 7,
    post_type: 'free_post',
    caption: 'Ahoj',
    author,
    images: [],
    shared_content: null,
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 1,
    comments_count: 0,
    is_liked_by_me: false,
    can_manage: false,
    created_at: '2026-01-01T10:00:00Z',
    ...overrides,
  } as unknown as FeedPost;
}

/** Triedy tlačidla mena, ktoré súvisia s podčiarkovaním (`underline`, `hover:underline`, `underline-offset-2`…). */
function podciarkovacieTriedy(element: HTMLElement): string[] {
  return element.className.split(/\s+/).filter((trieda) => trieda.includes('underline'));
}

const profileEvent = jest.fn();
const listenProfile = (event: Event) =>
  profileEvent((event as CustomEvent<{ identifier: string }>).detail.identifier);

beforeEach(() => {
  jest.clearAllMocks();
  document.body.innerHTML = '';
  window.addEventListener('goToUserProfile', listenProfile);
});

afterEach(() => {
  window.removeEventListener('goToUserProfile', listenProfile);
});

describe('meno autora príspevku sa nepodčiarkuje (nález 361)', () => {
  it.each([
    ['vlastný príspevok vo feede', { can_manage: true }, undefined],
    ['cudzí príspevok vo feede', { can_manage: false }, undefined],
    ['vlastný príspevok v okne detailu', { can_manage: true }, 'detail'],
    ['cudzí príspevok v okne detailu', { can_manage: false }, 'detail'],
  ] as const)('%s: tlačidlo mena nemá žiadnu triedu s podčiarkovaním', (_popis, prispevok, variant) => {
    render(
      <FeedPostOverlayProvider onTargetChange={jest.fn()}>
        <FeedPostCard post={makePost(prispevok)} variant={variant} />
      </FeedPostOverlayProvider>,
    );

    const meno = screen.getByTestId('feed-post-author-name');
    expect(meno).toHaveTextContent('Jana');
    expect(podciarkovacieTriedy(meno)).toEqual([]);
  });

  it('ostatný vzhľad tlačidla mena ostáva: zalamovanie, písmo a prstenec fokusu', () => {
    render(<FeedPostCard post={makePost()} />);

    expect(screen.getByTestId('feed-post-author-name')).toHaveClass(
      'block',
      'max-w-full',
      'truncate',
      'text-left',
      'text-sm',
      'font-semibold',
      'text-gray-900',
      'focus:outline-none',
      'focus-visible:ring-2',
      'focus-visible:ring-purple-400/60',
      'disabled:cursor-default',
      'dark:text-white',
    );
  });

  it('tlačidlo mena autora bez profilu je vypnuté a ani vtedy nemá triedu s podčiarkovaním', () => {
    render(
      <FeedPostCard
        post={makePost({ author: { ...author, id: 0, slug: '', display_name: 'Bývalý používateľ' } })}
      />,
    );

    const meno = screen.getByTestId('feed-post-author-name');
    expect(meno).toBeDisabled();
    expect(podciarkovacieTriedy(meno)).toEqual([]);
  });
});

describe('klik na meno autora príspevku naďalej otvára profil', () => {
  it('vo feede otvorí profil autora a nezasahuje do okna detailu', async () => {
    const onTargetChange = jest.fn();
    render(
      <FeedPostOverlayProvider onTargetChange={onTargetChange}>
        <FeedPostCard post={makePost()} />
      </FeedPostOverlayProvider>,
    );

    await userEvent.click(screen.getByTestId('feed-post-author-name'));

    expect(profileEvent).toHaveBeenCalledTimes(1);
    expect(profileEvent).toHaveBeenLastCalledWith('jana');
    expect(onTargetChange).not.toHaveBeenCalled();
  });

  it('v okne detailu najprv zatvorí okno bez zásahu do histórie a až potom otvorí profil', async () => {
    const onTargetChange = jest.fn();
    render(
      <FeedPostOverlayProvider onTargetChange={onTargetChange}>
        <FeedPostCard post={makePost()} variant="detail" />
      </FeedPostOverlayProvider>,
    );

    await userEvent.click(screen.getByTestId('feed-post-author-name'));

    expect(onTargetChange).toHaveBeenCalledTimes(1);
    expect(onTargetChange).toHaveBeenCalledWith(null, { keepHistory: true });
    expect(profileEvent).toHaveBeenCalledTimes(1);
    expect(profileEvent).toHaveBeenLastCalledWith('jana');
    expect(onTargetChange.mock.invocationCallOrder[0]).toBeLessThan(profileEvent.mock.invocationCallOrder[0]);
  });

  it('klik na vypnuté meno autora bez profilu nič neotvorí', async () => {
    render(
      <FeedPostCard
        post={makePost({ author: { ...author, id: 0, slug: '', display_name: 'Bývalý používateľ' } })}
      />,
    );

    await userEvent.click(screen.getByTestId('feed-post-author-name'));

    expect(profileEvent).not.toHaveBeenCalled();
  });
});
