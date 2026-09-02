import { OFFER_WATCH_NEW_MATCH_HOURS, type OfferWatchMatch } from './types';

const NEW_MATCH_WINDOW_MS = OFFER_WATCH_NEW_MATCH_HOURS * 60 * 60 * 1000;

export function isOfferWatchMatchNew(
  match: Pick<OfferWatchMatch, 'createdAt'>,
  now: number = Date.now(),
): boolean {
  const createdAt = Date.parse(match.createdAt);
  if (!Number.isFinite(createdAt) || !Number.isFinite(now)) return false;
  const age = now - createdAt;
  return age >= 0 && age < NEW_MATCH_WINDOW_MS;
}

