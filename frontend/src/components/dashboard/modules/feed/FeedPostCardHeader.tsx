'use client';

/**
 * Hlavička karty príspevku: avatar a meno autora (vedú na profil), čas, značka „upravené" a menu „…" s nahlásením,
 * úpravou a zmazaním.
 *
 * Presunuté z `FeedPostCard.tsx` bez zmeny (krok e delenia karty, nález 333, R23): JSX, komentáre aj obsluhy sú rovnaké
 * ako predtým; mení sa len odsadenie `<header>` (o dve medzery menej) a komentár nad ním, ktorý bol v karte výrazom JSX
 * s komentárom, je tu obyčajný komentár `//` nad `return` (text doslova). Stav menu (`menuOpen`, `menuAnchor`,
 * `menuTriggerRef`) a `closeMenu` sa presunuli sem, lebo ich nepoužíva nič iné v karte; texty a poradie (`useState`,
 * `useState`, `useRef`, `useCallback`) ostali. Stav vrstiev (`reported`, `setReportOpen`, `setEditOpen`,
 * `setDeleteOpen`) drží karta (hook `useFeedPostCardLayers`), hlavička ich len dostáva ako vlastnosti.
 *
 * PRUŽNÝ STĹPEC OKNA (`fillHeight`): koreňom je `<header>` a ostáva PRIAMYM potomkom koreňa karty (`motion.article`) na
 * rovnakom mieste (za riadkom „zdieľa ďalej", pred textom); nič sa neobaľuje. `fixedBlock` (`shrink-0` pri `fillHeight`)
 * a odsadenie pre „X" okna (`isDetail && !fillHeight`) ostali v tom istom `className` v tom istom poradí.
 *
 * MENU: `closeMenu` je `useCallback` s `[]`, takže `onClose` v `FeedAnchoredMenu` je stabilná funkcia a jeho listener na
 * Escape sa nepripája znova pri každom vykreslení; po zatvorení vracia fokus na spúšťač.
 */

import { useCallback, useRef, useState } from 'react';
import {
  EllipsisHorizontalIcon,
  FlagIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import InitialsAvatar from '@/components/shared/InitialsAvatar';
import type { FeedPost } from '@/lib/feedApi';
import FeedAnchoredMenu from './FeedAnchoredMenu';
import { formatRelativeTime } from './feedRelativeTime';
import { canOpenUserProfile, openUserProfile } from './feedProfileNavigation';

type FeedPostCardHeaderProps = {
  post: FeedPost;
  authorName: string;
  /** `is_edited` chodí LEN autorovi: `true` ukáže značku „(upravené)“. */
  isEdited: boolean;
  isDetail: boolean;
  fillHeight: boolean;
  /** Trieda pevného bloku pružného stĺpca okna: `shrink-0` pri `fillHeight`, inak prázdny reťazec. */
  fixedBlock: string;
  /** Preklik VON z karty (profil autora): v okne detailu zavrie okno. */
  closeOverlayOnLeave: () => void;
  /** Príspevok už bol nahlásený (položka menu je vypnutá a hlási „Už nahlásené“). */
  reported: boolean;
  setReportOpen: (open: boolean) => void;
  setEditOpen: (open: boolean) => void;
  setDeleteOpen: (open: boolean) => void;
  t: (key: string, fallback?: string) => string;
  locale: string;
};

export default function FeedPostCardHeader({
  post,
  authorName,
  isEdited,
  isDetail,
  fillHeight,
  fixedBlock,
  closeOverlayOnLeave,
  reported,
  setReportOpen,
  setEditOpen,
  setDeleteOpen,
  t,
  locale,
}: FeedPostCardHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  // Pozícia spúšťača v okne – menu sa kreslí portálom, takže si ju musí niesť.
  const [menuAnchor, setMenuAnchor] = useState<DOMRect | null>(null);
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    // Fokus späť na spúšťač – inak by po zatvorení skončil na <body>
    // a klávesnicová navigácia by začínala odznova.
    menuTriggerRef.current?.focus();
  }, []);

  // V jednostĺpcovom okne detailu sedí vpravo hore ešte jeho vlastné „X".
  // Bez miesta navyše by prekrylo „..." menu karty – oboje má byť
  // dosiahnuteľné. V dvojstĺpcovom rozložení leží „X" nad PRAVÝM stĺpcom
  // (miesto mu uvoľňuje nadpis komentárov), takže tu by odsadenie len
  // zbytočne ukrajovalo šírku.
  return (
    <header
      className={`flex items-center gap-3 px-4 pb-3 pt-3 ${
        isDetail && !fillHeight ? 'pr-12' : ''
      } ${fixedBlock}`}
    >
      {/* Avatar aj meno vedú na profil autora – rovnako vo feede, v okne
          detailu aj v mobilnom prehliadači fotky. */}
      <button
        type="button"
        onClick={() => openUserProfile(post.author, { beforeNavigate: closeOverlayOnLeave })}
        disabled={!canOpenUserProfile(post.author)}
        data-testid="feed-post-author-avatar"
        aria-label={t('feed.openProfile', 'Otvoriť profil')}
        className="shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 disabled:cursor-default"
      >
        <InitialsAvatar
          name={authorName}
          avatarUrl={post.author?.avatar_url}
          size="sm"
        />
      </button>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => openUserProfile(post.author, { beforeNavigate: closeOverlayOnLeave })}
          disabled={!canOpenUserProfile(post.author)}
          data-testid="feed-post-author-name"
          className="block max-w-full truncate text-left text-sm font-semibold text-gray-900 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 disabled:cursor-default disabled:no-underline dark:text-white"
        >
          {authorName}
        </button>
        <p className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <time dateTime={post.created_at}>
            {formatRelativeTime(post.created_at, t, locale)}
          </time>
          {/* „Upravené" vidí LEN autor – backend pole nikomu inému neposiela,
              takže tu netreba (ani sa nedá) porovnávať identity. */}
          {isEdited ? (
            <span data-testid="feed-post-edited">
              · {t('feed.editedMark', '(upravené)')}
            </span>
          ) : null}
        </p>
      </div>

      {/* „..." menu v pravom hornom rohu karty, vedľa času. Zámerne nie je
          štvrtou ikonou v riadku akcií – ten by sa na mobile preplnil.
          Štruktúrou je pripravené na ďalšie položky (napr. kopírovanie
          odkazu), zatiaľ nesie jedinú akciu. */}
      <div className="shrink-0">
        <button
          type="button"
          ref={menuTriggerRef}
          onClick={(event) => {
            setMenuAnchor(event.currentTarget.getBoundingClientRect());
            setMenuOpen((open) => !open);
          }}
          aria-label={t('feed.postMenu', 'Možnosti príspevku')}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          data-testid="feed-post-menu-trigger"
          className="rounded-full p-2 text-gray-400 transition-colors hover:bg-black/5 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-gray-200"
        >
          <EllipsisHorizontalIcon className="h-5 w-5" />
        </button>
        <FeedAnchoredMenu
          open={menuOpen}
          anchorRect={menuAnchor}
          onClose={closeMenu}
          ariaLabel={t('feed.postMenu', 'Možnosti príspevku')}
          testId="feed-post-menu"
        >
            <button
              type="button"
              role="menuitem"
              disabled={reported}
              onClick={() => {
                setMenuOpen(false);
                setReportOpen(true);
              }}
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-gray-900 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400 dark:text-white dark:hover:bg-gray-800 dark:disabled:text-gray-500"
            >
              <FlagIcon className="h-4 w-4" />
              {reported
                ? t('feed.alreadyReported', 'Už nahlásené')
                : t('feed.reportPost', 'Nahlásiť príspevok')}
            </button>
            {/* Upravovať aj mazať smie iba autor – o tom rozhoduje backend
                cez `can_manage`, FE si to neodvodzuje sám. */}
            {post.can_manage ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setEditOpen(true);
                }}
                data-testid="feed-post-edit"
                className="flex w-full items-center gap-2 border-t border-gray-200 px-4 py-3 text-left text-sm text-gray-900 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800"
              >
                <PencilSquareIcon className="h-4 w-4" />
                {t('feed.editPost', 'Upraviť príspevok')}
              </button>
            ) : null}
            {post.can_manage ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setDeleteOpen(true);
                }}
                data-testid="feed-post-delete"
                className="flex w-full items-center gap-2 border-t border-gray-200 px-4 py-3 text-left text-sm text-red-600 transition-colors hover:bg-red-50 dark:border-gray-700 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <TrashIcon className="h-4 w-4" />
                {t('feed.deletePost', 'Zmazať príspevok')}
              </button>
            ) : null}
        </FeedAnchoredMenu>
      </div>
    </header>
  );
}
