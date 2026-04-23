'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMessagesNotifications } from '@/components/dashboard/contexts/RequestsNotificationsContext';
import { useIsMobile } from '@/hooks';
import toast from 'react-hot-toast';
import type { ConversationListItem, MessageItem, MessageListPage } from './types';
import { copyTextToClipboard } from '@/lib/clipboard';
import {
  deleteMessage,
  getMessagingErrorMessage,
  hideConversation,
  listConversations,
  listMessages,
  markConversationRead,
  sendMessage,
  updateConversationPinnedMessage,
} from './messagingApi';
import { ConversationMessagesSkeleton } from './ConversationMessagesSkeleton';
import { ConversationActionsMenu } from './ConversationActionsMenu';
import { ConversationDesktopComposer } from './ConversationDesktopComposer';
import { ConversationDetailHeader } from './ConversationDetailHeader';
import { ConversationEmptyState } from './ConversationEmptyState';
import { ConversationMessageRow } from './ConversationMessageRow';
import { ConversationMobileComposer } from './ConversationMobileComposer';
import { ConversationScrollToBottomButton } from './ConversationScrollToBottomButton';
import { DeleteConversationConfirmModal } from './DeleteConversationConfirmModal';
import { DeleteMessageConfirmModal } from './DeleteMessageConfirmModal';
import { MessageImageLightbox } from './MessageImageLightbox';
import { MessageActionsMenu } from './MessageActionsMenu';
import { PinnedMessageBanner } from './PinnedMessageBanner';
import { requestConversationsRefresh } from './messagesEvents';
import { navigateMessagesUrl } from './messagesRouting';
import { useMobileViewportHeight } from '../../hooks/useMobileViewportHeight';
import {
  DESKTOP_MESSAGE_SIDE_PADDING_CLASS,
  MOBILE_LATEST_SCROLL_THRESHOLD_PX,
  MOBILE_MESSAGE_SIDE_PADDING_CLASS,
  MOBILE_SCROLL_TO_BOTTOM_BUTTON_THRESHOLD_PX,
} from './conversationDetailConstants';
import { formatTime, pickLatestTimestamp, timestampValue } from './conversationDetailUtils';
import {
  INITIAL_MESSAGES_PAGE_SIZE,
  mergeMessagesNewestFirst,
  OLDER_MESSAGES_SCROLL_THRESHOLD_PX,
} from './messageListUtils';
import { resolveMessagingImageUrl } from './resolveMessagingImageUrl';
import { useConversationPresenceHeartbeat } from './useConversationPresenceHeartbeat';
import { useInitialBottomPin } from './useInitialBottomPin';
import { useConversationPendingImage } from './useConversationPendingImage';
import { useConversationReadState } from './useConversationReadState';
import { useConversationRealtimeSync } from './useConversationRealtimeSync';

export function ConversationDetail({
  conversationId,
  currentUserId,
  className = 'max-w-4xl mx-auto',
}: {
  conversationId: number;
  currentUserId: number;
  className?: string;
}) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const { setActiveConversationId, syncConversationReadState } = useMessagesNotifications();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [nextOlderPage, setNextOlderPage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [isComposerFocused, setIsComposerFocused] = useState(false);
  const [showScrollToBottomButton, setShowScrollToBottomButton] = useState(false);
  const [peerLastReadAt, setPeerLastReadAt] = useState<string | null>(null);
  const [pinnedMessage, setPinnedMessage] = useState<MessageItem | null>(null);
  const [messageActionsTarget, setMessageActionsTarget] = useState<{
    messageId: number;
    anchorRect: DOMRect | null;
  } | null>(null);
  const [conversationActionsAnchorRect, setConversationActionsAnchorRect] = useState<DOMRect | null>(null);
  const [isConversationActionsOpen, setIsConversationActionsOpen] = useState(false);
  const [isConversationPendingDelete, setIsConversationPendingDelete] = useState(false);
  const [isDeletingConversation, setIsDeletingConversation] = useState(false);
  const [messagePendingDeleteId, setMessagePendingDeleteId] = useState<number | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<number | null>(null);
  const [isUpdatingPinnedMessage, setIsUpdatingPinnedMessage] = useState(false);
  const [isLocatingPinnedMessage, setIsLocatingPinnedMessage] = useState(false);
  const [messageImageLightbox, setMessageImageLightbox] = useState<{
    messageId: number;
    imageUrl: string;
  } | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const refreshInFlightRef = useRef<Promise<MessageListPage> | null>(null);
  const pendingScrollRestoreRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);
  const latestKnownMessageIdRef = useRef<number | null>(null);
  const [otherConversation, setOtherConversation] = useState<ConversationListItem | null>(null);
  const [isRequestPickerOpen, setIsRequestPickerOpen] = useState(false);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const messagesStackRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const shouldRestoreFocusRef = useRef(false);
  const pendingLatestScrollAfterRefreshRef = useRef(false);
  const shouldScrollToLatestOnRenderRef = useRef(false);
  const shouldPinFocusedViewportToBottomRef = useRef(false);
  const messageLongPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressedMessageIdRef = useRef<number | null>(null);
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
  useConversationPresenceHeartbeat(conversationId);
  const targetUserId = otherConversation?.other_user?.id ?? null;
  const targetUserSlug = otherConversation?.other_user?.slug ?? null;
  const targetUserName =
    (otherConversation?.other_user?.display_name || '').trim() || t('messages.unknownUser', 'Používateľ');
  const targetUserAvatarUrl = otherConversation?.other_user?.avatar_url ?? null;
  const targetUserType = otherConversation?.other_user?.user_type ?? null;
  const canCreateRequestFromOffer =
    targetUserId !== null && otherConversation?.has_requestable_offers === true;
  const { maybeMarkConversationRead, resetReadStateSession } = useConversationReadState({
    conversationId,
    currentUserId,
    syncConversationReadState,
  });

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

  const markMessageDeletedLocally = useCallback((messageId: number) => {
    setMessages((current) =>
      current.map((item) =>
        item.id === messageId
          ? {
              ...item,
              is_deleted: true,
              text: null,
              image_url: null,
              has_image: false,
            }
          : item,
      ),
    );
    setMessageImageLightbox((current) =>
      current?.messageId === messageId ? null : current,
    );
    setPinnedMessage((current) => (current?.id === messageId ? null : current));
  }, []);

  const openMessageImageLightbox = useCallback((messageId: number, imageUrl: string) => {
    setMessageImageLightbox({ messageId, imageUrl });
  }, []);

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
      // Keep the input focused so iOS does not consume the first tap by closing the keyboard.
      event.preventDefault();
    },
    [],
  );

  const handleOpenTargetUserProfile = useCallback(() => {
    const identifier =
      (targetUserSlug || '').trim() ||
      (typeof targetUserId === 'number' ? String(targetUserId) : '');
    if (!identifier || typeof window === 'undefined') return;

    window.dispatchEvent(
      new CustomEvent('goToUserProfile', {
        detail: { identifier },
      }),
    );
  }, [targetUserId, targetUserSlug]);

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

  const findMessageRowElement = useCallback((messageId: number) => {
    const scrollContainer = messagesScrollRef.current;
    if (!scrollContainer) return null;

    return scrollContainer.querySelector<HTMLElement>(`[data-message-row-id="${messageId}"]`);
  }, []);

  const waitForNextPaint = useCallback(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      }),
    [],
  );

  const handleUpdatePinnedMessage = useCallback(
    async (messageId: number | null) => {
      if (isUpdatingPinnedMessage) return;

      const isUnpin = messageId === null;
      closeMessageActions();
      setIsUpdatingPinnedMessage(true);
      try {
        const result = await updateConversationPinnedMessage(conversationId, messageId);
        setPinnedMessage(result.pinned_message);
      } catch (error) {
        toast.error(
          getMessagingErrorMessage(error, {
            fallback: isUnpin
              ? t('messages.unpinFailed', 'Správu sa nepodarilo odopnúť. Skúste to znova.')
              : t('messages.pinFailed', 'Správu sa nepodarilo pripnúť. Skúste to znova.'),
          }),
        );
      } finally {
        setIsUpdatingPinnedMessage(false);
      }
    },
    [closeMessageActions, conversationId, isUpdatingPinnedMessage, t],
  );

  const handlePinnedMessageBannerClick = useCallback(async () => {
    const messageId = pinnedMessage?.id ?? null;
    if (messageId === null || isLocatingPinnedMessage) return;

    let target = findMessageRowElement(messageId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsLocatingPinnedMessage(true);
    try {
      let pageToLoad = nextOlderPage;

      while (!target && pageToLoad !== null) {
        const page = await listMessages(conversationId, INITIAL_MESSAGES_PAGE_SIZE, pageToLoad);
        pageToLoad = page.nextPage;
        setMessages((current) => mergeMessagesNewestFirst(current, page.results));
        setNextOlderPage(page.nextPage);
        setPeerLastReadAt((current) => pickLatestTimestamp(current, page.peerLastReadAt ?? null));
        setPinnedMessage(page.pinnedMessage);
        await waitForNextPaint();
        target = findMessageRowElement(messageId);
      }

      if (!target) {
        toast.error(
          t(
            'messages.pinnedMessageUnavailable',
            'Pripnutú správu sa nepodarilo nájsť v histórii konverzácie.',
          ),
        );
        return;
      }

      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (error) {
      toast.error(
        getMessagingErrorMessage(error, {
          fallback: t(
            'messages.pinnedMessageUnavailable',
            'Pripnutú správu sa nepodarilo nájsť v histórii konverzácie.',
          ),
        }),
      );
    } finally {
      setIsLocatingPinnedMessage(false);
    }
  }, [
    conversationId,
    findMessageRowElement,
    isLocatingPinnedMessage,
    nextOlderPage,
    pinnedMessage,
    t,
    waitForNextPaint,
  ]);

  const handleUnpinPinnedMessage = useCallback(() => {
    if (!pinnedMessage) return;
    void handleUpdatePinnedMessage(null);
  }, [handleUpdatePinnedMessage, pinnedMessage]);

  const scrollMessagesToLatest = useCallback(() => {
    const scrollContainer = messagesScrollRef.current;
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
      if (isMobile) {
        setShowScrollToBottomButton(false);
      }
      return;
    }

    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
    if (isMobile) {
      setShowScrollToBottomButton(false);
    }
  }, [isMobile]);

  const getMessagesDistanceToBottom = useCallback((scrollContainer: HTMLDivElement | null) => {
    if (!scrollContainer) return null;

    return scrollContainer.scrollHeight - scrollContainer.clientHeight - scrollContainer.scrollTop;
  }, []);

  const updateScrollToBottomButtonVisibility = useCallback(
    (scrollContainer: HTMLDivElement | null) => {
      if (!isMobile || messages.length === 0) {
        setShowScrollToBottomButton(false);
        return false;
      }

      const distanceToBottom = getMessagesDistanceToBottom(scrollContainer);
      const shouldShow =
        distanceToBottom !== null &&
        distanceToBottom > MOBILE_SCROLL_TO_BOTTOM_BUTTON_THRESHOLD_PX;

      setShowScrollToBottomButton((current) => (current === shouldShow ? current : shouldShow));
      return shouldShow;
    },
    [getMessagesDistanceToBottom, isMobile, messages.length],
  );

  const isNearMessagesBottom = useCallback(() => {
    const scrollContainer = messagesScrollRef.current;
    const distanceToBottom = getMessagesDistanceToBottom(scrollContainer);
    if (distanceToBottom === null) return false;

    return distanceToBottom <= MOBILE_LATEST_SCROLL_THRESHOLD_PX;
  }, [getMessagesDistanceToBottom]);

  const ordered = useMemo(() => {
    // API vracia najnovšie prvé – v UI chceme chronologicky
    return [...messages].reverse();
  }, [messages]);
  const hasRenderedCurrentConversationMessages =
    !loading &&
    ordered.length > 0 &&
    ordered[ordered.length - 1]?.conversation === conversationId;

  useInitialBottomPin({
    conversationId,
    enabled: hasRenderedCurrentConversationMessages,
    scrollContainerRef: messagesScrollRef,
    contentRef: messagesStackRef,
    scrollToBottom: scrollMessagesToLatest,
  });

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
  const isSelectedMessagePinned =
    selectedMessageForActions !== null && pinnedMessage?.id === selectedMessageForActions.id;
  const hasSelectedMessageActions =
    canCopySelectedMessage || canDeleteSelectedMessage || canToggleSelectedPinnedMessage;

  const handleToggleSelectedMessagePin = useCallback(() => {
    if (!canToggleSelectedPinnedMessage || !selectedMessageForActions) return;
    void handleUpdatePinnedMessage(isSelectedMessagePinned ? null : selectedMessageForActions.id);
  }, [
    canToggleSelectedPinnedMessage,
    handleUpdatePinnedMessage,
    isSelectedMessagePinned,
    selectedMessageForActions,
  ]);

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

  const lastSeenMessageId = useMemo(() => {
    const peerReadTimestamp = timestampValue(peerLastReadAt);
    if (!Number.isFinite(peerReadTimestamp)) return null;

    for (let index = ordered.length - 1; index >= 0; index -= 1) {
      const item = ordered[index];
      if (item.sender?.id !== currentUserId) continue;
      if (timestampValue(item.created_at) <= peerReadTimestamp) {
        return item.id;
      }
    }

    return null;
  }, [currentUserId, ordered, peerLastReadAt]);

  const showLoadErrorToast = useCallback(
    (error: unknown) => {
      toast.error(
        getMessagingErrorMessage(error, {
          fallback: t('messages.loadFailed', 'Nepodarilo sa načítať správy. Skúste to znova.'),
          rateLimitFallback: t('messages.loadRateLimited', 'Správy načítavate príliš rýchlo. Skúste chvíľu počkať.'),
        }),
      );
    },
    [t],
  );

  const refresh = useCallback(
    async (
      {
        showError = true,
        markAsRead = false,
        syncConversations = false,
        scrollBehavior = 'none',
      }: {
        showError?: boolean;
        markAsRead?: boolean;
        syncConversations?: boolean;
        scrollBehavior?: 'none' | 'force_latest' | 'if_near_bottom';
      } = {},
    ) => {
      if (scrollBehavior === 'force_latest') {
        pendingLatestScrollAfterRefreshRef.current = true;
      } else if (scrollBehavior === 'if_near_bottom') {
        pendingLatestScrollAfterRefreshRef.current =
          pendingLatestScrollAfterRefreshRef.current || !isMobile || isNearMessagesBottom();
      }

      if (refreshInFlightRef.current) {
        try {
          const sharedPage = await refreshInFlightRef.current;
          setPeerLastReadAt((current) =>
            pickLatestTimestamp(current, sharedPage.peerLastReadAt ?? null),
          );
          if (markAsRead) {
            await maybeMarkConversationRead(sharedPage.results);
          }
          return sharedPage.results;
        } catch (error) {
          pendingLatestScrollAfterRefreshRef.current = false;
          if (showError) {
            showLoadErrorToast(error);
          }
          throw error;
        }
      }

      const request = (async () => {
        const page = await listMessages(conversationId, INITIAL_MESSAGES_PAGE_SIZE);
        const newestMessageId = page.results[0]?.id ?? null;
        const previousNewestMessageId = latestKnownMessageIdRef.current;
        const shouldScrollAfterRefresh = pendingLatestScrollAfterRefreshRef.current;
        pendingLatestScrollAfterRefreshRef.current = false;
        latestKnownMessageIdRef.current = newestMessageId;
        shouldScrollToLatestOnRenderRef.current =
          shouldScrollAfterRefresh && newestMessageId !== previousNewestMessageId;
        setMessages((current) => mergeMessagesNewestFirst(current, page.results));
        setNextOlderPage(page.nextPage);
        setPeerLastReadAt((current) => pickLatestTimestamp(current, page.peerLastReadAt ?? null));
        setPinnedMessage(page.pinnedMessage);
        if (
          syncConversations &&
          newestMessageId !== previousNewestMessageId
        ) {
          requestConversationsRefresh();
        }
        return page;
      })();

      refreshInFlightRef.current = request;

      try {
        const page = await request;
        if (markAsRead) {
          await maybeMarkConversationRead(page.results);
        }
        return page.results;
      } catch (error) {
        pendingLatestScrollAfterRefreshRef.current = false;
        if (showError) {
          showLoadErrorToast(error);
        }
        throw error;
      } finally {
        if (refreshInFlightRef.current === request) {
          refreshInFlightRef.current = null;
        }
      }
    },
    [conversationId, isMobile, isNearMessagesBottom, maybeMarkConversationRead, showLoadErrorToast],
  );

  useConversationRealtimeSync({
    conversationId,
    refresh,
    isMobile,
    openConversationActions,
    markMessageDeletedLocally,
    setPeerLastReadAt,
    setMessageActionsTarget,
    setMessagePendingDeleteId,
    setPinnedMessage,
  });

  useEffect(() => {
    let cancelled = false;
    resetReadStateSession();
    latestKnownMessageIdRef.current = null;
    setMessages([]);
    setNextOlderPage(null);
    setPeerLastReadAt(null);
    setPinnedMessage(null);
    setIsRequestPickerOpen(false);
    setIsConversationActionsOpen(false);
    setConversationActionsAnchorRect(null);
    setIsConversationPendingDelete(false);
    setIsDeletingConversation(false);
    setIsUpdatingPinnedMessage(false);
    setIsLocatingPinnedMessage(false);
    setMessageActionsTarget(null);
    setMessagePendingDeleteId(null);
    setDeletingMessageId(null);
    setLoadingOlder(false);
    pendingScrollRestoreRef.current = null;
    clearMessageLongPressTimer();
    void (async () => {
      try {
        setLoading(true);
        // Načítaj other_user z list endpointu (MVP nemá detail endpoint).
        try {
          const list = await listConversations();
          const found = Array.isArray(list) ? list.find((x) => x?.id === conversationId) : null;
          if (!cancelled) setOtherConversation(found ?? null);
        } catch {
          // ignore
        }
        await refresh({ markAsRead: true });
      } catch {
        // refresh already surfaced a user-facing error
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      clearMessageLongPressTimer();
    };
  }, [clearMessageLongPressTimer, conversationId, refresh, resetReadStateSession]);

  useEffect(() => {
    // Pri nových správach jemne doroluj na spodok (ak už je konverzácia otvorená).
    const scrollContainer = messagesScrollRef.current;
    const pendingRestore = pendingScrollRestoreRef.current;

    if (pendingRestore && scrollContainer) {
      pendingScrollRestoreRef.current = null;
      scrollContainer.scrollTop =
        scrollContainer.scrollHeight - pendingRestore.scrollHeight + pendingRestore.scrollTop;
      updateScrollToBottomButtonVisibility(scrollContainer);
      return;
    }

    if (!shouldScrollToLatestOnRenderRef.current) {
      return;
    }

    shouldScrollToLatestOnRenderRef.current = false;
    scrollMessagesToLatest();
  }, [ordered.length, scrollMessagesToLatest, updateScrollToBottomButtonVisibility]);

  useEffect(() => {
    if (!isMobile || !isComposerFocused || loading) return;
    if (!shouldPinFocusedViewportToBottomRef.current) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(scrollMessagesToLatest);
    });
  }, [isComposerFocused, isMobile, loading, mobileViewportHeight, scrollMessagesToLatest]);

  useEffect(() => {
    if (loading) return;
    focusComposer();
  }, [conversationId, focusComposer, loading]);

  useEffect(() => {
    if (sending || loading || !shouldRestoreFocusRef.current) return;
    shouldRestoreFocusRef.current = false;
    focusComposer();
  }, [focusComposer, loading, sending]);

  useEffect(() => {
    setActiveConversationId(conversationId);
    return () => {
      setActiveConversationId(null);
    };
  }, [conversationId, setActiveConversationId]);

  const loadOlderMessages = useCallback(async () => {
    if (loading || loadingOlder || nextOlderPage === null) return;

    const scrollContainer = messagesScrollRef.current;
    if (scrollContainer) {
      pendingScrollRestoreRef.current = {
        scrollHeight: scrollContainer.scrollHeight,
        scrollTop: scrollContainer.scrollTop,
      };
    }

    setLoadingOlder(true);
    try {
      const page = await listMessages(conversationId, INITIAL_MESSAGES_PAGE_SIZE, nextOlderPage);
      setMessages((current) => mergeMessagesNewestFirst(current, page.results));
      setNextOlderPage(page.nextPage);
      setPeerLastReadAt((current) => pickLatestTimestamp(current, page.peerLastReadAt ?? null));
      setPinnedMessage(page.pinnedMessage);
    } catch (error) {
      pendingScrollRestoreRef.current = null;
      showLoadErrorToast(error);
    } finally {
      setLoadingOlder(false);
    }
  }, [conversationId, loading, loadingOlder, nextOlderPage, showLoadErrorToast]);

  const handleMessagesScroll = useCallback(() => {
    const scrollContainer = messagesScrollRef.current;
    if (!scrollContainer) return;
    updateScrollToBottomButtonVisibility(scrollContainer);
    if (isMobile && isComposerFocused) {
      shouldPinFocusedViewportToBottomRef.current = isNearMessagesBottom();
    }
    if (loading || loadingOlder || nextOlderPage === null) return;
    if (scrollContainer.scrollTop > OLDER_MESSAGES_SCROLL_THRESHOLD_PX) return;
    void loadOlderMessages();
  }, [
    isComposerFocused,
    isMobile,
    isNearMessagesBottom,
    loadOlderMessages,
    loading,
    loadingOlder,
    nextOlderPage,
    updateScrollToBottomButtonVisibility,
  ]);

  const handleScrollToBottomClick = useCallback(() => {
    const scrollContainer = messagesScrollRef.current;
    if (scrollContainer && typeof scrollContainer.scrollTo === 'function') {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: 'smooth',
      });
    } else {
      scrollMessagesToLatest();
    }

    shouldPinFocusedViewportToBottomRef.current = true;
    setShowScrollToBottomButton(false);
  }, [scrollMessagesToLatest]);

  const handleSend = async () => {
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
      toast.error(
        getMessagingErrorMessage(error, {
          fallback: t('messages.sendFailed', 'Správu sa nepodarilo odoslať. Skúste to znova.'),
          rateLimitFallback: t('messages.sendRateLimited', 'Posielate príliš rýchlo. Skúste chvíľu počkať.'),
          unavailableFallback: t('messages.sendUnavailable', 'Konverzácia už nie je dostupná.'),
        }),
      );
    } finally {
      setSending(false);
    }
  };

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
    [
      clearMessageLongPressTimer,
      isMobile,
      openMessageActions,
    ],
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

  const containerClassName = `w-full ${className}`;

  const hasTextToSend = text.trim().length > 0;
  const hasContentToSend = hasTextToSend || pendingImageFile !== null;
  const isComposerInputDisabled = sending && (!isMobile || pendingImageFile !== null);
  const isMobileMessageActionsOpen = isMobile && messageActionsTarget !== null;
  const imagePreviewAlt = t('messages.imagePreview', 'Náhľad obrázka');
  const imageOnlyPreviewLabel = t('messages.imageOnlyPreview', 'Obrázok');
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
  const openPeerProfileLabel = t('messages.openPeerProfile', 'Otvoriť profil používateľa');
  const openConversationActionsLabel = t(
    'messages.openConversationActions',
    'Otvoriť možnosti konverzácie',
  );
  const pinMessageActionLabel = t('messages.pinAction', 'Pripnúť správu');
  const unpinMessageActionLabel = t('messages.unpinAction', 'Odopnúť správu');
  const pinnedMessageLabel = t('messages.pinnedMessageLabel', 'Pripnutá správa');
  const jumpToPinnedMessageLabel = t(
    'messages.jumpToPinnedMessage',
    'Prejsť na pripnutú správu',
  );
  const unpinPinnedMessageLabel = t(
    'messages.unpinPinnedMessage',
    'Odopnúť pripnutú správu',
  );
  const noMessagesYetText = t('messages.noMessagesYet', 'Zatiaľ bez správ');
  const deletedMessageText = t('messages.deleted', 'Správa bola vymazaná');
  const openImagePreviewLabel = t(
    'messages.openImagePreview',
    'Otvoriť obrázok na celú obrazovku',
  );
  const openMessageActionsLabel = t(
    'messages.openMessageActions',
    'Otvoriť možnosti správy',
  );
  const seenLabel = t('messages.seen', 'Prečítané');
  const scrollToBottomLabel = t('messages.scrollToBottom', 'Prejsť na najnovšie správy');
  const chooseImageLabel = t('messages.chooseImage', 'Vybrať obrázok');
  const takePhotoLabel = t('messages.takePhoto', 'Odfotiť');
  const attachImageLabel = t('messages.attachImage', 'Priložiť obrázok');
  const typePlaceholder = t('messages.type', 'Napíš správu…');
  const sendLabel = t('messages.send', 'Odoslať');
  const addEmojiLabel = t('messages.addEmoji', 'Pridať emoji');
  const sendingLabel = t('common.sending', 'Odosielam…');

  return (
    <div
      className={`${containerClassName} flex h-full min-h-0 flex-col overflow-hidden overscroll-none`}
    >
      {!isMobile ? (
        <ConversationDetailHeader
          avatarUrl={otherConversation?.other_user?.avatar_url ?? null}
          targetUserName={targetUserName}
          targetUserId={targetUserId}
          targetUserSlug={targetUserSlug}
          openPeerProfileLabel={openPeerProfileLabel}
          openConversationActionsLabel={openConversationActionsLabel}
          onOpenTargetUserProfile={handleOpenTargetUserProfile}
          onOpenConversationActions={openConversationActions}
        />
      ) : null}

      {pinnedMessage ? (
        <PinnedMessageBanner
          message={pinnedMessage}
          isMobile={isMobile}
          label={pinnedMessageLabel}
          imageFallbackLabel={imageOnlyPreviewLabel}
          jumpLabel={jumpToPinnedMessageLabel}
          unpinLabel={unpinPinnedMessageLabel}
          onClick={() => {
            void handlePinnedMessageBannerClick();
          }}
          onUnpin={handleUnpinPinnedMessage}
          isBusy={isUpdatingPinnedMessage || isLocatingPinnedMessage}
        />
      ) : null}

      <div className="relative flex-1 min-h-0">
        <div
          ref={messagesScrollRef}
          data-testid="conversation-messages-scroll"
          onScroll={handleMessagesScroll}
          className={`h-full min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y elegant-scrollbar ${
            isMobile ? MOBILE_MESSAGE_SIDE_PADDING_CLASS : DESKTOP_MESSAGE_SIDE_PADDING_CLASS
          }`}
        >
          {loading ? (
            <ConversationMessagesSkeleton isMobile={isMobile} />
          ) : ordered.length === 0 ? (
            <ConversationEmptyState text={noMessagesYetText} />
          ) : (
            <div
              ref={messagesStackRef}
              data-testid="conversation-messages-stack"
              className="flex min-h-full flex-col justify-end"
            >
              <div className="space-y-2">
                {ordered.map((message, index) => (
                  <ConversationMessageRow
                    key={message.id}
                    message={message}
                    prevMessage={index > 0 ? ordered[index - 1] : null}
                    nextMessage={index < ordered.length - 1 ? ordered[index + 1] : null}
                    currentUserId={currentUserId}
                    isMobile={isMobile}
                    lastSeenMessageId={lastSeenMessageId}
                    targetUserName={targetUserName}
                    targetUserAvatarUrl={targetUserAvatarUrl}
                    imagePreviewAlt={imagePreviewAlt}
                    deletedMessageText={deletedMessageText}
                    openImagePreviewLabel={openImagePreviewLabel}
                    openMessageActionsLabel={openMessageActionsLabel}
                    seenLabel={seenLabel}
                    isSelectedForMobileMessageActions={
                      isMobileMessageActionsOpen && messageActionsTarget?.messageId === message.id
                    }
                    messageRowAttributes={{
                      'data-message-row-id': String(message.id),
                      'data-testid': `message-row-${message.id}`,
                    }}
                    messageInteractionProps={getMessageInteractionProps(
                      message.id,
                      !message.is_deleted,
                    )}
                    suppressNativeMessageContextMenu={suppressNativeMessageContextMenu}
                    onMessageActionTrigger={handleMessageActionTrigger}
                    onMessageImageClick={handleMessageImageClick}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {isMobile && showScrollToBottomButton ? (
          <ConversationScrollToBottomButton
            ariaLabel={scrollToBottomLabel}
            onClick={handleScrollToBottomClick}
          />
        ) : null}
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        data-testid="conversation-image-picker-input"
        className="hidden"
        onChange={handlePendingImageInputChange}
      />
      {isMobile ? (
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          data-testid="conversation-camera-picker-input"
          className="hidden"
          onChange={handlePendingImageInputChange}
        />
      ) : null}

      {isMobile ? (
        <ConversationMobileComposer
          isComposerFocused={isComposerFocused}
          canCreateRequestFromOffer={canCreateRequestFromOffer}
          isRequestPickerOpen={isRequestPickerOpen}
          targetUserId={targetUserId}
          targetUserSlug={targetUserSlug}
          targetUserType={targetUserType}
          pendingImagePreviewUrl={pendingImagePreviewUrl}
          pendingImageFile={pendingImageFile}
          sending={sending}
          text={text}
          hasContentToSend={hasContentToSend}
          isComposerInputDisabled={isComposerInputDisabled}
          inputRef={inputRef}
          chooseImageLabel={chooseImageLabel}
          takePhotoLabel={takePhotoLabel}
          typePlaceholder={typePlaceholder}
          sendLabel={sendLabel}
          onToggleRequestPicker={() => setIsRequestPickerOpen((prev) => !prev)}
          onRemovePendingImage={clearPendingImage}
          onFocusCapture={handleComposerFocus}
          onBlurCapture={handleComposerBlur}
          onOpenImagePicker={openImagePicker}
          onOpenCameraPicker={openCameraPicker}
          onTextChange={setText}
          onInputKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void handleSend();
            }
          }}
          onSendPointerDown={handleMobileSendPointerDown}
          onSend={() => {
            void handleSend();
          }}
        />
      ) : (
        <ConversationDesktopComposer
          canCreateRequestFromOffer={canCreateRequestFromOffer}
          isRequestPickerOpen={isRequestPickerOpen}
          targetUserId={targetUserId}
          targetUserSlug={targetUserSlug}
          targetUserType={targetUserType}
          pendingImagePreviewUrl={pendingImagePreviewUrl}
          pendingImageFile={pendingImageFile}
          sending={sending}
          text={text}
          hasContentToSend={hasContentToSend}
          isComposerInputDisabled={isComposerInputDisabled}
          inputRef={inputRef}
          attachImageLabel={attachImageLabel}
          addEmojiLabel={addEmojiLabel}
          typePlaceholder={typePlaceholder}
          sendLabel={sendLabel}
          sendingLabel={sendingLabel}
          onToggleRequestPicker={() => setIsRequestPickerOpen((prev) => !prev)}
          onRemovePendingImage={clearPendingImage}
          onFocusCapture={handleComposerFocus}
          onBlurCapture={handleComposerBlur}
          onOpenImagePicker={openImagePicker}
          onTextChange={setText}
          onInputKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void handleSend();
            }
          }}
          onEmojiSelect={handleEmojiSelect}
          onSend={() => {
            void handleSend();
          }}
        />
      )}

      <MessageActionsMenu
        open={messageActionsTarget !== null}
        isMobile={isMobile}
        anchorRect={messageActionsTarget?.anchorRect ?? null}
        preview={selectedMessageActionPreview}
        canCopy={canCopySelectedMessage}
        canDelete={canDeleteSelectedMessage}
        canPin={canToggleSelectedPinnedMessage}
        pinActionLabel={isSelectedMessagePinned ? unpinMessageActionLabel : pinMessageActionLabel}
        onClose={closeMessageActions}
        onCopy={() => {
          void handleCopyMessage();
        }}
        onDelete={() => {
          if (messageActionsTarget === null) return;
          setMessagePendingDeleteId(messageActionsTarget.messageId);
          setMessageActionsTarget(null);
        }}
        onPinToggle={handleToggleSelectedMessagePin}
      />
      <MessageImageLightbox
        open={messageImageLightbox !== null}
        imageUrl={messageImageLightbox?.imageUrl ?? null}
        alt={imagePreviewAlt}
        onClose={closeMessageImageLightbox}
      />
      <ConversationActionsMenu
        open={isConversationActionsOpen}
        isMobile={isMobile}
        anchorRect={conversationActionsAnchorRect}
        onClose={closeConversationActions}
        onDeleteConversation={() => {
          closeConversationActions();
          setIsConversationPendingDelete(true);
        }}
      />
      <DeleteConversationConfirmModal
        open={isConversationPendingDelete}
        isDeleting={isDeletingConversation}
        onClose={() => {
          if (isDeletingConversation) return;
          setIsConversationPendingDelete(false);
        }}
        onConfirm={() => void handleDeleteConversation()}
      />
      <DeleteMessageConfirmModal
        open={messagePendingDeleteId !== null}
        isDeleting={deletingMessageId !== null}
        onClose={() => {
          if (deletingMessageId !== null) return;
          setMessagePendingDeleteId(null);
        }}
        onConfirm={() => void handleDeleteMessage()}
      />
    </div>
  );
}

