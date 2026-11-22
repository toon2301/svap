'use client';

/**
 * Karta príspevku na Nástenke (Smer B).
 *
 * - free_post: neutrálna biela karta, fialové akcenty (avatar, tagy, lajk).
 * - shared_*: TEN ISTÝ podklad ako voľný príspevok – zdieľanie hlási hlavička
 *   „zdieľa ďalej" a vnorená karta obsahu (`SharedContentPreviewCard`), nie
 *   odlišná farba dlaždice. Zdieľaný VOĽNÝ príspevok sa v nej kreslí bez rámu,
 *   ponuka a portfólio ako dlaždica s náhľadom.
 *
 * Akcie (lajk, komentáre, zdieľanie, nahlásenie) sú živé; lajk beží
 * optimisticky a pri zlyhaní sa vráti do pôvodného stavu.
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks';
import { translateFeedActionError } from './feedActionErrors';
import {
  deleteFeedPost,
  getFeedPost,
  removeOwnFeedPostTag,
} from '@/lib/feedApi';
import FeedPostComments from './FeedPostComments';
import FeedPostImageCarousel from './FeedPostImageCarousel';
import { useFeedPostOverlay } from '../../contexts/FeedPostOverlayContext';
import { emitFeedPostCounts } from './feedPostCountEvents';
import {
  emitFeedPostDeleted,
  onFeedPostDeleted,
} from './feedPostDeletedEvents';
import { onFeedShareLanding } from './feedShareLanding';
import FeedPostCaption, {
  CARD_CAPTION_LINES,
  DETAIL_CAPTION_LINES,
} from './FeedPostCaption';
import ExchangeIcon from './FeedExchangeIcon';
import { buildSharedSourceHandler } from './feedSharedContentNavigation';
import { usePendingFeedImages } from './usePendingFeedImages';
import { useViewerPost } from './useViewerPost';
import { useCardInViewport } from './useCardInViewport';
import { sharedFeedPostPhoto } from './feedImageSources';
import { useFeedCommentsPolling } from './useFeedCommentsPolling';
import { useFeedPostLike } from './useFeedPostLike';
import { useFeedPostCommentsCount } from './useFeedPostCommentsCount';
import FeedPostActions from './FeedPostActions';
import FeedPostSharedBlock from './FeedPostSharedBlock';
import FeedPostCardLayers from './FeedPostCardLayers';
import { useFeedPostCardLayers } from './useFeedPostCardLayers';
import FeedPostCardHeader from './FeedPostCardHeader';
import type { FeedPostCardProps } from './FeedPostCard.types';

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
}: FeedPostCardProps) {
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
  // Prehliadač fotky dostane príspevok so živými fotkami, nie zastaranú verziu z vytvorenia (nález 199).
  const viewerPost = useViewerPost(currentPost, images);
  const caption = currentPost.caption;
  // `is_edited` chodí LEN autorovi – cudziemu divákovi kľúč v odpovedi vôbec
  // nie je, takže `undefined` znamená „nezobrazuj", nie „neviem".
  const isEdited = currentPost.is_edited === true;

  // Počet komentárov vysiela aj odoberá – karta predtým len odoberala, takže
  // komentár pridaný priamo v nej (mobilný permalink) sa nikam nešíril.
  const {
    commentsCount,
    publishCommentsCount,
    changeCommentsCount,
    setCommentsCountLocally,
  } = useFeedPostCommentsCount(post.id, post.comments_count);
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
   * Fotoprehliadač PÔVODNÉHO príspevku, otvorený z fotky v repost náhľade.
   * `null` = repost fotku nemá, takže sa nedá ani otvoriť.
   */
  const sharedPhotoPostId = sharedFeedPostPhoto(currentPost)?.postId ?? null;
  const [sharedPhotoOpen, setSharedPhotoOpen] = useState(false);
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
  const {
    reportOpen,
    setReportOpen,
    shareOpen,
    setShareOpen,
    reported,
    setReported,
    tagRemoveOpen,
    setTagRemoveOpen,
    removingTag,
    setRemovingTag,
    deleteOpen,
    setDeleteOpen,
    editOpen,
    setEditOpen,
    likersOpen,
    setLikersOpen,
    deleting,
    setDeleting,
  } = useFeedPostCardLayers();
  // Označenia sú lokálne, aby chip po odstránení zmizol bez čakania na
  // obnovenie celého feedu. Prop-sync nižšie ich vráti do súladu so serverom.
  const [taggedUsers, setTaggedUsers] = useState(post.tagged_users ?? []);
  // Polling počtov beží LEN pre kartu na obrazovke – viď useCardInViewport.
  const { ref: viewportRef, inViewport } = useCardInViewport<HTMLElement>();

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
    setCommentsCountLocally(post.comments_count);
  }, [setCommentsCountLocally, post.comments_count]);

  useEffect(() => {
    setTaggedUsers(post.tagged_users ?? []);
  }, [post.tagged_users]);

  // Obnovenie feedu prináša čerstvejšiu verziu – tá má prednosť pred lokálnou.
  useEffect(() => {
    setCurrentPost(post);
  }, [post]);

  /**
   * Živý stav lajku sa premietne aj do `currentPost`.
   *
   * Karta ho drží v hooku, ale mobilným vrstvám podáva `currentPost` – a ten
   * niesol hodnotu z posledného načítania zo servera. Po lajku na karte tak
   * prehliadač fotky aj obrazovka detailu naskočili na ZASTARANÝ stav a
   * správny sa ukázal až po prvom rozposlaní počtov. Obe sa nasadzujú z toho
   * istého objektu, takže stačí zosúladiť ten.
   */
  useEffect(() => {
    setCurrentPost((previous) =>
      previous.is_liked_by_me === isLiked && previous.likes_count === likesCount
        ? previous
        : { ...previous, is_liked_by_me: isLiked, likes_count: likesCount },
    );
  }, [isLiked, likesCount]);

  // Po zdieľaní sa pristáva na Nástenku, takže žiadna vrstva nad kartou nesmie
  // ostať otvorená – ani tá, z ktorej sa zdieľalo. Zatvárajú sa tu spoločne,
  // rovnako ako pri zmiznutom príspevku nižšie.
  useEffect(
    () =>
      onFeedShareLanding(() => {
        setMobileDetailOpen(false);
        setPhotoViewerIndex(null);
        setSharedPhotoOpen(false);
      }),
    [],
  );

  // Príspevok zmizol (zmazal ho niekto iný, alebo to zistila iná interakcia).
  // Kartu odstráni zoznam, ale otvorené vrstvy nad ňou treba zavrieť tu –
  // karta sa vykresľuje aj tam, kde zoznam signál nespracúva (profil).
  useEffect(
    () =>
      onFeedPostDeleted((deletedId) => {
        if (deletedId !== post.id) return;
        setMobileDetailOpen(false);
        setPhotoViewerIndex(null);
        setSharedPhotoOpen(false);
      }),
    [post.id],
  );

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
    // Čerstvá serverová pravda musí ísť aj do otvorenej vrstvy NAD kartou –
    // tá sama nepolluje, takže by inak držala číslo z momentu otvorenia.
    // Rozposiela sa až TU, za oboma brzdami vyššie: odpoveď spred práve
    // dokončeného lajku by inak prepísala čerstvý stav ostatným.
    publishCommentsCount(fresh.comments_count);
    emitFeedPostCounts({
      postId: post.id,
      likesCount: fresh.likes_count,
      isLikedByMe: fresh.is_liked_by_me,
    });
  }, [
    likePendingRef,
    likeSeqRef,
    publishCommentsCount,
    setIsLiked,
    setLikesCount,
    post.id,
  ]);

  useFeedCommentsPolling({ enabled: inViewport, onPoll: refreshCounts });

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
   * Preklik na zdieľaný zdroj – VŽDY rovno na cieľ, aj vo feede.
   *
   * Vnorená karta ponuky/portfólia je samostatný ovládací prvok s jasným
   * sľubom: otvorí presne tú ponuku/portfólio. Medzikrok cez detail
   * zdieľajúceho príspevku ten sľub porušoval a k cieľu bolo treba dva kliky.
   * Do detailu vedú ostatné časti príspevku (text, avatar, akcie).
   */
  const handleOpenSharedSource = buildSharedSourceHandler(currentPost, {
    router,
    beforeNavigate: closeOverlayOnLeave,
  });

  /**
   * Náhľad zdieľaného PRÍSPEVKU mimo jeho fotky.
   *
   * Tu medzikrok zmysel dáva: mini príspevok nie je „karta ponuky", ale
   * ukážka obsahu, ku ktorému sa zdieľajúci vyjadril. Na mobile teda vedie do
   * detailu zdieľajúceho príspevku, na desktope ostáva nekliknuteľný ako
   * doteraz.
   */
  const handleOpenSharedPostPreview = opensMobileDetail
    ? () => setMobileDetailOpen(true)
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
        // `overflow-hidden` vyššie + pevné bloky + pružná fotka = stĺpec, ktorý
        // sa NEDÁ doscrollovať. `min-h-0` ruší automatické minimum flex položky.
        fillHeight ? 'flex min-h-0 flex-1 flex-col' : '',
        // Zdieľaný príspevok má ROVNAKÝ podklad ako každý iný – je to príspevok
        // ako každý druhý. Že ide o zdieľanie, hovorí hlavička „zdieľa ďalej"
        // a vnorená karta; odlišná farba celej dlaždice navyše rozbíjala
        // jednotný feed.
        isDetail ? '' : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-[#202223]',
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

      <FeedPostCardHeader
        post={post}
        authorName={authorName}
        isEdited={isEdited}
        isDetail={isDetail}
        fillHeight={fillHeight}
        fixedBlock={fixedBlock}
        closeOverlayOnLeave={closeOverlayOnLeave}
        reported={reported}
        setReportOpen={setReportOpen}
        setEditOpen={setEditOpen}
        setDeleteOpen={setDeleteOpen}
        t={t}
        locale={locale}
      />

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

      <FeedPostSharedBlock
        fillHeight={fillHeight}
        fixedBlock={fixedBlock}
        isShared={isShared}
        isDetail={isDetail}
        caption={caption}
        opensMobileDetail={opensMobileDetail}
        setMobileDetailOpen={setMobileDetailOpen}
        post={post}
        isSelfShare={isSelfShare}
        handleOpenSharedSource={handleOpenSharedSource}
        handleOpenSharedPostPreview={handleOpenSharedPostPreview}
        sharedPhotoPostId={sharedPhotoPostId}
        setSharedPhotoOpen={setSharedPhotoOpen}
        taggedUsers={taggedUsers}
        setTagRemoveOpen={setTagRemoveOpen}
        t={t}
      />

      <FeedPostActions
        fixedBlock={fixedBlock}
        t={t}
        postId={post.id}
        likesCount={likesCount}
        isLiked={isLiked}
        toggleLike={toggleLike}
        setLikersOpen={setLikersOpen}
        shownCommentsCount={shownCommentsCount}
        commentsOpen={commentsOpen}
        setCommentsOpen={setCommentsOpen}
        opensOverlay={opensOverlay}
        postOverlay={postOverlay}
        opensMobileDetail={opensMobileDetail}
        setMobileDetailOpen={setMobileDetailOpen}
        setShareOpen={setShareOpen}
      />

      {commentsOpen && !isDetail ? (
        <FeedPostComments
          highlightCommentId={highlightCommentId}
          postId={post.id}
          onCountChange={(delta) =>
            changeCommentsCount(delta)
          }
          // Číslo pri ikone vychádza z toho istého načítania ako zoznam,
          // takže sa nemôže rozísť s tým, čo používateľ reálne vidí.
          onTotalChange={publishCommentsCount}
        />
      ) : null}

      <FeedPostCardLayers
        post={post}
        sharedPhotoOpen={sharedPhotoOpen}
        sharedPhotoPostId={sharedPhotoPostId}
        setSharedPhotoOpen={setSharedPhotoOpen}
        mobileDetailOpen={mobileDetailOpen}
        currentPost={currentPost}
        setMobileDetailOpen={setMobileDetailOpen}
        setCurrentPost={setCurrentPost}
        onDeleted={onDeleted}
        onShared={onShared}
        photoViewerIndex={photoViewerIndex}
        viewerPost={viewerPost}
        setPhotoViewerIndex={setPhotoViewerIndex}
        likersOpen={likersOpen}
        setLikersOpen={setLikersOpen}
        deleteOpen={deleteOpen}
        deleting={deleting}
        setDeleteOpen={setDeleteOpen}
        handleDeletePost={handleDeletePost}
        t={t}
        tagRemoveOpen={tagRemoveOpen}
        removingTag={removingTag}
        setTagRemoveOpen={setTagRemoveOpen}
        handleRemoveOwnTag={handleRemoveOwnTag}
        editOpen={editOpen}
        setEditOpen={setEditOpen}
        onPostUpdated={onPostUpdated}
        reportOpen={reportOpen}
        setReportOpen={setReportOpen}
        setReported={setReported}
        shareOpen={shareOpen}
        setShareOpen={setShareOpen}
      />
    </motion.article>
  );
}
