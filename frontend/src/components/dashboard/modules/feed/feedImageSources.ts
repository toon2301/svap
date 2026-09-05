'use client';

/**
 * Ktoré fotky príspevku sa dajú naozaj zobraziť – jedno pravidlo pre kartu aj
 * pre prehliadač fotiek.
 *
 * Zamietnuté sa nezobrazujú nikde (cudziemu divákovi ich backend ani
 * neposiela) a rozpracovaná fotka ešte nemá URL, takže sa dá ukázať len ako
 * stavová plocha na karte – otvoriť sa nedá. Keby si toto pravidlo držala
 * karta a prehliadač zvlášť, rozišli by sa im indexy a klik na tretiu fotku by
 * otvoril inú.
 */

import type { FeedPost, FeedPostImage } from '@/lib/feedApi';

/** Veľká varianta, inak náhľad; prázdny reťazec = fotka sa ešte spracúva. */
export function feedImageSrc(image: FeedPostImage): string {
  return image.large_url || image.thumbnail_url || '';
}

/** Fotky, ktoré karta vykresľuje (vrátane rozpracovaných stavových plôch). */
export function feedSlideImages(images: FeedPostImage[]): FeedPostImage[] {
  return images.filter((image) => image.status !== 'rejected');
}

/** Fotky, ktoré sa dajú otvoriť v prehliadači (majú URL). */
export function feedViewableImages(images: FeedPostImage[]): FeedPostImage[] {
  return feedSlideImages(images).filter((image) => feedImageSrc(image));
}

/** URL otvárateľných fotiek v poradí zobrazenia. */
export function feedViewableSources(images: FeedPostImage[]): string[] {
  return feedViewableImages(images).map(feedImageSrc);
}

/**
 * Fotka PÔVODNÉHO príspevku vnútri repostu.
 *
 * Zdieľaný snapshot nesie jediný náhľad (`shared_thumbnail_key` na backende =
 * prvá schválená fotka), takže tu nejde o zoznam – len o odpoveď „má tento
 * repost fotku, a ku ktorému príspevku patrí".
 *
 * Odpoveď potrebujú tri miesta: rozhodnutie o dvojstĺpcovom rozložení
 * (repostovaný foto príspevok ho má dostať rovnako ako bežný), vykreslenie
 * náhľadu a otvorenie fotoprehliadača PÔVODNÉHO príspevku.
 *
 * Platí LEN pre zdieľaný príspevok: ponuka a portfólio majú malý náhľad
 * v kompaktnej karte, nie fotku na šírku.
 */
export function sharedFeedPostPhoto(
  post: FeedPost | null | undefined,
): { postId: number; thumbnailUrl: string } | null {
  const shared = post?.shared_content;
  if (!shared || shared.type !== 'feed_post') return null;
  if (post?.shared_content_unavailable) return null;
  const thumbnailUrl = (shared.thumbnail_url || '').trim();
  if (!thumbnailUrl || shared.id == null) return null;
  return { postId: shared.id, thumbnailUrl };
}
