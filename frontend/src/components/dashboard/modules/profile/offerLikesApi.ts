import { api, endpoints } from '@/lib/api';

export type OfferLikeResponse = {
  offer_id: number;
  is_liked_by_me: boolean;
  likes_count: number;
};

function assertValidOfferId(offerId: number): void {
  if (!Number.isSafeInteger(offerId) || offerId < 1) {
    throw new Error('Invalid offer id');
  }
}

export async function setOfferLikeState(
  offerId: number,
  shouldLike: boolean,
): Promise<OfferLikeResponse> {
  assertValidOfferId(offerId);
  const endpoint = endpoints.skills.like(offerId);
  const response = shouldLike
    ? await api.post<OfferLikeResponse>(endpoint)
    : await api.delete<OfferLikeResponse>(endpoint);

  return response.data;
}
