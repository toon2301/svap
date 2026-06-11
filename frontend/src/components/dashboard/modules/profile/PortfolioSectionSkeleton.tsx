'use client';

function PortfolioSkeletonCard({ featured = false }: { featured?: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white/70 shadow-sm dark:border-gray-800 dark:bg-[#0f0f10]">
      <div
        className={`${featured ? 'aspect-[16/9]' : 'aspect-[4/3]'} animate-pulse bg-gray-200 dark:bg-gray-700/60`}
        aria-hidden="true"
      />
      <div className="space-y-2 p-4">
        <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700/60" aria-hidden="true" />
        <div className="h-3 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700/60" aria-hidden="true" />
      </div>
    </div>
  );
}

export function PortfolioSectionSkeleton() {
  return (
    <div
      data-testid="portfolio-section-skeleton"
      className="mt-4 space-y-4"
      aria-hidden="true"
    >
      <PortfolioSkeletonCard featured />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((index) => (
          <PortfolioSkeletonCard key={index} />
        ))}
      </div>
    </div>
  );
}
