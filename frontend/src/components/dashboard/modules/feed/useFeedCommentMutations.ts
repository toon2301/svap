'use client';

/**
 * Mutácie komentárov (krok 7 delenia `FeedPostComments.tsx`, nález 333, R23).
 *
 * Presunuté z komponentu bez zmeny správania: obsluhy pridania komentára (`handleSubmit`), úpravy
 * (`handleSubmitEdit`), odpovede (`handleSubmitReply`) a zmazania s potvrdením (`handleConfirmDelete`) spolu
 * so stavmi, ktoré patria len im (úprava, odpoveď, potvrdenie a priebeh mazania).
 *
 * Zápisy do `loadSeqRef` (po úspešnom `await`, pred zmenou zoznamu), `markSeen`, `scrollToTopRef` a
 * `onCountChange` ostali presne tam, kde boli: nález 338 (K41) stavia opakovanie prvého načítania na tom, že
 * každá mutácia zneplatní prebiehajúce načítanie (viď `useFeedCommentsLoader`). Hook nemá žiadny efekt, takže sa
 * poradie efektov komponentu nemení.
 *
 * `submitting`, `trimmed` a `canSubmit` ostávajú v komponente: odvodzujú sa od poľa na komentár (`text`), ktoré
 * používa aj composer.
 *
 * Nález 342 (K43, R60): odpoveď, úprava a zmazanie pri zmiznutom príspevku ukazovali len všeobecnú chybu a
 * príspevok ostával v zoznamoch. Po chybe 404, 403 alebo 410 sa teraz najprv overí príspevok dopytom na detail
 * (`handleCommentActionErrorIfPostGone`) a ak zmizol, spracuje sa ako pri pridaní. Pridanie komentára ostáva pri
 * `handleFeedPostErrorIfGone`: tam 404 jednoznačne patrí príspevku, takže overovací dopyt netreba.
 */

import { useState, type Dispatch, type RefObject, type SetStateAction } from 'react';
import toast from 'react-hot-toast';
import { handleCommentActionErrorIfPostGone, handleFeedPostErrorIfGone } from './feedPostGone';
import { repliesTotal } from './feedCommentsLogic';
import {
  createFeedPostComment,
  deleteFeedPostComment,
  updateFeedPostComment,
  type FeedPostComment,
} from '@/lib/feedApi';

type UseFeedCommentMutationsOptions = {
  postId: number;
  t: (key: string, fallback?: string) => string;
  /** Orezaný text nového komentára; odvádza ho komponent z poľa na komentár. */
  trimmed: string;
  /** Dá sa nový komentár odoslať (má text, nie je dlhý a neodosiela sa); odvádza ho komponent. */
  canSubmit: boolean;
  setSubmitting: (submitting: boolean) => void;
  setText: (text: string) => void;
  onCountChange?: (delta: number) => void;
  /** Poradové číslo načítaní z `useFeedCommentsLoader`; po úspešnej mutácii sa zvýši. */
  loadSeqRef: RefObject<number>;
  markSeen: (seen: FeedPostComment[]) => void;
  setComments: Dispatch<SetStateAction<FeedPostComment[]>>;
  /** Požadované doscrollovanie po commite z `useFeedCommentsScroll`; píše doň len vlastný nový komentár. */
  scrollToTopRef: RefObject<ScrollBehavior | null>;
  setExpandedReplies: Dispatch<SetStateAction<Set<number>>>;
};

export function useFeedCommentMutations({
  postId,
  t,
  trimmed,
  canSubmit,
  setSubmitting,
  setText,
  onCountChange,
  loadSeqRef,
  markSeen,
  setComments,
  scrollToTopRef,
  setExpandedReplies,
}: UseFeedCommentMutationsOptions) {
  const [pendingDelete, setPendingDelete] = useState<FeedPostComment | null>(null);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
      // Príspevok mohol medzitým zmiznúť (nález 342): po 404, 403 a 410 sa najprv overí dopytom na detail.
      if (!(await handleCommentActionErrorIfPostGone(err, postId, t))) {
        const message =
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error ||
          t('feed.commentUpdateError', 'Komentár sa nepodarilo upraviť.');
        toast.error(message);
      }
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
      // Príspevok mohol medzitým zmiznúť (nález 342): po 404, 403 a 410 sa najprv overí dopytom na detail.
      if (!(await handleCommentActionErrorIfPostGone(err, postId, t))) {
        const message =
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error || t('feed.replyCreateError', 'Odpoveď sa nepodarilo pridať.');
        toast.error(message);
      }
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
    } catch (err) {
      // Príspevok mohol medzitým zmiznúť (nález 342): po 404, 403 a 410 sa najprv overí dopytom na detail.
      if (!(await handleCommentActionErrorIfPostGone(err, postId, t))) {
        toast.error(t('feed.commentDeleteError', 'Komentár sa nepodarilo zmazať.'));
      }
    } finally {
      setDeleting(false);
    }
  };

  return {
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
  };
}
