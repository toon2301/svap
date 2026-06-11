import { api, endpoints } from '@/lib/api';
import type { PortfolioItem } from './portfolioTypes';

type ListPortfolioParams = {
  isOwner: boolean;
  ownerUserId?: number;
  ownerSlug?: string | null;
};

function normalizeSlug(slug?: string | null): string | null {
  const value = String(slug || '').trim();
  return value || null;
}

export function getPortfolioListEndpoint({
  isOwner,
  ownerUserId,
  ownerSlug,
}: ListPortfolioParams): string | null {
  if (isOwner) return endpoints.portfolio.list;

  const slug = normalizeSlug(ownerSlug);
  if (slug) return endpoints.portfolio.userListBySlug(slug);
  if (typeof ownerUserId === 'number' && Number.isFinite(ownerUserId)) {
    return endpoints.portfolio.userList(ownerUserId);
  }
  return null;
}

export async function listProfilePortfolio(params: ListPortfolioParams): Promise<PortfolioItem[]> {
  const endpoint = getPortfolioListEndpoint(params);
  if (!endpoint) return [];

  const { data } = await api.get<PortfolioItem[]>(endpoint);
  return Array.isArray(data) ? data : [];
}
