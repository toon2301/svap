'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMessagesNotifications } from '@/components/dashboard/contexts/RequestsNotificationsContext';
import { useIsMobile } from '@/hooks';
import { BlockUserConfirmDialog } from '../profile/BlockUserConfirmDialog';
import { ReportUserModal } from '../profile/ReportUserModal';
import { useBlockUserAction } from '../profile/useBlockUserAction';
import { BlockedConversationNotice } from './BlockedConversationNotice';
import { ConversationComposerSection } from './ConversationComposerSection';
import { ConversationDetailHeader } from './ConversationDetailHeader';
import { messagingUserName } from './messagingUserName';
import { ConversationDetailOverlays } from './ConversationDetailOverlays';
import { ConversationMessagesPane } from './ConversationMessagesPane';
import { GroupSettingsModal } from './GroupSettingsModal';
import { PinnedMessageBanner } from './PinnedMessageBanner';
import { useConversationActionsController } from './useConversationActionsController';
import { useConversationComposerController } from './useConversationComposerController';
import { useConversationPresenceHeartbeat } from './useConversationPresenceHeartbeat';
import { useConversationRealtimeSync } from './useConversationRealtimeSync';
import { useConversationThreadController } from './useConversationThreadController';
import { dispatchConversationUnavailable, requestConversationsRefresh } from './messagesEvents';
import { navigateMessagesUrl } from './messagesRouting';
import { getMessagingErrorMessage, respondToGroupInvitation } from './messagingApi';
import toast from 'react-hot-toast';

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
  const [isReportUserModalOpen, setIsReportUserModalOpen] = useState(false);
  const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);
  const [busyInvitationId, setBusyInvitationId] = useState<number | null>(null);
  const {
    isRealtimeConnected,
    setActiveConversationId,
    syncConversationReadState,
  } = useMessagesNotifications();
  useConversationPresenceHeartbeat(conversationId);

  const handleConversationUnavailable = useCallback((unavailableConversationId: number) => {
    dispatchConversationUnavailable(unavailableConversationId);
    requestConversationsRefresh();
    navigateMessagesUrl(null, { mode: 'replace' });
  }, []);

  const imagePreviewAlt = t('messages.imagePreview', 'Náhľad obrázka');
  const imageOnlyPreviewLabel = t('messages.imageOnlyPreview', 'Obrázok');

  const thread = useConversationThreadController({
    conversationId,
    currentUserId,
    isMobile,
    t,
    syncConversationReadState,
    onConversationUnavailable: handleConversationUnavailable,
  });
  const loadedMessageIdsRef = useRef<Set<number>>(new Set());
  loadedMessageIdsRef.current = new Set(thread.messages.map((item) => item.id));
  /**
   * Checks the latest rendered message set without recreating realtime listeners
   * after every message-list update.
   *
   * @param messageId - Message identifier announced by a realtime event.
   * @returns True when the message is already present in the open thread.
   */
  const hasLoadedMessage = useCallback(
    (messageId: number) => loadedMessageIdsRef.current.has(messageId),
    [],
  );
  const isCurrentUserInvitedGroup = Boolean(
    thread.otherConversation?.is_group &&
    thread.otherConversation.current_user_status === 'invited',
  );
  const isPendingMessageRequest = thread.otherConversation?.request_status === 'pending';
  const isMessageRequestRecipient =
    isPendingMessageRequest && thread.otherConversation?.message_request_role === 'recipient';

  const actions = useConversationActionsController({
    conversationId,
    currentUserId,
    isMobile,
    imageOnlyPreviewLabel,
    messages: thread.messages,
    pinnedMessage: thread.pinnedMessage,
    markMessageDeletedLocally: thread.markMessageDeletedLocally,
    onUpdatePinnedMessage: thread.handleUpdatePinnedMessage,
    syncConversationReadState,
    t,
  });

  const isGroupConversation = Boolean(thread.otherConversation?.is_group);
  const targetUserId = isGroupConversation ? null : thread.otherConversation?.other_user?.id ?? null;
  const targetUserSlug = isGroupConversation ? null : thread.otherConversation?.other_user?.slug ?? null;
  const targetUserName = isGroupConversation
    ? (thread.otherConversation?.name || '').trim() ||
      t('messages.unknownGroup', 'Skupina')
    : messagingUserName(thread.otherConversation?.other_user, t);
  const targetUserAvatarUrl = isGroupConversation
    ? null
    : thread.otherConversation?.other_user?.avatar_url ?? null;
  const targetUserType = isGroupConversation ? null : thread.otherConversation?.other_user?.user_type ?? null;
  const isTargetDeleted =
    !isGroupConversation && thread.otherConversation?.other_user?.is_deleted === true;
  const isBlockedByMe =
    !isGroupConversation && thread.otherConversation?.is_blocked_by_me === true;
  const canCreateRequestFromOffer =
    targetUserId !== null &&
    !isBlockedByMe &&
    thread.otherConversation?.has_requestable_offers === true;
  const closeConversationActions = actions.closeConversationActions;
  const refreshConversation = thread.refresh;

  const handleBlocked = useCallback(() => {
    closeConversationActions();
    void refreshConversation({ showError: false, syncConversations: true }).catch(() => undefined);
    requestConversationsRefresh();
  }, [closeConversationActions, refreshConversation]);

  const blockAction = useBlockUserAction({
    targetUserId: targetUserId ?? 0,
    onBlocked: handleBlocked,
  });

  const composer = useConversationComposerController({
    conversationId,
    isMobile,
    loading: thread.loading,
    disabled: isCurrentUserInvitedGroup || isBlockedByMe || blockAction.isBlocking,
    t,
    refresh: thread.refresh,
  });

  useConversationRealtimeSync({
    conversationId,
    refresh: thread.refresh,
    isRealtimeConnected,
    isMobile,
    openConversationActions: actions.openConversationActions,
    hasLoadedMessage,
    markMessageDeletedLocally: thread.markMessageDeletedLocally,
    setPeerLastReadAt: thread.setPeerLastReadAt,
    setMessageActionsTarget: actions.setMessageActionsTarget,
    setMessagePendingDeleteId: actions.setMessagePendingDeleteId,
    setPinnedMessage: thread.setPinnedMessage,
  });

  const handleMessagesScroll = useCallback(() => {
    thread.handleMessagesScroll();
    if (isMobile && composer.isComposerFocused) {
      composer.shouldPinFocusedViewportToBottomRef.current = thread.isNearMessagesBottom();
    }
  }, [
    composer.isComposerFocused,
    composer.shouldPinFocusedViewportToBottomRef,
    isMobile,
    thread,
  ]);

  const handleScrollToBottomClick = useCallback(() => {
    composer.shouldPinFocusedViewportToBottomRef.current = true;
    thread.handleScrollToBottomClick();
  }, [composer.shouldPinFocusedViewportToBottomRef, thread]);

  const handleGroupInvitationRespond = useCallback(
    async (invitationId: number, action: 'accept' | 'decline') => {
      setBusyInvitationId(invitationId);
      try {
        await respondToGroupInvitation(invitationId, action);
        await thread.refresh({
          showError: false,
          markAsRead: true,
          syncConversations: true,
          scrollBehavior: 'if_near_bottom',
        });
        requestConversationsRefresh();
      } catch (error) {
        toast.error(
          getMessagingErrorMessage(error, {
            fallback: t('messages.groupInvitationResponseFailed', 'Pozvánku sa nepodarilo spracovať.'),
          }),
        );
      } finally {
        setBusyInvitationId(null);
      }
    },
    [t, thread],
  );

  const handleOpenTargetUserProfile = useCallback(() => {
    if (isGroupConversation) {
      setIsGroupSettingsOpen(true);
      return;
    }
    // Anonymizovaný/zmazaný účet nemá profil – nikam nenavigujeme.
    if (isTargetDeleted) return;
    const identifier =
      (targetUserSlug || '').trim() ||
      (typeof targetUserId === 'number' ? String(targetUserId) : '');
    if (!identifier || typeof window === 'undefined') return;

    window.dispatchEvent(
      new CustomEvent('goToUserProfile', {
        detail: { identifier },
      }),
    );
  }, [isGroupConversation, isTargetDeleted, targetUserId, targetUserSlug]);

  useEffect(() => {
    if (!isMobile || !composer.isComposerFocused || thread.loading) return;
    if (!composer.shouldPinFocusedViewportToBottomRef.current) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(thread.scrollMessagesToLatest);
    });
  }, [
    composer.isComposerFocused,
    composer.mobileViewportHeight,
    composer.shouldPinFocusedViewportToBottomRef,
    isMobile,
    thread.loading,
    thread.scrollMessagesToLatest,
  ]);

  useEffect(() => {
    setActiveConversationId(conversationId);
    return () => {
      setActiveConversationId(null);
    };
  }, [conversationId, setActiveConversationId]);

  const containerClassName = `w-full ${className}`;
  const isMobileMessageActionsOpen = isMobile && actions.messageActionsTarget !== null;
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
  const typePlaceholder = isCurrentUserInvitedGroup
    ? t('messages.acceptGroupInviteToReply', 'Prijmite pozvánku, aby ste mohli písať.')
    : isMessageRequestRecipient
      ? t('messages.replyAcceptsMessageRequest', 'Odpoveď automaticky prijme žiadosť.')
    : t('messages.type', 'Napíš správu…');
  const sendLabel = t('messages.send', 'Odoslať');
  const addEmojiLabel = t('messages.addEmoji', 'Pridať emoji');
  const sendingLabel = t('common.sending', 'Odosielam…');

  const mobileComposerProps = {
    isComposerFocused: composer.isComposerFocused,
    canCreateRequestFromOffer,
    isRequestPickerOpen: composer.isRequestPickerOpen,
    targetUserId,
    targetUserSlug,
    targetUserType,
    pendingImagePreviewUrl: composer.pendingImagePreviewUrl,
    pendingImageFile: composer.pendingImageFile,
    sending: composer.sending,
    text: composer.text,
    hasContentToSend: composer.hasContentToSend,
    isComposerInputDisabled: composer.isComposerInputDisabled,
    inputRef: composer.inputRef,
    chooseImageLabel,
    takePhotoLabel,
    typePlaceholder,
    sendLabel,
    onToggleRequestPicker: composer.toggleRequestPicker,
    onRemovePendingImage: composer.clearPendingImage,
    onFocusCapture: composer.handleComposerFocus,
    onBlurCapture: composer.handleComposerBlur,
    onOpenImagePicker: composer.openImagePicker,
    onOpenCameraPicker: composer.openCameraPicker,
    onTextChange: (value: string) => composer.setText(value),
    onInputKeyDown: composer.handleInputKeyDown,
    onSendPointerDown: composer.handleMobileSendPointerDown,
    onSend: () => {
      void composer.handleSend();
    },
  };

  const desktopComposerProps = {
    canCreateRequestFromOffer,
    isRequestPickerOpen: composer.isRequestPickerOpen,
    targetUserId,
    targetUserSlug,
    targetUserType,
    pendingImagePreviewUrl: composer.pendingImagePreviewUrl,
    pendingImageFile: composer.pendingImageFile,
    sending: composer.sending,
    text: composer.text,
    hasContentToSend: composer.hasContentToSend,
    isComposerInputDisabled: composer.isComposerInputDisabled,
    inputRef: composer.inputRef,
    attachImageLabel,
    addEmojiLabel,
    typePlaceholder,
    sendLabel,
    sendingLabel,
    onToggleRequestPicker: composer.toggleRequestPicker,
    onRemovePendingImage: composer.clearPendingImage,
    onFocusCapture: composer.handleComposerFocus,
    onBlurCapture: composer.handleComposerBlur,
    onOpenImagePicker: composer.openImagePicker,
    onTextChange: (value: string) => composer.setText(value),
    onInputKeyDown: composer.handleInputKeyDown,
    onEmojiSelect: composer.handleEmojiSelect,
    onSend: () => {
      void composer.handleSend();
    },
  };

  return (
    <div
      className={`${containerClassName} flex h-full min-h-0 flex-col overflow-hidden overscroll-none`}
    >
      {!isMobile ? (
        <ConversationDetailHeader
          avatarUrl={targetUserAvatarUrl}
          targetUserName={targetUserName}
          targetUserId={targetUserId}
          targetUserSlug={targetUserSlug}
          isGroup={isGroupConversation}
          isTargetDeleted={isTargetDeleted}
          avatarMembers={thread.otherConversation?.avatar_members ?? []}
          openPeerProfileLabel={openPeerProfileLabel}
          openConversationActionsLabel={openConversationActionsLabel}
          onOpenTargetUserProfile={handleOpenTargetUserProfile}
          onOpenConversationActions={actions.openConversationActions}
        />
      ) : null}

      {thread.pinnedMessage ? (
        <PinnedMessageBanner
          message={thread.pinnedMessage}
          isMobile={isMobile}
          label={pinnedMessageLabel}
          imageFallbackLabel={imageOnlyPreviewLabel}
          jumpLabel={jumpToPinnedMessageLabel}
          unpinLabel={unpinPinnedMessageLabel}
          onClick={() => {
            void thread.handlePinnedMessageBannerClick();
          }}
          onUnpin={thread.handleUnpinPinnedMessage}
          isBusy={thread.isUpdatingPinnedMessage || thread.isLocatingPinnedMessage}
        />
      ) : null}

      <ConversationMessagesPane
        loading={thread.loading}
        ordered={thread.ordered}
        currentUserId={currentUserId}
        isMobile={isMobile}
        lastSeenMessageId={thread.lastSeenMessageId}
        targetUserName={targetUserName}
        targetUserAvatarUrl={targetUserAvatarUrl}
        imagePreviewAlt={imagePreviewAlt}
        deletedMessageText={deletedMessageText}
        openImagePreviewLabel={openImagePreviewLabel}
        openMessageActionsLabel={openMessageActionsLabel}
        seenLabel={seenLabel}
        selectedMessageId={isMobileMessageActionsOpen ? actions.messageActionsTarget?.messageId ?? null : null}
        noMessagesYetText={noMessagesYetText}
        showScrollToBottomButton={thread.showScrollToBottomButton}
        scrollToBottomLabel={scrollToBottomLabel}
        messagesScrollRef={thread.messagesScrollRef}
        messagesStackRef={thread.messagesStackRef}
        bottomRef={thread.bottomRef}
        onScroll={handleMessagesScroll}
        getMessageInteractionProps={actions.getMessageInteractionProps}
        suppressNativeMessageContextMenu={actions.suppressNativeMessageContextMenu}
        onMessageActionTrigger={actions.handleMessageActionTrigger}
        onMessageImageClick={actions.handleMessageImageClick}
        onScrollToBottomClick={handleScrollToBottomClick}
        onGroupInvitationRespond={handleGroupInvitationRespond}
        busyInvitationId={busyInvitationId}
      />

      {isBlockedByMe ? (
        <BlockedConversationNotice />
      ) : (
        <ConversationComposerSection
          isMobile={isMobile}
          imageInputRef={composer.imageInputRef}
          cameraInputRef={composer.cameraInputRef}
          onPendingImageInputChange={composer.handlePendingImageInputChange}
          mobileComposerProps={mobileComposerProps}
          desktopComposerProps={desktopComposerProps}
        />
      )}

      <ConversationDetailOverlays
        isMobile={isMobile}
        conversationId={conversationId}
        imagePreviewAlt={imagePreviewAlt}
        pinActionLabel={
          actions.isSelectedMessagePinned ? unpinMessageActionLabel : pinMessageActionLabel
        }
        messageActionsTarget={actions.messageActionsTarget}
        selectedMessageActionPreview={actions.selectedMessageActionPreview}
        canCopySelectedMessage={actions.canCopySelectedMessage}
        canDeleteSelectedMessage={actions.canDeleteSelectedMessage}
        canToggleSelectedPinnedMessage={actions.canToggleSelectedPinnedMessage}
        canForwardSelectedMessage={actions.canForwardSelectedMessage}
        forwardMessageTarget={actions.forwardMessageTarget}
        messageImageLightbox={actions.messageImageLightbox}
        isConversationActionsOpen={actions.isConversationActionsOpen}
        conversationActionsAnchorRect={actions.conversationActionsAnchorRect}
        isConversationPendingDelete={actions.isConversationPendingDelete}
        isDeletingConversation={actions.isDeletingConversation}
        isDeletingMessage={actions.deletingMessageId !== null}
        isMessagePendingDelete={actions.messagePendingDeleteId !== null}
        onCloseMessageActions={actions.closeMessageActions}
        onCopyMessage={() => {
          void actions.handleCopyMessage();
        }}
        onDeleteSelectedMessage={actions.requestDeleteSelectedMessage}
        onToggleSelectedMessagePin={actions.handleToggleSelectedMessagePin}
        onForwardSelectedMessage={actions.handleForwardSelectedMessage}
        onCloseForwardMessageModal={actions.closeForwardMessageModal}
        onCloseMessageImageLightbox={actions.closeMessageImageLightbox}
        onCloseConversationActions={actions.closeConversationActions}
        onOpenGroupSettings={
          isGroupConversation
            ? () => {
                actions.closeConversationActions();
                setIsGroupSettingsOpen(true);
              }
            : undefined
        }
        onBlockUser={
          !isGroupConversation && targetUserId !== null && !isTargetDeleted && !isBlockedByMe
            ? () => {
                actions.closeConversationActions();
                blockAction.openConfirm();
              }
            : undefined
        }
        onReportUser={
          isMobile && !isGroupConversation && targetUserId !== null
            ? () => {
                actions.closeConversationActions();
                setIsReportUserModalOpen(true);
              }
            : undefined
        }
        onRequestDeleteConversation={actions.requestDeleteConversation}
        onCloseDeleteConversationModal={actions.closeDeleteConversationModal}
        onConfirmDeleteConversation={() => {
          void actions.handleDeleteConversation();
        }}
        onCloseDeleteMessageModal={actions.closeDeleteMessageModal}
        onConfirmDeleteMessage={() => {
          void actions.handleDeleteMessage();
        }}
      />
      <BlockUserConfirmDialog
        open={blockAction.isConfirmOpen}
        isBlocking={blockAction.isBlocking}
        onClose={blockAction.closeConfirm}
        onConfirm={() => {
          void blockAction.confirmBlock();
        }}
      />
      {targetUserId !== null ? (
        <ReportUserModal
          open={isReportUserModalOpen}
          userId={targetUserId}
          onClose={() => setIsReportUserModalOpen(false)}
          onSuccess={() => setIsReportUserModalOpen(false)}
        />
      ) : null}
      <GroupSettingsModal
        open={isGroupSettingsOpen}
        conversation={thread.otherConversation}
        onClose={() => setIsGroupSettingsOpen(false)}
        onUpdated={() => {
          void thread.refresh({ showError: false, syncConversations: true }).catch(() => undefined);
          requestConversationsRefresh();
        }}
        onDeleted={() => {
          setIsGroupSettingsOpen(false);
          requestConversationsRefresh();
          navigateMessagesUrl(null);
        }}
      />
    </div>
  );
}
