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
import {
  deleteFeedPost,
  getFeedPost,
  removeOwnFeedPostTag,
  type FeedPost,
  type FeedPostImage,
} from '@/lib/feedApi';
import FeedDestructiveConfirm from './FeedDestructiveConfirm';
import FeedLikersDialog from './FeedLikersDialog';
import FeedPostComments from './FeedPostComments';
import FeedPostImageCarousel from './FeedPostImageCarousel';
import { useFeedPostOverlay } from '../../contexts/FeedPostOverlayContext';
import { onFeedPostCounts } from './feedPostCountEvents';
import { emitFeedPostDeleted } from './feedPostDeletedEvents';
import FeedAnchoredMenu from './FeedAnchoredMenu';
import FeedPostCaption, {
  CARD_CAPTION_LINES,
  DETAIL_CAPTION_LINES,
} from './FeedPostCaption';
import FeedPostEditModal from './FeedPostEditModal';
import FeedPostReportModal from './FeedPostReportModal';
import FeedPostShareModal from './FeedPostShareModal';
import ShareIcon from './ShareIcon';
import ExchangeIcon from './FeedExchangeIcon';
import SharedContentPreview from './FeedSharedContentPreview';
import { buildSharedSourceHandler } from './feedSharedContentNavigation';
import { usePendingFeedImages } from './usePendingFeedImages';
import { useCardInViewport } from './useCardInViewport';
import { formatRelativeTime } from './feedRelativeTime';
import { canOpenUserProfile, openUserProfile } from './feedProfileNavigation';
import FeedPhotoViewer from './FeedPhotoViewer';
import FeedPostMobileDetail from './FeedPostMobileDetail';
import { useFeedCommentsPolling } from './useFeedCommentsPolling';
import { useFeedPostLike } from './useFeedPostLike';

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

export default function FeedPostCard({
  post,
  initialCommentsOpen = false,
  highlightCommentId,
  onShared,
  onSelfTagRemoved,
  onDeleted,
  variant = 'card',
  fillHeight = false,
  liveImages,
  onPostUpdated,
  commentsCount: commentsCountOverride,
}: {
  post: FeedPost;
  /**
   * `card` = dlaždica vo feede (vlastný rám, komentáre sa rozbaľujú v nej).
   * `detail` = vnútrajšok okna detailu: bez rámu a BEZ komentárovej sekcie –
   * tú si okno vykresľuje samo v scrollovateľnej časti.
   */
  variant?: 'card' | 'detail';
  /**
   * Karta vyplní výšku rodiča a fotka si vezme zvyšok (dvojstĺpcové okno
   * detailu pri príspevku S FOTKOU).
   *
   * Hlavička, text, označenia aj riadok akcií majú vtedy pevnú výšku
   * (`shrink-0`) a jediná pružná časť je médiová plocha, takže rozbalenie
   * textu fotku zmenší namiesto toho, aby stĺpec pretiekol. Bez fotky nemá
   * čo zvyšok pohltiť, preto to zapína výhradne `FeedPostDetailSplitLayout`.
   */
  fillHeight?: boolean;
  /**
   * Živý stav fotiek zvonka – karta si ho vtedy nesleduje sama.
   *
   * Používa to okno detailu: podľa fotiek sa rozhoduje o rozložení, takže ich
   * musí poznať UŽ NAD kartou. Aby nad tým istým príspevkom nebežali dva
   * pollingy, dostane ich karta hotové (viď `usePendingFeedImages`).
   */
  liveImages?: FeedPostImage[];
  /**
   * Autor príspevok upravil. Karta si novú verziu drží aj sama; okno detailu
   * ju ale potrebuje tiež – rozhoduje sa podľa nej o rozložení a podáva karte
   * fotky späť.
   */
  onPostUpdated?: (post: FeedPost) => void;
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
      // Mazať sa dá aj z okna detailu, ktoré leží NAD feedom – ten sa o tom
      // inak nedozvie a nechal by kartu neexistujúceho príspevku.
      emitFeedPostDeleted(post.id);
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
  // Keď fotky sleduje niekto nad kartou (okno detailu), vlastný polling sa
  // vypne – inak by nad jedným príspevkom bežali dva naraz.
  const ownImages = usePendingFeedImages(currentPost, {
    enabled: liveImages === undefined,
  });
  const images = liveImages ?? ownImages;
  const caption = currentPost.caption;
  // `is_edited` chodí LEN autorovi – cudziemu divákovi kľúč v odpovedi vôbec
  // nie je, takže `undefined` znamená „nezobrazuj", nie „neviem".
  const isEdited = currentPost.is_edited === true;

  const [commentsCount, setCommentsCount] = useState(post.comments_count);
  // Optimistický lajk je spoločný pre kartu aj obe mobilné vrstvy – karta si
  // navyše berie `pendingRef`/`seqRef`, lebo počty ešte aj pollingom obnovuje.
  const {
    isLiked,
    likesCount,
    toggleLike,
    setIsLiked,
    setLikesCount,
    pendingRef: likePendingRef,
    seqRef: likeSeqRef,
  } = useFeedPostLike({
    postId: post.id,
    initialLiked: post.is_liked_by_me,
    initialCount: post.likes_count,
    t,
  });
  // V okne detailu drží počet okno (komentáre sú pod kartou, nie v nej);
  // vlastný stav karty pritom beží ďalej, takže po zatvorení okna nič nechýba.
  const shownCommentsCount = commentsCountOverride ?? commentsCount;
  const isDetail = variant === 'detail';
  // V pružnom stĺpci nesmie hlavičku, text, označenia ani akcie nič stlačiť –
  // zmenšuje sa výhradne fotka. Mimo neho trieda nič nemení (rodič nie je flex).
  const fixedBlock = fillHeight ? 'shrink-0' : '';
  // Kontext chýba mimo dashboardu (napr. samostatne vykreslená karta) – vtedy
  // ostáva pôvodné správanie: komentáre sa rozbalia priamo v karte.
  const postOverlay = useFeedPostOverlay();
  // Okno je DESKTOPOVÁ náhrada rozbaľovania; mobil ostáva nezmenený.
  const opensOverlay = Boolean(postOverlay) && !isMobile && !isDetail;
  /**
   * Na MOBILE otvára ťuk na fotku bohatý prehliadač (fotka + hlavička, text,
   * akcie, komentáre). Desktop sa nemení: tam vedie fotka do okna detailu a
   * vnútri okna do pôvodného fullscreen prehliadača.
   *
   * `null` = zatvorený; číslo je index v zozname otvárateľných fotiek.
   */
  const opensPhotoViewer = isMobile && !isDetail;
  const [photoViewerIndex, setPhotoViewerIndex] = useState<number | null>(null);
  /**
   * Mobilná obrazovka detailu – otvára ju ikona komentárov a ťuk na TEXT
   * príspevku. Ťuk na FOTKU vedie inam (prehliadač fotky vyššie), desktop sa
   * nemení: tam komentáre aj naďalej otvárajú okno detailu.
   */
  const opensMobileDetail = isMobile && !isDetail;
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  /**
   * Preklik VON z karty (profil autora). V okne detailu musí okno zmiznúť –
   * inak by ostalo visieť nad stránkou, na ktorú sa používateľ dostal. Adresu
   * si rieši samotná navigácia, preto `keepHistory`: krok späť by ju vzápätí
   * zrušil. Rovnaká úvaha ako pri preklikoch zo zdieľaného náhľadu.
   */
  const closeOverlayOnLeave = useCallback(() => {
    if (isDetail) postOverlay?.close({ keepHistory: true });
  }, [isDetail, postOverlay]);

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
  }, [likePendingRef, setIsLiked, setLikesCount, post.is_liked_by_me, post.likes_count]);

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
  }, [likePendingRef, likeSeqRef, setIsLiked, setLikesCount, post.id]);

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
    [likePendingRef, setIsLiked, setLikesCount, post.id],
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

  /**
   * Preklik na zdieľaný zdroj.
   *
   * Na MOBILE ho karta neponúka: tam vedie ťuk kdekoľvek na zdieľanom
   * príspevku najprv do mobilnej obrazovky detailu a odtiaľ sa dá prekliknúť
   * ďalej. Bez toho by mal ten istý príspevok dve rôzne cieľové obrazovky
   * podľa toho, kam presne používateľ ťukol.
   */
  const handleOpenSharedSource = opensMobileDetail
    ? () => setMobileDetailOpen(true)
    : buildSharedSourceHandler(currentPost, {
        router,
        beforeNavigate: closeOverlayOnLeave,
      });

  // Text autora zdieľania – v okne ide nad náhľad, na karte pod neho.
  const sharedCaptionNode =
    isShared && caption ? (
      <FeedPostCaption
        text={caption}
        boundedExpansion={isDetail}
        expansionBound={fillHeight ? 'roomy' : 'compact'}
        maxLines={isDetail ? DETAIL_CAPTION_LINES : CARD_CAPTION_LINES}
        collapseBlankLines
        onTextClick={
          opensMobileDetail ? () => setMobileDetailOpen(true) : undefined
        }
      />
    ) : null;

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
        // `overflow-hidden` vyššie + pevné bloky + pružná fotka = stĺpec, ktorý
        // sa NEDÁ doscrollovať. `min-h-0` ruší automatické minimum flex položky.
        fillHeight ? 'flex min-h-0 flex-1 flex-col' : '',
        isShared && !isDetail
          ? SHARED_CARD_SURFACE
          : isDetail
            ? ''
            : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-[#202223]',
      ].join(' ')}
    >
      {isShared ? (
        <div
          className={`flex items-center gap-2 px-4 pt-3 text-xs font-medium text-purple-700 dark:text-purple-200 ${fixedBlock}`}
        >
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

      {/* V jednostĺpcovom okne detailu sedí vpravo hore ešte jeho vlastné „X".
          Bez miesta navyše by prekrylo „..." menu karty – oboje má byť
          dosiahnuteľné. V dvojstĺpcovom rozložení leží „X" nad PRAVÝM stĺpcom
          (miesto mu uvoľňuje nadpis komentárov), takže tu by odsadenie len
          zbytočne ukrajovalo šírku. */}
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

      {/* Voľný príspevok: VEDIE text, fotky idú pod neho. Zdieľanie sa riadi
          tým istým pravidlom v okne detailu (text nad náhľadom), na karte vo
          feede ostáva poradie opačné – viď blok zdieľaného obsahu nižšie. */}
      {!isShared && caption ? (
        <div className={`px-4 py-3 ${fixedBlock}`}>
          <FeedPostCaption
            text={caption}
            boundedExpansion={isDetail}
            expansionBound={fillHeight ? 'roomy' : 'compact'}
            maxLines={isDetail ? DETAIL_CAPTION_LINES : CARD_CAPTION_LINES}
            collapseBlankLines
            onTextClick={
              opensMobileDetail ? () => setMobileDetailOpen(true) : undefined
            }
          />
        </div>
      ) : null}

      {images.length > 0 ? (
        fillHeight ? (
          // Jediná PRUŽNÁ časť stĺpca: vlastný flex stĺpec, aby si médiová
          // plocha vzala zvyšok a poznámka o zamietnutej fotke ostala pod ňou.
          //
          // `min-h-[8rem]` je PODLAHA, nie výška: ruší automatické minimum
          // flex položky (to je úloha, akú tu inak plní `min-h-0`) a zároveň
          // drží fotku viditeľnú aj vtedy, keď pevné časti nad ňou vyčerpajú
          // celý stĺpec (dlhý text + plný zoznam označených + nízke okno).
          // V takom prípade sa doscrolluje stĺpec ako celok – viď
          // `FeedPostDetailSplitLayout`.
          <div
            className="flex min-h-[8rem] flex-1 flex-col"
            data-testid="feed-post-media-fill"
          >
            <FeedPostImageCarousel
              images={images}
              alt={t('feed.imageAlt', 'Fotka príspevku')}
              fillHeight
            />
          </div>
        ) : (
          <FeedPostImageCarousel
            images={images}
            alt={t('feed.imageAlt', 'Fotka príspevku')}
            // Desktop: fotka vedie do okna detailu. Mobil: bohatý prehliadač
            // fotky. V samotnom okne detailu ostáva pôvodné správanie –
            // fullscreen prehliadač (vrstva nad ním).
            onPhotoClick={
              opensOverlay
                ? () => postOverlay?.open({ postId: post.id })
                : opensPhotoViewer
                  ? (index) => setPhotoViewerIndex(index)
                  : undefined
            }
            photoOpensPostDetail={opensOverlay}
          />
        )
      ) : null}

      {isShared || taggedUsers.length ? (
        <div className={`space-y-3 px-4 py-3 ${fixedBlock}`}>
          {/* V OKNE ide text autora nad náhľad – rovnaké pravidlo ako „text
              nad fotkou" pri voľnom príspevku. Na karte vo feede ostáva
              poradie zámerne opačné: tam je hlavným obsahom náhľad a caption
              je komentár k nemu. */}
          {isDetail ? sharedCaptionNode : null}

          {isShared ? (
            <SharedContentPreview
              post={post}
              hideOwner={isSelfShare}
              onOpenSource={handleOpenSharedSource}
              // Na mobile vedie ťuk kdekoľvek na zdieľanom príspevku do
              // obrazovky detailu – vrátane náhľadu mini príspevku, ktorý na
              // desktope ostáva nekliknuteľný ako doteraz.
              interactivePostPreview={opensMobileDetail}
            />
          ) : null}

          {isDetail ? null : sharedCaptionNode}

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

      <footer
        className={`flex items-center gap-4 border-t border-gray-200/70 px-4 py-2.5 dark:border-gray-700/60 ${fixedBlock}`}
      >
        <ActionButton
          label={t('feed.likes', 'Páči sa mi')}
          count={likesCount}
          active={isLiked}
          onClick={() => void toggleLike()}
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
            // Mobil dostáva vlastnú obrazovku detailu namiesto rozbaľovania
            // komentárov priamo v karte.
            if (opensMobileDetail) {
              setMobileDetailOpen(true);
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

      {/* Mobilná obrazovka detailu – mountuje sa až pri otvorení. */}
      {mobileDetailOpen ? (
        <FeedPostMobileDetail
          post={currentPost}
          onClose={() => setMobileDetailOpen(false)}
          onPostUpdated={setCurrentPost}
          onDeleted={onDeleted}
          onShared={onShared}
        />
      ) : null}

      {/* Mobilný prehliadač fotky – mountuje sa až pri otvorení, rovnako ako
          ostatné vrstvy karty. */}
      {photoViewerIndex !== null ? (
        <FeedPhotoViewer
          post={currentPost}
          initialIndex={photoViewerIndex}
          onClose={() => setPhotoViewerIndex(null)}
          onPostUpdated={setCurrentPost}
          onDeleted={onDeleted}
          onShared={onShared}
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
          onUpdated={(updated) => {
            setCurrentPost(updated);
            onPostUpdated?.(updated);
          }}
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
