'use client';

/**
 * Relatívny čas pre Nástenku („práve teraz", „5 min", „3 h", „2 d", dátum).
 *
 * Vytiahnuté z karty príspevku, aby ho vedel použiť aj prehliadač fotiek a
 * komentáre – inak by sa ten istý údaj na dvoch miestach formátoval inak.
 */

export function formatRelativeTime(
  iso: string,
  t: (key: string, fallback?: string) => string,
  locale: string,
): string {
  const created = new Date(iso);
  if (Number.isNaN(created.getTime())) return '';
  const diffMs = Date.now() - created.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return t('feed.timeJustNow', 'práve teraz');
  if (minutes < 60) return `${minutes} ${t('feed.timeMinutesShort', 'min')}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${t('feed.timeHoursShort', 'h')}`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ${t('feed.timeDaysShort', 'd')}`;
  // Staršie príspevky ukazujú absolútny dátum – ten musí sledovať jazyk appky,
  // nie locale prehliadača (tie sa bežne líšia).
  return created.toLocaleDateString(locale || undefined);
}
