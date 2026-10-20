'use client';

import { useEffect, useRef } from 'react';

import { MESSAGING_REALTIME_RECONNECTED_EVENT } from '@/components/dashboard/modules/messages/messagesEvents';

/** Dávku signálov „som späť“ (iOS pošle visibilitychange aj focus naraz) zlúčime do jednej obnovy. */
export const NOTIFICATIONS_RESYNC_DEBOUNCE_MS = 300;

/** Poistka, kým je sekcia viditeľná: zachytí upozornenie aj keď realtime spojenie mlčí. */
export const NOTIFICATIONS_RESYNC_POLL_MS = 30_000;

/**
 * Dotiahne zoznam upozornení po medzere v realtime, aby sa nové upozornenie objavilo samo.
 *
 * Server nič nezopakuje: upozornenie vytvorené, kým je spojenie spadnuté alebo uspané (iPhone v
 * pozadí), sa nikdy nedoručí. Zoznam preto obnovíme pri návrate do popredia (visibilitychange,
 * focus), pri obnove siete, po reconnecte realtime spojenia a pomalým intervalom, kým je sekcia
 * viditeľná. Nedotýka sa počítadla zvončeka: len volá `onResync`.
 */
export function useNotificationsResync(onResync: () => void): void {
  // Najnovší callback v refe: zmena jeho identity nesmie zrušiť čakajúci signál ani reštartovať poll.
  const onResyncRef = useRef(onResync);
  onResyncRef.current = onResync;

  useEffect(() => {
    let timer: number | null = null;
    const isVisible = () => document.visibilityState !== 'hidden';

    const schedule = () => {
      if (timer !== null || !isVisible()) return;
      timer = window.setTimeout(() => {
        timer = null;
        if (isVisible()) onResyncRef.current();
      }, NOTIFICATIONS_RESYNC_DEBOUNCE_MS);
    };

    const poll = window.setInterval(schedule, NOTIFICATIONS_RESYNC_POLL_MS);
    window.addEventListener('focus', schedule);
    window.addEventListener('online', schedule);
    window.addEventListener(MESSAGING_REALTIME_RECONNECTED_EVENT, schedule);
    document.addEventListener('visibilitychange', schedule);

    return () => {
      window.clearInterval(poll);
      if (timer !== null) window.clearTimeout(timer);
      window.removeEventListener('focus', schedule);
      window.removeEventListener('online', schedule);
      window.removeEventListener(MESSAGING_REALTIME_RECONNECTED_EVENT, schedule);
      document.removeEventListener('visibilitychange', schedule);
    };
  }, []);
}
