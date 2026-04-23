'use client';

import React from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';
import { ChatRequestOfferPicker } from './ChatRequestOfferPicker';
import { DesktopEmojiPickerButton } from './DesktopEmojiPickerButton';
import { MessageComposerImagePreview } from './MessageComposerImagePreview';

type ConversationDesktopComposerProps = {
  canCreateRequestFromOffer: boolean;
  isRequestPickerOpen: boolean;
  targetUserId: number | null;
  targetUserSlug: string | null;
  targetUserType: string | null;
  pendingImagePreviewUrl: string | null;
  pendingImageFile: File | null;
  sending: boolean;
  text: string;
  hasContentToSend: boolean;
  isComposerInputDisabled: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  attachImageLabel: string;
  addEmojiLabel: string;
  typePlaceholder: string;
  sendLabel: string;
  sendingLabel: string;
  onToggleRequestPicker: () => void;
  onRemovePendingImage: () => void;
  onFocusCapture: React.FocusEventHandler<HTMLDivElement>;
  onBlurCapture: React.FocusEventHandler<HTMLDivElement>;
  onOpenImagePicker: () => void;
  onTextChange: (value: string) => void;
  onInputKeyDown: React.KeyboardEventHandler<HTMLInputElement>;
  onEmojiSelect: (emoji: string) => void;
  onSend: () => void;
};

export function ConversationDesktopComposer({
  canCreateRequestFromOffer,
  isRequestPickerOpen,
  targetUserId,
  targetUserSlug,
  targetUserType,
  pendingImagePreviewUrl,
  pendingImageFile,
  sending,
  text,
  hasContentToSend,
  isComposerInputDisabled,
  inputRef,
  attachImageLabel,
  addEmojiLabel,
  typePlaceholder,
  sendLabel,
  sendingLabel,
  onToggleRequestPicker,
  onRemovePendingImage,
  onFocusCapture,
  onBlurCapture,
  onOpenImagePicker,
  onTextChange,
  onInputKeyDown,
  onEmojiSelect,
  onSend,
}: ConversationDesktopComposerProps) {
  return (
    <div className="mx-auto mt-2 w-full max-w-[min(100%,56rem)] px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:px-6 lg:px-8 lg:pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]">
      <div className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white/90 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-[#0f0f10]/90">
        {canCreateRequestFromOffer ? (
          <ChatRequestOfferPicker
            open={isRequestPickerOpen}
            disabled={!targetUserId}
            isMobile={false}
            pairWithComposerBelow
            targetUserId={targetUserId}
            targetUserSlug={targetUserSlug}
            targetUserType={targetUserType}
            onToggle={onToggleRequestPicker}
            className=""
          />
        ) : null}
        {pendingImagePreviewUrl && pendingImageFile ? (
          <MessageComposerImagePreview
            previewUrl={pendingImagePreviewUrl}
            fileName={pendingImageFile.name}
            disabled={sending}
            onRemove={onRemovePendingImage}
          />
        ) : null}
        <div
          data-testid="conversation-composer"
          onFocusCapture={onFocusCapture}
          onBlurCapture={onBlurCapture}
          className="flex w-full min-w-0 shrink-0 gap-3 border-t border-gray-200 bg-white/90 px-3 py-3 dark:border-gray-800 dark:bg-[#0f0f10]/90"
        >
          <div className="relative min-w-0 flex-1">
            <input
              ref={inputRef}
              value={text}
              onChange={(event) => onTextChange(event.target.value)}
              disabled={isComposerInputDisabled}
              onKeyDown={onInputKeyDown}
              className="min-w-0 w-full rounded-2xl border border-gray-200 bg-white px-4 py-2 pr-24 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand/40 dark:border-gray-800 dark:bg-black dark:text-gray-100"
              placeholder={typePlaceholder}
            />
            <button
              type="button"
              data-testid="conversation-image-picker-trigger"
              onClick={onOpenImagePicker}
              disabled={sending}
              className="absolute right-10 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-400 dark:hover:bg-[#141416] dark:hover:text-gray-200"
              aria-label={attachImageLabel}
            >
              <PhotoIcon className="h-4 w-4" />
            </button>
            <DesktopEmojiPickerButton
              ariaLabel={addEmojiLabel}
              disabled={sending}
              onSelect={onEmojiSelect}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-[#141416] dark:hover:text-gray-200"
            />
          </div>
          <button
            type="button"
            disabled={sending || !hasContentToSend}
            onClick={onSend}
            className="shrink-0 rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? sendingLabel : sendLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
