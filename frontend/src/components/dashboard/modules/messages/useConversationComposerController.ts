'use client';

import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { requestConversationsRefresh, suppressPassiveMessagingRefresh } from './messagesEvents';
import {
  getMessagingErrorCode,
  getMessagingErrorMessage,
  getMessagingErrorStatus,
  sendMessage,
} from './messagingApi';
import { useConversationPendingImage } from './useConversationPendingImage';
import { useMobileViewportHeight } from '../../hooks/useMobileViewportHeight';
import type { ConversationRefreshOptions } from './useConversationThreadController';

type Translate = (key: string, defaultValue?: string) => string;

type RefreshMessages = (options?: ConversationRefreshOptions) => Promise<unknown>;

type UseConversationComposerControllerArgs = {
  conversationId: number;
  isMobile: boolean;
  loading: boolean;
  disabled?: boolean;
  t: Translate;
  refresh: RefreshMessages;
};

export function useConversationComposerController({
  conversationId,
  isMobile,
  loading,
  disabled = false,
  t,
  refresh,
}: UseConversationComposerControllerArgs) {
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [isComposerFocused, setIsComposerFocused] = useState(false);
  const [isRequestPickerOpen, setIsRequestPickerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const shouldRestoreFocusRef = useRef(false);
  const shouldPinFocusedViewportToBottomRef = useRef(false);
  const mobileViewportHeight = useMobileViewportHeight(isMobile && isComposerFocused);
  const {
    imageInputRef,
    cameraInputRef,
    pendingImageFile,
    pendingImagePreviewUrl,
    clearPendingImage,
    handlePendingImageInputChange,
    openImagePicker,
    openCameraPicker,
  } = useConversationPendingImage({ sending, t });

  const focusComposer = useCallback(() => {
    if (isMobile) return;

    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input || input.disabled) return;

      try {
        input.focus({ preventScroll: true });
      } catch {
        input.focus();
      }

      const end = input.value.length;
      input.setSelectionRange(end, end);
    });
  }, [isMobile]);

  const handleComposerFocus = useCallback(() => {
    setIsRequestPickerOpen(false);
    if (!isMobile) return;
    shouldPinFocusedViewportToBottomRef.current = true;
    setIsComposerFocused(true);
  }, [isMobile]);

  const handleComposerBlur = useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      if (!isMobile) return;
      const nextFocused = event.relatedTarget as Node | null;
      if (nextFocused && event.currentTarget.contains(nextFocused)) {
        return;
      }
      shouldPinFocusedViewportToBottomRef.current = false;
      setIsComposerFocused(false);
    },
    [isMobile],
  );

  const handleMobileSendPointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
    },
    [],
  );

  const handleSend = useCallback(async () => {
    if (disabled) return;
    const draft = text;
    const clean = draft.trim();
    if ((!clean && !pendingImageFile) || sending) return;

    const keepMobileComposerInteractive = isMobile && pendingImageFile === null;
    let didSend = false;

    shouldRestoreFocusRef.current = true;
    setSending(true);
    if (keepMobileComposerInteractive) {
      setText('');
    }
    try {
      await sendMessage(
        conversationId,
        pendingImageFile
          ? {
              text: clean,
              image: pendingImageFile,
            }
          : clean,
      );
      didSend = true;
      if (!keepMobileComposerInteractive) {
        setText('');
      }
      clearPendingImage();
      await refresh({ showError: false, markAsRead: true, scrollBehavior: 'force_latest' });
      requestConversationsRefresh();
    } catch (error) {
      if (keepMobileComposerInteractive && !didSend) {
        setText((current) => (current === '' ? draft : current));
      }
      if (getMessagingErrorCode(error) === 'message_request_pending' || getMessagingErrorStatus(error) === 403) {
        suppressPassiveMessagingRefresh();
      }
      toast.error(
        getMessagingErrorMessage(error, {
          fallback: t('messages.sendFailed', 'Správu sa nepodarilo odoslať. Skúste to znova.'),
          rateLimitFallback: t(
            'messages.sendRateLimited',
            'Posielate príliš rýchlo. Skúste chvíľu počkať.',
          ),
          unavailableFallback: t('messages.sendUnavailable', 'Konverzácia už nie je dostupná.'),
          requestPendingFallback: t(
            'messages.messageRequestPendingNotice',
            'Čakáte na prijatie konverzácie.',
          ),
          requestAcceptRequiredFallback: t(
            'messages.acceptMessageRequestToReply',
            'Prijmite žiadosť, aby ste mohli odpovedať.',
          ),
        }),
      );
    } finally {
      setSending(false);
    }
  }, [clearPendingImage, conversationId, disabled, isMobile, pendingImageFile, refresh, sending, t, text]);

  const handleEmojiSelect = useCallback((emoji: string) => {
    const input = inputRef.current;
    if (!input) {
      setText((current) => current + emoji);
      return;
    }

    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    setText((current) => current.slice(0, start) + emoji + current.slice(end));

    requestAnimationFrame(() => {
      const nextPosition = start + emoji.length;
      input.focus();
      input.setSelectionRange(nextPosition, nextPosition);
    });
  }, []);

  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== 'Enter' || event.shiftKey) return;
      event.preventDefault();
      void handleSend();
    },
    [handleSend],
  );

  useEffect(() => {
    setIsRequestPickerOpen(false);
  }, [conversationId]);

  useEffect(() => {
    if (loading) return;
    focusComposer();
  }, [conversationId, focusComposer, loading]);

  useEffect(() => {
    if (sending || loading || !shouldRestoreFocusRef.current) return;
    shouldRestoreFocusRef.current = false;
    focusComposer();
  }, [focusComposer, loading, sending]);

  return {
    sending,
    text,
    isComposerFocused,
    isRequestPickerOpen,
    inputRef,
    imageInputRef,
    cameraInputRef,
    pendingImageFile,
    pendingImagePreviewUrl,
    mobileViewportHeight,
    shouldPinFocusedViewportToBottomRef,
    hasContentToSend: !disabled && (text.trim().length > 0 || pendingImageFile !== null),
    isComposerInputDisabled: disabled || (sending && (!isMobile || pendingImageFile !== null)),
    clearPendingImage,
    handlePendingImageInputChange,
    openImagePicker,
    openCameraPicker,
    setText,
    toggleRequestPicker: () => setIsRequestPickerOpen((prev) => !prev),
    handleComposerFocus,
    handleComposerBlur,
    handleMobileSendPointerDown,
    handleSend,
    handleEmojiSelect,
    handleInputKeyDown,
  };
}
