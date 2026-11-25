'use client';

/**
 * Stav jedného poľa na komentár aj odpoveď na mobile (R75, kolo 3b redizajnu komentárov).
 *
 * Mobilný detail príspevku a panel nad fotkou majú pole dole mimo zoznamu. Namiesto samostatného poľa pod komentárom
 * (počítač) sa v nich po ťuknutí na „Odpovedať“ prepne TO ISTÉ pole na odpoveď. Komentár aj odpoveď majú každé svoj text:
 * rozpísaný komentár sa pri odpovedaní nestratí a po krížiku alebo po odoslaní odpovede je späť.
 *
 * Hook nič nevlastní, len zosúlaďuje dva existujúce stavy (text komentára z `FeedPostComments`, cieľ a text odpovede z
 * `useFeedCommentMutations`) do vlastností poľa a obsluhy ťuknutia na „Odpovedať“. Mimo mobilu (`enabled` false) vráti
 * `null` a komentáre sa správajú ako doteraz.
 *
 * - „Odpovedať“ pri inom komentári len zmení cieľ, text odpovede ostane (R75 bod 4); text sa maže až krížikom.
 * - Cieľ, ktorý medzitým zmizol (komentár sa zmazal), vráti pole na komentár, aby nezostalo bez adresáta.
 * - Pri odmontovaní ohlási, že pole fokus nemá: obrazovka podľa neho prispôsobuje výšku klávesnici a po odmontovaní
 *   poľa by inak ostala pripnutá.
 */

import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { FEED_COMMENT_MAX_LENGTH, type FeedPostComment } from '@/lib/feedApi';
import type { FeedCommentMobileComposerProps } from './FeedCommentMobileComposer';

type ReplyState = {
  replyingTo: number | null;
  setReplyingTo: (id: number | null) => void;
  replyText: string;
  setReplyText: (value: string) => void;
  replySubmitting: boolean;
  handleSubmitReply: (parentId: number) => Promise<void>;
};

/** Pole na nový komentár tak, ako ho pozná `FeedPostComments`. */
type CommentField = {
  text: string;
  setText: (value: string) => void;
  canSubmit: boolean;
  tooLong: boolean;
  handleSubmit: () => Promise<void>;
};

type UseFeedMobileReplyFieldOptions = {
  enabled: boolean;
  reply: ReplyState;
  field: CommentField;
  comments: FeedPostComment[];
  loading: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onFocusChange?: (focused: boolean) => void;
  t: (key: string, fallback?: string) => string;
};

export type FeedMobileReplyField = {
  /** Vlastnosti jediného poľa dole (`FeedCommentMobileComposer`). */
  composer: FeedCommentMobileComposerProps;
  /** Ťuk na „Odpovedať“ pri komentári: prepne pole na odpoveď a zaostrí ho. */
  onReply: (comment: FeedPostComment) => void;
};

export function useFeedMobileReplyField({
  enabled,
  reply,
  field,
  comments,
  loading,
  textareaRef,
  onFocusChange,
  t,
}: UseFeedMobileReplyFieldOptions): FeedMobileReplyField | null {
  const {
    replyingTo,
    setReplyingTo,
    replyText,
    setReplyText,
    replySubmitting,
    handleSubmitReply,
  } = reply;
  const replying = enabled && replyingTo !== null;
  const target = replying
    ? comments.find((comment) => comment.id === replyingTo)
    : undefined;

  // Komentár, na ktorý sa odpovedalo, zmizol (zmazanie, obnovenie zoznamu): späť na komentár.
  useEffect(() => {
    if (!replying || loading) return;
    if (comments.some((comment) => comment.id === replyingTo)) return;
    setReplyingTo(null);
    setReplyText('');
  }, [replying, loading, comments, replyingTo, setReplyingTo, setReplyText]);

  const onFocusChangeRef = useRef(onFocusChange);
  onFocusChangeRef.current = onFocusChange;
  useEffect(() => () => onFocusChangeRef.current?.(false), []);

  const onReply = useCallback(
    (comment: FeedPostComment) => {
      setReplyingTo(comment.id);
      // Pole je v DOM stále, takže sa dá zaostriť priamo z ťuknutia: iPhone klávesnicu inak neotvorí.
      textareaRef.current?.focus();
    },
    [setReplyingTo, textareaRef],
  );

  const onCancelReply = useCallback(() => {
    setReplyingTo(null);
    setReplyText('');
  }, [setReplyingTo, setReplyText]);

  if (!enabled) return null;

  const replyTooLong = replyText.length > FEED_COMMENT_MAX_LENGTH;
  const replyCanSubmit =
    Boolean(replyText.trim()) && !replyTooLong && !replySubmitting;

  return {
    onReply,
    composer: {
      textareaRef,
      replying,
      replyTargetName: target?.author?.display_name,
      value: replying ? replyText : field.text,
      onChange: replying ? setReplyText : field.setText,
      onSubmit: () => {
        if (replying && replyingTo !== null) void handleSubmitReply(replyingTo);
        else void field.handleSubmit();
      },
      onCancelReply,
      canSubmit: replying ? replyCanSubmit : field.canSubmit,
      tooLong: replying ? replyTooLong : field.tooLong,
      readOnly: replying && replySubmitting,
      onFocusChange,
      t,
    },
  };
}
