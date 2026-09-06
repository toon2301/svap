'use client';

/**
 * Zdieľanie PRÍSPEVKU ďalej – tenký obal nad `FeedShareDialog`.
 *
 * Celé telo dialógu (text, emoji, tagovanie, náhľad, odosielanie) je spoločné
 * pre všetky tri zdroje; tu sa dopĺňa len náhľad príspevku a volanie API.
 */

import FeedShareDialog, { type FeedSharePreview } from './FeedShareDialog';
import { shareFeedPost, type FeedPost } from '@/lib/feedApi';

type FeedPostShareModalProps = {
  open: boolean;
  onClose: () => void;
  post: FeedPost;
  onShared?: (created: FeedPost) => void;
};

export default function FeedPostShareModal({
  open,
  onClose,
  post,
  onShared,
}: FeedPostShareModalProps) {
  // Pri zdieľaní zdieľania ukazujeme koreňový obsah, ktorý sa reálne prevezme
  // (backend reťazec sploští), nie medzičlánok.
  const shared = post.shared_content;
  const preview: FeedSharePreview = {
    type: 'feed_post',
    caption: shared ? shared.caption || shared.title : post.caption,
    // Prvá fotka nemusí mať náhľad (autor vidí aj pending/rejected, tie ho
    // nemajú) – hľadá sa teda prvá SPRACOVANÁ, nie doslova images[0].
    thumbnailUrl:
      shared?.thumbnail_url ||
      post.images?.find((image) => image.thumbnail_url)?.thumbnail_url ||
      null,
    owner: {
      displayName: shared?.owner_display_name || post.author?.display_name || '',
      avatarUrl: shared?.owner?.avatar_url ?? post.author?.avatar_url ?? null,
    },
  };

  return (
    <FeedShareDialog
      open={open}
      onClose={onClose}
      preview={preview}
      onShare={(caption, taggedUserIds) =>
        shareFeedPost(post.id, caption, taggedUserIds)
      }
      onShared={onShared}
    />
  );
}
