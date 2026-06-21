import axios, { type AxiosProgressEvent } from 'axios';
import { api, endpoints } from '@/lib/api';
import type { PortfolioImage, PortfolioImageStatus, PortfolioItem } from './portfolioTypes';

export type PortfolioItemPayload = {
  title: string;
  category: string;
  description: string;
};

export type PortfolioImageUploadInitPayload = {
  filename: string;
  content_type: string;
  size_bytes: number;
};

export type PortfolioImageUploadInitResponse = {
  url: string;
  fields: Record<string, string>;
  key: string;
  expires_in?: number;
  content_type?: string | null;
};

export type PortfolioImageUploadCompletePayload = {
  key: string;
  filename: string;
};

export type PortfolioImageUploadCompleteResponse = {
  id: number;
  status: PortfolioImageStatus;
  order?: number | null;
};

export type PortfolioImageReorderResponse = {
  images: PortfolioImage[];
};

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

export async function createPortfolioItem(payload: PortfolioItemPayload): Promise<PortfolioItem> {
  const { data } = await api.post<PortfolioItem>(endpoints.portfolio.list, payload);
  return data;
}

export async function updatePortfolioItem(
  itemId: number,
  payload: PortfolioItemPayload,
): Promise<PortfolioItem> {
  const endpoint = getPortfolioDetailEndpoint(itemId);
  if (!endpoint) {
    throw new Error('Invalid portfolio item id.');
  }

  const { data } = await api.patch<PortfolioItem>(endpoint, payload);
  return data;
}

export async function deletePortfolioItem(itemId: number): Promise<void> {
  const endpoint = getPortfolioDetailEndpoint(itemId);
  if (!endpoint) {
    throw new Error('Invalid portfolio item id.');
  }

  await api.delete(endpoint);
}

function requirePortfolioItemId(itemId: number): void {
  if (!Number.isInteger(itemId) || itemId < 1) {
    throw new Error('Invalid portfolio item id.');
  }
}

function requirePortfolioImageId(imageId: number): void {
  if (!Number.isInteger(imageId) || imageId < 1) {
    throw new Error('Invalid portfolio image id.');
  }
}

function requirePositiveIdList(ids: number[], label: string): void {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error(`Invalid ${label}.`);
  }
  ids.forEach((id) => {
    if (!Number.isInteger(id) || id < 1) {
      throw new Error(`Invalid ${label}.`);
    }
  });
  // Duplicitné ID by spôsobili nesprávne mapovanie poradia a zbytočný server request.
  if (new Set(ids).size !== ids.length) {
    throw new Error(`Duplicate ${label}.`);
  }
}

export async function uploadPortfolioImageInit(
  itemId: number,
  payload: PortfolioImageUploadInitPayload,
): Promise<PortfolioImageUploadInitResponse> {
  requirePortfolioItemId(itemId);
  const { data } = await api.post<PortfolioImageUploadInitResponse>(
    endpoints.portfolio.imageUploadInit(itemId),
    payload,
  );
  return data;
}

export async function uploadPortfolioImageToStorage(
  upload: PortfolioImageUploadInitResponse,
  file: File,
  onProgress?: (progress: number) => void,
): Promise<void> {
  const formData = new FormData();
  Object.entries(upload.fields || {}).forEach(([key, value]) => {
    formData.append(key, value);
  });
  formData.append('file', file);

  await axios.post(upload.url, formData, {
    withCredentials: false,
    timeout: 60000,
    onUploadProgress: (event: AxiosProgressEvent) => {
      const total = event.total || file.size;
      if (!total) return;
      const progress = Math.min(100, Math.max(0, Math.round((event.loaded / total) * 100)));
      onProgress?.(progress);
    },
  });
}

export async function uploadPortfolioImageComplete(
  itemId: number,
  payload: PortfolioImageUploadCompletePayload,
): Promise<PortfolioImageUploadCompleteResponse> {
  requirePortfolioItemId(itemId);
  const { data } = await api.post<PortfolioImageUploadCompleteResponse>(
    endpoints.portfolio.imageUploadComplete(itemId),
    payload,
  );
  return data;
}

export async function deletePortfolioImage(itemId: number, imageId: number): Promise<void> {
  requirePortfolioItemId(itemId);
  requirePortfolioImageId(imageId);
  await api.delete(endpoints.portfolio.imageDetail(itemId, imageId));
}

export async function setPortfolioCoverImage(
  itemId: number,
  imageId: number,
): Promise<PortfolioImage | null> {
  requirePortfolioItemId(itemId);
  requirePortfolioImageId(imageId);
  const { data } = await api.patch<{ cover_image?: PortfolioImage | null }>(
    endpoints.portfolio.imageCover(itemId, imageId),
    {},
  );
  return data.cover_image ?? null;
}

export async function reorderPortfolioImages(
  itemId: number,
  imageIds: number[],
): Promise<PortfolioImage[]> {
  requirePortfolioItemId(itemId);
  requirePositiveIdList(imageIds, 'portfolio image ids');
  const { data } = await api.patch<PortfolioImageReorderResponse>(
    endpoints.portfolio.imageReorder(itemId),
    { image_ids: imageIds },
  );
  return Array.isArray(data.images) ? data.images : [];
}

export async function reorderPortfolioItems(itemIds: number[]): Promise<PortfolioItem[]> {
  requirePositiveIdList(itemIds, 'portfolio item ids');
  const { data } = await api.patch<PortfolioItem[]>(
    endpoints.portfolio.reorder,
    { item_ids: itemIds },
  );
  return Array.isArray(data) ? data : [];
}

export async function uploadPortfolioImageFile(
  itemId: number,
  file: File,
  onProgress?: (progress: number) => void,
): Promise<PortfolioImageUploadCompleteResponse> {
  const upload = await uploadPortfolioImageInit(itemId, {
    filename: file.name,
    content_type: file.type || 'application/octet-stream',
    size_bytes: file.size,
  });
  await uploadPortfolioImageToStorage(upload, file, onProgress);
  return uploadPortfolioImageComplete(itemId, {
    key: upload.key,
    filename: file.name,
  });
}
