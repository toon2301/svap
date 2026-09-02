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

import type { FeedPostImage } from '@/lib/feedApi';

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
