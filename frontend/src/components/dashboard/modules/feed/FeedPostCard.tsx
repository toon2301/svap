'use client';

/**
 * Karta príspevku na Nástenke (Smer B).
 *
 * - free_post: neutrálna biela karta, fialové akcenty (avatar, tagy, lajk).
 * - shared_*: CELÁ karta jemne fialová (#EEEDFE) + „výmena ďalej" hlavička
 *   a vnorený náhľad zdieľaného obsahu. Zdieľaný VOĽNÝ príspevok má vlastný
 *   variant náhľadu („mini príspevok" – autor, text, fotka).
 *
 * Akcie (lajk, komentáre, zdieľanie, nahlásenie) sú živé; lajk beží
 * optimisticky a pri zlyhaní sa vráti do pôvodného stavu.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  EllipsisHorizontalIcon,
  FlagIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks';
import { translateFeedActionError } from './feedActionErrors';
import InitialsAvatar from '@/components/shared/InitialsAvatar';
import { buildPortfolioDetailPath } from '../profile/portfolioRouting';
import {
  deleteFeedPost,
  getFeedPost,
  likeFeedPost,
  removeOwnFeedPostTag,
  unlikeFeedPost,
  type FeedPost,
} from '@/lib/feedApi';
import FeedDestructiveConfirm from './FeedDestructiveConfirm';
import FeedLikersDialog from './FeedLikersDialog';
import FeedPostComments from './FeedPostComments';
import FeedPostImageCarousel from './FeedPostImageCarousel';
import { useFeedPostOverlay } from '../../contexts/FeedPostOverlayContext';
import {
  emitFeedPostCounts,
  onFeedPostCounts,
} from './feedPostCountEvents';
import FeedAnchoredMenu from './FeedAnchoredMenu';
import FeedPostCaption from './FeedPostCaption';
import FeedPostEditModal from './FeedPostEditModal';
import FeedPostReportModal from './FeedPostReportModal';
import FeedPostShareModal from './FeedPostShareModal';
import ShareIcon from './ShareIcon';
import { formatOfferPriceLabel } from './offerPriceLabel';
import { usePendingFeedImages } from './usePendingFeedImages';
import { useCardInViewport } from './useCardInViewport';
import { useFeedCommentsPolling } from './useFeedCommentsPolling';

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

function ActionButton({
  label,
  count,
  active = false,
  onClick,
  onCountClick,
  countLabel,
  countTestId,
  testId,
  children,
}: {
  label: string;
  count?: number;
  active?: boolean;
  onClick: () => void;
  /**
   * Klik na POČET (nie na ikonu) – napr. otvorenie zoznamu lajkujúcich.
   * Keď chýba alebo je počet 0, ostáva počet obyčajný text: vnorené tlačidlo
   * v tlačidle je neplatné HTML, takže sa vyčlení iba keď má čo robiť.
   */
  onCountClick?: () => void;
  countLabel?: string;
  countTestId?: string;
  testId?: string;
  children: React.ReactNode;
}) {
  const countIsInteractive = Boolean(onCountClick) && (count ?? 0) > 0;

  if (countIsInteractive) {
    return (
      // gap-1 drží medzi srdiečkom a číslom skutočnú medzeru – bez nej sa
      // dva nezávislé ciele kliku čítajú ako jedno tlačidlo.
      <span className="-m-1 inline-flex items-center gap-1">
        <button
          type="button"
          onClick={onClick}
          data-testid={testId}
          aria-label={count === undefined ? label : `${label}: ${count}`}
          title={label}
          className={`inline-flex items-center rounded-full p-2 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${
            active
              ? 'text-purple-600 dark:text-purple-300'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {children}
        </button>
        <button
          type="button"
          onClick={onCountClick}
          data-testid={countTestId}
          aria-label={countLabel ? `${countLabel}: ${count}` : undefined}
          title={countLabel}
          // Farba ZÁMERNE nesleduje `active`: keď je príspevok lajknutý,
          // srdiečko sfialovie a číslo ostane neutrálne, takže je vidieť, že
          // sú to dve rôzne veci. Podčiarknutie + zmena farby pri hoveri
          // napovedajú, že číslo je samostatný cieľ kliku.
          className="rounded-full px-1.5 py-2 text-sm tabular-nums text-gray-500 underline-offset-2 transition-colors hover:bg-black/5 hover:text-purple-700 hover:underline dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-purple-300"
        >
          {count}
        </button>
      </span>
    );
  }

  return (
    // p-2 + gap drží dotykový cieľ nad 40px aj na mobile (vzor ostatných
    // ikonových tlačidiel appky, napr. zatváracie X v modaloch).
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      aria-label={count === undefined ? label : `${label}: ${count}`}
      title={label}
      className={`-m-1 inline-flex items-center gap-1.5 rounded-full p-2 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${
        active
          ? 'text-purple-600 dark:text-purple-300'
          : 'text-gray-500 dark:text-gray-400'
      }`}
    >
      {children}
      {count === undefined ? null : <span className="tabular-nums">{count}</span>}
    </button>
  );
}

function SharedContentPreview({
  post,
  hideOwner = false,
  onOpenSource,
}: {
  post: FeedPost;
  hideOwner?: boolean;
  onOpenSource?: () => void;
}) {
  const { t, locale } = useLanguage();
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
              : shared.type === 'portfolio_item'
                ? t('feed.sharedPortfolioUnavailable', 'Toto portfólio už nie je dostupné')
                : t('feed.sharedPostUnavailable', 'Tento príspevok už nie je dostupný')}
          </p>
          {shared.title || shared.caption ? (
            <p className="truncate text-xs text-gray-400 dark:text-gray-500">
              {shared.title || shared.caption}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  // Zdieľaný VOĽNÝ príspevok – „mini príspevok" (autor + text + fotka),
  // nie „mini ponuka" (náhľad + názov + kategória).
  if (shared.type === 'feed_post') {
    return (
      // Výraznejší rám než pri ponuke/portfóliu: tu sú „hore" aj „dole"
      // PRÍSPEVKY OD ĽUDÍ, takže bez zreteľného predelu to môže vyzerať,
      // akoby pôvodný autor zdieľal sám seba. Ponuka ani portfólio túto
      // zámenu nevyvolávajú – náhľad je tam očividne iný typ obsahu.
      <div
        data-testid="feed-shared-post-preview"
        className="rounded-xl border-2 border-purple-300 bg-white/90 p-3 shadow-sm dark:border-purple-700/70 dark:bg-black/30"
      >
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-purple-700/80 dark:text-purple-300/80">
          {t('feed.originalPost', 'Pôvodný príspevok')}
        </p>
        {hideOwner ? null : (
          <div className="flex items-center gap-2">
            <InitialsAvatar
              name={shared.owner_display_name}
              avatarUrl={shared.owner?.avatar_url}
              size="xs"
            />
            <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">
              {shared.owner_display_name}
            </span>
          </div>
        )}
        {shared.caption ? (
          <p className="mt-2 line-clamp-4 whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-gray-200">
            {shared.caption}
          </p>
        ) : null}
        {shared.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shared.thumbnail_url}
            alt=""
            className="mt-2 max-h-64 w-full rounded-lg object-cover"
          />
        ) : null}
      </div>
    );
  }

  // Kompaktný náhľad podľa vzoru OfferShareMessageCard z messages: nízky
  // horizontálny riadok s malým obrázkom, celý klikateľný. Fialový obal karty
  // aj „výmena ďalej" hlavička ostávajú – mení sa len tento vnútorný náhľad.
  const isOffer = shared.type === 'offer';
  // Spoločný helper s náhľadom v zdieľacom dialógu – inak by používateľ pri
  // zdieľaní videl inú cenu než tú, čo o chvíľu pristane vo feede.
  const priceLabel = formatOfferPriceLabel(t, locale, shared);

  return (
    <button
      type="button"
      onClick={onOpenSource}
      disabled={!onOpenSource}
      data-testid="feed-shared-compact-preview"
      className="flex w-full items-center gap-3 rounded-xl border border-purple-200/70 bg-white/80 p-2.5 text-left transition-colors hover:bg-white disabled:cursor-default dark:border-purple-800/40 dark:bg-black/20 dark:hover:bg-black/30"
    >
      {shared.thumbnail_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={shared.thumbnail_url}
          alt=""
          className="h-12 w-12 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-500 dark:bg-purple-900/40 dark:text-purple-300">
          <ExchangeIcon />
        </span>
      )}
      <span className="min-w-0 flex-1">
        {isOffer && shared.is_seeking !== null ? (
          <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-purple-600 dark:text-purple-300">
            {shared.is_seeking
              ? t('skills.search', 'Hľadám')
              : t('skills.offering', 'Ponúkam')}
          </span>
        ) : null}
        <span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">
          {shared.title}
        </span>
        <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
          {shared.owner_display_name}
        </span>
      </span>
      {priceLabel ? (
        <span className="shrink-0 rounded-md border border-purple-100 bg-purple-50 px-1.5 py-0.5 text-xs font-bold tabular-nums text-purple-700 dark:border-purple-800/30 dark:bg-purple-900/20 dark:text-purple-300">
          {priceLabel}
        </span>
      ) : null}
    </button>
  );
}

export default function FeedPostCard({
  post,
  initialCommentsOpen = false,
  highlightCommentId,
  onShared,
  onSelfTagRemoved,
  onDeleted,
  variant = 'card',
  commentsCount: commentsCountOverride,
}: {
  post: FeedPost;
  /**
   * `card` = dlaždica vo feede (vlastný rám, komentáre sa rozbaľujú v nej).
   * `detail` = vnútrajšok okna detailu: bez rámu a BEZ komentárovej sekcie –
   * tú si okno vykresľuje samo v scrollovateľnej časti.
   */
  variant?: 'card' | 'detail';
  /** V okne drží počet komentárov okno (má ich pod sebou), nie karta. */
  commentsCount?: number;
  /** Permalink detail otvára komentáre rovno (viď FeedPostDetailModule). */
  initialCommentsOpen?: boolean;
  /** Komentár z notifikácie – sekcia naň doscrolluje a zvýrazní ho. */
  highlightCommentId?: number | null;
  /** Zdieľanie ďalej vloží nový príspevok na vrch feedu (ako composer). */
  onShared?: (created: FeedPost) => void;
  /**
   * Používateľ odstránil svoje označenie. Zoznamy filtrované na „kde som
   * označený" (profilový tab) tam príspevok už nemajú prečo držať.
   */
  onSelfTagRemoved?: (postId: number) => void;
  /** Autor zmazal príspevok – zoznamy ho majú okamžite vyhodiť. */
  onDeleted?: (postId: number) => void;
}) {
  const { t, locale } = useLanguage();
  const isMobile = useIsMobile();
  const router = useRouter();
  const isShared = post.post_type !== 'free_post';
  const authorName = post.author?.display_name || '';
  // Odstránenie sa premietne AŽ po potvrdení serverom – rovnako ako mazanie
  // komentára. Optimistický vzor je vo feede vyhradený lajku, kde je zlyhanie
  // bezvýznamné; tu by zmiznutý a späť vrátený chip pôsobil ako chyba.
  const handleRemoveOwnTag = async () => {
    if (removingTag) return;
    setRemovingTag(true);
    try {
      await removeOwnFeedPostTag(post.id);
      setTaggedUsers((current) => current.filter((tag) => !tag.can_remove_tag));
      setTagRemoveOpen(false);
      toast.success(t('feed.tagRemoved', 'Označenie bolo odstránené.'));
      onSelfTagRemoved?.(post.id);
    } catch (error) {
      toast.error(
        translateFeedActionError(t, error, () =>
          t('feed.tagRemoveError', 'Označenie sa nepodarilo odstrániť.'),
        ),
      );
    } finally {
      setRemovingTag(false);
    }
  };

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    // Fokus späť na spúšťač – inak by po zatvorení skončil na <body>
    // a klávesnicová navigácia by začínala odznova.
    menuTriggerRef.current?.focus();
  }, []);

  const handleDeletePost = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteFeedPost(post.id);
      setDeleteOpen(false);
      toast.success(t('feed.postDeleted', 'Príspevok bol zmazaný.'));
      // Zoznam si kartu odstráni sám; na detaile to znamená odchod na Nástenku.
      onDeleted?.(post.id);
    } catch (error) {
      toast.error(
        translateFeedActionError(t, error, () =>
          t('feed.postDeleteError', 'Príspevok sa nepodarilo zmazať.'),
        ),
      );
    } finally {
      setDeleting(false);
    }
  };

  // Backend posiela cudziemu divákovi len APPROVED fotky; autor dostane aj
  // pending/rejected – hook ich dosleduje, kým sa spracovanie nedokončí.
  //
  // Karta drží JEDNU lokálnu verziu príspevku. Prop z feedu je len počiatočný
  // stav: po úprave sa zoznam neobnovuje, takže by ostal zastaraný – a keby sa
  // z neho inicializoval edit modal pri druhom otvorení, ukázal by už zmazané
  // fotky a starým textom by prepísal ten práve uložený.
  const [currentPost, setCurrentPost] = useState(post);
  const images = usePendingFeedImages(currentPost);
  const caption = currentPost.caption;
  // `is_edited` chodí LEN autorovi – cudziemu divákovi kľúč v odpovedi vôbec
  // nie je, takže `undefined` znamená „nezobrazuj", nie „neviem".
  const isEdited = currentPost.is_edited === true;

  const [isLiked, setIsLiked] = useState(post.is_liked_by_me);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [commentsCount, setCommentsCount] = useState(post.comments_count);
  // V okne detailu drží počet okno (komentáre sú pod kartou, nie v nej);
  // vlastný stav karty pritom beží ďalej, takže po zatvorení okna nič nechýba.
  const shownCommentsCount = commentsCountOverride ?? commentsCount;
  const isDetail = variant === 'detail';
  // Kontext chýba mimo dashboardu (napr. samostatne vykreslená karta) – vtedy
  // ostáva pôvodné správanie: komentáre sa rozbalia priamo v karte.
  const postOverlay = useFeedPostOverlay();
  // Okno je DESKTOPOVÁ náhrada rozbaľovania; mobil ostáva nezmenený.
  const opensOverlay = Boolean(postOverlay) && !isMobile && !isDetail;
  const [commentsOpen, setCommentsOpen] = useState(initialCommentsOpen);
  const [menuOpen, setMenuOpen] = useState(false);
  // Pozícia spúšťača v okne – menu sa kreslí portálom, takže si ju musí niesť.
  const [menuAnchor, setMenuAnchor] = useState<DOMRect | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [reported, setReported] = useState(false);
  // Označenia sú lokálne, aby chip po odstránení zmizol bez čakania na
  // obnovenie celého feedu. Prop-sync nižšie ich vráti do súladu so serverom.
  const [taggedUsers, setTaggedUsers] = useState(post.tagged_users ?? []);
  const [tagRemoveOpen, setTagRemoveOpen] = useState(false);
  const [removingTag, setRemovingTag] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [likersOpen, setLikersOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const likePendingRef = useRef(false);
  // Poradové číslo lajkov. `likePendingRef` sám nestačí: lajk, ktorý sa počas
  // pollu stihne CELÝ (aj s odpoveďou), príznak zase vynuluje, takže by
  // zastaraná odpoveď pollu prepísala čerstvý počet späť. Rovnaký vzor ako
  // loadSeqRef vo FeedPostComments.
  const likeSeqRef = useRef(0);
  // Polling počtov beží LEN pre kartu na obrazovke – viď useCardInViewport.
  const { ref: viewportRef, inViewport } = useCardInViewport<HTMLElement>();
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);

  // Obnovenie feedu nahradí príspevok čerstvejšou verziou, ale `key` ostáva
  // rovnaké – React teda inštanciu recykluje a bez tejto synchronizácie by
  // karta ďalej ukazovala počty z prvého načítania. Počas prebiehajúceho
  // lajku sa nepreberá, nech optimistická zmena neprebliká späť.
  useEffect(() => {
    if (likePendingRef.current) return;
    setIsLiked(post.is_liked_by_me);
    setLikesCount(post.likes_count);
  }, [post.is_liked_by_me, post.likes_count]);

  useEffect(() => {
    setCommentsCount(post.comments_count);
  }, [post.comments_count]);

  useEffect(() => {
    setTaggedUsers(post.tagged_users ?? []);
  }, [post.tagged_users]);

  // Obnovenie feedu prináša čerstvejšiu verziu – tá má prednosť pred lokálnou.
  useEffect(() => {
    setCurrentPost(post);
  }, [post]);

  const handleToggleLike = async () => {
    if (likePendingRef.current) return;
    likePendingRef.current = true;
    likeSeqRef.current += 1;

    // Optimisticky prepni hneď, request beží na pozadí.
    const previousLiked = isLiked;
    const previousCount = likesCount;
    const nextLiked = !previousLiked;
    const optimisticCount = Math.max(0, previousCount + (nextLiked ? 1 : -1));
    setIsLiked(nextLiked);
    setLikesCount(optimisticCount);
    // Druhá karta toho istého príspevku (feed pod oknom detailu) má prebliknúť
    // spolu s touto, nie až po odpovedi servera.
    emitFeedPostCounts({
      postId: post.id,
      likesCount: optimisticCount,
      isLikedByMe: nextLiked,
    });

    try {
      const payload = nextLiked
        ? await likeFeedPost(post.id)
        : await unlikeFeedPost(post.id);
      // Zosúlaď s pravdou zo servera (iný divák mohol medzitým lajknúť tiež).
      setIsLiked(payload.is_liked_by_me);
      setLikesCount(payload.likes_count);
      emitFeedPostCounts({
        postId: post.id,
        likesCount: payload.likes_count,
        isLikedByMe: payload.is_liked_by_me,
      });
    } catch (err) {
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
      emitFeedPostCounts({
        postId: post.id,
        likesCount: previousCount,
        isLikedByMe: previousLiked,
      });
      toast.error(translateFeedActionError(t, err));
    } finally {
      likePendingRef.current = false;
    }
  };

  /**
   * Priebežné počty lajkov od iných používateľov.
   *
   * Rovnaký hook ako pri komentároch, takže interval, pauza pri skrytej
   * záložke, timeout nečinnosti aj ochrana proti prekrývajúcim sa requestom
   * sú zdieľané, nie skopírované.
   *
   * Počty lajkov KOMENTÁROV nič nové nepotrebujú: pollovanie komentárov
   * vracia celé objekty vrátane `likes_count` a merge ich nahradí čerstvou
   * verziou.
   */
  const refreshCounts = useCallback(async () => {
    // Vlastný lajk práve beží – serverová odpoveď je spred neho a prebliklo
    // by to späť. Rovnaká zásada ako v prop-sync efekte vyššie.
    if (likePendingRef.current) return;
    const seq = likeSeqRef.current;
    const fresh = await getFeedPost(post.id);
    // Medzitým používateľ lajkol (aj keď už dobehol) → odpoveď je spred toho.
    if (seq !== likeSeqRef.current || likePendingRef.current) return;
    setLikesCount(fresh.likes_count);
    setIsLiked(fresh.is_liked_by_me);
    setCommentsCount(fresh.comments_count);
  }, [post.id]);

  useFeedCommentsPolling({ enabled: inViewport, onPoll: refreshCounts });

  // Počty z inej karty toho istého príspevku (typicky okno detailu nad
  // feedom). Vlastný prebiehajúci lajk má prednosť – rovnaká zásada ako pri
  // pollovaní, inak by sa čerstvé kliknutie prepísalo starším číslom.
  useEffect(
    () =>
      onFeedPostCounts((patch) => {
        if (patch.postId !== post.id) return;
        if (!likePendingRef.current) {
          if (patch.likesCount !== undefined) setLikesCount(patch.likesCount);
          if (patch.isLikedByMe !== undefined) setIsLiked(patch.isLikedByMe);
        }
        if (patch.commentsCount !== undefined) {
          setCommentsCount(patch.commentsCount);
        }
      }),
    [post.id],
  );

  // Self-share: zdieľajúci JE pôvodný autor. Bez tejto vetvy sa to isté meno
  // zobrazí dvakrát pod sebou (hlavička + vnorený náhľad), čo pôsobí ako chyba.
  const isSelfShare =
    isShared &&
    post.shared_content?.owner?.id != null &&
    post.shared_content.owner.id === post.author?.id;
  // Duplicitné meno hrozí LEN pri zdieľanom PRÍSPEVKU. Náhľad ponuky a
  // portfólia ukazuje názov, nie meno vlastníka, takže tam sa nič neduplikuje
  // a hlásiť re-share pri PRVOM zdieľaní vlastnej ponuky by bolo mätúce.
  const isOwnReshare = isSelfShare && post.post_type === 'shared_feed_post';

  // Preklik na zdroj MUSÍ rozlišovať typ: ponuky, portfólio položky aj
  // príspevky majú nezávislé číslovanie, takže poslať portfolio id ako offerId
  // by otvorilo cudziu ponuku s rovnakým číslom.
  const sharedOwnerIdentifier =
    (post.shared_content?.owner?.slug || '').trim() ||
    String(post.shared_content?.owner?.id || '');
  const sharedSourceId = post.shared_content?.id ?? null;
  const sharedType = post.shared_content?.type;

  const handleOpenSharedSource =
    sharedSourceId && (sharedType === 'feed_post' || sharedOwnerIdentifier)
      ? () => {
          if (sharedType === 'portfolio_item') {
            router.push(
              buildPortfolioDetailPath(sharedOwnerIdentifier, sharedSourceId),
            );
            return;
          }
          if (sharedType === 'feed_post') {
            router.push(`/dashboard/feed/${sharedSourceId}`);
            return;
          }
          // Ponuka – globálny event, rovnako ako OfferShareMessageCard v správach.
          if (typeof window === 'undefined') return;
          window.dispatchEvent(
            new CustomEvent('goToUserProfile', {
              detail: {
                identifier: sharedOwnerIdentifier,
                offerId: sharedSourceId,
              },
            }),
          );
        }
      : undefined;

  const sharedHeadline =
    post.shared_content?.type === 'portfolio_item'
      ? t('feed.sharesPortfolioOnward', '{name} zdieľa portfólio ďalej')
      : post.shared_content?.type === 'feed_post'
        ? t('feed.sharesPostOnward', '{name} zdieľa príspevok ďalej')
        : t('feed.offersExchangeOnward', '{name} ponúka výmenu ďalej');

  return (
    <motion.article
      ref={viewportRef}
      data-testid="feed-post-card"
      data-post-type={post.post_type}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={[
        // Na mobile ide karta od kraja po kraj, takže zaoblenie nemá čo
        // ohraničovať – od `sm:` (kde má karta bočné okraje) ostáva pôvodné.
        // V okne detailu rám nekreslíme vôbec – má ho samotné okno.
        isDetail
          ? 'overflow-hidden'
          : 'overflow-hidden rounded-none border shadow-sm sm:rounded-2xl',
        isShared && !isDetail
          ? SHARED_CARD_SURFACE
          : isDetail
            ? ''
            : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-[#202223]',
      ].join(' ')}
    >
      {isShared ? (
        <div className="flex items-center gap-2 px-4 pt-3 text-xs font-medium text-purple-700 dark:text-purple-200">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-200/80 text-purple-700 dark:bg-purple-900/60 dark:text-purple-200">
            <ExchangeIcon />
          </span>
          <span className="truncate">
            {isOwnReshare
              ? t('feed.resharedOwn', 'Znovu zdieľané')
              : sharedHeadline.replace('{name}', authorName)}
          </span>
        </div>
      ) : null}

      {/* V okne detailu sedí vpravo hore ešte jeho vlastné „X". Bez miesta
          navyše by prekrylo „..." menu karty – oboje má byť dosiahnuteľné. */}
      <header
        className={`flex items-center gap-3 px-4 pb-3 pt-3 ${
          isDetail ? 'pr-12' : ''
        }`}
      >
        <InitialsAvatar
          name={authorName}
          avatarUrl={post.author?.avatar_url}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
            {authorName}
          </p>
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

      {/* Voľný príspevok: VEDIE text, fotky idú pod neho. Zdieľanie má poradie
          iné a zámerne nezmenené – tam je hlavným obsahom náhľad zdieľaného
          a caption je komentár autora k nemu, takže patrí až zaň. */}
      {!isShared && caption ? (
        <div className="px-4 py-3">
          <FeedPostCaption text={caption} boundedExpansion={isDetail} />
        </div>
      ) : null}

      {images.length > 0 ? (
        <FeedPostImageCarousel
          images={images}
          alt={t('feed.imageAlt', 'Fotka príspevku')}
          // Vo feede klik na fotku otvára okno detailu; v samotnom okne už
          // otvorí fullscreen prehliadač (vrstvu nad ním).
          onPhotoClick={
            opensOverlay ? () => postOverlay?.open({ postId: post.id }) : undefined
          }
        />
      ) : null}

      {isShared || taggedUsers.length ? (
        <div className="space-y-3 px-4 py-3">
          {isShared ? (
            <SharedContentPreview
              post={post}
              hideOwner={isSelfShare}
              onOpenSource={handleOpenSharedSource}
            />
          ) : null}

          {isShared && caption ? (
            <FeedPostCaption text={caption} boundedExpansion={isDetail} />
          ) : null}

          {taggedUsers.length ? (
            <ul className="flex flex-wrap gap-1.5" data-testid="feed-post-tags">
              {taggedUsers.map((tagged) => {
                // „x" patrí VÝHRADNE vlastnému označeniu; príznak dáva backend,
                // ktorý je aj tak jediný, kto o tom rozhoduje.
                const isOwnTag = tagged.can_remove_tag === true;
                return (
                  <li
                    key={tagged.id}
                    data-testid={`feed-post-tag-${tagged.id}`}
                    className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/40 dark:text-purple-200"
                  >
                    @{tagged.display_name}
                    {isOwnTag ? (
                      <button
                        type="button"
                        onClick={() => setTagRemoveOpen(true)}
                        data-testid="feed-post-tag-remove"
                        aria-label={t('feed.tagRemoveAction', 'Odstrániť označenie')}
                        title={t('feed.tagRemoveAction', 'Odstrániť označenie')}
                        className="-mr-1 rounded-full p-0.5 text-purple-500 transition-colors hover:bg-purple-200 hover:text-purple-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 dark:text-purple-300 dark:hover:bg-purple-800/60 dark:hover:text-white"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          className="h-3 w-3"
                          aria-hidden="true"
                        >
                          <line x1="6" y1="6" x2="18" y2="18" />
                          <line x1="18" y1="6" x2="6" y2="18" />
                        </svg>
                      </button>
                    ) : null}
                  </li>
                );
              })}
              </ul>
          ) : null}
        </div>
      ) : null}

      <footer className="flex items-center gap-4 border-t border-gray-200/70 px-4 py-2.5 dark:border-gray-700/60">
        <ActionButton
          label={t('feed.likes', 'Páči sa mi')}
          count={likesCount}
          active={isLiked}
          onClick={() => void handleToggleLike()}
          onCountClick={() => setLikersOpen(true)}
          countLabel={t('feed.likersTitle', 'Páči sa im to')}
          countTestId="feed-like-count"
          testId="feed-like-button"
        >
          <svg
            viewBox="0 0 24 24"
            fill={isLiked ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </ActionButton>

        <ActionButton
          label={t('feed.comments', 'Komentáre')}
          count={shownCommentsCount}
          active={commentsOpen}
          onClick={() => {
            if (opensOverlay) {
              postOverlay?.open({ postId: post.id });
              return;
            }
            setCommentsOpen((open) => !open);
          }}
          testId="feed-comments-button"
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
        </ActionButton>

        <ActionButton
          label={t('feed.sharePost', 'Zdieľať ďalej')}
          onClick={() => setShareOpen(true)}
          testId="feed-share-button"
        >
          <ShareIcon />
        </ActionButton>
      </footer>

      {commentsOpen && !isDetail ? (
        <FeedPostComments
          highlightCommentId={highlightCommentId}
          postId={post.id}
          onCountChange={(delta) =>
            setCommentsCount((count) => Math.max(0, count + delta))
          }
          // Číslo pri ikone vychádza z toho istého načítania ako zoznam,
          // takže sa nemôže rozísť s tým, čo používateľ reálne vidí.
          onTotalChange={setCommentsCount}
        />
      ) : null}

      <FeedLikersDialog
        open={likersOpen}
        onClose={() => setLikersOpen(false)}
        postId={post.id}
      />

      <FeedDestructiveConfirm
        open={deleteOpen}
        isDeleting={deleting}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeletePost}
        testId="feed-post-delete-confirm"
        title={t('feed.postDeleteConfirm', 'Naozaj chceš zmazať tento príspevok?')}
        hint={t('feed.postDeleteHint', 'Túto akciu už nie je možné vrátiť späť.')}
      />

      <FeedDestructiveConfirm
        open={tagRemoveOpen}
        isDeleting={removingTag}
        onClose={() => setTagRemoveOpen(false)}
        onConfirm={handleRemoveOwnTag}
        testId="feed-tag-remove-confirm"
        title={t(
          'feed.tagRemoveConfirm',
          'Naozaj chceš odstrániť svoje označenie z tohto príspevku?',
        )}
        hint={t(
          'feed.tagRemoveHint',
          'Príspevok ostane zverejnený, zmizne len tvoje označenie.',
        )}
        confirmLabel={t('feed.tagRemoveAction', 'Odstrániť označenie')}
        busyLabel={t('feed.tagRemoving', 'Odstraňujem...')}
      />

      {/* Mountuje sa až pri otvorení – rovnaký vzor ako composer: každé
          otvorenie je čistý stav, bez resetovacieho efektu. */}
      {editOpen ? (
        <FeedPostEditModal
          open
          post={currentPost}
          onClose={() => setEditOpen(false)}
          onUpdated={setCurrentPost}
        />
      ) : null}
      <FeedPostReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        postId={post.id}
        onReported={() => setReported(true)}
      />
      <FeedPostShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        post={post}
        onShared={onShared}
      />
    </motion.article>
  );
}
