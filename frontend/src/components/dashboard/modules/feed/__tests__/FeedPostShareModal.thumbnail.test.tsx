/**
 * Náhľad príspevku v okne zdieľania (nález 274): fotka z hostu backendu sa načíta cez doménu frontendu, aby s požiadavkou
 * išlo prihlasovacie cookie. Inak by autor súkromného profilu pri zdieľaní vlastného príspevku videl pokazený náhľad.
 */

import { render } from '@testing-library/react';
import FeedPostShareModal from '../FeedPostShareModal';
import type { FeedPost } from '@/lib/feedApi';
import type { FeedSharePreview } from '../FeedShareDialog';

let capturedPreview: FeedSharePreview | null = null;

jest.mock('../FeedShareDialog', () => ({
  __esModule: true,
  default: ({ preview }: { preview: FeedSharePreview }) => {
    capturedPreview = preview;
    return null;
  },
}));

jest.mock('@/lib/feedApi', () => ({
  shareFeedPost: jest.fn(),
}));

const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

beforeEach(() => {
  capturedPreview = null;
  process.env.NEXT_PUBLIC_API_URL = '/api';
});

afterEach(() => {
  if (originalApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
  else process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
});

/** Voľný príspevok s jednou schválenou fotkou, ktorej adresa smeruje na host backendu. */
function freePostWithPhoto(): FeedPost {
  return {
    id: 5,
    post_type: 'free_post',
    caption: 'Text',
    author: { id: 1, display_name: 'Jana', slug: 'jana', user_type: 'individual', avatar_url: null },
    images: [
      {
        id: 9,
        thumbnail_url: 'https://backend.example.up.railway.app/api/auth/feed/posts/5/images/9/file/?variant=thumbnail',
        large_url: 'https://backend.example.up.railway.app/api/auth/feed/posts/5/images/9/file/?variant=large',
      },
    ],
    shared_content: null,
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 0,
    comments_count: 0,
    is_liked_by_me: false,
    can_manage: true,
    created_at: '2026-01-01T10:00:00Z',
  } as FeedPost;
}

describe('FeedPostShareModal: náhľad fotky', () => {
  it('fotku príspevku v náhľade načíta cez doménu frontendu', () => {
    render(<FeedPostShareModal open onClose={jest.fn()} post={freePostWithPhoto()} />);

    expect(capturedPreview?.thumbnailUrl).toBe('/api/auth/feed/posts/5/images/9/file/?variant=thumbnail');
  });

  it('príspevok bez schválenej fotky nemá náhľad', () => {
    const post = { ...freePostWithPhoto(), images: [{ id: 9, status: 'pending' as const }] };
    render(<FeedPostShareModal open onClose={jest.fn()} post={post as FeedPost} />);

    expect(capturedPreview?.thumbnailUrl).toBeNull();
  });
});
