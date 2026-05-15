'use client';

import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { copyTextToClipboard } from '@/lib/clipboard';
import type { MessageItem } from './types';
import {
  deleteMessage,
  getMessagingErrorMessage,
  hideConversation,
} from './messagingApi';
import { requestConversationsRefresh } from './messagesEvents';
import { navigateMessagesUrl } from './messagesRouting';
import { formatTime } from './conversationDetailUtils';
import { resolveMessagingImageUrl } from './resolveMessagingImageUrl';

type Translate = (key: string, defaultValue?: string) => string;

type MessageActionsTarget = {
  messageId: number;
  anchorRect: DOMRect | null;
} | null;

type UseConversationActionsControllerArgs = {
  conversationId: number;
  currentUserId: number;
  isMobile: boolean;
  imageOnlyPreviewLabel: string;
  messages: MessageItem[];
  pinnedMessage: MessageItem | null;
  markMessageDeletedLocally: (messageId: number) => void;
  onUpdatePinnedMessage: (messageId: number | null) => Promise<void>;
  syncConversationReadState: (options: {
    conversationId: number;
    totalUnreadCount?: number | null;
  }) => void;
  t: Translate;
};

export function useConversationActionsController({
  conversationId,
  currentUserId,
  isMobile,
  imageOnlyPreviewLabel,
  messages,
  pinnedMessage,
  markMessageDeletedLocally,
  onUpdatePinnedMessage,
  syncConversationReadState,
  t,
}: UseConversationActionsControllerArgs) {
  const [messageActionsTarget, setMessageActionsTarget] = useState<MessageActionsTarget>(null);
  const [conversationActionsAnchorRect, setConversationActionsAnchorRect] = useState<DOMRect | null>(
    null,
  );
  const [isConversationActionsOpen, setIsConversationActionsOpen] = useState(false);
  const [isConversationPendingDelete, setIsConversationPendingDelete] = useState(false);
  const [isDeletingConversation, setIsDeletingConversation] = useState(false);
  const [messagePendingDeleteId, setMessagePendingDeleteId] = useState<number | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<number | null>(null);
  const [messageImageLightbox, setMessageImageLightbox] = useState<{
    messageId: number;
    imageUrl: string;
  } | null>(null);
  const [forwardMessageTarget, setForwardMessageTarget] = useState<MessageItem | null>(null);
  const messageLongPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressedMessageIdRef = useRef<number | null>(null);

  const closeMessageActions = useCallback(() => {
    longPressedMessageIdRef.current = null;
    setMessageActionsTarget(null);
  }, []);

  const closeConversationActions = useCallback(() => {
    setIsConversationActionsOpen(false);
    setConversationActionsAnchorRect(null);
  }, []);

  const closeMessageImageLightbox = useCallback(() => {
    setMessageImageLightbox(null);
  }, []);

  const clearMessageLongPressTimer = useCallback(() => {
    if (!messageLongPressTimerRef.current) return;
    clearTimeout(messageLongPressTimerRef.current);
    messageLongPressTimerRef.current = null;
  }, []);

  const clearActiveTextSelection = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.getSelection?.()?.removeAllRanges();
    }

    if (typeof document === 'undefined') {
      return;
    }

    const activeElement = document.activeElement;
    if (!(activeElement instanceof HTMLElement) || activeElement === document.body) {
      return;
    }

    activeElement.blur();
  }, []);

  const suppressNativeMessageContextMenu = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!isMobile) return;
      event.preventDefault();
    },
    [isMobile],
  );

  const openMessageImageLightbox = useCallback((messageId: number, imageUrl: string) => {
    setMessageImageLightbox({ messageId, imageUrl });
  }, []);

  const openMessageActions = useCallback(
    (messageId: number, anchorRect: DOMRect | null) => {
      clearActiveTextSelection();
      setMessageActionsTarget({ messageId, anchorRect });
    },
    [clearActiveTextSelection],
  );

  const openConversationActions = useCallback((anchorRect: DOMRect | null) => {
    setConversationActionsAnchorRect(anchorRect);
    setIsConversationActionsOpen(true);
  }, []);

  const handleDeleteMessage = useCallback(async () => {
    const messageId = messagePendingDeleteId;
    if (messageId === null || deletingMessageId !== null) return;

    setDeletingMessageId(messageId);
    try {
      const result = await deleteMessage(conversationId, messageId);
      markMessageDeletedLocally(result.message.id);
      setMessageImageLightbox((current) =>
        current?.messageId === result.message.id ? null : current,
      );
      setMessagePendingDeleteId(null);
      setMessageActionsTarget(null);
      syncConversationReadState({
        conversationId,
        totalUnreadCount: result.total_unread_count,
      });
    } catch (error) {
      toast.error(
        getMessagingErrorMessage(error, {
          fallback: t('messages.deleteFailed', 'Správu sa nepodarilo vymazať. Skúste to znova.'),
          unavailableFallback: t(
            'messages.deleteUnavailable',
            'Správu už nie je možné vymazať.',
          ),
        }),
      );
    } finally {
      setDeletingMessageId(null);
    }
  }, [
    conversationId,
    deletingMessageId,
    markMessageDeletedLocally,
    messagePendingDeleteId,
    syncConversationReadState,
    t,
  ]);

  const handleDeleteConversation = useCallback(async () => {
    if (isDeletingConversation) return;

    setIsDeletingConversation(true);
    try {
      const result = await hideConversation(conversationId);
      closeConversationActions();
      setIsConversationPendingDelete(false);
      syncConversationReadState({
        conversationId,
        totalUnreadCount: result.total_unread_count,
      });
      requestConversationsRefresh();
      navigateMessagesUrl();
    } catch (error) {
      toast.error(
        getMessagingErrorMessage(error, {
          fallback: t(
            'messages.deleteConversationFailed',
            'Konverzáciu sa nepodarilo vymazať. Skúste to znova.',
          ),
          unavailableFallback: t(
            'messages.deleteConversationUnavailable',
            'Konverzáciu už nie je možné vymazať.',
          ),
        }),
      );
    } finally {
      setIsDeletingConversation(false);
    }
  }, [
    closeConversationActions,
    conversationId,
    isDeletingConversation,
    syncConversationReadState,
    t,
  ]);

  const selectedMessageForActions = useMemo(() => {
    if (messageActionsTarget === null) {
      return null;
    }

    return messages.find((item) => item.id === messageActionsTarget.messageId) ?? null;
  }, [messageActionsTarget, messages]);

  const canCopySelectedMessage =
    selectedMessageForActions !== null &&
    !selectedMessageForActions.is_deleted &&
    typeof selectedMessageForActions.text === 'string' &&
    selectedMessageForActions.text.length > 0;
  const canDeleteSelectedMessage =
    selectedMessageForActions !== null &&
    !selectedMessageForActions.is_deleted &&
    selectedMessageForActions.sender?.id === currentUserId;
  const canToggleSelectedPinnedMessage =
    selectedMessageForActions !== null && !selectedMessageForActions.is_deleted;
  const canForwardSelectedMessage =
    selectedMessageForActions !== null &&
    !selectedMessageForActions.is_deleted &&
    (selectedMessageForActions.message_type ?? 'user') === 'user' &&
    Boolean(
      selectedMessageForActions.text?.trim() ||
        selectedMessageForActions.image_url ||
        selectedMessageForActions.has_image,
    );
  const isSelectedMessagePinned =
    selectedMessageForActions !== null && pinnedMessage?.id === selectedMessageForActions.id;
  const hasSelectedMessageActions =
    canCopySelectedMessage ||
    canDeleteSelectedMessage ||
    canToggleSelectedPinnedMessage ||
    canForwardSelectedMessage;

  const handleToggleSelectedMessagePin = useCallback(() => {
    if (!canToggleSelectedPinnedMessage || !selectedMessageForActions) return;
    closeMessageActions();
    void onUpdatePinnedMessage(isSelectedMessagePinned ? null : selectedMessageForActions.id);
  }, [
    canToggleSelectedPinnedMessage,
    closeMessageActions,
    isSelectedMessagePinned,
    onUpdatePinnedMessage,
    selectedMessageForActions,
  ]);

  const handleForwardSelectedMessage = useCallback(() => {
    if (!canForwardSelectedMessage || !selectedMessageForActions) return;
    setForwardMessageTarget(selectedMessageForActions);
    closeMessageActions();
  }, [canForwardSelectedMessage, closeMessageActions, selectedMessageForActions]);

  useEffect(() => {
    if (messageActionsTarget === null) {
      return;
    }

    if (
      !selectedMessageForActions ||
      selectedMessageForActions.is_deleted ||
      !hasSelectedMessageActions
    ) {
      closeMessageActions();
    }
  }, [closeMessageActions, hasSelectedMessageActions, messageActionsTarget, selectedMessageForActions]);

  useEffect(() => {
    if (messageImageLightbox === null) {
      return;
    }

    const activeMessage = messages.find((item) => item.id === messageImageLightbox.messageId) ?? null;
    if (!activeMessage || activeMessage.is_deleted || !resolveMessagingImageUrl(activeMessage.image_url)) {
      closeMessageImageLightbox();
    }
  }, [closeMessageImageLightbox, messageImageLightbox, messages]);

  useEffect(() => {
    if (forwardMessageTarget === null) {
      return;
    }

    const activeMessage = messages.find((item) => item.id === forwardMessageTarget.id) ?? null;
    if (!activeMessage || activeMessage.is_deleted) {
      setForwardMessageTarget(null);
    }
  }, [forwardMessageTarget, messages]);

  const handleCopyMessage = useCallback(async () => {
    if (!canCopySelectedMessage || !selectedMessageForActions?.text) {
      return;
    }

    try {
      const copied = await copyTextToClipboard(selectedMessageForActions.text);

      if (copied) {
        closeMessageActions();
        toast.success(t('messages.copySuccess', 'Správa bola skopírovaná.'));
        return;
      }
    } catch {
      // Fall through to the error toast below.
    }

    toast.error(t('messages.copyFailed', 'Správu sa nepodarilo skopírovať.'));
  }, [canCopySelectedMessage, closeMessageActions, selectedMessageForActions, t]);

  const handleMessageActionTrigger = useCallback(
    (messageId: number, element: HTMLElement | null) => {
      openMessageActions(messageId, element?.getBoundingClientRect() ?? null);
    },
    [openMessageActions],
  );

  const getMessageInteractionProps = useCallback(
    (messageId: number, hasActions: boolean) => {
      if (!hasActions) {
        return {};
      }

      if (isMobile) {
        return {
          onTouchStart: (event: React.TouchEvent<HTMLDivElement>) => {
            clearMessageLongPressTimer();
            longPressedMessageIdRef.current = null;
            const target = event.currentTarget;
            messageLongPressTimerRef.current = setTimeout(() => {
              longPressedMessageIdRef.current = messageId;
              openMessageActions(messageId, target.getBoundingClientRect());
              messageLongPressTimerRef.current = null;
            }, 450);
          },
          onTouchEnd: clearMessageLongPressTimer,
          onTouchCancel: clearMessageLongPressTimer,
          onTouchMove: clearMessageLongPressTimer,
        };
      }

      return {};
    },
    [clearMessageLongPressTimer, isMobile, openMessageActions],
  );

  const handleMessageImageClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>, messageId: number, imageUrl: string) => {
      event.stopPropagation();
      if (longPressedMessageIdRef.current === messageId) {
        longPressedMessageIdRef.current = null;
        return;
      }

      openMessageImageLightbox(messageId, imageUrl);
    },
    [openMessageImageLightbox],
  );

  useEffect(() => {
    clearMessageLongPressTimer();
    longPressedMessageIdRef.current = null;
    setMessageActionsTarget(null);
    setConversationActionsAnchorRect(null);
    setIsConversationActionsOpen(false);
    setIsConversationPendingDelete(false);
    setIsDeletingConversation(false);
    setMessagePendingDeleteId(null);
    setDeletingMessageId(null);
    setMessageImageLightbox(null);
    setForwardMessageTarget(null);
  }, [clearMessageLongPressTimer, conversationId]);

  const selectedMessageActionPreviewText =
    selectedMessageForActions && !selectedMessageForActions.is_deleted
      ? selectedMessageForActions.text?.trim() ||
        (selectedMessageForActions.image_url ? imageOnlyPreviewLabel : '')
      : '';

  const selectedMessageActionPreview =
    selectedMessageForActions && !selectedMessageForActions.is_deleted
      ? {
          text: selectedMessageActionPreviewText,
          imageUrl: resolveMessagingImageUrl(selectedMessageForActions.image_url),
          timestamp: formatTime(selectedMessageForActions.created_at),
        }
      : null;

  return {
    messageActionsTarget,
    conversationActionsAnchorRect,
    isConversationActionsOpen,
    isConversationPendingDelete,
    isDeletingConversation,
    messagePendingDeleteId,
    deletingMessageId,
    messageImageLightbox,
    forwardMessageTarget,
    canCopySelectedMessage,
    canDeleteSelectedMessage,
    canToggleSelectedPinnedMessage,
    canForwardSelectedMessage,
    isSelectedMessagePinned,
    selectedMessageActionPreview,
    setMessageActionsTarget,
    setMessagePendingDeleteId,
    closeMessageActions,
    closeConversationActions,
    closeMessageImageLightbox,
    suppressNativeMessageContextMenu,
    openConversationActions,
    handleDeleteMessage,
    handleDeleteConversation,
    handleCopyMessage,
    handleToggleSelectedMessagePin,
    handleForwardSelectedMessage,
    handleMessageActionTrigger,
    getMessageInteractionProps,
    handleMessageImageClick,
    requestDeleteConversation: () => {
      closeConversationActions();
      setIsConversationPendingDelete(true);
    },
    requestDeleteSelectedMessage: () => {
      if (messageActionsTarget === null) return;
      setMessagePendingDeleteId(messageActionsTarget.messageId);
      setMessageActionsTarget(null);
    },
    closeDeleteConversationModal: () => {
      if (isDeletingConversation) return;
      setIsConversationPendingDelete(false);
    },
    closeDeleteMessageModal: () => {
      if (deletingMessageId !== null) return;
      setMessagePendingDeleteId(null);
    },
    closeForwardMessageModal: () => {
      setForwardMessageTarget(null);
    },
  };
}
