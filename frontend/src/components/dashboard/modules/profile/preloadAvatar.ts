const activeAvatarPreloads = new Set<HTMLImageElement>();

function normalizeAvatarUrl(rawUrl?: string | null): string | null {
  const value = String(rawUrl || '').trim();
  if (!value || typeof window === 'undefined') return null;

  try {
    const parsed = new URL(value, window.location.origin);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.href;
  } catch {
    return null;
  }
}

/** Starts downloading a known avatar while the destination profile is loading. */
export function preloadProfileAvatar(rawUrl?: string | null): void {
  const url = normalizeAvatarUrl(rawUrl);
  if (!url || typeof Image === 'undefined') return;

  const image = new Image();
  const release = () => activeAvatarPreloads.delete(image);
  image.decoding = 'async';
  image.referrerPolicy = 'no-referrer';
  image.onload = release;
  image.onerror = release;
  activeAvatarPreloads.add(image);
  image.src = url;
}
