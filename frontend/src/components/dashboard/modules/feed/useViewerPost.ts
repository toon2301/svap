'use client';

/**
 * Príspevok pre mobilný prehliadač fotky (`FeedPhotoViewer`): príspevok karty so ŽIVÝMI fotkami.
 *
 * Karta drží `currentPost` ako lokálnu verziu príspevku, no fotky, ktoré sa po vytvorení príspevku ešte
 * spracúvali (`pending`), dosleduje polling (`usePendingFeedImages`) vo vlastnom stave a do `currentPost`
 * ich nevracia. Prehliadač, ktorý by dostal samotný `currentPost`, tak videl zastarané fotky bez adries,
 * `ImageLightbox` sa pri prázdnom zozname zatvoril hneď po otvorení a ťuk na hotovú fotku „nič neurobil“,
 * kým sa feed nenačítal znova.
 *
 * Objekt sa mení len pri zmene príspevku alebo fotiek, aby sa prehliadač (ktorý si pri zmene `post`
 * prebíja vlastnú kópiu) neprekresľoval zbytočne.
 */

import { useMemo } from 'react';
import type { FeedPost, FeedPostImage } from '@/lib/feedApi';

export function useViewerPost(post: FeedPost, images: FeedPostImage[]): FeedPost {
  return useMemo(() => (post.images === images ? post : { ...post, images }), [post, images]);
}
