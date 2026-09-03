'use client';

/**
 * Ovládacia vrstva mobilného prehliadača fotiek – všetko, čo leží NAD fotkou.
 *
 * Fotku samotnú (aj prepínanie medzi viacerými) rieši `ImageLightbox`; tento
 * komponent je len jeho `chrome`, takže o swipe, klávesnicu ani vrstvy sa
 * nestará. Zhora nadol: hlavička s autorom a „X", text príspevku (dva riadky
 * s „Viac"), a dole riadok akcií s „..." menu.
 *
 * Čitateľnosť bieleho textu drží jemný gradient hore aj dole – nie plná
 * plocha, aby fotka pod ním ostala vidieť.
 */

import { useState } from 'react';
import { EllipsisHorizontalIcon } from '@heroicons/react/24/outline';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import InitialsAvatar from '@/components/shared/InitialsAvatar';
import type { FeedPost } from '@/lib/feedApi';
import ShareIcon from './ShareIcon';
import { canOpenUserProfile, openUserProfile } from './feedProfileNavigation';
import { formatRelativeTime } from './feedRelativeTime';

/** Tmavý závoj za textom – dosť na čitateľnosť, nie nepriehľadný. */
const TOP_SCRIM =
  'bg-gradient-to-b from-black/75 via-black/45 to-transparent';
const BOTTOM_SCRIM =
  'bg-gradient-to-t from-black/75 via-black/45 to-transparent';

/** Spoločný vzhľad ikon v riadku akcií – biele na fotke, dotykový cieľ 44 px. */
const ACTION_BUTTON =
  'inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-2 text-white transition-colors hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70';

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

type FeedPhotoViewerChromeProps = {
  post: FeedPost;
  isLiked: boolean;
  likesCount: number;
  commentsCount: number;
  onToggleLike: () => void;
  onOpenLikers: () => void;
  onOpenComments: () => void;
  onOpenShare: () => void;
  onOpenReport: () => void;
  onOpenEdit: () => void;
  onOpenDelete: () => void;
  onClose: () => void;
  /** Autor už príspevok nahlásil – položka v menu ostáva, ale je vyčerpaná. */
  reported: boolean;
};

export default function FeedPhotoViewerChrome({
  post,
  isLiked,
  likesCount,
  commentsCount,
  onToggleLike,
  onOpenLikers,
  onOpenComments,
  onOpenShare,
  onOpenReport,
  onOpenEdit,
  onOpenDelete,
  onClose,
  reported,
}: FeedPhotoViewerChromeProps) {
  const { t, locale } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const author = post.author;
  const authorName = author?.display_name || '';
  const caption = post.caption || '';
  const authorClickable = canOpenUserProfile(author);

  const openAuthorProfile = () =>
    openUserProfile(author, { beforeNavigate: onClose });

  return (
    <>
      {/* HORE – hlavička a text. `pointer-events-none` na obale, aby ťuk na
          voľnú plochu medzi prvkami dopadol na fotku pod ňou (prepnutie
          vrstvy); jednotlivé ovládacie prvky si ich zapínajú späť. */}
      <div
        data-testid="feed-photo-viewer-top"
        className={`pointer-events-none absolute inset-x-0 top-0 z-20 px-3 pb-6 pt-3 ${TOP_SCRIM}`}
      >
        <div className="flex items-start gap-2">
          {/* Meno sa NIKDY nezalomí ani nepretečie: `min-w-0` + `truncate`
              nechajú „X" vpravo vždy jeho miesto. */}
          <div className="pointer-events-auto flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              onClick={openAuthorProfile}
              disabled={!authorClickable}
              data-testid="feed-photo-viewer-author"
              aria-label={t('feed.openProfile', 'Otvoriť profil')}
              className="flex min-w-0 items-center gap-2 rounded-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-default"
            >
              <InitialsAvatar
                name={authorName}
                avatarUrl={author?.avatar_url}
                size="sm"
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-white">
                  {authorName}
                </span>
                <span className="block truncate text-xs text-white/70">
                  {formatRelativeTime(post.created_at, t, locale)}
                </span>
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            data-testid="feed-photo-viewer-close"
            aria-label={t('common.close', 'Zavrieť')}
            className="pointer-events-auto inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {caption ? (
          <div className="pointer-events-auto mt-2 pr-12">
            <p
              data-testid="feed-photo-viewer-caption"
              className={`whitespace-pre-wrap break-words text-sm text-white ${
                captionExpanded ? '' : 'line-clamp-2'
              }`}
            >
              {caption}
            </p>
            {captionExpanded ? null : (
              <button
                type="button"
                onClick={() => setCaptionExpanded(true)}
                data-testid="feed-photo-viewer-caption-more"
                className="mt-0.5 text-sm font-medium text-white/80 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                {t('feed.captionMore', 'Viac')}
              </button>
            )}
          </div>
        ) : null}
      </div>

      {/* DOLE – riadok akcií. */}
      <div
        data-testid="feed-photo-viewer-actions"
        className={`pointer-events-none absolute inset-x-0 bottom-0 z-20 px-2 pb-3 pt-8 ${BOTTOM_SCRIM}`}
      >
        <div className="pointer-events-auto flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleLike}
            data-testid="feed-photo-viewer-like"
            aria-label={t('feed.likes', 'Páči sa mi')}
            aria-pressed={isLiked}
            className={`${ACTION_BUTTON} ${isLiked ? 'text-purple-300' : ''}`}
          >
            <HeartIcon filled={isLiked} />
          </button>
          {/* Počet je SAMOSTATNÝ cieľ kliku – otvára zoznam lajkujúcich,
              rovnako ako na karte vo feede. */}
          <button
            type="button"
            onClick={onOpenLikers}
            data-testid="feed-photo-viewer-like-count"
            aria-label={`${t('feed.likersTitle', 'Páči sa im to')}: ${likesCount}`}
            className="h-11 rounded-full px-1 text-sm font-medium tabular-nums text-white transition-colors hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            {likesCount}
          </button>

          <button
            type="button"
            onClick={onOpenComments}
            data-testid="feed-photo-viewer-comments"
            aria-label={t('feed.comments', 'Komentáre')}
            className={ACTION_BUTTON}
          >
            <CommentIcon />
          </button>
          <span
            data-testid="feed-photo-viewer-comments-count"
            className="text-sm font-medium tabular-nums text-white"
          >
            {commentsCount}
          </span>

          <button
            type="button"
            onClick={onOpenShare}
            data-testid="feed-photo-viewer-share"
            aria-label={t('feed.sharePost', 'Zdieľať ďalej')}
            className={`${ACTION_BUTTON} ml-1`}
          >
            <ShareIcon className="h-6 w-6" />
          </button>

          <div className="relative ml-auto">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              data-testid="feed-photo-viewer-menu-trigger"
              aria-label={t('feed.postMenu', 'Možnosti príspevku')}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className={ACTION_BUTTON}
            >
              <EllipsisHorizontalIcon className="h-6 w-6" />
            </button>

            {menuOpen ? (
              <div
                role="menu"
                data-testid="feed-photo-viewer-menu"
                aria-label={t('feed.postMenu', 'Možnosti príspevku')}
                className="absolute bottom-12 right-0 z-30 w-56 overflow-hidden rounded-xl border border-white/15 bg-[#101012] shadow-2xl"
              >
                {/* Zdieľanie tu ZÁMERNE nie je – má vlastnú ikonu v riadku
                    akcií a dve cesty k tej istej akcii len mätú. */}
                <button
                  type="button"
                  role="menuitem"
                  disabled={reported}
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenReport();
                  }}
                  data-testid="feed-photo-viewer-report"
                  className="block w-full px-4 py-3 text-left text-sm text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:text-white/40"
                >
                  {reported
                    ? t('feed.alreadyReported', 'Už nahlásené')
                    : t('feed.reportPost', 'Nahlásiť príspevok')}
                </button>
                {/* Upravovať aj mazať smie iba autor – rozhoduje o tom backend
                    cez `can_manage`, FE si to neodvodzuje sám. */}
                {post.can_manage ? (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenEdit();
                    }}
                    data-testid="feed-photo-viewer-edit"
                    className="block w-full border-t border-white/10 px-4 py-3 text-left text-sm text-white transition-colors hover:bg-white/10"
                  >
                    {t('feed.editPost', 'Upraviť príspevok')}
                  </button>
                ) : null}
                {post.can_manage ? (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenDelete();
                    }}
                    data-testid="feed-photo-viewer-delete"
                    className="block w-full border-t border-white/10 px-4 py-3 text-left text-sm text-red-400 transition-colors hover:bg-red-500/15"
                  >
                    {t('feed.deletePost', 'Zmazať príspevok')}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
