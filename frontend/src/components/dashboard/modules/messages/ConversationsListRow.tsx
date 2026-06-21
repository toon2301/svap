'use client';

import React from 'react';
import { Bars3Icon } from '@heroicons/react/24/outline';
import type { ConversationListItem } from './types';
import { GroupConversationAvatar } from './GroupConversationAvatar';
import { MessagePinIcon } from './MessagePinIcon';
import { messagingUserName } from './messagingUserName';

export function ConversationsListRow({
  conversation,
  currentUserId,
  selectedConversationId,
  isCompact,
  isRail,
  showHoverAction,
  onOpenConversation,
  onOpenActions,
  t,
}: {
  conversation: ConversationListItem;
  currentUserId: number;
  selectedConversationId: number | null;
  isCompact: boolean;
  isRail: boolean;
  showHoverAction: boolean;
  onOpenConversation: (conversationId: number) => void;
  onOpenActions: (conversationId: number, anchorRect: DOMRect) => void;
  t: (key: string, fallback: string) => string;
}) {
  const other = conversation.other_user;
  const isGroup = Boolean(conversation.is_group);
  const title = isGroup
    ? (conversation.name || t('messages.unknownGroup', 'Skupina'))
    : messagingUserName(other, t);
  const isMine =
    typeof conversation.last_message_sender_id === 'number' &&
    conversation.last_message_sender_id === currentUserId;
  const deletedPreview = isMine
    ? t('messages.deletedPreviewSelf', 'Vymazali ste správu')
    : t('messages.deletedPreviewOther', '{name} vymazal/a správu').replace('{name}', title);
  const imageOnlyPreview = t('messages.imageOnlyPreview', 'Obrázok');
  const groupInvitationPreview = t('messages.groupInvitationPreview', 'Pozvánka do skupiny');
  const profileSharePreview = t('messages.profileSharePreview', 'Zdieľaný profil');
  const offerSharePreview = t('messages.offerSharePreview', 'Zdieľaná ponuka');
  const rawPreview =
    (conversation.last_message_type === 'group_invitation' ? groupInvitationPreview : null) ||
    (conversation.last_message_type === 'profile_share' ? profileSharePreview : null) ||
    (conversation.last_message_type === 'offer_share' ? offerSharePreview : null) ||
    conversation.last_message_preview ||
    (conversation.last_message_has_image ? imageOnlyPreview : null) ||
    (conversation.last_message_at
      ? t('messages.noPreview', 'Message')
      : t('messages.noMessagesYet', 'No messages yet'));
  const preview = conversation.last_message_is_deleted
    ? deletedPreview
    : isMine
      ? `Ty: ${rawPreview}`
      : rawPreview;
  const isSelected = selectedConversationId === conversation.id;
  const unreadCount =
    typeof conversation.unread_count === 'number'
      ? conversation.unread_count
      : conversation.has_unread
        ? 1
        : 0;
  const isUnread = unreadCount > 0 && !isSelected && !isMine;
  const isPinned = Boolean(conversation.is_pinned);

  return (
    <div
      className={`group relative flex w-full items-center gap-3 text-left transition-colors ${
        isRail
          ? `rounded-2xl border ${
              isSelected
                ? 'border-purple-300 bg-purple-50/90 text-purple-900 dark:border-purple-700 dark:bg-purple-900/25 dark:text-white'
                : 'border-transparent bg-transparent text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-900 dark:hover:text-white'
            }`
          : `${
              isSelected
                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/25 dark:text-white'
                : 'bg-transparent text-gray-700 dark:text-gray-300'
            }`
      } ${isCompact ? 'px-3 py-2.5' : 'px-4 py-3.5'}`}
    >
      <button
        type="button"
        onClick={() => onOpenConversation(conversation.id)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <div
          className={`flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full ${
            isCompact ? 'h-9 w-9' : 'h-11 w-11'
          } ${
            isSelected
              ? 'bg-purple-200 dark:bg-purple-800/70'
              : 'bg-purple-100 dark:bg-purple-900/40'
          }`}
        >
          {isGroup ? (
            <GroupConversationAvatar
              name={title}
              members={conversation.avatar_members}
              size={isCompact ? 'sm' : 'lg'}
            />
          ) : other?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={other.avatar_url} alt={title} className="h-full w-full object-cover" />
          ) : (
            <span
              className={`font-bold ${
                isCompact ? 'text-[11px]' : 'text-sm'
              } ${
                isSelected
                  ? 'text-purple-800 dark:text-purple-100'
                  : 'text-purple-700 dark:text-purple-300'
              }`}
            >
              {(title || 'U').slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>

        <div
          className={`min-w-0 flex-1 transition-[padding-right] duration-150 ${
            showHoverAction ? 'group-focus-visible:pr-7 group-hover:pr-7' : ''
          }`}
        >
          <div className="flex min-w-0 items-center gap-2">
            <span
              data-testid={showHoverAction ? `conversation-title-${conversation.id}` : undefined}
              className={`truncate ${
                isCompact ? 'text-xs' : 'text-base'
              } font-semibold ${
                isSelected ? 'text-purple-900 dark:text-white' : 'text-gray-900 dark:text-white'
              }`}
            >
              {title}
            </span>
            {isPinned ? (
              <span
                className={`inline-flex flex-shrink-0 items-center text-purple-600 dark:text-purple-300 ${
                  isCompact ? 'h-4 w-4' : 'h-[18px] w-[18px]'
                }`}
                data-testid={`conversation-pinned-indicator-${conversation.id}`}
                title={t('messages.pinnedConversationLabel', 'Pripnutá konverzácia')}
              >
                <MessagePinIcon className={isCompact ? 'h-4 w-4' : 'h-[18px] w-[18px]'} />
              </span>
            ) : null}
            {isUnread ? (
              <span
                className={`inline-flex flex-shrink-0 items-center justify-center rounded-full bg-purple-600 font-bold text-white ${
                  isCompact
                    ? 'h-5 min-w-5 px-1.5 text-[10px]'
                    : 'h-[22px] min-w-[22px] px-1.5 text-[11px]'
                }`}
                aria-label={`${unreadCount} unread messages`}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            ) : null}
          </div>
          <div
            className={`truncate ${
              isCompact ? 'text-[11px]' : 'text-sm'
            } ${
              isSelected
                ? 'text-purple-700/90 dark:text-purple-200/90'
                : 'text-gray-600 dark:text-gray-400'
            } ${isUnread ? 'font-extrabold text-gray-900 dark:text-white' : 'font-normal'}`}
          >
            {preview}
          </div>
        </div>
      </button>

      {showHoverAction ? (
        <button
          type="button"
          data-testid={`conversation-hover-action-${conversation.id}`}
          onClick={(event) => {
            event.stopPropagation();
            onOpenActions(conversation.id, event.currentTarget.getBoundingClientRect());
          }}
          aria-label={t('messages.openConversationActions', 'Otvoriť možnosti konverzácie')}
          className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-150 group-hover:opacity-100 ${
            isSelected ? 'text-purple-700 dark:text-purple-200' : 'text-gray-400 dark:text-gray-500'
          } group-focus-within:pointer-events-auto group-hover:pointer-events-auto focus:pointer-events-auto focus:opacity-100`}
        >
          <Bars3Icon className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
