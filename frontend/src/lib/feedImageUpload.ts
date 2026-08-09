/**
 * Upload fotky k feed príspevku – init → priamy POST do S3 → complete.
 *
 * Rovnaký reťazec ako `offerImageUpload`, ale BEZ multipart fallbacku: feed
 * upload-init žiadnu legacy vetvu na backende nemá (viď docstring
 * `accounts/views/feed_uploads.py`), takže by fallback volal endpoint, ktorý
 * neexistuje. Nenakonfigurované úložisko preto necháme prebublať ako chybu.
 *
 * Príspevok musí v DB existovať PRED volaním – S3 kľúč je odvodený z jeho id.
 */

import api, { endpoints } from './api';

type FeedUploadInitResponse = {
  url: string;
  fields: Record<string, string>;
  key: string;
  expires_in: number;
};

export type FeedUploadCompleteResponse = {
  id: number;
  image_status: string;
};

/** Backend prijíma práve jednu fotku na príspevok (max 1, viď feed_uploads). */
export const FEED_POST_MAX_IMAGES = 1;

/**
 * Zrkadlí backendové `max_image_bytes()` / `allowed_image_extensions()`
 * (settings IMAGE_MAX_SIZE_MB, default 5). Slúži LEN na okamžitú spätnú väzbu
 * pri výbere súboru – skutočnú validáciu robí upload-init aj upload-complete.
 */
export const FEED_IMAGE_MAX_MB = 5;
export const FEED_IMAGE_MAX_BYTES = FEED_IMAGE_MAX_MB * 1024 * 1024;
export const FEED_IMAGE_ACCEPT =
  '.jpg,.jpeg,.png,.gif,.webp,.heic,.heif,image/*';

export async function uploadFeedPostImage(
  postId: number,
  file: File,
): Promise<FeedUploadCompleteResponse> {
  const { data: init } = await api.post<FeedUploadInitResponse>(
    endpoints.feed.postImageUploadInit(postId),
    {
      filename: file.name,
      content_type: file.type || '',
      size_bytes: file.size,
    },
  );

  if (!init?.url || !init?.fields || !init?.key) {
    throw new Error('Feed image upload init failed: invalid response');
  }

  const form = new FormData();
  for (const [key, value] of Object.entries(init.fields)) form.append(key, value);
  // `file` musí ísť POSLEDNÉ – S3 ignoruje polia, ktoré prídu za súborom.
  form.append('file', file);

  const response = await fetch(init.url, { method: 'POST', body: form });
  if (!response.ok) {
    throw new Error(`S3 upload failed (${response.status})`);
  }

  const { data } = await api.post<FeedUploadCompleteResponse>(
    endpoints.feed.postImageUploadComplete(postId),
    { key: init.key, filename: file.name },
  );
  return data;
}
