/**
 * Skeleton jednej feed karty.
 *
 * Vlastný súbor, lebo ho používa Nástenka aj profilové taby (Fáza 4.5) –
 * keby ostal lokálny vo FeedList, druhé miesto by si ho muselo skopírovať a
 * loading stav by sa časom rozišiel.
 */

export default function FeedCardSkeleton() {
  return (
    <div
      data-testid="feed-skeleton"
      className="animate-pulse overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-[#202223]"
    >
      <div className="flex items-center gap-3 p-4">
        <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-32 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-2.5 w-16 rounded bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>
      <div className="h-40 w-full bg-gray-100 dark:bg-gray-800" />
      <div className="space-y-2 p-4">
        <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}
