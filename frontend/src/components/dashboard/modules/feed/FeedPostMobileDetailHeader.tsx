'use client';

/**
 * Pevná hlavička mobilnej obrazovky detailu príspevku: avatar, meno a čas autora (vedú na profil), menu „…" s
 * nahlásením, úpravou a zmazaním a tlačidlo „X" na zatvorenie.
 *
 * Presunuté z `FeedPostMobileDetail.tsx` bez zmeny (posledná dávka delenia, presun 2, nález 333, R23): JSX, komentáre
 * aj obsluhy sú rovnaké ako predtým; mení sa len odsadenie `<header>` (o dve medzery menej) a komentár nad ním, ktorý
 * bol v obrazovke výrazom JSX s komentárom, je tu obyčajný komentár `//` nad `return` (text doslova). Odvodené
 * hodnoty `author`, `authorName` a `openAuthorProfile` používa len hlavička, preto idú s ňou.
 *
 * STAV MENU ostáva v obrazovke: `menuOpen` aj `setMenuOpen` dostáva hlavička ako vlastnosti (na rozdiel od hlavičky
 * karty), aby sa menu „…" dalo neskôr presunúť k riadku akcií bez presúvania stavu. Stav vrstiev (`reported`,
 * `setReportOpen`, `setEditOpen`, `setDeleteOpen`) drží obrazovka tiež; hlavička ich len číta alebo volá.
 *
 * PEVNÁ HLAVIČKA: koreňom je `<header>` (`shrink-0`) a ostáva PRIAMYM potomkom koreňa obrazovky (`role="dialog"`,
 * pružný stĺpec) pred obalom komentárov; nič sa neobaľuje.
 */

import type { Dispatch, SetStateAction } from 'react';
import { EllipsisHorizontalIcon, XMarkIcon } from '@heroicons/react/24/outline';
import InitialsAvatar from '@/components/shared/InitialsAvatar';
import type { FeedPost } from '@/lib/feedApi';
import { canOpenUserProfile, openUserProfile } from './feedProfileNavigation';
import { formatRelativeTime } from './feedRelativeTime';

type FeedPostMobileDetailHeaderProps = {
  currentPost: FeedPost;
  /** Zatvorenie obrazovky (tlačidlo „X"). */
  onClose: () => void;
  /**
   * Zatvorenie PRED prekliknutím na profil autora; bez vlastnosti sa použije `onClose`. Hostiteľ obrazovky ním zatvára bez kroku
   * späť v histórii (krok späť by navigáciu vzápätí zrušil), pozri `FeedPostMobileDetail`.
   */
  onLeave?: () => void;
  t: (key: string, fallback?: string) => string;
  locale: string;
  /** Stav menu „…" drží obrazovka (hlavička ho len číta a prepína). */
  menuOpen: boolean;
  setMenuOpen: Dispatch<SetStateAction<boolean>>;
  /** Príspevok už bol nahlásený (položka menu je vypnutá a hlási „Už nahlásené"). */
  reported: boolean;
  setReportOpen: (open: boolean) => void;
  setEditOpen: (open: boolean) => void;
  setDeleteOpen: (open: boolean) => void;
};

export default function FeedPostMobileDetailHeader({
  currentPost,
  onClose,
  onLeave,
  t,
  locale,
  menuOpen,
  setMenuOpen,
  reported,
  setReportOpen,
  setEditOpen,
  setDeleteOpen,
}: FeedPostMobileDetailHeaderProps) {
  const author = currentPost.author;
  const authorName = author?.display_name || '';
  const openAuthorProfile = () =>
    openUserProfile(author, { beforeNavigate: onLeave ?? onClose });

  // PEVNÁ hlavička – nescrolluje s obsahom.
  return (
    <header
      data-testid="feed-mobile-detail-header"
      className="flex shrink-0 items-center gap-2 border-b border-gray-200 px-3 py-2 dark:border-gray-800"
    >
      <button
        type="button"
        onClick={openAuthorProfile}
        disabled={!canOpenUserProfile(author)}
        data-testid="feed-mobile-detail-author"
        aria-label={t('feed.openProfile', 'Otvoriť profil')}
        className="flex min-w-0 items-center gap-2 rounded-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 disabled:cursor-default"
      >
        <InitialsAvatar
          name={authorName}
          avatarUrl={author?.avatar_url}
          size="sm"
        />
        <span className="min-w-0">
          {/* Meno sa NIKDY nezalomí – `min-w-0` + `truncate` nechajú menu aj
              „X" vpravo vždy ich miesto. */}
          <span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">
            {authorName}
          </span>
          <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
            {formatRelativeTime(currentPost.created_at, t, locale)}
          </span>
        </span>
      </button>

      {/* „..." menu sedí VEDĽA MENA, nie v riadku akcií. */}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          data-testid="feed-mobile-detail-menu-trigger"
          aria-label={t('feed.postMenu', 'Možnosti príspevku')}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 dark:text-gray-400 dark:hover:bg-white/10"
        >
          <EllipsisHorizontalIcon className="h-5 w-5" />
        </button>

        {menuOpen ? (
          <div
            role="menu"
            data-testid="feed-mobile-detail-menu"
            aria-label={t('feed.postMenu', 'Možnosti príspevku')}
            className="absolute left-0 top-12 z-10 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-[#151517]"
          >
            <button
              type="button"
              role="menuitem"
              disabled={reported}
              onClick={() => {
                setMenuOpen(false);
                setReportOpen(true);
              }}
              data-testid="feed-mobile-detail-report"
              className="block w-full px-4 py-3 text-left text-sm text-gray-900 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400 dark:text-white dark:hover:bg-gray-800 dark:disabled:text-gray-500"
            >
              {reported
                ? t('feed.alreadyReported', 'Už nahlásené')
                : t('feed.reportPost', 'Nahlásiť príspevok')}
            </button>
            {/* Upravovať aj mazať smie iba autor – rozhoduje backend cez
                `can_manage`, FE si to neodvodzuje sám. */}
            {currentPost.can_manage ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setEditOpen(true);
                }}
                data-testid="feed-mobile-detail-edit"
                className="block w-full border-t border-gray-200 px-4 py-3 text-left text-sm text-gray-900 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800"
              >
                {t('feed.editPost', 'Upraviť príspevok')}
              </button>
            ) : null}
            {currentPost.can_manage ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setDeleteOpen(true);
                }}
                data-testid="feed-mobile-detail-delete"
                className="block w-full border-t border-gray-200 px-4 py-3 text-left text-sm text-red-600 transition-colors hover:bg-red-50 dark:border-gray-700 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                {t('feed.deletePost', 'Zmazať príspevok')}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onClose}
        data-testid="feed-mobile-detail-close"
        aria-label={t('common.close', 'Zavrieť')}
        className="ml-auto inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 dark:text-gray-400 dark:hover:bg-white/10"
      >
        <XMarkIcon className="h-5 w-5" />
      </button>
    </header>
  );
}
