/**
 * Upload fotiek k feed príspevku – init → priamy POST do S3 → complete.
 *
 * Rovnaký reťazec ako `offerImageUpload`, ale BEZ multipart fallbacku: feed
 * upload-init žiadnu legacy vetvu na backende nemá (viď docstring
 * `accounts/views/feed_uploads.py`), takže by fallback volal endpoint, ktorý
 * neexistuje. Nenakonfigurované úložisko preto necháme prebublať ako chybu.
 *
 * Od Fázy 4.4 je limit 5 fotiek a endpointy sú per-obrázok: init si najprv
 * vypýta `image_id`, complete potom cieli naň. Príspevok musí v DB existovať
 * PRED volaním – S3 kľúč je odvodený z jeho id.
 */

import api, { endpoints } from './api';

type FeedUploadInitResponse = {
  image_id: number;
  url: string;
  fields: Record<string, string>;
  key: string;
  expires_in: number;
};

export type FeedUploadCompleteResponse = {
  id: number;
  post_id: number;
  status: string;
};

/** Zhodné s MAX_FEED_POST_IMAGES na backende – limit validuje aj BE. */
export const MAX_FEED_POST_IMAGES = 5;

/**
 * Zrkadlí backendové `max_image_bytes()` / `allowed_image_extensions()`
 * (settings IMAGE_MAX_SIZE_MB, default 5). Slúži LEN na okamžitú spätnú väzbu
 * pri výbere súboru – skutočnú validáciu robí upload-init aj upload-complete.
 */
export const FEED_IMAGE_MAX_MB = 5;
export const FEED_IMAGE_MAX_BYTES = FEED_IMAGE_MAX_MB * 1024 * 1024;
export const FEED_IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.heic',
  '.heif',
] as const;
/**
 * ZÁMERNE bez `image/*` – ten by v dialógu ponúkol aj BMP/TIFF/SVG, ktoré
 * backend odmietne až pri uploade, teda keď príspevok už existuje.
 */
export const FEED_IMAGE_ACCEPT = FEED_IMAGE_EXTENSIONS.join(',');

/** `accept` sa dá v dialógu obísť („všetky súbory"), preto vlastná kontrola. */
export function isAllowedFeedImageName(filename: string): boolean {
  const dot = filename.lastIndexOf('.');
  if (dot < 0) return false;
  return (FEED_IMAGE_EXTENSIONS as readonly string[]).includes(
    filename.slice(dot).toLowerCase(),
  );
}

/** Zaseknutý upload musí spadnúť, inak by tlačidlo ostalo navždy v loadingu. */
export const FEED_UPLOAD_TIMEOUT_MS = 60_000;

export async function uploadFeedPostImage(
  postId: number,
  file: File,
): Promise<FeedUploadCompleteResponse> {
  const { data: init } = await api.post<FeedUploadInitResponse>(
    endpoints.feed.postImagesUploadInit(postId),
    {
      filename: file.name,
      content_type: file.type || '',
      size_bytes: file.size,
    },
  );

  if (!init?.url || !init?.fields || !init?.key || !init?.image_id) {
    throw new Error('Feed image upload init failed: invalid response');
  }

  const form = new FormData();
  for (const [key, value] of Object.entries(init.fields)) form.append(key, value);
  // `file` musí ísť POSLEDNÉ – S3 ignoruje polia, ktoré prídu za súborom.
  form.append('file', file);

  const response = await fetch(init.url, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(FEED_UPLOAD_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`S3 upload failed (${response.status})`);
  }

  const { data } = await api.post<FeedUploadCompleteResponse>(
    endpoints.feed.postImageUploadComplete(postId, init.image_id),
    { key: init.key, filename: file.name },
  );
  return data;
}

export type FeedImageUploadFailure = { file: File; error: unknown };

/**
 * Nahrá vybrané fotky POSTUPNE (nie paralelne).
 *
 * Sekvenčne zámerne: `onProgress` vie potom hlásiť „nahrávam 2 z 4", chyba sa
 * dá priradiť ku konkrétnemu súboru a nezaťažíme spojenie piatimi uploadmi
 * naraz. Jedna zlyhaná fotka ostatné NEzastaví – volajúci dostane zoznam tých,
 * ktoré neprešli, a vie ich pomenovať.
 */
export async function uploadFeedPostImages(
  postId: number,
  files: File[],
  onProgress?: (uploaded: number, total: number) => void,
): Promise<FeedImageUploadFailure[]> {
  const failures: FeedImageUploadFailure[] = [];
  for (let index = 0; index < files.length; index += 1) {
    onProgress?.(index + 1, files.length);
    try {
      await uploadFeedPostImage(postId, files[index]);
    } catch (error) {
      failures.push({ file: files[index], error });
    }
  }
  return failures;
}
