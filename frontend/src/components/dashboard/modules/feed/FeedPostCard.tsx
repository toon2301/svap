'use client';

/**
 * Karta príspevku na Nástenke (Smer B).
 *
 * - free_post: neutrálna biela karta, fialové akcenty (avatar, tagy, lajk).
 * - shared_*: CELÁ karta jemne fialová (#EEEDFE) + „výmena ďalej" hlavička
 *   a vnorený náhľad zdieľaného obsahu.
 *
 * Fáza 4.1 = len zobrazenie: akcie sú vizuálne (počty), bez onClick.
 */

import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import InitialsAvatar from '@/components/shared/InitialsAvatar';
import type { FeedPost } from '@/lib/feedApi';

/**
 * Pozadie zdieľanej karty. Svetlý odtieň je presne #EEEDFE zo zadania (preto
 * arbitrary hodnota, nie purple-50 – to je iný, ružovejší tón), tmavý variant
 * ide podľa zavedeného vzoru appky pre fialové plochy (`dark:bg-purple-950/30`,
 * viď AboutPage). Zámerne ako TRIEDA, nie inline style: inline farba sa
 * neprepína podľa režimu, takže by v tmavom režime ostal svetlý podklad pod
 * svetlým textom.
 */
const SHARED_CARD_SURFACE =
  'bg-[#EEEDFE] dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/60';

function formatRelativeTime(
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

/** Ikona výmeny (ti-arrows-exchange) v kruhu – marker zdieľaného príspevku. */
function ExchangeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <path d="M7 10h14l-4-4" />
      <path d="M17 14H3l4 4" />
    </svg>
  );
}

function ActionCount({
  label,
  count,
  children,
}: {
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    // Fáza 4.2 z toho spraví tlačidlá; teraz zámerne bez onClick a bez
    // role="button", aby to čítačka neohlasovala ako klikateľné.
    <span
      className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400"
      aria-label={`${label}: ${count}`}
    >
      {children}
      <span className="tabular-nums">{count}</span>
    </span>
  );
}

function SharedContentPreview({ post }: { post: FeedPost }) {
  const { t } = useLanguage();
  const shared = post.shared_content;
  if (!shared) return null;

  if (post.shared_content_unavailable) {
    return (
      <div
        data-testid="feed-shared-unavailable"
        className="flex items-center gap-3 rounded-xl border border-purple-200/70 bg-white/70 p-3 dark:border-purple-800/40 dark:bg-black/20"
      >
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-6 w-6"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <line x1="5.6" y1="5.6" x2="18.4" y2="18.4" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {shared.type === 'offer'
              ? t('feed.sharedOfferUnavailable', 'Táto ponuka už nie je dostupná')
              : t('feed.sharedPortfolioUnavailable', 'Toto portfólio už nie je dostupné')}
          </p>
          {shared.title ? (
            <p className="truncate text-xs text-gray-400 dark:text-gray-500">
              {shared.title}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-purple-200/70 bg-white/80 p-3 dark:border-purple-800/40 dark:bg-black/20">
      {shared.thumbnail_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={shared.thumbnail_url}
          alt={shared.title}
          className="h-14 w-14 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-500 dark:bg-purple-900/40 dark:text-purple-300">
          <ExchangeIcon />
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
          {shared.title}
        </p>
        {shared.owner_display_name ? (
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
            {shared.owner_display_name}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function FeedPostCard({ post }: { post: FeedPost }) {
  const { t, locale } = useLanguage();
  const isShared = post.post_type !== 'free_post';
  const authorName = post.author?.display_name || '';
  const approvedImage =
    post.image && (post.image.thumbnail_url || post.image.large_url)
      ? post.image
      : null;
  const processingStatus = post.image?.status;

  const sharedHeadline =
    post.shared_content?.type === 'portfolio_item'
      ? t('feed.sharesPortfolioOnward', '{name} zdieľa portfólio ďalej')
      : t('feed.offersExchangeOnward', '{name} ponúka výmenu ďalej');

  return (
    <motion.article
      data-testid="feed-post-card"
      data-post-type={post.post_type}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={[
        'overflow-hidden rounded-2xl border shadow-sm',
        isShared
          ? SHARED_CARD_SURFACE
          : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-[#202223]',
      ].join(' ')}
    >
      {isShared ? (
        <div className="flex items-center gap-2 px-4 pt-3 text-xs font-medium text-purple-700 dark:text-purple-200">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-200/80 text-purple-700 dark:bg-purple-900/60 dark:text-purple-200">
            <ExchangeIcon />
          </span>
          <span className="truncate">
            {sharedHeadline.replace('{name}', authorName)}
          </span>
        </div>
      ) : null}

      <header className="flex items-center gap-3 px-4 pb-3 pt-3">
        <InitialsAvatar
          name={authorName}
          avatarUrl={post.author?.avatar_url}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
            {authorName}
          </p>
          <time
            dateTime={post.created_at}
            className="text-xs text-gray-500 dark:text-gray-400"
          >
            {formatRelativeTime(post.created_at, t, locale)}
          </time>
        </div>
      </header>

      {approvedImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={approvedImage.large_url || approvedImage.thumbnail_url || ''}
          alt=""
          data-testid="feed-post-image"
          className="max-h-[28rem] w-full object-cover"
        />
      ) : processingStatus === 'pending' || processingStatus === 'rejected' ? (
        // Vidí len autor (backend cudzím fotku neposiela) – vzor
        // ImageWithStatusOverlay, ale bez samotného obrázka.
        <div className="flex h-40 w-full flex-col items-center justify-center gap-1 bg-gray-100 text-sm font-medium text-gray-700 dark:bg-gray-900/40 dark:text-gray-200">
          {processingStatus === 'pending' ? (
            <>
              <svg
                className="h-5 w-5 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 12a8 8 0 018-8"
                />
              </svg>
              <span>{t('skills.imageProcessing', 'Spracúva sa…')}</span>
            </>
          ) : (
            <>
              <span className="font-bold text-red-600 dark:text-red-300">!</span>
              <span>
                {post.image?.rejected_reason ||
                  t('feed.imageRejected', 'Fotka bola zamietnutá')}
              </span>
            </>
          )}
        </div>
      ) : null}

      <div className="space-y-3 px-4 py-3">
        {isShared ? <SharedContentPreview post={post} /> : null}

        {post.caption ? (
          <p className="whitespace-pre-wrap break-words text-sm text-gray-800 dark:text-gray-100">
            {post.caption}
          </p>
        ) : null}

        {post.tagged_users?.length ? (
          <ul className="flex flex-wrap gap-1.5" data-testid="feed-post-tags">
            {post.tagged_users.map((tagged) => (
              <li
                key={tagged.id}
                className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/40 dark:text-purple-200"
              >
                @{tagged.display_name}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <footer className="flex items-center gap-5 border-t border-gray-200/70 px-4 py-2.5 dark:border-gray-700/60">
        <ActionCount label={t('feed.likes', 'Páči sa mi')} count={post.likes_count}>
          <svg
            viewBox="0 0 24 24"
            fill={post.is_liked_by_me ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            className={`h-4 w-4 ${post.is_liked_by_me ? 'text-purple-600 dark:text-purple-300' : ''}`}
            aria-hidden="true"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </ActionCount>

        <ActionCount
          label={t('feed.comments', 'Komentáre')}
          count={post.comments_count}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </ActionCount>
      </footer>
    </motion.article>
  );
}
