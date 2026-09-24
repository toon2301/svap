import { OFFER_WATCH_NEW_MATCH_HOURS, type OfferWatchMatch } from './types';

const NEW_MATCH_WINDOW_MS = OFFER_WATCH_NEW_MATCH_HOURS * 60 * 60 * 1000;

export function isOfferWatchMatchNew(
  match: Pick<OfferWatchMatch, 'createdAt'>,
  watchUpdatedAt: string,
  now: number = Date.now(),
): boolean {
  const createdAt = Date.parse(match.createdAt);
  const watchActivatedAt = Date.parse(watchUpdatedAt);
  if (
    !Number.isFinite(createdAt)
    || !Number.isFinite(watchActivatedAt)
    || !Number.isFinite(now)
  ) {
    return false;
  }
  const age = now - createdAt;
  return createdAt > watchActivatedAt && age >= 0 && age < NEW_MATCH_WINDOW_MS;
}
