'use client';

/**
 * Upozornenie na nové komentáre, ktoré prišli, kým používateľ čítal vyššie v
 * zozname: hlásič pre čítačky obrazovky (v DOM stále) a tlačidlo „N nových
 * komentárov" nad spodným okrajom zoznamu.
 *
 * Vracia dva súrodenecké uzly bez obalu, lebo tlačidlo je pozicované voči
 * `relative` obalu zoznamu v rodičovi. Vytiahnuté z `FeedPostComments.tsx` ako
 * čistý presun (nález 333, delenie súboru): vlastnosti nesú pôvodné názvy z
 * rodiča, takže sa presunutý text nemenil.
 */

type FeedCommentsNewIndicatorProps = {
  /** Koľko nových komentárov prišlo (0 = nič sa nehlási). */
  newCommentsCount: number;
  /** Text typu „3 nové komentáre"; skloňovanie rieši rodič. */
  newCommentsLabel: string;
  /** Klik na tlačidlo: doscrolluje navrch a vynuluje počet. */
  handleNewCommentsClick: () => void;
};

export default function FeedCommentsNewIndicator({
  newCommentsCount,
  newCommentsLabel,
  handleNewCommentsClick,
}: FeedCommentsNewIndicatorProps) {
  return (
    <>
      {/* Hlásič pre čítačky. Musí byť v DOM STÁLE a meniť sa len jeho obsah:
          aria-live oznamuje zmeny výhradne v prvku, ktorý čítačka sledovala
          UŽ PREDTÝM, takže na regióne, ktorý sa spolu s tlačidlom objaví a
          zmizne, sa oznámenie nespoľahlivo stratí. Vizuálnu rolu má tlačidlo
          nižšie, tento uzol je len pre asistenčné technológie. */}
      <p
        data-testid="feed-comments-new-announcer"
        aria-live="polite"
        className="sr-only"
      >
        {newCommentsCount > 0 ? newCommentsLabel : ''}
      </p>

      {/* Nenápadné upozornenie namiesto vynúteného posunu pohľadu – ukáže sa
          len vtedy, keď používateľ číta vyššie v zozname. */}
      {newCommentsCount > 0 ? (
        <button
          type="button"
          onClick={handleNewCommentsClick}
          data-testid="feed-comments-new-indicator"
          className="absolute inset-x-0 bottom-2 mx-auto flex w-max items-center gap-1.5 rounded-full bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400/60"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <polyline points="19 12 12 19 5 12" />
          </svg>
          {newCommentsLabel}
        </button>
      ) : null}
    </>
  );
}
