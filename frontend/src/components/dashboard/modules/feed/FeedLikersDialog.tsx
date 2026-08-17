'use client';

/**
 * Zoznam ľudí, čo dali lajk – príspevku alebo komentáru.
 *
 * Jeden dialóg pre oba prípady: líši sa len zdroj dát, nie správanie. Rovnaký
 * obal ako ostatné feed dialógy (`useFeedDialog` – Escape, fokus dovnútra,
 * Tab trap, návrat fokusu), mobil ako spodný panel, desktop ako centrovaný
 * modal.
 *
 * Donačítavanie je TLAČIDLOM, nie nekonečným scrollom: je to jednorazovo
 * otvorený zoznam, nie priebežne sledovaná sekcia ako komentáre.
 *
 * Blokovaných používateľov odfiltruje backend, takže tu netreba nič riešiť.
 */

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import InitialsAvatar from '@/components/shared/InitialsAvatar';
import { useFeedDialog } from './useFeedDialog';
import {
  listFeedCommentLikers,
  listFeedPostLikers,
  type FeedUserSummary,
} from '@/lib/feedApi';

const LIKERS_PAGE_SIZE = 20;

type FeedLikersDialogProps = {
  open: boolean;
  onClose: () => void;
  postId: number;
  /** Keď je vyplnené, zoznam patrí komentáru; inak príspevku. */
  commentId?: number | null;
};

export default function FeedLikersDialog({
  open,
  onClose,
  postId,
  commentId,
}: FeedLikersDialogProps) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [users, setUsers] = useState<FeedUserSummary[]>([]);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => setMounted(true), []);

  const fetchPage = useCallback(
    (params: { pageSize?: number; cursorUrl?: string | null }) =>
      commentId
        ? listFeedCommentLikers(postId, commentId, params)
        : listFeedPostLikers(postId, params),
    [postId, commentId],
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    fetchPage({ pageSize: LIKERS_PAGE_SIZE })
      .then((page) => {
        if (cancelled) return;
        setUsers(page.results);
        setNextUrl(page.next);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, fetchPage]);

  const dialogRef = useFeedDialog({ open, onClose, canClose: true });

  const handleLoadMore = async () => {
    if (!nextUrl || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchPage({ cursorUrl: nextUrl });
      setUsers((current) => {
        const seen = new Set(current.map((user) => user.id));
        return [...current, ...page.results.filter((user) => !seen.has(user.id))];
      });
      setNextUrl(page.next);
    } catch {
      // Ticho: zoznam ostáva použiteľný, tlačidlo sa dá skúsiť znova.
    } finally {
      setLoadingMore(false);
    }
  };

  const goToProfile = (user: FeedUserSummary) => {
    if (typeof window === 'undefined') return;
    onClose();
    // Rovnaký globálny event ako pri otvorení profilu z karty príspevku.
    window.dispatchEvent(
      new CustomEvent('goToUserProfile', {
        detail: { identifier: user.slug || String(user.id) },
      }),
    );
  };

  if (!open || !mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feed-likers-title"
      data-testid="feed-likers-dialog"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative flex max-h-[80vh] w-full max-w-sm flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-xl sm:max-h-[70vh] sm:rounded-2xl dark:border-gray-800 dark:bg-[#0f0f10]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <h2
            id="feed-likers-title"
            className="text-base font-semibold text-gray-900 dark:text-white"
          >
            {t('feed.likersTitle', 'Páči sa im to')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close', 'Zavrieť')}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto subtle-scrollbar px-2 py-2">
          {loading ? (
            <p className="px-2 py-4 text-sm text-gray-500 dark:text-gray-400">
              {t('common.loading', 'Načítavam...')}
            </p>
          ) : failed ? (
            <p className="px-2 py-4 text-sm text-gray-500 dark:text-gray-400">
              {t('feed.likersLoadError', 'Zoznam sa nepodarilo načítať.')}
            </p>
          ) : users.length === 0 ? (
            <p
              data-testid="feed-likers-empty"
              className="px-2 py-4 text-sm text-gray-500 dark:text-gray-400"
            >
              {t('feed.likersEmpty', 'Zatiaľ nikto.')}
            </p>
          ) : (
            <ul>
              {users.map((user) => (
                <li key={user.id}>
                  <button
                    type="button"
                    onClick={() => goToProfile(user)}
                    data-testid={`feed-liker-${user.id}`}
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <InitialsAvatar
                      name={user.display_name}
                      avatarUrl={user.avatar_url}
                      size="sm"
                    />
                    <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {user.display_name}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {nextUrl && !loading ? (
            <button
              type="button"
              onClick={() => void handleLoadMore()}
              disabled={loadingMore}
              data-testid="feed-likers-load-more"
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100 hover:text-purple-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900"
            >
              {loadingMore
                ? t('common.loading', 'Načítavam...')
                : t('feed.loadMore', 'Zobraziť ďalšie')}
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
