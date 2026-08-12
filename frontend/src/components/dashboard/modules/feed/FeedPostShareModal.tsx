'use client';

/**
 * Zdieľanie PRÍSPEVKU ďalej – tenký obal nad `FeedShareDialog`.
 *
 * Celé telo dialógu (text, emoji, tagovanie, náhľad, odosielanie) je spoločné
 * pre všetky tri zdroje; tu sa dopĺňa len náhľad príspevku a volanie API.
 */

import FeedShareDialog from './FeedShareDialog';
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
  const preview = {
    showAvatar: true,
    heading:
      post.shared_content?.owner_display_name || post.author?.display_name || '',
    text: post.shared_content
      ? post.shared_content.caption || post.shared_content.title
      : post.caption,
    // Prvá fotka nemusí mať náhľad (autor vidí aj pending/rejected, tie ho
    // nemajú) – hľadá sa teda prvá SPRACOVANÁ, nie doslova images[0].
    thumbnailUrl:
      post.shared_content?.thumbnail_url ||
      post.images?.find((image) => image.thumbnail_url)?.thumbnail_url ||
      null,
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
