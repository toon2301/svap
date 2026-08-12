/**
 * Fázy 4.3/4.4 doplnky na karte: polling rozpracovaných fotiek, neutrálna
 * hláška pri nedostupnom obsahu a vloženie zdieľania na vrch feedu.
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import toast from 'react-hot-toast';
import FeedPostCard from '../FeedPostCard';
import { getFeedPost, likeFeedPost, type FeedPost } from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  getFeedPost: jest.fn(),
  likeFeedPost: jest.fn(),
  unlikeFeedPost: jest.fn(),
  shareFeedPost: jest.fn(),
  listFeedPostComments: jest.fn(),
  createFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
  likeFeedPostComment: jest.fn(),
  unlikeFeedPostComment: jest.fn(),
  reportFeedPost: jest.fn(),
  FEED_COMMENT_MAX_LENGTH: 500,
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fallback: string) => fallback, locale: 'sk' }),
}));

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => (
      <div {...props}>{children}</div>
    ),
    article: ({ children, ...props }: React.ComponentProps<'article'>) => (
      <article {...props}>{children}</article>
    ),
  },
}));

const mockedGet = getFeedPost as jest.MockedFunction<typeof getFeedPost>;
const mockedLike = likeFeedPost as jest.MockedFunction<typeof likeFeedPost>;
const mockedToastError = toast.error as jest.MockedFunction<typeof toast.error>;

function makePost(overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    id: 1,
    post_type: 'free_post',
    caption: 'Ahoj',
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
    can_manage: false,
    created_at: '2026-01-01',
    ...overrides,
  } as FeedPost;
}

describe('FeedPostCard – spracovanie fotiek a chybové hlášky', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockedGet.mockReset();
    mockedLike.mockReset();
    mockedToastError.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('polls while a photo is still processing and stops once it is done', async () => {
    mockedGet.mockResolvedValue(
      makePost({
        can_manage: true,
        images: [{ id: 5, status: 'approved', large_url: 'https://cdn.test/a.webp' }],
      }),
    );

    render(
      <FeedPostCard
        post={makePost({ can_manage: true, images: [{ id: 5, status: 'pending' }] })}
      />,
    );
    expect(screen.getByTestId('feed-image-status')).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(2600);
    });

    // Fotka dobehla na pozadí – karta to zachytila bez reloadu.
    await waitFor(() =>
      expect(screen.queryByTestId('feed-image-status')).not.toBeInTheDocument(),
    );
    const callsAfterDone = mockedGet.mock.calls.length;

    // A polling sa zastavil, keď už nič rozpracované nie je.
    await act(async () => {
      jest.advanceTimersByTime(10000);
    });
    expect(mockedGet.mock.calls.length).toBe(callsAfterDone);
  });

  it('does not poll when there is nothing pending', async () => {
    render(
      <FeedPostCard
        post={makePost({
          can_manage: true,
          images: [{ id: 5, status: 'approved', large_url: 'https://cdn.test/a.webp' }],
        })}
      />,
    );

    await act(async () => {
      jest.advanceTimersByTime(10000);
    });

    expect(mockedGet).not.toHaveBeenCalled();
  });

  it('does not poll for a viewer who is not the author', async () => {
    // Cudziemu divákovi backend PENDING fotky ani neposiela – polling by bol
    // len zbytočná záťaž.
    render(
      <FeedPostCard
        post={makePost({ can_manage: false, images: [{ id: 5, status: 'pending' }] })}
      />,
    );

    await act(async () => {
      jest.advanceTimersByTime(10000);
    });

    expect(mockedGet).not.toHaveBeenCalled();
  });

  it('reports a blocked interaction as unavailable content, not as a save failure', async () => {
    jest.useRealTimers();
    mockedLike.mockRejectedValue({ response: { status: 404 } });

    render(<FeedPostCard post={makePost()} />);
    await userEvent.click(screen.getByTestId('feed-like-button'));

    // Neutrálne a zámerne neprezrádzajúce, že ide o blokovanie.
    await waitFor(() =>
      expect(mockedToastError).toHaveBeenCalledWith(
        'Tento obsah už nie je dostupný.',
      ),
    );
  });

  it('keeps the generic message for a plain network failure', async () => {
    jest.useRealTimers();
    mockedLike.mockRejectedValue(new Error('offline'));

    render(<FeedPostCard post={makePost()} />);
    await userEvent.click(screen.getByTestId('feed-like-button'));

    await waitFor(() =>
      expect(mockedToastError).toHaveBeenCalledWith('Akciu sa nepodarilo uložiť.'),
    );
  });
});
