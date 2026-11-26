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
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { deleteFeedPost, type FeedPost } from '@/lib/feedApi';
import { translateFeedActionError } from './feedActionErrors';
import { emitFeedPostDeleted } from './feedPostDeletedEvents';
import { feedViewableImages, sharedFeedPostPhoto } from './feedImageSources';
import FeedSharedPhotoViewer from './FeedSharedPhotoViewer';
import { shouldAutoScrollToComments } from './feedMobileDetailAutoScroll';
import { useFeedDialog } from './useFeedDialog';
import { usePendingFeedImages } from './usePendingFeedImages';
import { useFeedPostLike } from './useFeedPostLike';
import { useFeedPostCommentsCount } from './useFeedPostCommentsCount';
import {
  feedKeyboardBoxStyle,
  useFeedKeyboardViewport,
} from './useFeedKeyboardViewport';
import { useFeedOverscrollLock } from './useFeedOverscrollLock';
import FeedDestructiveConfirm from './FeedDestructiveConfirm';
import FeedKeyboardDiagnostics from './FeedKeyboardDiagnostics';
import FeedLikersDialog from './FeedLikersDialog';
import FeedPostComments from './FeedPostComments';
import FeedPostEditModal from './FeedPostEditModal';
import FeedPostMobileDetailContent from './FeedPostMobileDetailContent';
import FeedPostMobileDetailHeader from './FeedPostMobileDetailHeader';
import FeedPostReportModal from './FeedPostReportModal';
import { openUserProfile } from './feedProfileNavigation';
import { buildSharedSourceHandler } from './feedSharedContentNavigation';
import FeedPostShareModal from './FeedPostShareModal';

type FeedPostMobileDetailProps = {
  post: FeedPost;
  onClose: () => void;
  /**
   * Komentár z upozornenia (`?comment=<id>`; nález 360): zoznam komentárov naň doscrolluje, krátko ho zvýrazní a podľa potreby
   * donačíta ďalšie stránky, rovnako ako okno detailu na počítači. Bez neho sa obrazovka správa ako dosiaľ.
   */
  highlightCommentId?: number | null;
  /**
   * Autor príspevok upravil.
   *
   * Karta pod obrazovkou si novú verziu prevezme, takže po zatvorení ukazuje
   * upravený obsah bez čakania na obnovenie feedu – ten istý mechanizmus, aký
   * appka už používa medzi kartou a desktopovým oknom detailu.
   */
  onPostUpdated?: (post: FeedPost) => void;
  /** Autor príspevok zmazal – zoznam pod obrazovkou ho má vyhodiť. */
  onDeleted?: (postId: number) => void;
  /** Zdieľanie ďalej vloží nový príspevok na vrch feedu. */
  onShared?: (created: FeedPost) => void;
};

export default function FeedPostMobileDetail({
  post,
  onClose,
  highlightCommentId = null,
  onPostUpdated,
  onDeleted,
  onShared,
}: FeedPostMobileDetailProps) {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const [currentPost, setCurrentPost] = useState(post);
  // Počet komentárov vysiela aj odoberá – táto vrstva predtým len vysielala,
  // takže zmenu z karty pod ňou nikdy nezachytila.
  const { commentsCount, publishCommentsCount, changeCommentsCount } =
    useFeedPostCommentsCount(post.id, post.comments_count);
  // Optimistický lajk je spoločný pre kartu aj obe mobilné vrstvy.
  const { isLiked, likesCount, toggleLike } = useFeedPostLike({
    postId: post.id,
    initialLiked: post.is_liked_by_me,
    initialCount: post.likes_count,
    t,
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [likersOpen, setLikersOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reported, setReported] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sharedPhotoOpen, setSharedPhotoOpen] = useState(false);
  /** Pole na komentár dole má fokus (otvorená klávesnica). */
  const [commentFieldFocused, setCommentFieldFocused] = useState(false);
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

  // Nález 370 (R75 bod 5): pole na komentár má stáť pevne. Pri otvorenej klávesnici sa obrazovka pripne na viditeľnú plochu nad
  // ňou (pole stojí tesne nad klávesnicou, hlavička hore) a kým je obrazovka otvorená, stránka pod ňou sa nesmie „odpružiť“.
  const keyboardBox = useFeedKeyboardViewport(commentFieldFocused);
  useFeedOverscrollLock(portalNode !== null);

  // Karta je vlastníkom príspevku – jej čerstvejšia verzia má prednosť pred
  // lokálnou (rovnaký prop-sync ako v samotnej karte).
  useEffect(() => {
    setCurrentPost(post);
  }, [post]);

  // Rozpracované fotky si dosleduje ten istý hook ako karta – obrazovka je
  // otvorená dlho, takže by inak ostala na snímke z otvorenia.
  const images = usePendingFeedImages(currentPost);
  const hasPhoto = feedViewableImages(images).length > 0;
  const caption = currentPost.caption;
  /**
   * Zdieľaný obsah zaberá miesto, kde má voľný príspevok fotku.
   *
   * Backend posiela `images` len pri `free_post`, takže sa tieto dve vetvy
   * nemôžu stretnúť. Nedostupný zdroj sa kreslí tiež – `SharedContentPreviewCard`
   * si stav „už nie je dostupné" rieši sám a aj ten patrí medzi text a
   * komentáre.
   */
  const hasSharedPreview = Boolean(currentPost.shared_content);
  /** Fotka pôvodného príspevku v reposte – otvára jeho fotoprehliadač. */
  const sharedPhotoPostId = sharedFeedPostPhoto(currentPost)?.postId ?? null;
  // Self-share: zdieľajúci JE pôvodný autor. Bez toho by sa to isté meno
  // ukázalo dvakrát pod sebou (hlavička + náhľad).
  const isSelfShare =
    currentPost.shared_content?.owner?.id != null &&
    currentPost.shared_content.owner.id === currentPost.author?.id;
  const openSharedSource = buildSharedSourceHandler(currentPost, {
    router,
    // Preklik vedie preč – obrazovka nesmie ostať visieť nad cieľom, na ktorý
    // sa používateľ práve dostal.
    beforeNavigate: onClose,
  });
  // Profil pôvodného autora zo zdieľaného obsahu (nález 362): vlastník je z feed
  // API (`shared_content.owner`, pri nedostupnom zdroji `null`) a obrazovka sa
  // pred odchodom zatvorí rovnako ako pri prekliku na zdroj.
  const sharedOwner = currentPost.shared_content?.owner ?? null;
  const openSharedOwner = sharedOwner
    ? () => openUserProfile(sharedOwner, { beforeNavigate: onClose })
    : undefined;

  /**
   * Štartovacia pozícia: pri rozmernom obsahu a rozbehnutej diskusii sa
   * obrazovka otvorí rovno pri komentároch, inak od vrchu.
   *
   * Spúšťa to AŽ signál `onCommentsReady`, nie prvý render. Predtým sa
   * rozhodovalo hneď pri otvorení, keď bol zoznam ešte v stave „Načítavam…":
   * obsah scrollovacej plochy bol vtedy KRATŠÍ než ona sama (na bežnom
   * telefóne ~490 px proti ~707 px), takže sa nemal kam pohnúť – a jednorazová
   * poistka sa už napriek tomu nastavila, takže sa to po dorazení komentárov
   * nikdy nezopakovalo.
   *
   * Posúva sa o vypočítanú vzdialenosť, nie cez `scrollIntoView`: zámer je tým
   * vyjadrený číslom (o koľko), takže sa dá overiť skutočná zmena pozície, nie
   * len fakt, že sa nejaká funkcia zavolala.
   */
  const handleCommentsReady = useCallback(
    (scroller: HTMLElement | null) => {
      if (autoScrolledRef.current) return;
      const anchor = commentsAnchorRef.current;
      if (!anchor || !scroller) return;
      // Rozhodnutie padne raz; ďalšie prekreslenia (nový komentár z pollingu)
      // už používateľovi pohľad nestrhnú.
      autoScrolledRef.current = true;

      // Komentár z upozornenia má prednosť (nález 360): naň zoznam posúva sám (`useFeedCommentsSeek`) a druhý plynulý posun
      // ku kotve „Komentáre“ by sa s ním bil o pozíciu.
      if (highlightCommentId) {
        setAutoScrollDecision(false);
        return;
      }

      const scroll = shouldAutoScrollToComments({
        hasPhoto,
        hasSharedPreview,
        commentsCount: post.comments_count,
      });
      setAutoScrollDecision(scroll);
      if (!scroll) return;

      // Vzdialenosť kotvy od vrchu plochy. Cez `getBoundingClientRect`, nie
      // `offsetTop`: to by záviselo od toho, ktorý predok je `offsetParent`.
      const delta =
        anchor.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
      if (delta <= 0) return;

      const target = scroller.scrollTop + delta;
      // Plynulo, nie skokom – skok pôsobil trhane. `scrollTo` ale nie je
      // všade (jsdom ho nemá vôbec), a štartovacia pozícia je pohodlie, nie
      // funkčnosť: bez neho sa posunie rovno, len bez animácie. Rovnaká
      // kontrola typu, akú appka používa pri `scrollIntoView`.
      if (typeof scroller.scrollTo === 'function') {
        scroller.scrollTo({ top: target, behavior: 'smooth' });
      } else {
        scroller.scrollTop = target;
      }
    },
    [hasPhoto, hasSharedPreview, highlightCommentId, post.comments_count],
  );

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

  /**
   * Všetko nad komentármi. Ide DOVNÚTRA scrollovateľného boxu komentárov,
   * takže text, fotka aj akcie scrollujú spolu so zoznamom.
   */
  const listHeader = (
    <FeedPostMobileDetailContent
      caption={caption}
      hasPhoto={hasPhoto}
      images={images}
      t={t}
      hasSharedPreview={hasSharedPreview}
      currentPost={currentPost}
      isSelfShare={isSelfShare}
      openSharedSource={openSharedSource}
      openSharedOwner={openSharedOwner}
      sharedPhotoPostId={sharedPhotoPostId}
      setSharedPhotoOpen={setSharedPhotoOpen}
      toggleLike={toggleLike}
      isLiked={isLiked}
      likesCount={likesCount}
      setLikersOpen={setLikersOpen}
      commentsCount={commentsCount}
      setShareOpen={setShareOpen}
      commentsAnchorRef={commentsAnchorRef}
      autoScrollDecision={autoScrollDecision}
    />
  );

  return createPortal(
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={t('feed.postDetail', 'Detail príspevku')}
      data-testid="feed-mobile-detail"
      style={feedKeyboardBoxStyle(keyboardBox)}
      className="fixed inset-0 z-[111] flex flex-col bg-white focus:outline-none dark:bg-[#0f0f10]"
    >
      <FeedPostMobileDetailHeader
        currentPost={currentPost}
        onClose={onClose}
        t={t}
        locale={locale}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        reported={reported}
        setReportOpen={setReportOpen}
        setEditOpen={setEditOpen}
        setDeleteOpen={setDeleteOpen}
      />

      {/* `min-h-0` ruší automatické minimum flex položky – bez neho by obsah
          plochu roztiahol a pole na nový komentár by vypadlo z obrazovky. */}
      <div className="min-h-0 flex-1">
        <FeedPostComments
          postId={post.id}
          fillHeight
          showTimestamp
          compactComposer
          mobileReplyField
          onFieldFocusChange={setCommentFieldFocused}
          listHeader={listHeader}
          highlightCommentId={highlightCommentId}
          onCommentsReady={handleCommentsReady}
          onCountChange={(delta) =>
            changeCommentsCount(delta)
          }
          onTotalChange={publishCommentsCount}
        />
      </div>

      {sharedPhotoOpen && sharedPhotoPostId != null ? (
        <FeedSharedPhotoViewer
          postId={sharedPhotoPostId}
          onClose={() => setSharedPhotoOpen(false)}
        />
      ) : null}

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
          onUpdated={(updated) => {
            setCurrentPost(updated);
            onPostUpdated?.(updated);
          }}
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
      {/* Skrytá diagnostika (nálezy 375 až 377): bez zapnutia nevykreslí nič. */}
      <FeedKeyboardDiagnostics label="detail" layerTestId="feed-mobile-detail" />
    </div>,
    portalNode,
  );
}
