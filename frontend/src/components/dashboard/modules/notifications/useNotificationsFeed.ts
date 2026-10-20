'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { publishNotificationUnreadCount } from '@/components/dashboard/contexts/notificationUnreadStore';

import { diag } from './notifDiag';
import { markAllNotificationsRead, markNotificationRead } from './notificationsApi';
import { appendUniqueNotifications } from './notificationsWindow';
import type { DashboardNotification } from './types';
import { useNotificationsPaging } from './useNotificationsPaging';

const NOTIFICATION_CHANGED_EVENT = 'notifications:changed';
const LOAD_ERROR = 'notifications.loadFeedError';

export function dispatchNotificationsChanged(): void {
  if (typeof window === 'undefined') return;
  diag('dispatchNotificationsChanged()');
  window.dispatchEvent(new Event(NOTIFICATION_CHANGED_EVENT));
}

/** Zmaže len chybu načítania; iné chyby (napr. „označiť všetko“) ostávajú. */
function clearLoadError(current: string | null): string | null {
  return current === LOAD_ERROR ? null : current;
}

/** Upozornenie, ktoré sa už nikdy nevráti medzi neprečítané. */
function markedRead(item: DashboardNotification): DashboardNotification {
  if (item.is_read) return item;
  return { ...item, is_read: true, read_at: item.read_at || new Date().toISOString() };
}

/** Jedna obnova zoznamu: prvé načítanie, obnova z udalosti, alebo ručné „Skúsiť znova“. */
type RefreshRequest = {
  /** Prvé načítanie ukazuje skeleton; obnova nechá zoznam na obrazovke. */
  initial: boolean;
  /** Zlyhanie sa ukáže používateľovi; obnova na pozadí zlyhá ticho. */
  reportError: boolean;
  /**
   * Dáta sa mohli zmeniť po začiatku už rozbehnutej obnovy: dobehne ešte jedna. Pri prvom načítaní
   * (aj pri dvojitom spustení efektu) sa nové údaje neobjavili, preto sa nepripája.
   */
  followUp: boolean;
};

export function useNotificationsFeed() {
  const [items, setItems] = useState<DashboardNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Zlyhanie „Zobraziť ďalšie“ sa ukazuje dole pri tlačidle (tam je používateľ), nie v pruhu hore.
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);
  const markingReadIdsRef = useRef<Set<number>>(new Set());
  const mountedRef = useRef(true);
  const refreshInFlightRef = useRef<Promise<void> | null>(null);
  const queuedRefreshRef = useRef<RefreshRequest | null>(null);
  // Upozornenia prečítané počas tejto relácie. Odpoveď servera, ktorá odišla pred prečítaním, ich
  // inak vráti medzi neprečítané; prečítané ostáva prečítané, preto ich dopĺňame do každej odpovede.
  const locallyReadIdsRef = useRef<Set<number>>(new Set());
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const withLocalReads = useCallback(
    (list: DashboardNotification[]) =>
      locallyReadIdsRef.current.size === 0
        ? list
        : list.map((item) => (locallyReadIdsRef.current.has(item.id) ? markedRead(item) : item)),
    [],
  );

  const paging = useNotificationsPaging({
    onAppend: (incoming) =>
      setItems((current) => appendUniqueNotifications(current, withLocalReads(incoming))),
  });
  const { fetchWindow, loadMore: loadMoreBatch } = paging;

  useEffect(() => {
    mountedRef.current = true;
    diag(
      `feed mount standalone=${String((navigator as { standalone?: boolean }).standalone)} online=${navigator.onLine} vis=${document.visibilityState} w=${window.innerWidth}`,
    );
    return () => {
      mountedRef.current = false;
      diag('feed unmount');
    };
  }, []);

  const performRefresh = useCallback(
    async (request: RefreshRequest) => {
      diag(`performRefresh start initial=${request.initial} reportError=${request.reportError}`);
      if (request.initial) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      // Ručné „Skúsiť znova“ je vedomá akcia používateľa, takže zmaže akúkoľvek zobrazenú chybu.
      if (request.reportError) setError(null);

      try {
        // Obnova načíta celé už načítané okno, nie len prvú stranu: donačítané upozornenia ostanú
        // a zoznam sa pod prstom neskráti.
        const fetched = await fetchWindow();
        diag(
          `window fetched mounted=${mountedRef.current} n=${fetched ? fetched.items.length : 'null'} top=${fetched?.items[0]?.id ?? '-'}`,
        );
        if (!mountedRef.current) return;
        if (!fetched) {
          // Dávky pribúdali tak rýchlo, že okno nestihlo sedieť. Menšie okno by zoznam skrátilo,
          // takže sa nezapíše nič a obnova sa zopakuje s aktuálnym rozsahom.
          queuedRefreshRef.current ??= {
            initial: false,
            reportError: request.reportError,
            followUp: true,
          };
          return;
        }
        fetched.commit();
        diag(`setItems top=${fetched.items[0]?.id ?? '-'}`);
        setItems(withLocalReads(fetched.items));
        setError(clearLoadError);
        setLoadMoreFailed(false);
      } catch (error) {
        diag(`performRefresh ERROR ${error instanceof Error ? error.message : String(error)}`);
        if (mountedRef.current && request.reportError) setError(LOAD_ERROR);
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [fetchWindow, withLocalReads],
  );

  /**
   * Spustí obnovu tak, aby naraz bežala jediná a odpovede nepredbehli jedna druhú.
   *
   * Udalosti zo servera chodia v dávkach (nové upozornenie, ozvena vlastného prečítania). Ak obnova
   * už beží, ďalšia sa nespúšťa súbežne, ale najviac jedna dobehne po nej, takže odpoveď staršej
   * obnovy nemôže prepísať odpoveď novšej. (Odpoveď na donačítanie ďalšej dávky rieši stránkovanie
   * a prečítania doplňuje `withLocalReads`.)
   */
  const refresh = useCallback(
    (request: RefreshRequest): Promise<void> => {
      const running = refreshInFlightRef.current;
      diag(`refresh() inFlight=${Boolean(running)} followUp=${request.followUp} initial=${request.initial}`);
      if (running) {
        if (request.followUp) {
          const queued = queuedRefreshRef.current;
          queuedRefreshRef.current = {
            initial: false,
            reportError: request.reportError || Boolean(queued?.reportError),
            followUp: true,
          };
        }
        return running;
      }

      const promise = (async () => {
        let next: RefreshRequest | null = request;
        while (next) {
          queuedRefreshRef.current = null;
          await performRefresh(next);
          next = mountedRef.current ? queuedRefreshRef.current : null;
        }
      })().finally(() => {
        refreshInFlightRef.current = null;
      });
      refreshInFlightRef.current = promise;
      return promise;
    },
    [performRefresh],
  );

  const loadMore = useCallback(async () => {
    setLoadMoreFailed(false);
    const outcome = await loadMoreBatch();
    if (!mountedRef.current) return;
    if (outcome === 'failed') {
      setLoadMoreFailed(true);
    } else if (outcome === 'loaded') {
      setError(clearLoadError);
    }
  }, [loadMoreBatch]);

  useEffect(() => {
    void refresh({ initial: true, reportError: true, followUp: false });
  }, [refresh]);

  useEffect(() => {
    const handleChanged = () => {
      diag(`listener fired vis=${document.visibilityState}`);
      void refresh({ initial: false, reportError: false, followUp: true });
    };

    window.addEventListener(NOTIFICATION_CHANGED_EVENT, handleChanged);
    return () => {
      window.removeEventListener(NOTIFICATION_CHANGED_EVENT, handleChanged);
    };
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    setMarkingRead(true);
    setError(null);
    try {
      await markAllNotificationsRead();
      publishNotificationUnreadCount(0, { source: 'mutation' });
      for (const item of itemsRef.current) locallyReadIdsRef.current.add(item.id);
      setItems((current) => current.map(markedRead));
    } catch {
      setError('notifications.markAllReadError');
    } finally {
      setMarkingRead(false);
    }
  }, []);

  const markItemRead = useCallback(async (notification: DashboardNotification) => {
    if (notification.is_read || markingReadIdsRef.current.has(notification.id)) return;

    markingReadIdsRef.current.add(notification.id);
    try {
      const result = await markNotificationRead(notification.id);
      const readAt = result.read_at || new Date().toISOString();

      if (notification.type !== 'skill_request' && typeof result.unread_count === 'number') {
        publishNotificationUnreadCount(result.unread_count, { source: 'mutation' });
      }

      locallyReadIdsRef.current.add(notification.id);
      setItems((current) =>
        current.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                is_read: true,
                read_at: item.read_at || readAt,
              }
            : item,
        ),
      );
    } catch {
      // The click navigation should not be blocked by a best-effort read update.
    } finally {
      markingReadIdsRef.current.delete(notification.id);
    }
  }, []);

  return {
    items,
    loading,
    refreshing,
    markingRead,
    loadingMore: paging.loadingMore,
    hasMore: paging.hasMore,
    loadMoreFailed,
    error,
    refresh: () => refresh({ initial: false, reportError: true, followUp: true }),
    loadMore,
    markAllRead,
    markItemRead,
  };
}
