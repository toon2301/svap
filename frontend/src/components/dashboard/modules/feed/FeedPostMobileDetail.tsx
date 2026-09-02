'use client';

/**
 * Mobilná obrazovka detailu príspevku – celá stránka, nie prehliadač fotky.
 *
 * Otvára ju ťuk na „komentovať" na karte a ťuk na TEXT príspevku (s fotkou aj
 * bez nej). Ťuk priamo na FOTKU vedie inam – do `FeedPhotoViewer`, imerzného
 * prehliadača, ktorý sa nemení.
 *
 * ROZLOŽENIE (zámerne bez akéhokoľvek imerzného triku):
 *
 *   ┌───────────────────────────────┐
 *   │ hlavička: avatar meno ⋯    ✕ │ PEVNÁ
 *   ├───────────────────────────────┤
 *   │ text (5 riadkov + „Viac")     │
 *   │ fotka / karusel               │ JEDNA súvislá
 *   │ riadok akcií                  │ scrollovateľná
 *   │ „Komentáre" + zoznam          │ plocha
 *   ├───────────────────────────────┤
 *   │ pole na nový komentár         │ PEVNÉ
 *   └───────────────────────────────┘
 *
 * Ten jeden súvislý povrch NEROBÍ tento súbor: obsah nad komentármi ide do
 * `FeedPostComments` ako `listHeader`, teda PRIAMO DO jeho scrollovateľného
 * boxu. Vďaka tomu je scroll naozaj jeden (nie dva nad sebou), donačítavanie
 * pri scrollovaní meria tú istú plochu, ktorou používateľ hýbe, a pole na nový
 * komentár ostáva pod ňou pevne. Zoznam, polling, odpovede, lajky, úprava aj
 * composer sú teda ten istý komponent ako na karte, v okne detailu a v paneli
 * nad fotkou – nie ďalšia kópia.
 *
 * Na rozdiel od prehliadača fotky tu NIE JE tmavá výnimka: pod obsahom nie je
 * fotka, takže obrazovka sleduje bežný svetlý/tmavý režim appky.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { EllipsisHorizontalIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import InitialsAvatar from '@/components/shared/InitialsAvatar';
import {
  deleteFeedPost,
  likeFeedPost,
  unlikeFeedPost,
  type FeedPost,
} from '@/lib/feedApi';
import { translateFeedActionError } from './feedActionErrors';
import { emitFeedPostCounts } from './feedPostCountEvents';
import { emitFeedPostDeleted } from './feedPostDeletedEvents';
import { canOpenUserProfile, openUserProfile } from './feedProfileNavigation';
import { feedViewableImages } from './feedImageSources';
import { formatRelativeTime } from './feedRelativeTime';
import { shouldAutoScrollToComments } from './feedMobileDetailAutoScroll';
import { useFeedDialog } from './useFeedDialog';
import { usePendingFeedImages } from './usePendingFeedImages';
import FeedDestructiveConfirm from './FeedDestructiveConfirm';
import FeedLikersDialog from './FeedLikersDialog';
import FeedPostCaption from './FeedPostCaption';
import FeedPostComments from './FeedPostComments';
import FeedPostEditModal from './FeedPostEditModal';
import FeedPostImageCarousel from './FeedPostImageCarousel';
import FeedPostReportModal from './FeedPostReportModal';
import FeedPostShareModal from './FeedPostShareModal';
import ShareIcon from './ShareIcon';

/** Text príspevku sa tu zbalí na päť riadkov – obrazovka má miesta viac než karta. */
const MOBILE_DETAIL_CAPTION_LINES = 5;

/** Spoločný vzhľad troch akcií – dotykový cieľ nad 44 px. */
const ACTION_BUTTON =
  'inline-flex h-11 items-center gap-1.5 rounded-full px-2 text-sm text-gray-600 transition-colors hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 dark:text-gray-300 dark:hover:bg-white/10';

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
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
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

type FeedPostMobileDetailProps = {
  post: FeedPost;
  onClose: () => void;
  /** Autor príspevok zmazal – zoznam pod obrazovkou ho má vyhodiť. */
  onDeleted?: (postId: number) => void;
  /** Zdieľanie ďalej vloží nový príspevok na vrch feedu. */
  onShared?: (created: FeedPost) => void;
};

export default function FeedPostMobileDetail({
  post,
  onClose,
  onDeleted,
  onShared,
}: FeedPostMobileDetailProps) {
  const { t, locale } = useLanguage();
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const [currentPost, setCurrentPost] = useState(post);
  const [isLiked, setIsLiked] = useState(post.is_liked_by_me);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [commentsCount, setCommentsCount] = useState(post.comments_count);
  const [menuOpen, setMenuOpen] = useState(false);
  const [likersOpen, setLikersOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reported, setReported] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const likePendingRef = useRef(false);
  /** Kotva „Komentáre" – sem sa doscrolluje pri otvorení, ak sa má. */
  const commentsAnchorRef = useRef<HTMLDivElement | null>(null);
  const autoScrolledRef = useRef(false);
  /**
   * Čo obrazovka pri otvorení rozhodla o štartovacej pozícii.
   *
   * `null` = ešte sa nerozhodlo (portál nie je hotový). Vyjadrené aj v DOM
   * (`data-auto-scrolled`), aby sa dalo overiť oboje – že sa doscrollovalo aj
   * že sa ZÁMERNE nedoscrollovalo. Bez toho by sa „nescrolluje" nedalo odlíšiť
   * od „efekt ešte nedobehol".
   */
  const [autoScrollDecision, setAutoScrollDecision] = useState<boolean | null>(null);

  // Fokus, Tab trap aj Escape rieši spoločný hook feed dialógov – vrátane
  // poradia vrstiev, takže Escape nad otvoreným prehliadačom fotky zavrie
  // najprv jeho a až ďalšie stlačenie túto obrazovku.
  const dialogRef = useFeedDialog({
    open: true,
    onClose,
    ready: portalNode !== null,
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    setPortalNode(document.getElementById('app-root') ?? document.body);
  }, []);

  // Rozpracované fotky si dosleduje ten istý hook ako karta – obrazovka je
  // otvorená dlho, takže by inak ostala na snímke z otvorenia.
  const images = usePendingFeedImages(currentPost);
  const hasPhoto = feedViewableImages(images).length > 0;
  const caption = currentPost.caption;

  // Počty drží obrazovka; karta pod ňou o novom komentári inak nevie.
  useEffect(() => {
    emitFeedPostCounts({ postId: post.id, commentsCount });
  }, [post.id, commentsCount]);

  /**
   * Štartovacia pozícia: pri fotke a rozbehnutej diskusii sa obrazovka otvorí
   * rovno pri komentároch, inak od vrchu. Beží NAJVIAC RAZ – ďalší render
   * (donačítanie, nový komentár) už používateľovi pohľad nestrhne.
   */
  useEffect(() => {
    if (autoScrolledRef.current) return;
    const anchor = commentsAnchorRef.current;
    // Portál ešte nie je hotový – rozhodnutie padne v ďalšom kole.
    if (!anchor) return;
    autoScrolledRef.current = true;

    const scroll = shouldAutoScrollToComments({
      hasPhoto,
      commentsCount: post.comments_count,
    });
    setAutoScrollDecision(scroll);
    if (!scroll) return;
    // `block: 'start'` posadí kotvu na vrch scrollovateľnej plochy, teda hneď
    // pod pevnú hlavičku – fotka aj riadok akcií tým ostanú nad dohľadom.
    //
    // Kontrola typu je kvôli prostrediam bez `scrollIntoView` (jsdom ho
    // neimplementuje): štartovacia pozícia je pohodlie, nie funkčnosť, takže
    // jej absencia nesmie zhodiť celú obrazovku.
    if (typeof anchor.scrollIntoView === 'function') {
      anchor.scrollIntoView({ block: 'start' });
    }
    // `portalNode` v závislostiach je podstatné: pri PRVOM renderi ešte portál
    // neexistuje, takže kotva nie je v DOM a efekt by sa bez neho už nikdy
    // nezopakoval.
  }, [hasPhoto, portalNode, post.comments_count]);

  const handleToggleLike = useCallback(async () => {
    if (likePendingRef.current) return;
    likePendingRef.current = true;

    const previousLiked = isLiked;
    const previousCount = likesCount;
    const nextLiked = !previousLiked;
    const optimisticCount = Math.max(0, previousCount + (nextLiked ? 1 : -1));
    setIsLiked(nextLiked);
    setLikesCount(optimisticCount);
    emitFeedPostCounts({
      postId: post.id,
      likesCount: optimisticCount,
      isLikedByMe: nextLiked,
    });

    try {
      const payload = nextLiked
        ? await likeFeedPost(post.id)
        : await unlikeFeedPost(post.id);
      setIsLiked(payload.is_liked_by_me);
      setLikesCount(payload.likes_count);
      emitFeedPostCounts({
        postId: post.id,
        likesCount: payload.likes_count,
        isLikedByMe: payload.is_liked_by_me,
      });
    } catch (error) {
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
      emitFeedPostCounts({
        postId: post.id,
        likesCount: previousCount,
        isLikedByMe: previousLiked,
      });
      toast.error(translateFeedActionError(t, error));
    } finally {
      likePendingRef.current = false;
    }
  }, [isLiked, likesCount, post.id, t]);

  const handleDelete = useCallback(async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteFeedPost(post.id);
      setDeleteOpen(false);
      toast.success(t('feed.postDeleted', 'Príspevok bol zmazaný.'));
      onDeleted?.(post.id);
      emitFeedPostDeleted(post.id);
      onClose();
    } catch (error) {
      toast.error(
        translateFeedActionError(t, error, () =>
          t('feed.postDeleteError', 'Príspevok sa nepodarilo zmazať.'),
        ),
      );
    } finally {
      setDeleting(false);
    }
  }, [deleting, onClose, onDeleted, post.id, t]);

  if (!portalNode) return null;

  const author = currentPost.author;
  const authorName = author?.display_name || '';
  const openAuthorProfile = () =>
    openUserProfile(author, { beforeNavigate: onClose });

  /**
   * Všetko nad komentármi. Ide DOVNÚTRA scrollovateľného boxu komentárov,
   * takže text, fotka aj akcie scrollujú spolu so zoznamom.
   */
  const listHeader = (
    <div data-testid="feed-mobile-detail-header-content" className="pb-1">
      {caption ? (
        <div className="pb-3">
          <FeedPostCaption
            text={caption}
            testId="feed-mobile-detail-caption"
            maxLines={MOBILE_DETAIL_CAPTION_LINES}
            collapseBlankLines
            // Rozbaľuje sa v BEŽNOM toku: žiadny strop ani vlastný scroll, len
            // viac textu, ktorý prirodzene posunie fotku, akcie aj komentáre
            // nižšie.
          />
        </div>
      ) : null}

      {hasPhoto ? (
        <div className="-mx-4 pb-3" data-testid="feed-mobile-detail-photo">
          {/* Bez `onPhotoClick`: ťuk otvorí pôvodný fullscreen prehliadač
              (`ImageLightbox`) priamo z karuselu – tá istá cesta, aká platí
              vnútri okna detailu na desktope. */}
          <FeedPostImageCarousel
            images={images}
            alt={t('feed.imageAlt', 'Fotka príspevku')}
          />
        </div>
      ) : null}

      {/* Lajk, komentáre aj zdieľanie sú POKOPE – žiadne odsúvanie zdieľania
          na druhý koniec riadku. */}
      <div
        data-testid="feed-mobile-detail-actions"
        className="flex items-center gap-1 border-y border-gray-200/70 py-1 dark:border-gray-700/60"
      >
        <button
          type="button"
          onClick={() => void handleToggleLike()}
          data-testid="feed-mobile-detail-like"
          aria-label={t('feed.likes', 'Páči sa mi')}
          aria-pressed={isLiked}
          className={`${ACTION_BUTTON} ${
            isLiked ? 'text-purple-600 dark:text-purple-300' : ''
          }`}
        >
          <HeartIcon filled={isLiked} />
        </button>
        {/* Počet je samostatný cieľ kliku – otvára zoznam lajkujúcich. */}
        <button
          type="button"
          onClick={() => setLikersOpen(true)}
          data-testid="feed-mobile-detail-like-count"
          aria-label={`${t('feed.likersTitle', 'Páči sa im to')}: ${likesCount}`}
          className="h-11 rounded-full px-1 text-sm tabular-nums text-gray-600 underline-offset-2 transition-colors hover:bg-black/5 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 dark:text-gray-300 dark:hover:bg-white/10"
        >
          {likesCount}
        </button>

        <span className={ACTION_BUTTON} data-testid="feed-mobile-detail-comments">
          <CommentIcon />
          <span className="tabular-nums">{commentsCount}</span>
        </span>

        <button
          type="button"
          onClick={() => setShareOpen(true)}
          data-testid="feed-mobile-detail-share"
          aria-label={t('feed.sharePost', 'Zdieľať ďalej')}
          className={ACTION_BUTTON}
        >
          <ShareIcon className="h-5 w-5" />
        </button>
      </div>

      <div
        ref={commentsAnchorRef}
        data-testid="feed-mobile-detail-comments-anchor"
        data-auto-scrolled={
          autoScrollDecision === null ? undefined : String(autoScrollDecision)
        }
        className="pt-3"
      >
        <h2
          data-testid="feed-mobile-detail-comments-title"
          className="text-sm font-semibold text-gray-900 dark:text-white"
        >
          {t('feed.comments', 'Komentáre')}
        </h2>
      </div>
    </div>
  );

  return createPortal(
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={t('feed.postDetail', 'Detail príspevku')}
      data-testid="feed-mobile-detail"
      className="fixed inset-0 z-[111] flex flex-col bg-white focus:outline-none dark:bg-[#0f0f10]"
    >
      {/* PEVNÁ hlavička – nescrolluje s obsahom. */}
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

      {/* `min-h-0` ruší automatické minimum flex položky – bez neho by obsah
          plochu roztiahol a pole na nový komentár by vypadlo z obrazovky. */}
      <div className="min-h-0 flex-1">
        <FeedPostComments
          postId={post.id}
          fillHeight
          showTimestamp
          compactComposer
          listHeader={listHeader}
          onCountChange={(delta) =>
            setCommentsCount((count) => Math.max(0, count + delta))
          }
          onTotalChange={setCommentsCount}
        />
      </div>

      <FeedLikersDialog
        open={likersOpen}
        onClose={() => setLikersOpen(false)}
        postId={post.id}
      />
      <FeedPostShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        post={currentPost}
        onShared={onShared}
      />
      <FeedPostReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        postId={post.id}
        onReported={() => setReported(true)}
      />
      {editOpen ? (
        <FeedPostEditModal
          open
          post={currentPost}
          onClose={() => setEditOpen(false)}
          onUpdated={setCurrentPost}
        />
      ) : null}
      <FeedDestructiveConfirm
        open={deleteOpen}
        isDeleting={deleting}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        testId="feed-mobile-detail-delete-confirm"
        title={t('feed.postDeleteConfirm', 'Naozaj chceš zmazať tento príspevok?')}
        hint={t('feed.postDeleteHint', 'Túto akciu už nie je možné vrátiť späť.')}
      />
    </div>,
    portalNode,
  );
}
