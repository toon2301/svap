import type { PortfolioImage, PortfolioItem } from './portfolioTypes';

export type PortfolioDisplayImage = {
  key: string;
  id?: number;
  mediumSrc: string;
  largeSrc: string;
  order: number;
};

function cleanUrl(value?: string | null): string {
  return String(value || '').trim();
}

export function getPortfolioCategoryLabel(
  t: (key: string, fallback?: string) => string,
  category: string,
): string {
  const key = `skillsCatalog.categories.${category}`;
  const translated = t(key);
  if (translated !== key) return translated;
  return category
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getMediumSrc(image: PortfolioImage): string {
  return cleanUrl(image.medium_url) || cleanUrl(image.image_url) || cleanUrl(image.thumbnail_url);
}

function getLargeSrc(image: PortfolioImage): string {
  return cleanUrl(image.large_url) || cleanUrl(image.medium_url) || cleanUrl(image.image_url);
}

function imageIdentity(image: PortfolioImage, mediumSrc: string, largeSrc: string): string {
  if (typeof image.id === 'number') return `id:${image.id}`;
  return `src:${largeSrc || mediumSrc}`;
}

export function preparePortfolioDisplayImages(item: PortfolioItem): PortfolioDisplayImage[] {
  const sourceImages = [
    item.cover_image ?? null,
    ...(item.images || []).slice().sort((left, right) => {
      const leftOrder = typeof left.order === 'number' ? left.order : Number.MAX_SAFE_INTEGER;
      const rightOrder = typeof right.order === 'number' ? right.order : Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder;
    }),
  ];
  const seen = new Set<string>();
  const displayImages: PortfolioDisplayImage[] = [];

  sourceImages.forEach((image, index) => {
    if (!image) return;
    if (image.status && image.status !== 'approved') return;
    const mediumSrc = getMediumSrc(image);
    const largeSrc = getLargeSrc(image);
    if (!mediumSrc && !largeSrc) return;

    const identity = imageIdentity(image, mediumSrc, largeSrc);
    if (seen.has(identity)) return;
    seen.add(identity);

    displayImages.push({
      key: identity,
      id: image.id,
      mediumSrc: mediumSrc || largeSrc,
      largeSrc: largeSrc || mediumSrc,
      order: typeof image.order === 'number' ? image.order : index,
    });
  });

  return displayImages;
}

export function formatPortfolioPhotoCounter(
  template: string,
  current: number,
  total: number,
): string {
  return template
    .replace('{current}', String(current))
    .replace('{total}', String(total));
}
