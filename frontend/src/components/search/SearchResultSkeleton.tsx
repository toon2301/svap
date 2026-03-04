export function SearchResultSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-black">
      {/* Image placeholder */}
      <div
        className="aspect-[3/2] bg-gray-200 dark:bg-gray-700 animate-pulse rounded-t-2xl"
        aria-hidden
      />
      {/* Content placeholder */}
      <div className="p-3 flex flex-col gap-3">
        {/* Label */}
        <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" aria-hidden />
        {/* Title */}
        <div className="h-4 w-full max-w-[85%] bg-gray-200 dark:bg-gray-700 animate-pulse rounded" aria-hidden />
        {/* Text lines */}
        <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 animate-pulse rounded" aria-hidden />
        <div className="h-3 w-2/3 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" aria-hidden />
        {/* Price */}
        <div className="h-8 w-20 ml-auto bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg" aria-hidden />
      </div>
    </div>
  );
}
