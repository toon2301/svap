import type { PortfolioImage, PortfolioItem } from './portfolioTypes';

export function portfolioImageKey(image: PortfolioImage, index: number): string {
  if (typeof image.id === 'number') return `id:${image.id}`;
  return `index:${index}`;
}

export function isActivePortfolioImage(image: PortfolioImage): boolean {
  return image.status === 'pending' || image.status === 'approved' || image.status == null;
}

export function portfolioImagePreviewSrc(image: PortfolioImage): string {
  return (
    String(image.thumbnail_url || '').trim() ||
    String(image.medium_url || '').trim() ||
    String(image.image_url || '').trim() ||
    String(image.large_url || '').trim()
  );
}

export function uniquePortfolioImages(item: PortfolioItem): PortfolioImage[] {
  const images = [item.cover_image ?? null, ...(item.images || [])];
  const seen = new Set<string>();
  const unique: PortfolioImage[] = [];

  images.forEach((image, index) => {
    if (!image) return;
    const key = portfolioImageKey(image, index);
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(image);
  });

  return unique.sort((left, right) => {
    const leftOrder = typeof left.order === 'number' ? left.order : Number.MAX_SAFE_INTEGER;
    const rightOrder = typeof right.order === 'number' ? right.order : Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder;
  });
}
