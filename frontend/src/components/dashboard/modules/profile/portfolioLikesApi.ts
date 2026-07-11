import { api, endpoints } from '@/lib/api';

export type PortfolioLikeResponse = {
  portfolio_item_id: number;
  is_liked_by_me: boolean;
  likes_count: number;
};

function assertValidPortfolioItemId(itemId: number): void {
  if (!Number.isSafeInteger(itemId) || itemId < 1) {
    throw new Error('Invalid portfolio item id');
  }
}

export async function setPortfolioLikeState(
  itemId: number,
  shouldLike: boolean,
): Promise<PortfolioLikeResponse> {
  assertValidPortfolioItemId(itemId);
  const endpoint = endpoints.portfolio.like(itemId);
  const response = shouldLike
    ? await api.post<PortfolioLikeResponse>(endpoint)
    : await api.delete<PortfolioLikeResponse>(endpoint);

  return response.data;
}
