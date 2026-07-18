'use client';

import { ConversationActionsMenu } from './ConversationActionsMenu';
import { DeleteConversationConfirmModal } from './DeleteConversationConfirmModal';
import { DeleteMessageConfirmModal } from './DeleteMessageConfirmModal';
import { ForwardMessageModal } from './ForwardMessageModal';
import { MessageActionsMenu } from './MessageActionsMenu';
import { MessageImageLightbox } from './MessageImageLightbox';
import type { MessageItem } from './types';

type MessageActionPreview = {
  text: string;
  imageUrl: string | null;
  timestamp: string;
} | null;

type ConversationDetailOverlaysProps = {
  isMobile: boolean;
  conversationId: number;
  imagePreviewAlt: string;
  pinActionLabel: string;
  messageActionsTarget: {
    messageId: number;
    anchorRect: DOMRect | null;
  } | null;
  selectedMessageActionPreview: MessageActionPreview;
  canCopySelectedMessage: boolean;
  canDeleteSelectedMessage: boolean;
  canToggleSelectedPinnedMessage: boolean;
  canForwardSelectedMessage: boolean;
  forwardMessageTarget: MessageItem | null;
  messageImageLightbox: {
    messageId: number;
    imageUrl: string;
  } | null;
  isConversationActionsOpen: boolean;
  conversationActionsAnchorRect: DOMRect | null;
  isConversationPendingDelete: boolean;
  isDeletingConversation: boolean;
  isDeletingMessage: boolean;
  isMessagePendingDelete: boolean;
  onCloseMessageActions: () => void;
  onCopyMessage: () => void;
  onDeleteSelectedMessage: () => void;
  onToggleSelectedMessagePin: () => void;
  onForwardSelectedMessage: () => void;
  onCloseForwardMessageModal: () => void;
  onCloseMessageImageLightbox: () => void;
  onCloseConversationActions: () => void;
  onOpenGroupSettings?: () => void;
  onBlockUser?: () => void;
  onReportUser?: () => void;
  onRequestDeleteConversation: () => void;
  onCloseDeleteConversationModal: () => void;
  onConfirmDeleteConversation: () => void;
  onCloseDeleteMessageModal: () => void;
  onConfirmDeleteMessage: () => void;
};

export function ConversationDetailOverlays({
  isMobile,
  conversationId,
  imagePreviewAlt,
  pinActionLabel,
  messageActionsTarget,
  selectedMessageActionPreview,
  canCopySelectedMessage,
  canDeleteSelectedMessage,
  canToggleSelectedPinnedMessage,
  canForwardSelectedMessage,
  forwardMessageTarget,
  messageImageLightbox,
  isConversationActionsOpen,
  conversationActionsAnchorRect,
  isConversationPendingDelete,
  isDeletingConversation,
  isDeletingMessage,
  isMessagePendingDelete,
  onCloseMessageActions,
  onCopyMessage,
  onDeleteSelectedMessage,
  onToggleSelectedMessagePin,
  onForwardSelectedMessage,
  onCloseForwardMessageModal,
  onCloseMessageImageLightbox,
  onCloseConversationActions,
  onOpenGroupSettings,
  onBlockUser,
  onReportUser,
  onRequestDeleteConversation,
  onCloseDeleteConversationModal,
  onConfirmDeleteConversation,
  onCloseDeleteMessageModal,
  onConfirmDeleteMessage,
}: ConversationDetailOverlaysProps) {
  return (
    <>
      <MessageActionsMenu
        open={messageActionsTarget !== null}
        isMobile={isMobile}
        anchorRect={messageActionsTarget?.anchorRect ?? null}
        preview={selectedMessageActionPreview}
        canCopy={canCopySelectedMessage}
        canDelete={canDeleteSelectedMessage}
        canPin={canToggleSelectedPinnedMessage}
        canForward={canForwardSelectedMessage}
        pinActionLabel={pinActionLabel}
        onClose={onCloseMessageActions}
        onCopy={onCopyMessage}
        onDelete={onDeleteSelectedMessage}
        onPinToggle={onToggleSelectedMessagePin}
        onForward={onForwardSelectedMessage}
      />
      <ForwardMessageModal
        open={forwardMessageTarget !== null}
        conversationId={conversationId}
        message={forwardMessageTarget}
        onClose={onCloseForwardMessageModal}
      />
      <MessageImageLightbox
        open={messageImageLightbox !== null}
        imageUrl={messageImageLightbox?.imageUrl ?? null}
        alt={imagePreviewAlt}
        onClose={onCloseMessageImageLightbox}
      />
      <ConversationActionsMenu
        open={isConversationActionsOpen}
        isMobile={isMobile}
        anchorRect={conversationActionsAnchorRect}
        onClose={onCloseConversationActions}
        onOpenGroupSettings={onOpenGroupSettings}
        onBlockUser={onBlockUser}
        onReportUser={onReportUser}
        onDeleteConversation={onRequestDeleteConversation}
      />
      <DeleteConversationConfirmModal
        open={isConversationPendingDelete}
        isDeleting={isDeletingConversation}
        onClose={onCloseDeleteConversationModal}
        onConfirm={onConfirmDeleteConversation}
      />
      <DeleteMessageConfirmModal
        open={isMessagePendingDelete}
        isDeleting={isDeletingMessage}
        onClose={onCloseDeleteMessageModal}
        onConfirm={onConfirmDeleteMessage}
      />
    </>
  );
}
