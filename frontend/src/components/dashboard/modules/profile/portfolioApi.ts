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
  if (!Array.isArray(data)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Unexpected portfolio list response shape.', { endpoint, data });
    }
    return [];
  }
  return data;
}

export function getPortfolioDetailEndpoint(itemId: number): string | null {
  if (!Number.isInteger(itemId) || itemId < 1) return null;
  return endpoints.portfolio.detail(itemId);
}

export async function getPortfolioItem(itemId: number): Promise<PortfolioItem> {
  const endpoint = getPortfolioDetailEndpoint(itemId);
  if (!endpoint) {
    throw new Error('Invalid portfolio item id.');
  }

  const { data } = await api.get<PortfolioItem>(endpoint);
  return data;
}
