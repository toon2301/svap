'use client';

import { PortfolioImageUploadItem } from './PortfolioImageUploadItem';
import type { PortfolioUploadQueueItem } from './usePortfolioImageUploadQueue';

type PortfolioImageUploadQueueProps = {
  items: PortfolioUploadQueueItem[];
  onRetry: (id: string) => void;
};

export function PortfolioImageUploadQueue({ items, onRetry }: PortfolioImageUploadQueueProps) {
  if (items.length === 0) return null;

  return (
    <div
      data-testid="portfolio-upload-queue"
      className="grid gap-3 md:grid-cols-2"
    >
      {items.map((item) => (
        <PortfolioImageUploadItem key={item.id} item={item} onRetry={onRetry} />
      ))}
    </div>
  );
}
