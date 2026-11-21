'use client';

/**
 * Tlačidlo akcie pod príspevkom (lajk, komentáre, zdieľanie): ikona, voliteľný počet a farba aktívneho stavu.
 *
 * Presunuté z `FeedPostCard.tsx` bez zmeny (krok a delenia karty, nález 333, R23): kód aj komentáre sú rovnaké ako
 * predtým, pribudlo len `export default`. Komponent nepoužíva nič zo škrupiny karty, dostáva len vlastnosti.
 */

export default function ActionButton({
  label,
  count,
  active = false,
  onClick,
  onCountClick,
  countLabel,
  countTestId,
  testId,
  children,
}: {
  label: string;
  count?: number;
  active?: boolean;
  onClick: () => void;
  /**
   * Klik na POČET (nie na ikonu) – napr. otvorenie zoznamu lajkujúcich.
   * Keď chýba alebo je počet 0, ostáva počet obyčajný text: vnorené tlačidlo
   * v tlačidle je neplatné HTML, takže sa vyčlení iba keď má čo robiť.
   */
  onCountClick?: () => void;
  countLabel?: string;
  countTestId?: string;
  testId?: string;
  children: React.ReactNode;
}) {
  const countIsInteractive = Boolean(onCountClick) && (count ?? 0) > 0;

  if (countIsInteractive) {
    return (
      // gap-1 drží medzi srdiečkom a číslom skutočnú medzeru – bez nej sa
      // dva nezávislé ciele kliku čítajú ako jedno tlačidlo.
      <span className="-m-1 inline-flex items-center gap-1">
        <button
          type="button"
          onClick={onClick}
          data-testid={testId}
          aria-label={count === undefined ? label : `${label}: ${count}`}
          title={label}
          className={`inline-flex items-center rounded-full p-2 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${
            active
              ? 'text-purple-600 dark:text-purple-300'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {children}
        </button>
        <button
          type="button"
          onClick={onCountClick}
          data-testid={countTestId}
          aria-label={countLabel ? `${countLabel}: ${count}` : undefined}
          title={countLabel}
          // Farba ZÁMERNE nesleduje `active`: keď je príspevok lajknutý,
          // srdiečko sfialovie a číslo ostane neutrálne, takže je vidieť, že
          // sú to dve rôzne veci. Podčiarknutie + zmena farby pri hoveri
          // napovedajú, že číslo je samostatný cieľ kliku.
          className="rounded-full px-1.5 py-2 text-sm tabular-nums text-gray-500 underline-offset-2 transition-colors hover:bg-black/5 hover:text-purple-700 hover:underline dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-purple-300"
        >
          {count}
        </button>
      </span>
    );
  }

  return (
    // p-2 + gap drží dotykový cieľ nad 40px aj na mobile (vzor ostatných
    // ikonových tlačidiel appky, napr. zatváracie X v modaloch).
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      aria-label={count === undefined ? label : `${label}: ${count}`}
      title={label}
      className={`-m-1 inline-flex items-center gap-1.5 rounded-full p-2 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${
        active
          ? 'text-purple-600 dark:text-purple-300'
          : 'text-gray-500 dark:text-gray-400'
      }`}
    >
      {children}
      {count === undefined ? null : <span className="tabular-nums">{count}</span>}
    </button>
  );
}
