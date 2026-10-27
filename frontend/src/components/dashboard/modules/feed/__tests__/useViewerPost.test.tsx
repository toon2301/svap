import { renderHook } from '@testing-library/react';
import type { FeedPost, FeedPostImage } from '@/lib/feedApi';
import { useViewerPost } from '../useViewerPost';

const pending = { id: 1, status: 'pending' } as FeedPostImage;
const approved = { id: 1, status: 'approved', large_url: 'https://cdn.test/a.webp' } as FeedPostImage;

function makePost(images: FeedPostImage[]): FeedPost {
  return { id: 7, post_type: 'free_post', caption: 'Text', images } as FeedPost;
}

describe('useViewerPost', () => {
  it('returns the very same post when its photos are already the live ones', () => {
    const post = makePost([approved]);

    const { result } = renderHook(() => useViewerPost(post, post.images));

    expect(result.current === post).toBe(true);
  });

  it('returns the post with the live photos when polling finished a photo the card still holds as pending', () => {
    const post = makePost([pending]);
    const live = [approved];

    const { result } = renderHook(() => useViewerPost(post, live));

    expect(result.current === post).toBe(false);
    expect(result.current.images).toBe(live);
    expect(result.current.id).toBe(7);
    expect(result.current.caption).toBe('Text');
    expect(post.images[0].status).toBe('pending');
  });

  it('keeps the same object between renders while neither the post nor the photos change', () => {
    const post = makePost([pending]);
    const live = [approved];

    const { result, rerender } = renderHook(() => useViewerPost(post, live));
    const first = result.current;
    rerender();

    expect(result.current === first).toBe(true);
  });

  it('follows a newer set of live photos', () => {
    const post = makePost([pending]);
    const { result, rerender } = renderHook(({ live }) => useViewerPost(post, live), {
      initialProps: { live: [pending] },
    });
    const next = [approved, { ...approved, id: 2 }];

    rerender({ live: next });

    expect(result.current.images).toBe(next);
  });
});
