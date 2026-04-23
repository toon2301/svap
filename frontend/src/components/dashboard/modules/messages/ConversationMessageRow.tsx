'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EllipsisHorizontalIcon } from '@heroicons/react/24/outline';
import type { MessageItem } from './types';
import { resolveMessagingImageUrl } from './resolveMessagingImageUrl';
import { formatTime, minuteBucketKey } from './conversationDetailUtils';
import { MOBILE_OWN_MESSAGE_BUBBLE_SUPPRESSION_STYLE } from './conversationDetailConstants';

const DESKTOP_ACTION_TRIGGER_HIDE_DELAY_MS = 150;

type MessageRowRootDivAttributes = React.HTMLAttributes<HTMLDivElement> & {
  'data-message-row-id'?: string;
  'data-testid'?: string;
};

type ConversationMessageRowProps = {
  message: MessageItem;
  prevMessage: MessageItem | null;
  nextMessage: MessageItem | null;
  currentUserId: number;
  isMobile: boolean;
  lastSeenMessageId: number | null;
  targetUserName: string;
  targetUserAvatarUrl: string | null;
  imagePreviewAlt: string;
  deletedMessageText: string;
  openImagePreviewLabel: string;
  openMessageActionsLabel: string;
  seenLabel: string;
  isSelectedForMobileMessageActions: boolean;
  messageInteractionProps?: React.HTMLAttributes<HTMLDivElement>;
  messageRowAttributes?: MessageRowRootDivAttributes;
  suppressNativeMessageContextMenu?: React.MouseEventHandler<HTMLDivElement>;
  onMessageActionTrigger: (messageId: number, element: HTMLElement | null) => void;
  onMessageImageClick: (
    event: React.MouseEvent<HTMLButtonElement>,
    messageId: number,
    imageUrl: string,
  ) => void;
};

export function ConversationMessageRow({
  message,
  prevMessage,
  nextMessage,
  currentUserId,
  isMobile,
  lastSeenMessageId,
  targetUserName,
  targetUserAvatarUrl,
  imagePreviewAlt,
  deletedMessageText,
  openImagePreviewLabel,
  openMessageActionsLabel,
  seenLabel,
  isSelectedForMobileMessageActions,
  messageInteractionProps = {},
  messageRowAttributes = {},
  suppressNativeMessageContextMenu,
  onMessageActionTrigger,
  onMessageImageClick,
}: ConversationMessageRowProps) {
  const hideDesktopActionTriggerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isDesktopActionTriggerVisible, setIsDesktopActionTriggerVisible] = useState(false);
  const mine = message.sender?.id === currentUserId;
  const prevSenderId = prevMessage?.sender?.id ?? null;
  const curSenderId = message.sender?.id ?? null;
  const nextSenderId = nextMessage?.sender?.id ?? null;
  const showTimestamp =
    !prevMessage ||
    prevSenderId !== curSenderId ||
    minuteBucketKey(prevMessage.created_at) !== minuteBucketKey(message.created_at);
  const showSenderAvatar = !mine && (!nextMessage || nextSenderId !== curSenderId);
  const showSeenIndicator = mine && !message.is_deleted && lastSeenMessageId === message.id;
  const senderAvatarUrl = message.sender?.avatar_url || targetUserAvatarUrl;
  const senderDisplayName = (message.sender?.display_name || '').trim() || targetUserName;
  const messageCanDelete = mine && !message.is_deleted;
  const messageCanCopy =
    !message.is_deleted && typeof message.text === 'string' && message.text.length > 0;
  const messageCanPin = !message.is_deleted;
  const messageHasActions = messageCanCopy || messageCanDelete || messageCanPin;
  const showDesktopMessageActionsTrigger = messageHasActions && !isMobile;
  const messageImageUrl =
    !message.is_deleted &&
    typeof message.image_url === 'string' &&
    message.image_url.length > 0
      ? resolveMessagingImageUrl(message.image_url)
      : null;
  const displayText = message.is_deleted ? deletedMessageText : message.text ?? '';
  const suppressMobileMessageSelection = isMobile && messageHasActions;
  const messageTextClassName = `whitespace-pre-wrap break-words${
    suppressMobileMessageSelection ? ' select-none' : ''
  }`;
  const bubbleClassName = [
    'w-fit max-w-full rounded-2xl px-3 py-2 text-sm',
    mine && !message.is_deleted
      ? 'bg-brand text-white'
      : 'border border-gray-200/60 bg-gray-100 text-gray-900 dark:border-gray-800 dark:bg-[#141416] dark:text-gray-100',
  ].join(' ');
  const maybeSuppressedContextMenu = suppressMobileMessageSelection
    ? suppressNativeMessageContextMenu
    : undefined;
  const maybeSuppressedStyle = suppressMobileMessageSelection
    ? MOBILE_OWN_MESSAGE_BUBBLE_SUPPRESSION_STYLE
    : undefined;
  const {
    onMouseEnter: externalOnMouseEnter,
    onMouseLeave: externalOnMouseLeave,
    onFocusCapture: externalOnFocusCapture,
    onBlurCapture: externalOnBlurCapture,
    ...messageRowRestAttributes
  } = messageRowAttributes;

  const clearDesktopActionTriggerHideTimer = useCallback(() => {
    if (!hideDesktopActionTriggerTimerRef.current) return;
    clearTimeout(hideDesktopActionTriggerTimerRef.current);
    hideDesktopActionTriggerTimerRef.current = null;
  }, []);

  const showDesktopActionTrigger = useCallback(() => {
    if (isMobile || !showDesktopMessageActionsTrigger) return;
    clearDesktopActionTriggerHideTimer();
    setIsDesktopActionTriggerVisible(true);
  }, [clearDesktopActionTriggerHideTimer, isMobile, showDesktopMessageActionsTrigger]);

  const scheduleDesktopActionTriggerHide = useCallback(() => {
    if (isMobile || !showDesktopMessageActionsTrigger) return;
    clearDesktopActionTriggerHideTimer();
    hideDesktopActionTriggerTimerRef.current = setTimeout(() => {
      setIsDesktopActionTriggerVisible(false);
      hideDesktopActionTriggerTimerRef.current = null;
    }, DESKTOP_ACTION_TRIGGER_HIDE_DELAY_MS);
  }, [clearDesktopActionTriggerHideTimer, isMobile, showDesktopMessageActionsTrigger]);

  useEffect(() => {
    if (isMobile || showDesktopMessageActionsTrigger) return;
    clearDesktopActionTriggerHideTimer();
    setIsDesktopActionTriggerVisible(false);
  }, [clearDesktopActionTriggerHideTimer, isMobile, showDesktopMessageActionsTrigger]);

  useEffect(() => {
    return () => {
      clearDesktopActionTriggerHideTimer();
    };
  }, [clearDesktopActionTriggerHideTimer]);

  const handleRowMouseEnter = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      externalOnMouseEnter?.(event);
      if (event.defaultPrevented) return;
      showDesktopActionTrigger();
    },
    [externalOnMouseEnter, showDesktopActionTrigger],
  );

  const handleRowMouseLeave = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      externalOnMouseLeave?.(event);
      if (event.defaultPrevented) return;
      scheduleDesktopActionTriggerHide();
    },
    [externalOnMouseLeave, scheduleDesktopActionTriggerHide],
  );

  const handleRowFocusCapture = useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      externalOnFocusCapture?.(event);
      if (event.defaultPrevented) return;
      showDesktopActionTrigger();
    },
    [externalOnFocusCapture, showDesktopActionTrigger],
  );

  const handleRowBlurCapture = useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      externalOnBlurCapture?.(event);
      if (event.defaultPrevented) return;
      const nextFocused = event.relatedTarget as Node | null;
      if (nextFocused && event.currentTarget.contains(nextFocused)) {
        return;
      }
      scheduleDesktopActionTriggerHide();
    },
    [externalOnBlurCapture, scheduleDesktopActionTriggerHide],
  );

  const desktopActionTriggerClassName = `${
    isDesktopActionTriggerVisible ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
  } absolute ${
    mine ? 'right-full mr-2' : 'left-full ml-2'
  } top-1/2 -translate-y-1/2 rounded-full p-1.5 text-gray-400 transition-all duration-150 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand/30 focus-visible:pointer-events-auto focus-visible:opacity-100 dark:text-gray-500 dark:hover:bg-[#141416] dark:hover:text-gray-200`;

  const messageContent = (
    <div
      className={`space-y-2${suppressMobileMessageSelection ? ' select-none' : ''}`}
      style={maybeSuppressedStyle}
      onContextMenu={maybeSuppressedContextMenu}
    >
      {messageImageUrl ? (
        <button
          type="button"
          data-testid={`message-image-trigger-${message.id}`}
          onClick={(event) => onMessageImageClick(event, message.id, messageImageUrl)}
          className="block w-fit max-w-full cursor-zoom-in rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 dark:focus:ring-brand/50"
          aria-label={openImagePreviewLabel}
        >
          <img
            src={messageImageUrl}
            alt={imagePreviewAlt}
            className="block h-auto max-h-[22rem] w-auto max-w-[min(75vw,18rem)] rounded-xl object-contain"
          />
        </button>
      ) : null}
      {displayText ? <div className={messageTextClassName}>{displayText}</div> : null}
    </div>
  );

  if (mine) {
    return (
      <div
        key={message.id}
        className={`flex justify-end ${isMobile ? 'pr-0' : 'pr-1'}`}
        {...messageRowRestAttributes}
        onMouseEnter={handleRowMouseEnter}
        onMouseLeave={handleRowMouseLeave}
        onFocusCapture={handleRowFocusCapture}
        onBlurCapture={handleRowBlurCapture}
      >
        <div
          className={`group flex min-w-0 flex-col items-end ${
            isMobile ? 'max-w-full' : 'max-w-[80%]'
          }${isSelectedForMobileMessageActions ? ' pointer-events-none opacity-0' : ''}`}
        >
          {showTimestamp ? (
            <div
              data-testid={`message-timestamp-${message.id}`}
              className="mb-1 text-right text-[10px] tabular-nums text-gray-500 dark:text-gray-400"
            >
              {formatTime(message.created_at)}
            </div>
          ) : null}
          <div className="relative -ml-2 pl-2">
            {showDesktopMessageActionsTrigger ? (
              <button
                type="button"
                data-testid={`message-actions-trigger-${message.id}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onMessageActionTrigger(message.id, event.currentTarget);
                }}
                className={desktopActionTriggerClassName}
                aria-label={openMessageActionsLabel}
              >
                <EllipsisHorizontalIcon className="h-5 w-5" />
              </button>
            ) : null}
            <div
              data-testid={`message-bubble-${message.id}`}
              className={`${bubbleClassName}${suppressMobileMessageSelection ? ' select-none' : ''}`}
              style={maybeSuppressedStyle}
              onContextMenu={maybeSuppressedContextMenu}
              {...messageInteractionProps}
            >
              {messageContent}
            </div>
          </div>
          {showSeenIndicator ? (
            <div
              data-testid={`message-seen-indicator-${message.id}`}
              className="mt-1 inline-flex self-end text-[11px] items-center gap-1 text-gray-500 dark:text-gray-400"
            >
              <span>{seenLabel}</span>
              <span className="inline-flex h-4 w-4 items-center justify-center overflow-hidden rounded-full bg-purple-100 dark:bg-purple-900/40">
                {targetUserAvatarUrl ? (
                  <img
                    src={targetUserAvatarUrl}
                    alt={targetUserName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-[8px] font-bold text-purple-700 dark:text-purple-300">
                    {(targetUserName || 'U').slice(0, 1).toUpperCase()}
                  </span>
                )}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      key={message.id}
      className={`flex justify-start ${isMobile ? 'pl-0' : 'pl-1'}`}
      {...messageRowRestAttributes}
      onMouseEnter={handleRowMouseEnter}
      onMouseLeave={handleRowMouseLeave}
      onFocusCapture={handleRowFocusCapture}
      onBlurCapture={handleRowBlurCapture}
    >
      <div
        className={`group flex min-w-0 flex-col ${
          isMobile ? 'max-w-full' : 'max-w-[80%]'
        }${isSelectedForMobileMessageActions ? ' pointer-events-none opacity-0' : ''}`}
      >
        {showTimestamp ? (
          <div
            data-testid={`message-timestamp-${message.id}`}
            className={`mb-1 text-left text-[10px] tabular-nums text-gray-500 dark:text-gray-400 ${
              isMobile ? 'pl-7' : 'pl-10'
            }`}
          >
            {formatTime(message.created_at)}
          </div>
        ) : null}
        <div className={`flex min-w-0 items-center ${isMobile ? 'gap-1' : 'gap-2'}`}>
          <div className={`flex shrink-0 justify-start ${isMobile ? 'w-6' : 'w-8'}`}>
            {showSenderAvatar ? (
              <div
                data-testid={`message-avatar-${message.id}`}
                className={`overflow-hidden rounded-full bg-purple-100 dark:bg-purple-900/40 ${
                  isMobile ? 'h-6 w-6' : 'h-8 w-8'
                }`}
              >
                {senderAvatarUrl ? (
                  <img
                    src={senderAvatarUrl}
                    alt={senderDisplayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-[9px] font-bold text-purple-700 dark:text-purple-300">
                    {senderDisplayName.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
            ) : null}
          </div>
          <div className={`min-w-0 flex-1 ${isMobile ? 'max-w-[calc(100%-1.75rem)]' : ''}`}>
            <div className="relative w-fit max-w-full -mr-2 pr-2">
              <div
                data-testid={`message-bubble-${message.id}`}
                className={`${bubbleClassName}${suppressMobileMessageSelection ? ' select-none' : ''}`}
                style={maybeSuppressedStyle}
                onContextMenu={maybeSuppressedContextMenu}
                {...messageInteractionProps}
              >
                {messageContent}
              </div>
              {showDesktopMessageActionsTrigger ? (
                <button
                  type="button"
                  data-testid={`message-actions-trigger-${message.id}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onMessageActionTrigger(message.id, event.currentTarget);
                  }}
                  className={desktopActionTriggerClassName}
                  aria-label={openMessageActionsLabel}
                >
                  <EllipsisHorizontalIcon className="h-5 w-5" />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
