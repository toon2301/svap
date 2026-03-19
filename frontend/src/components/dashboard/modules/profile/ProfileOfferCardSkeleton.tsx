'use client';

/**
 * Skeleton pre kartu ponuky v profile – rovnaký layout ako ProfileOfferCard.
 * Používa sa pri načítavaní ponúk (vlastný aj cudzí profil).
 */
export function ProfileOfferCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-[#0f0f10] shadow-sm">
      {/* Obrázok */}
      <div
        className="aspect-[3/2] bg-gray-200 dark:bg-gray-700/60 animate-pulse rounded-t-2xl"
        aria-hidden
      />
      {/* Obsah – zodpovedá h-52 a p-3 z OfferCardFront */}
      <div className="relative p-3 flex flex-col h-52 border-t border-gray-200 dark:border-gray-700/50">
        {/* Flip button placeholder */}
        <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700/60 animate-pulse" aria-hidden />
        <div className="flex-1 flex flex-col gap-2 pt-1">
          {/* Label */}
          <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700/60 animate-pulse rounded" aria-hidden />
          {/* Nadpis */}
          <div className="h-4 w-full max-w-[90%] bg-gray-200 dark:bg-gray-700/60 animate-pulse rounded" aria-hidden />
        </div>
        <div className="flex-shrink-0 mt-2 space-y-2">
          {/* Miesto / prax */}
          <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700/60 animate-pulse rounded" aria-hidden />
          {/* Cena */}
          <div className="h-10 w-20 ml-auto bg-gray-200 dark:bg-gray-700/60 animate-pulse rounded-lg" aria-hidden />
          {/* Tlačidlá */}
          <div className="flex gap-2 mt-2">
            <div className="h-8 flex-1 rounded-lg bg-gray-200 dark:bg-gray-700/60 animate-pulse" aria-hidden />
            <div className="h-8 flex-1 rounded-lg bg-gray-200 dark:bg-gray-700/60 animate-pulse" aria-hidden />
          </div>
        </div>
      </div>
    </div>
  );
}
