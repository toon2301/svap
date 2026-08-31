/**
 * Zmazanie príspevku z okna detailu sa musí prejaviť aj vo feede POD oknom.
 *
 * Feed pod oknom ostáva namountovaný (okno je vrstva, nie navigácia), takže
 * bez signálu by v ňom po zavretí okna ostala karta príspevku, ktorý už
 * neexistuje – a klik na ňu by skončil chybou. Lajky a zdieľanie sa takto
 * synchronizujú už dnes, mazanie musí tiež.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostCard from '../FeedPostCard';
import { deleteFeedPost, type FeedPost } from '@/lib/feedApi';
import { onFeedPostDeleted } from '../feedPostDeletedEvents';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  getFeedPost: jest.fn(),
  likeFeedPost: jest.fn(),
  unlikeFeedPost: jest.fn(),
  deleteFeedPost: jest.fn(),
  listFeedPostComments: jest.fn().mockResolvedValue({
    results: [],
    next: null,
    previous: null,
    count: 0,
  }),
  listFeedCommentReplies: jest.fn(),
  createFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
  updateFeedPostComment: jest.fn(),
  likeFeedPostComment: jest.fn(),
  unlikeFeedPostComment: jest.fn(),
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
  useLanguage: () => ({ t: (_k: string, fallback: string) => fallback, locale: 'sk' }),
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

const mockedDelete = deleteFeedPost as jest.MockedFunction<typeof deleteFeedPost>;

function makePost(overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    id: 7,
    post_type: 'free_post',
    caption: 'Text príspevku',
    author: {
      id: 10,
      display_name: 'Jana',
      slug: 'jana',
      user_type: 'individual',
      avatar_url: null,
    },
    images: [],
    shared_content: null,
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 0,
    comments_count: 0,
    is_liked_by_me: false,
    can_manage: true,
    created_at: '2026-01-01T10:00:00Z',
    ...overrides,
  } as FeedPost;
}

/** Feed pod oknom – rovnaký princíp ako `removePost` v `FeedList`. */
function FeedUnderneath({ ids }: { ids: number[] }) {
  const [posts, setPosts] = React.useState(ids);
  React.useEffect(
    () => onFeedPostDeleted((postId) => setPosts((list) => list.filter((id) => id !== postId))),
    [],
  );
  return (
    <div data-testid="feed-pod-oknom">
      {posts.map((id) => (
        <div key={id} data-testid={`karta-${id}`}>
          Príspevok {id}
        </div>
      ))}
    </div>
  );
}

async function deleteFromOverlay() {
  await userEvent.click(screen.getByTestId('feed-post-menu-trigger'));
  await userEvent.click(screen.getByTestId('feed-post-delete'));
  await userEvent.click(screen.getByTestId('feed-post-delete-confirm-action'));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedDelete.mockResolvedValue(undefined as never);
});

it('removes the post from the feed underneath the window', async () => {
  const onClose = jest.fn();
  render(
    <>
      <FeedUnderneath ids={[7, 8]} />
      {/* Karta v okne detailu – tá istá inštancia komponentu ako vo feede. */}
      <FeedPostCard post={makePost()} variant="detail" onDeleted={onClose} />
    </>,
  );

  await deleteFromOverlay();

  await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith(7));
  // Okno sa zavrie…
  expect(onClose).toHaveBeenCalled();
  // …a karta pod ním zmizne, nie len to.
  await waitFor(() =>
    expect(screen.queryByTestId('karta-7')).not.toBeInTheDocument(),
  );
  // Ostatné príspevky ostávajú.
  expect(screen.getByTestId('karta-8')).toBeInTheDocument();
});

it('keeps the feed untouched when deleting fails', async () => {
  mockedDelete.mockRejectedValue({ response: { status: 500 } });
  render(
    <>
      <FeedUnderneath ids={[7]} />
      <FeedPostCard post={makePost()} variant="detail" onDeleted={jest.fn()} />
    </>,
  );

  await deleteFromOverlay();

  await waitFor(() => expect(mockedDelete).toHaveBeenCalled());
  // Príspevok na serveri ostal – karta teda musí ostať tiež.
  expect(screen.getByTestId('karta-7')).toBeInTheDocument();
});
