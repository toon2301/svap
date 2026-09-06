'use client';

/**
 * Zdieľanie PRÍSPEVKU ďalej – tenký obal nad `FeedShareDialog`.
 *
 * Celé telo dialógu (text, emoji, tagovanie, náhľad, odosielanie) je spoločné
 * pre všetky tri zdroje; tu sa dopĺňa len náhľad príspevku a volanie API.
 */

import FeedShareDialog, { type FeedSharePreview } from './FeedShareDialog';
import { sharedContentCardFromPost } from './sharedContentCard';
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
  // (backend reťazec sploští v `_flatten_reshare`), nie medzičlánok. Nový
  // príspevok pritom preberá aj TYP medzičlánku – zdieľanie ponuky ostane
  // ponukou – takže náhľad musí vychádzať zo skutočného snapshotu, nie
  // z predpokladu „vždy príspevok". Inak dialóg ukáže názov ponuky ako
  // obyčajný text, bez Ponúkam/Hľadám a bez ceny, hoci po potvrdení pristane
  // vo feede plnohodnotná karta ponuky.
  //
  // Ten istý mapper, aký kŕmi kartu vo feede – náhľad a výsledok tak nemajú
  // ako povedať dve rôzne veci.
  const shared = sharedContentCardFromPost(post);
  const preview: FeedSharePreview = shared ?? {
    // Bez snapshotu ide o naozaj voľný príspevok: koreňom je on sám.
    type: 'feed_post',
    caption: post.caption,
    // Prvá fotka nemusí mať náhľad (autor vidí aj pending/rejected, tie ho
    // nemajú) – hľadá sa teda prvá SPRACOVANÁ, nie doslova images[0].
    thumbnailUrl:
      post.images?.find((image) => image.thumbnail_url)?.thumbnail_url ?? null,
    owner: {
      displayName: post.author?.display_name || '',
      avatarUrl: post.author?.avatar_url ?? null,
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
