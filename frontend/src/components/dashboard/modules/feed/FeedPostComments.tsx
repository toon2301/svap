'use client';

/**
 * Komentáre pod príspevkom – inline rozbalenie, nie modal.
 *
 * Donačítavanie je plynulé (rovnako ako hlavný feed), ale observer je SCOPED
 * na túto inštanciu: `useInfiniteScrollSentinel` vracia vlastný ref, takže
 * každá rozbalená karta má vlastný sentinel aj vlastný observer a viac kariet
 * otvorených naraz sa navzájom neovplyvňuje.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
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
import { useFeedCommentMutations } from './useFeedCommentMutations';
import { openUserProfile } from './feedProfileNavigation';
import { useFeedPostOverlay } from '../../contexts/FeedPostOverlayContext';
import { useInfiniteScrollSentinel } from './useFeedInfiniteScroll';
import {
  FEED_COMMENT_MAX_LENGTH,
  type FeedPostComment,
} from '@/lib/feedApi';
import type { FeedPostCommentsProps } from './FeedPostComments.types';

/**
 * Triedy komentárov pri `fillHeight`: koreň, obal zoznamu a posuvný rámik.
 *
 * `FILL_CLASSES` vypĺňajú výšku rodiča, ktorá je pevná (percentuálna výška, `h-full`). `FLEX_FILL_CLASSES` ju namiesto
 * toho odovzdávajú flexom celým reťazcom (`flex-1` + `min-h-0`), lebo rodič s nedefinitnou výškou (okno so stropom
 * `max-h`) percentuálnu výšku nevyhodnotí; viď `flexFill` vo `FeedPostComments.types.ts`. Píšu sa DOSLOVA, lebo
 * Tailwind hľadá v zdroji celé názvy tried.
 */
const FILL_CLASSES = {
  root: 'flex h-full min-h-0 flex-col',
  listWrap: 'min-h-0 flex-1',
  scroll: 'h-full',
} as const;
const FLEX_FILL_CLASSES = {
  root: 'flex min-h-0 flex-1 flex-col',
  listWrap: 'flex min-h-0 flex-1 flex-col',
  scroll: 'min-h-0 flex-1',
} as const;

export default function FeedPostComments({
  postId,
  fillHeight = false,
  flexFill = false,
  draft,
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
  const [ownSubmitting, setOwnSubmitting] = useState(false);
  const [ownText, setOwnText] = useState('');
  // Text aj priebeh odosielania drží rodič, ak o to požiada (`draft`): odmountovanie komentárov pri prepnutí rozloženia
  // okna ich nestratí, takže sa po prepnutí nedá odoslať ten istý komentár druhýkrát.
  const text = draft ? draft.value : ownText;
  const setText: (value: string) => void = draft ? draft.onChange : setOwnText;
  const submitting = draft ? draft.submitting : ownSubmitting;
  const setSubmitting: (value: boolean) => void = draft ? draft.onSubmittingChange : setOwnSubmitting;
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

  // Rozbalenie je LOKÁLNE per komentár – jedno vlákno môže mať naraz
  // rozbalené jedny odpovede a zbalené druhé.
  const [expandedReplies, setExpandedReplies] = useState<Set<number>>(
    () => new Set(),
  );
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
    loadMorePaused,
    loadingRepliesFor,
    repliesPaused,
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
  // Po zlyhaní donačítania je sentinel vypnutý (`loadMorePaused`), inak by sa dopyt v slučke opakoval (nález 351);
  // hlavný feed a profil to robia cez `!error`.
  const sentinelRef = useInfiniteScrollSentinel({
    onIntersect: loadMore,
    enabled: hasMore && !loading && !loadingMore && !loadMorePaused,
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

  /**
   * Vyprázdnenie poľa po úspešnom odoslaní (mutácie ho volajú ako `setText('')`).
   *
   * S `draft` sa pole vyprázdni len vtedy, keď ešte obsahuje odoslaný text: odpoveď servera môže prísť až po prepnutí
   * rozloženia a po tom, čo používateľ napísal ďalší komentár, a ten sa nesmie stratiť. `trimmed` je ten istý text, ktorý
   * odišiel na server, lebo obsluha odoslania aj táto funkcia vznikli v tom istom vykreslení. Bez `draft` sa pole
   * vyprázdni vždy, ako doteraz.
   */
  const clearSentText = (next: string) => {
    if (draft) draft.onSent(trimmed);
    else setOwnText(next);
  };

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

  // Mutácie komentárov (pridanie, úprava, odpoveď, zmazanie s potvrdením): krok 7 delenia, viď hook.
  const {
    pendingDelete,
    setPendingDelete,
    replyingTo,
    setReplyingTo,
    replyText,
    setReplyText,
    replySubmitting,
    editingComment,
    setEditingComment,
    editSubmitting,
    deleting,
    handleSubmit,
    handleSubmitEdit,
    handleSubmitReply,
    handleConfirmDelete,
  } = useFeedCommentMutations({
    postId,
    t,
    trimmed,
    canSubmit,
    setSubmitting,
    setText: clearSentText,
    onCountChange,
    loadSeqRef,
    markSeen,
    setComments,
    scrollToTopRef,
    setExpandedReplies,
  });

  const toggleReplies = (commentId: number) => {
    setExpandedReplies((current) => {
      const next = new Set(current);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
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

  const fill = flexFill ? FLEX_FILL_CLASSES : FILL_CLASSES;

  return (
    <div
      data-testid="feed-post-comments"
      className={`border-t border-gray-200/70 px-4 py-3 dark:border-gray-700/60 ${
        fillHeight ? fill.root : ''
      }`}
    >
      {/* Ohraničený box s vlastným scrollom: stovky komentárov nenaťahujú
          stránku do nekonečna. `overscroll-contain` zastaví reťazenie scrollu
          na stránku pri dosiahnutí konca (podstatné hlavne na mobile).
          tabIndex robí oblasť dostupnou aj z klávesnice (WCAG 2.1.1). */}
      {/* `relative` kvôli indikátoru nových komentárov, ktorý pláva nad
          spodným okrajom zoznamu. */}
      <div className={`relative ${fillHeight ? fill.listWrap : ''}`}>
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
            fillHeight ? fill.scroll : 'max-h-[min(26rem,60dvh)]'
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
                      paused={repliesPaused}
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
