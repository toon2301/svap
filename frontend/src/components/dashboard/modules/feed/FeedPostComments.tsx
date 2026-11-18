'use client';

/**
 * Komentáre pod príspevkom – inline rozbalenie, nie modal.
 *
 * Donačítavanie je plynulé (rovnako ako hlavný feed), ale observer je SCOPED
 * na túto inštanciu: `useInfiniteScrollSentinel` vracia vlastný ref, takže
 * každá rozbalená karta má vlastný sentinel aj vlastný observer a viac kariet
 * otvorených naraz sa navzájom neovplyvňuje.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks';
import FeedDestructiveConfirm from './FeedDestructiveConfirm';
import FeedCommentItem from './FeedCommentItem';
import FeedCommentComposer from './FeedCommentComposer';
import FeedCommentsLoadingMore from './FeedCommentsLoadingMore';
import FeedCommentsNewIndicator from './FeedCommentsNewIndicator';
import FeedCommentReplyComposer from './FeedCommentReplyComposer';
import FeedRepliesAutoLoader from './FeedRepliesAutoLoader';
import { useEmojiInsertion } from './useEmojiInsertion';
import { useFeedCommentsLoader } from './useFeedCommentsLoader';
import { useFeedCommentsScroll } from './useFeedCommentsScroll';
import { useFeedCommentsSeek } from './useFeedCommentsSeek';
import { openUserProfile } from './feedProfileNavigation';
import { useFeedPostOverlay } from '../../contexts/FeedPostOverlayContext';
import { handleFeedPostErrorIfGone } from './feedPostGone';
import { useInfiniteScrollSentinel } from './useFeedInfiniteScroll';
import {
  repliesTotal,
} from './feedCommentsLogic';
import {
  FEED_COMMENT_MAX_LENGTH,
  createFeedPostComment,
  deleteFeedPostComment,
  updateFeedPostComment,
  type FeedPostComment,
} from '@/lib/feedApi';

type FeedPostCommentsProps = {
  /**
   * Sekcia vyplní výšku rodiča namiesto vlastného stropu.
   *
   * V karte je zoznam ohraničený pevným stropom, aby stovky komentárov
   * nenaťahovali stránku. V okne detailu je to naopak: pevný blok nad ním má
   * svoju výšku a komentáre majú dostať PRESNE zvyšok – strop by tam nechal
   * prázdne miesto alebo by okno prerástol.
   */
  fillHeight?: boolean;
  /**
   * Ukázať čas pri komentári.
   *
   * Zapína to mobilný prehliadač fotky, kde je meta riadok jediné miesto, kde
   * sa čas dá zobraziť. Na karte a v okne detailu ostáva riadok zámerne
   * strohý (čas nesie samotný príspevok nad nimi).
   */
  showTimestamp?: boolean;
  /**
   * Jednoriadkové pole na komentár s ikonou odoslania namiesto tlačidla.
   *
   * Pre vysunutý panel nad fotkou, kde má byť composer čo najnižší. Emoji
   * tlačidlo tam nie je tak či tak – to appka na mobile skrýva všade.
   */
  compactComposer?: boolean;
  /**
   * Obsah vložený NAD zoznam, do tej istej scrollovateľnej plochy.
   *
   * Mobilná obrazovka detailu tým dosiahne, že text, fotka aj riadok akcií
   * scrollujú SPOLU s komentármi ako jeden súvislý povrch, a pole na nový
   * komentár im pritom ostáva pevne na spodku. Bez toho by mala obrazovka dva
   * nezávislé scrolly nad sebou.
   *
   * Musí byť VNÚTRI scrollovateľného boxu, nie nad ním – inak by donačítavanie
   * (sentinel) aj doscrollovanie na komentár merali inú plochu, než ktorou
   * používateľ naozaj hýbe.
   */
  listHeader?: ReactNode;
  /**
   * Prvé načítanie dobehlo a zoznam je VYKRESLENÝ; nesie svoju scrollovaciu
   * plochu.
   *
   * Volajúci, ktorý chce po otvorení niekam doscrollovať, to nesmie robiť
   * skôr: kým je zoznam v stave „Načítavam…", je obsah plochy KRATŠÍ než ona
   * sama, takže sa scroll nemá kam pohnúť a ticho sa zahodí.
   *
   * Signál je jednorazový na príspevok a zámerne EXPLICITNÝ – pasívne
   * sledovanie `loading` zvonka by volajúceho nechalo hádať, či už je čo
   * merať.
   */
  onCommentsReady?: (scroller: HTMLElement | null) => void;
  postId: number;
  /** Komentár z notifikácie – doscrolluje sa naň a krátko sa zvýrazní. */
  highlightCommentId?: number | null;
  onCountChange?: (delta: number) => void;
  /** Skutočný počet zo servera – drží číslo pri ikone v súlade so zoznamom. */
  onTotalChange?: (total: number) => void;
};

export default function FeedPostComments({
  postId,
  fillHeight = false,
  showTimestamp = false,
  compactComposer = false,
  listHeader,
  onCommentsReady,
  highlightCommentId,
  onCountChange,
  onTotalChange,
}: FeedPostCommentsProps) {
  const { t, locale } = useLanguage();
  // Mobil má emoji priamo na systémovej klávesnici – appkové
  // tlačidlo je tam duplicitné, tak ho tam nekreslíme.
  const isMobile = useIsMobile();
  const [submitting, setSubmitting] = useState(false);
  const [text, setText] = useState('');
  // Okno detailu vie o sebe cez kontext – komentáre sa v ňom vykresľujú tiež,
  // takže ho vedia zavrieť rovnako ako hlavička príspevku.
  const postOverlay = useFeedPostOverlay();

  /**
   * Preklik na profil autora komentára.
   *
   * V otvorenom okne detailu musí okno zmiznúť, inak ostane visieť nad
   * profilom, na ktorý sa práve prešlo. `keepHistory`: adresu si rieši
   * samotná navigácia, krok späť by ju vzápätí zrušil – rovnaká úvaha ako
   * pri preklikoch z hlavičky príspevku.
   *
   * Kontrola `target` je podstatná: komentáre sa kreslia aj mimo okna
   * (rozbalené v karte, mobilná obrazovka, panel nad fotkou) a zatváranie
   * niečoho, čo otvorené nie je, by len pomiešalo účtovníctvo histórie.
   */
  const openCommentAuthorProfile = useCallback(
    (author: FeedPostComment['author']) => {
      openUserProfile(author, {
        beforeNavigate: () => {
          if (postOverlay?.target) postOverlay.close({ keepHistory: true });
        },
      });
    },
    [postOverlay],
  );

  const [pendingDelete, setPendingDelete] = useState<FeedPostComment | null>(null);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  // Rozbalenie je LOKÁLNE per komentár – jedno vlákno môže mať naraz
  // rozbalené jedny odpovede a zbalené druhé.
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<number>>(
    () => new Set(),
  );
  const [deleting, setDeleting] = useState(false);
  const {
    scrollRef,
    scrollToTopRef,
    newCommentsCount,
    setNewCommentsCount,
    scrollListToTop,
    announceNewComments,
    handleListScroll,
    handleNewCommentsClick,
  } = useFeedCommentsScroll();
  /** Signál „zoznam je vykreslený" padne raz na príspevok. */
  const commentsReadyRef = useRef(false);
  const onCommentsReadyRef = useRef(onCommentsReady);
  onCommentsReadyRef.current = onCommentsReady;
  const { textareaRef, insertEmoji } = useEmojiInsertion(text, setText);
  const {
    comments,
    setComments,
    loading,
    loadingMore,
    failed,
    hasMore,
    loadingRepliesFor,
    loadSeqRef,
    markSeen,
    loadMore,
    refresh,
    loadMoreReplies,
  } = useFeedCommentsLoader({
    postId,
    t,
    onTotalChange,
    announceNewComments,
  });

  /**
   * Ohlás, že zoznam je vykreslený.
   *
   * Beží AŽ po commite, v ktorom `loading` prepol na false – komentáre sú
   * teda už v DOM a plocha má svoju skutočnú výšku. Neúspešné načítanie sa
   * neohlasuje: nie je čo ukázať a doscrollovať by sa nemalo kam.
   */
  useEffect(() => {
    commentsReadyRef.current = false;
  }, [postId]);

  useEffect(() => {
    if (commentsReadyRef.current || loading || failed) return;
    commentsReadyRef.current = true;
    onCommentsReadyRef.current?.(scrollRef.current);
  }, [loading, failed, scrollRef]);

  // Rootom observera je ohraničený box, nie viewport – donačítanie tak reaguje
  // na scroll VNÚTRI zoznamu. Menší rootMargin než v hlavnom feede: predsávka
  // 400px by v ~26rem vysokom boxe znamenala, že sentinel je "blízko" vždy.
  const sentinelRef = useInfiniteScrollSentinel({
    onIntersect: loadMore,
    enabled: hasMore && !loading && !loadingMore,
    root: scrollRef,
    rootMargin: '80px',
  });

  // Beží až po commite DOM, takže scrollHeight už zahŕňa nový komentár.
  // Gate cez ref: donačítanie staršej stránky pridáva komentáre tiež, ale
  // vtedy pozíciu scrollu meniť nechceme.
  useEffect(() => {
    const behavior = scrollToTopRef.current;
    if (!behavior) return;
    scrollToTopRef.current = null;
    scrollListToTop(behavior);
    // Doscrollovaním sa upozornenie vyčerpalo.
    setNewCommentsCount((current) => (current === 0 ? current : 0));
  }, [comments, scrollListToTop, scrollToTopRef, setNewCommentsCount]);

  const highlighted = useFeedCommentsSeek({
    comments,
    expandedReplies,
    setExpandedReplies,
    highlightCommentId,
    loading,
    loadingMore,
    loadingRepliesFor,
    hasMore,
    loadMore,
    refresh,
    loadMoreReplies,
  });

  const trimmed = text.trim();
  const tooLong = text.length > FEED_COMMENT_MAX_LENGTH;
  const canSubmit = Boolean(trimmed) && !tooLong && !submitting;

  // Skloňovanie: 1 / 2–4 / 5+ pokrýva sk, cs aj pl. V en, de a hu, kde sa
  // tvary 2–4 a 5+ nelíšia, majú oba kľúče rovnaký text, takže rovnaká vetva
  // funguje pre všetkých šesť jazykov bez ďalšej logiky.
  const newCommentsLabel = `${newCommentsCount} ${
    newCommentsCount === 1
      ? t('feed.newCommentsOne', 'nový komentár')
      : newCommentsCount < 5
        ? t('feed.newCommentsFew', 'nové komentáre')
        : t('feed.newCommentsMany', 'nových komentárov')
  }`;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const created = await createFeedPostComment(postId, trimmed);
      // Zneplatní prebiehajúci load() – jeho odpoveď by tento komentár
      // prepísala stavom spred vytvorenia.
      loadSeqRef.current += 1;
      // Najnovší prvý (poradie z BE) → vlastný komentár ide NAVRCH. Composer
      // je pod zoznamom, takže pri dlhšom vlákne je vrch mimo dohľadu –
      // pohľad sa tam dorovná bez animácie (používateľ práve odoslal, čakať
      // na dojazd nemá zmysel).
      scrollToTopRef.current = 'auto';
      setComments((current) => [created, ...current]);
      // Vlastný komentár sa nesmie vrátiť ako „nový" v najbližšom polle.
      markSeen([created]);
      setText('');
      onCountChange?.(1);
    } catch (err) {
      if (!handleFeedPostErrorIfGone(err, postId, t)) {
        const message =
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error || t('feed.commentCreateError', 'Komentár sa nepodarilo pridať.');
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const toggleReplies = (commentId: number) => {
    setExpandedReplies((current) => {
      const next = new Set(current);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  const handleSubmitEdit = async (comment: FeedPostComment, text: string) => {
    if (editSubmitting || !text) return;
    setEditSubmitting(true);
    try {
      const updated = await updateFeedPostComment(postId, comment.id, text);
      // Zneplatní prebiehajúci load() – rovnako ako pri vytvorení komentára.
      loadSeqRef.current += 1;
      // Preberá sa LEN text a príznak úpravy. Celý objekt by prepísal odpovede
      // náhľadom zo serverovej odpovede, takže by používateľ prišiel o tie,
      // ktoré si sám donačítal.
      const patch = (item: FeedPostComment): FeedPostComment =>
        item.id === comment.id
          ? { ...item, text: updated.text, is_edited: updated.is_edited }
          : item;
      setComments((current) =>
        current.map((item) => ({
          ...patch(item),
          replies: item.replies?.map(patch),
        })),
      );
      setEditingComment(null);
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ||
        t('feed.commentUpdateError', 'Komentár sa nepodarilo upraviť.');
      toast.error(message);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: number) => {
    const trimmedReply = replyText.trim();
    if (!trimmedReply || replySubmitting) return;
    setReplySubmitting(true);
    try {
      const created = await createFeedPostComment(postId, trimmedReply, parentId);
      // Zneplatní prebiehajúci load() – rovnako ako pri bežnom komentári.
      loadSeqRef.current += 1;
      markSeen([created]);
      setComments((current) =>
        current.map((comment) =>
          comment.id === parentId
            ? {
                ...comment,
                // Najnovšia odpoveď je prvá – rovnaký smer ako komentáre.
                replies: [created, ...(comment.replies ?? [])],
                // Počet drží tlačidlo „Zobraziť odpovede (N)" – bez neho by
                // sa vlastná odpoveď po zbalení už nedala otvoriť.
                replies_count: repliesTotal(comment) + 1,
              }
            : comment,
        ),
      );
      setReplyText('');
      setReplyingTo(null);
      // Vlastnú odpoveď má autor hneď vidieť, aj keď mal sekciu zbalenú.
      setExpandedReplies((current) => new Set(current).add(parentId));
      onCountChange?.(1);
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || t('feed.replyCreateError', 'Odpoveď sa nepodarilo pridať.');
      toast.error(message);
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    const comment = pendingDelete;
    if (!comment) return;
    setDeleting(true);
    try {
      await deleteFeedPostComment(postId, comment.id);
      loadSeqRef.current += 1;
      // Zmazaný môže byť vrcholový komentár aj odpoveď – odpoveď žije
      // vnorená, takže sa musí odstrániť z rodiča.
      setComments((current) =>
        current
          .filter((item) => item.id !== comment.id)
          .map((item) =>
            item.replies?.some((reply) => reply.id === comment.id)
              ? {
                  ...item,
                  replies: item.replies.filter((reply) => reply.id !== comment.id),
                  replies_count: Math.max(repliesTotal(item) - 1, 0),
                }
              : item,
          ),
      );
      // Backend maže vrcholový komentár aj jeho odpovede naraz (CASCADE),
      // takže číslo pri ikone musí klesnúť o celý podstrom – nie o jedno.
      // Odpoveď žiadne vlastné odpovede nemá, takže tam ostáva -1.
      // Ráta sa CELKOVÝ počet odpovedí, nie len načítaný – zbalené vlákno má
      // v appke nanajvýš náhľad, backend však zmaže všetky.
      onCountChange?.(-(1 + repliesTotal(comment)));
      toast.success(t('feed.commentDeleted', 'Komentár bol zmazaný.'));
      setPendingDelete(null);
    } catch {
      toast.error(t('feed.commentDeleteError', 'Komentár sa nepodarilo zmazať.'));
    } finally {
      setDeleting(false);
    }
  };

  /**
   * Jeden komentár. Tá istá funkcia kreslí vrcholový komentár aj odpoveď –
   * líšia sa len veľkosťou a tým, že odpoveď NEMÁ tlačidlo „Odpovedať"
   * (vnorenie je jednoúrovňové, na odpoveď sa už odpovedať nedá).
   */
  const renderComment = (comment: FeedPostComment, isReply = false) => (
    <FeedCommentItem
      comment={comment}
      isReply={isReply}
      postId={postId}
      highlighted={highlighted}
      editingComment={editingComment}
      editSubmitting={editSubmitting}
      expandedReplies={expandedReplies}
      showTimestamp={showTimestamp}
      t={t}
      locale={locale}
      openCommentAuthorProfile={openCommentAuthorProfile}
      setEditingComment={setEditingComment}
      handleSubmitEdit={handleSubmitEdit}
      setReplyingTo={setReplyingTo}
      setReplyText={setReplyText}
      toggleReplies={toggleReplies}
      setPendingDelete={setPendingDelete}
    />
  );

  return (
    <div
      data-testid="feed-post-comments"
      className={`border-t border-gray-200/70 px-4 py-3 dark:border-gray-700/60 ${
        fillHeight ? 'flex h-full min-h-0 flex-col' : ''
      }`}
    >
      {/* Ohraničený box s vlastným scrollom: stovky komentárov nenaťahujú
          stránku do nekonečna. `overscroll-contain` zastaví reťazenie scrollu
          na stránku pri dosiahnutí konca (podstatné hlavne na mobile).
          tabIndex robí oblasť dostupnou aj z klávesnice (WCAG 2.1.1). */}
      {/* `relative` kvôli indikátoru nových komentárov, ktorý pláva nad
          spodným okrajom zoznamu. */}
      <div className={`relative ${fillHeight ? 'min-h-0 flex-1' : ''}`}>
        <div
          ref={scrollRef}
          onScroll={handleListScroll}
          data-testid="feed-comments-scroll"
          role="region"
          aria-label={t('feed.commentsList', 'Komentáre')}
          tabIndex={0}
          // `subtle-scrollbar` je appkina utilita (tenký zaoblený scrollbar so
          // svetlým aj tmavým variantom v globals.css) – tú istú má composer,
          // zdieľací dialóg aj zoznam lajkujúcich. V dvojstĺpcovom okne
          // detailu je toto JEDINÉ scrollovateľné miesto, takže by tu
          // predvolený systémový scrollbar bil do očí najviac.
          className={`subtle-scrollbar overflow-y-auto overscroll-contain pr-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 ${
            fillHeight ? 'h-full' : 'max-h-[min(26rem,60dvh)]'
          }`}
        >
          {listHeader}
          {loading ? (
            <p className="py-2 text-sm text-gray-500 dark:text-gray-400">
              {t('common.loading', 'Načítavam...')}
            </p>
          ) : failed ? (
            <p className="py-2 text-sm text-gray-500 dark:text-gray-400">
              {t('feed.commentsLoadError', 'Komentáre sa nepodarilo načítať.')}
            </p>
          ) : comments.length === 0 ? (
            <p
              data-testid="feed-comments-empty"
              className="py-2 text-sm text-gray-500 dark:text-gray-400"
            >
              {t('feed.commentsEmpty', 'Zatiaľ žiadne komentáre.')}
            </p>
          ) : (
            <ul className="space-y-3">
              {comments.map((comment) => (
                <li key={comment.id}>
                  {renderComment(comment)}

                  {/* Odpovede – jedna úroveň, odsadené a menšie. Žiadna
                      @menovka: kontext dáva samotné vnorenie. Predvolene
                      zbalené, nech dlhé vlákno neprevalcuje zoznam. */}
                  {expandedReplies.has(comment.id) && comment.replies?.length ? (
                    <ul
                      data-testid={`feed-comment-replies-${comment.id}`}
                      className="mt-2 space-y-2 border-l-2 border-gray-200 pl-3 ml-4 dark:border-gray-700"
                    >
                      {comment.replies.map((reply) => (
                        <li key={reply.id}>{renderComment(reply, true)}</li>
                      ))}
                    </ul>
                  ) : null}

                  {/* Staršie odpovede sa dopĺňajú samy pri scrollovaní –
                      žiadne tlačidlo. Sentinel patrí TOMUTO vláknu, takže
                      viac rozbalených naraz sa navzájom nespúšťa. */}
                  {expandedReplies.has(comment.id) &&
                  (comment.replies?.length ?? 0) <
                    (comment.replies_count ?? 0) ? (
                    <FeedRepliesAutoLoader
                      enabled={loadingRepliesFor !== comment.id}
                      loading={loadingRepliesFor === comment.id}
                      root={scrollRef}
                      onLoadMore={() => void loadMoreReplies(comment.id)}
                      testId={`feed-comment-replies-sentinel-${comment.id}`}
                    />
                  ) : null}

                  {replyingTo === comment.id ? (
                    <div className="ml-4 pl-3">
                      <FeedCommentReplyComposer
                        value={replyText}
                        onChange={setReplyText}
                        submitting={replySubmitting}
                        onSubmit={() => void handleSubmitReply(comment.id)}
                        onCancel={() => {
                          setReplyingTo(null);
                          setReplyText('');
                        }}
                      />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {loadingMore ? <FeedCommentsLoadingMore /> : null}

          {/* Sentinel patrí TEJTO karte – observer je per-inštancia, takže dve
              naraz rozbalené karty si donačítavanie navzájom nespúšťajú.
              Musí byť VNÚTRI scrollovateľného boxu, inak by ho scroll v zozname
              nikdy neposunul do zorného poľa a donačítavanie by sa nespustilo. */}
          <div ref={sentinelRef} aria-hidden="true" data-testid="feed-comments-sentinel" />
        </div>

        <FeedCommentsNewIndicator
          newCommentsCount={newCommentsCount}
          newCommentsLabel={newCommentsLabel}
          handleNewCommentsClick={handleNewCommentsClick}
        />
      </div>

      {/* Composer je MIMO scrollovateľnej časti – ostáva viditeľný bez ohľadu
          na to, kde v zozname používateľ je. */}
      <FeedCommentComposer
        compactComposer={compactComposer}
        textareaRef={textareaRef}
        text={text}
        setText={setText}
        t={t}
        handleSubmit={handleSubmit}
        canSubmit={canSubmit}
        tooLong={tooLong}
        isMobile={isMobile}
        submitting={submitting}
        insertEmoji={insertEmoji}
      />

      <FeedDestructiveConfirm
        open={pendingDelete !== null}
        isDeleting={deleting}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
