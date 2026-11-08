'use client';

import { useDelayedLoading } from '@/hooks/useDelayedLoading';

type PushMessagesStatusProps = {
  /** Prebieha načítavanie alebo ukladanie (`loading` z `usePushMessagesPreference`). */
  loading: boolean;
  /** Prebieha úvodné načítanie uloženej voľby; to ukazuje kostra, nie tento riadok. */
  initialLoading?: boolean;
  /** Text „Načítavam nastavenia…“. */
  loadingLabel: string;
  /** Chybová hláška pod stavovým riadkom (alebo `null`). */
  error: string | null;
};

/**
 * Stavový riadok pod voľbou Správy (nález 286). Riadok je v DOM vždy a drží svoju výšku, takže text „Načítavam
 * nastavenia…“ sa v ňom objaví a zmizne bez posunu sekcií pod ním (predtým sa riadok pridával a odoberal a celý zvyšok
 * stránky poskočil). Text sa ukáže až vtedy, keď kontrola prehliadača alebo ukladanie trvá aspoň 200 ms, takže rýchla
 * kontrola nepreblikne. Úvodné načítanie sem nepatrí, ukazuje ho kostra voľby. Chyba je samostatný riadok pod ním;
 * je to skutočný obsah, ktorého výšku vopred nepoznáme, takže ju nemožno vyhradiť, no vloží sa s krátkym prechodom.
 */
export default function PushMessagesStatus({
  loading,
  initialLoading = false,
  loadingLabel,
  error,
}: PushMessagesStatusProps) {
  const showLoading = useDelayedLoading(loading && !initialLoading);

  return (
    <>
      <p
        role="status"
        data-testid="notifications-push-status"
        className="mt-2 min-h-4 text-xs text-gray-500 dark:text-gray-400"
      >
        {showLoading ? loadingLabel : null}
      </p>
      {error && (
        <p className="animate-content-in mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </>
  );
}
