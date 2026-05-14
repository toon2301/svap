'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMessagesNotifications } from '@/components/dashboard/contexts/RequestsNotificationsContext';
import { useIsMobile } from '@/hooks';
import { ReportUserModal } from '../profile/ReportUserModal';
import { ConversationComposerSection } from './ConversationComposerSection';
import { ConversationDetailHeader } from './ConversationDetailHeader';
import { ConversationDetailOverlays } from './ConversationDetailOverlays';
import { ConversationMessagesPane } from './ConversationMessagesPane';
import { GroupSettingsModal } from './GroupSettingsModal';
import { PinnedMessageBanner } from './PinnedMessageBanner';
import { useConversationActionsController } from './useConversationActionsController';
import { useConversationComposerController } from './useConversationComposerController';
import { useConversationPresenceHeartbeat } from './useConversationPresenceHeartbeat';
import { useConversationRealtimeSync } from './useConversationRealtimeSync';
import { useConversationThreadController } from './useConversationThreadController';
import { requestConversationsRefresh } from './messagesEvents';
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
  const { setActiveConversationId, syncConversationReadState } = useMessagesNotifications();
  useConversationPresenceHeartbeat(conversationId);

  const imagePreviewAlt = t('messages.imagePreview', 'Náhľad obrázka');
  const imageOnlyPreviewLabel = t('messages.imageOnlyPreview', 'Obrázok');

  const thread = useConversationThreadController({
    conversationId,
    currentUserId,
    isMobile,
    t,
    syncConversationReadState,
  });
  const isCurrentUserInvitedGroup = Boolean(
    thread.otherConversation?.is_group &&
    thread.otherConversation.current_user_status === 'invited',
  );
  const isPendingMessageRequest = thread.otherConversation?.request_status === 'pending';
  const isMessageRequestRecipient =
    isPendingMessageRequest && thread.otherConversation?.message_request_role === 'recipient';

  const composer = useConversationComposerController({
    conversationId,
    isMobile,
    loading: thread.loading,
    disabled: isCurrentUserInvitedGroup || isMessageRequestRecipient,
    t,
    refresh: thread.refresh,
  });

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
  const targetUserName =
    (
      (isGroupConversation
        ? thread.otherConversation?.name
        : thread.otherConversation?.other_user?.display_name) || ''
    ).trim() ||
    t(
      isGroupConversation ? 'messages.unknownGroup' : 'messages.unknownUser',
      isGroupConversation ? 'Skupina' : 'Používateľ',
    );
  const targetUserAvatarUrl = isGroupConversation
    ? null
    : thread.otherConversation?.other_user?.avatar_url ?? null;
  const targetUserType = isGroupConversation ? null : thread.otherConversation?.other_user?.user_type ?? null;
  const canCreateRequestFromOffer =
    targetUserId !== null && thread.otherConversation?.has_requestable_offers === true;

  useConversationRealtimeSync({
    conversationId,
    refresh: thread.refresh,
    isMobile,
    openConversationActions: actions.openConversationActions,
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
    const identifier =
      (targetUserSlug || '').trim() ||
      (typeof targetUserId === 'number' ? String(targetUserId) : '');
    if (!identifier || typeof window === 'undefined') return;

    window.dispatchEvent(
      new CustomEvent('goToUserProfile', {
        detail: { identifier },
      }),
    );
  }, [isGroupConversation, targetUserId, targetUserSlug]);

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
      ? t('messages.acceptMessageRequestToReply', 'Prijmite žiadosť, aby ste mohli odpovedať.')
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

      <ConversationComposerSection
        isMobile={isMobile}
        imageInputRef={composer.imageInputRef}
        cameraInputRef={composer.cameraInputRef}
        onPendingImageInputChange={composer.handlePendingImageInputChange}
        mobileComposerProps={mobileComposerProps}
        desktopComposerProps={desktopComposerProps}
      />

      <ConversationDetailOverlays
        isMobile={isMobile}
        imagePreviewAlt={imagePreviewAlt}
        pinActionLabel={
          actions.isSelectedMessagePinned ? unpinMessageActionLabel : pinMessageActionLabel
        }
        messageActionsTarget={actions.messageActionsTarget}
        selectedMessageActionPreview={actions.selectedMessageActionPreview}
        canCopySelectedMessage={actions.canCopySelectedMessage}
        canDeleteSelectedMessage={actions.canDeleteSelectedMessage}
        canToggleSelectedPinnedMessage={actions.canToggleSelectedPinnedMessage}
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
          void thread.refresh({ showError: false, syncConversations: true });
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
