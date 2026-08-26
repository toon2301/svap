'use client';

/**
 * Výber fotiek pre príspevok – pravidlá spoločné composeru aj úprave.
 *
 * Formát a veľkosť sa kontrolujú UŽ PRI VÝBERE, nie až pri odosielaní: pri
 * vytváraní by odmietnutie zo servera nechalo používateľa s hotovým príspevkom
 * bez očakávanej fotky, pri úprave by prišlo uprostred ukladacej sekvencie.
 * Skutočnú validáciu robí backend tak či tak (upload-init aj upload-complete).
 *
 * Helper LEN triedi a hlási; toasty, reset inputu a stav si rieši volajúci –
 * composer a edit modal ich majú inak.
 */

import {
  FEED_IMAGE_MAX_BYTES,
  FEED_IMAGE_MAX_MB,
  MAX_FEED_POST_IMAGES,
  isAllowedFeedImageName,
} from '@/lib/feedImageUpload';

/** Prečo bol súbor odmietnutý – volajúci k tomu doplní vlastnú hlášku. */
export type FeedImagePickRejection = 'bad_type' | 'too_large';

export type FeedImagePickResult = {
  /** Súbory, ktoré prešli a zmestili sa do voľných miest. */
  accepted: File[];
  /** Odmietnuté súbory aj s dôvodom, v poradí výberu. */
  rejected: { file: File; reason: FeedImagePickRejection }[];
  /**
   * Výber presiahol voľné miesta – prebytok je zahodený.
   * (Limit sám je `MAX_FEED_POST_IMAGES`.)
   */
  overLimit: boolean;
};

/** Hláška k dôvodu odmietnutia – rovnaké texty v composeri aj pri úprave. */
export function imagePickError(
  t: (key: string, fallback: string) => string,
  reason: FeedImagePickRejection,
): string {
  if (reason === 'too_large') {
    return t(
      'feed.composerImageTooLarge',
      'Fotka je príliš veľká. Maximum je {max} MB.',
    ).replace('{max}', String(FEED_IMAGE_MAX_MB));
  }
  return t('feed.composerImageBadType', 'Tento formát fotky nie je podporovaný.');
}

export function pickFeedImages(
  files: File[],
  remainingSlots: number,
): FeedImagePickResult {
  const accepted: File[] = [];
  const rejected: FeedImagePickResult['rejected'] = [];

  for (const candidate of files) {
    if (!isAllowedFeedImageName(candidate.name)) {
      rejected.push({ file: candidate, reason: 'bad_type' });
      continue;
    }
    if (candidate.size > FEED_IMAGE_MAX_BYTES) {
      rejected.push({ file: candidate, reason: 'too_large' });
      continue;
    }
    accepted.push(candidate);
  }

  const room = Math.max(Math.min(remainingSlots, MAX_FEED_POST_IMAGES), 0);
  return {
    accepted: accepted.slice(0, room),
    rejected,
    overLimit: accepted.length > room,
  };
}
