'use client';

import React from 'react';
import { CameraIcon, PaperAirplaneIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { ChatRequestOfferPicker } from './ChatRequestOfferPicker';
import { MessageComposerImagePreview } from './MessageComposerImagePreview';

type ConversationMobileComposerProps = {
  isComposerFocused: boolean;
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
  chooseImageLabel: string;
  takePhotoLabel: string;
  typePlaceholder: string;
  sendLabel: string;
  onToggleRequestPicker: () => void;
  onRemovePendingImage: () => void;
  onFocusCapture: React.FocusEventHandler<HTMLDivElement>;
  onBlurCapture: React.FocusEventHandler<HTMLDivElement>;
  onOpenImagePicker: () => void;
  onOpenCameraPicker: () => void;
  onTextChange: (value: string) => void;
  onInputKeyDown: React.KeyboardEventHandler<HTMLInputElement>;
  onSendPointerDown: React.PointerEventHandler<HTMLButtonElement>;
  onSend: () => void;
};

export function ConversationMobileComposer({
  isComposerFocused,
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
  chooseImageLabel,
  takePhotoLabel,
  typePlaceholder,
  sendLabel,
  onToggleRequestPicker,
  onRemovePendingImage,
  onFocusCapture,
  onBlurCapture,
  onOpenImagePicker,
  onOpenCameraPicker,
  onTextChange,
  onInputKeyDown,
  onSendPointerDown,
  onSend,
}: ConversationMobileComposerProps) {
  return (
    <div
      data-testid="conversation-mobile-composer-stack"
      className={`mt-1 w-full shrink-0 pl-[max(0.75rem,env(safe-area-inset-left,0px))] pr-[max(0.75rem,env(safe-area-inset-right,0px))] ${
        isComposerFocused
          ? 'pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]'
          : 'pb-[max(1.75rem,env(safe-area-inset-bottom,0px))]'
      }`}
    >
      <div className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white/90 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-[#0f0f10]/90">
        {canCreateRequestFromOffer ? (
          <ChatRequestOfferPicker
            open={isRequestPickerOpen}
            disabled={!targetUserId}
            isMobile
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
          className="relative z-10 flex w-full min-w-0 shrink-0 items-center gap-2 overflow-x-hidden border-t border-gray-200 bg-white/90 px-2.5 py-2.5 dark:border-gray-800 dark:bg-[#0f0f10]/90"
        >
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              data-testid="conversation-image-picker-trigger"
              onClick={onOpenImagePicker}
              disabled={sending}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-400 dark:hover:bg-[#141416] dark:hover:text-gray-200"
              aria-label={chooseImageLabel}
            >
              <PhotoIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              data-testid="conversation-camera-picker-trigger"
              onClick={onOpenCameraPicker}
              disabled={sending}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-400 dark:hover:bg-[#141416] dark:hover:text-gray-200"
              aria-label={takePhotoLabel}
            >
              <CameraIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="relative flex min-h-0 min-w-0 flex-1 items-center overflow-hidden rounded-2xl border border-gray-200 bg-white px-2 dark:border-gray-800 dark:bg-black">
            <input
              ref={inputRef}
              value={text}
              onChange={(event) => onTextChange(event.target.value)}
              disabled={isComposerInputDisabled}
              onKeyDown={onInputKeyDown}
              className={`min-w-0 w-full border-0 bg-transparent py-2 text-sm text-gray-900 focus:outline-none dark:text-gray-100 ${
                hasContentToSend
                  ? 'overflow-x-hidden text-ellipsis whitespace-nowrap pl-2 pr-12'
                  : 'overflow-x-hidden text-ellipsis whitespace-nowrap px-2'
              }`}
              placeholder={typePlaceholder}
            />
            {hasContentToSend ? (
              <button
                type="button"
                disabled={sending}
                onPointerDown={onSendPointerDown}
                onClick={onSend}
                className="absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-brand text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
                aria-label={sendLabel}
              >
                <PaperAirplaneIcon className="h-4 w-4 -rotate-45" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
