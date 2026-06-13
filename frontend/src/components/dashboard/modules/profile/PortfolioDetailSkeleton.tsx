'use client';

export function PortfolioDetailSkeleton() {
  return (
    <div
      data-testid="portfolio-detail-skeleton"
      className="mx-auto w-full max-w-5xl animate-pulse space-y-6 px-4 py-4 sm:px-6 lg:px-0"
    >
      <div className="h-9 w-24 rounded-full bg-gray-200 dark:bg-gray-800" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <div className="aspect-[16/9] rounded-3xl bg-gray-200 dark:bg-gray-800" />
        <div className="space-y-4">
          <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-8 w-4/5 rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-800" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="aspect-[4/3] rounded-2xl bg-gray-200 dark:bg-gray-800"
          />
        ))}
      </div>
    </div>
  );
}
