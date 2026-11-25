'use client';

/**
 * Kostra pod zoznamom komentárov, kým sa donačítava ďalšia stránka: dva
 * prázdne riadky komentára s animáciou. Od R52 je plochá ako samotné komentáre: avatar a dva riadky, bez sivej bubliny.
 *
 * Vytiahnuté z `FeedPostComments.tsx` ako čistý presun (nález 333, delenie
 * súboru). Rodič ju ukazuje, kým beží donačítanie (`loadingMore`).
 */

export default function FeedCommentsLoadingMore() {
  return (
    <ul className="mt-3 space-y-3" data-testid="feed-comments-loading-more">
      {[0, 1].map((key) => (
        <li key={key} className="flex animate-pulse items-start gap-2">
          <div className="h-9 w-9 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="flex-1 space-y-1.5 pt-1.5">
            <div className="h-2.5 w-24 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </li>
      ))}
    </ul>
  );
}
