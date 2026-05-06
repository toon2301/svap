'use client';

import { BellIcon, ChatBubbleLeftRightIcon, InboxIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

import { useLanguage } from '@/contexts/LanguageContext';

import type { DashboardNotification } from './types';

interface NotificationItemProps {
  notification: DashboardNotification;
  onNavigate?: (targetUrl: string) => void;
  onMarkRead?: (notification: DashboardNotification) => void;
}

function safeInternalTarget(value: string | null): string | null {
  if (!value) return null;
  return value === '/dashboard' || value.startsWith('/dashboard/') ? value : null;
}

function formatNotificationDate(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getActorName(notification: DashboardNotification, fallback: string): string {
  return (notification.actor?.display_name || '').trim() || fallback;
}

export default function NotificationItem({
  notification,
  onNavigate,
  onMarkRead,
}: NotificationItemProps) {
  const router = useRouter();
  const { locale, t } = useLanguage();
  const actorName = getActorName(notification, t('notifications.unknownActor', 'Používateľ'));
  const targetUrl = safeInternalTarget(notification.target_url);

  const title =
    notification.type === 'group_invitation'
      ? t('notifications.groupInvitationTitle', 'Pozvánka do skupiny')
      : notification.type === 'skill_request_accepted'
        ? notification.title ||
          t('notifications.skillRequestAcceptedTitle', 'Žiadosť prijatá')
        : notification.type === 'skill_request_completion_requested'
          ? notification.title ||
            t(
              'notifications.skillRequestCompletionRequestedTitle',
              'Výmena označená ako dokončená',
            )
        : notification.type === 'skill_request_completed'
          ? notification.title ||
            t(
              'notifications.skillRequestCompletedTitle',
              'Dokončenie výmeny potvrdené',
            )
        : notification.type === 'review_created'
          ? notification.title || t('notifications.reviewCreatedTitle', 'Nová recenzia')
        : notification.type === 'review_reply_created'
          ? t('notifications.reviewReplyCreatedTitle', 'Odpoveď na recenziu')
        : notification.type === 'skill_request'
          ? notification.title || t('notifications.skillRequestFeedTitle', 'Nová žiadosť')
          : notification.title || t('notifications.genericTitle', 'Nové upozornenie');

  const body =
    notification.type === 'group_invitation'
      ? t(
          'notifications.groupInvitationBody',
          '{name} vás pozýva do skupinového chatu.',
        ).replace('{name}', actorName)
      : notification.type === 'skill_request_accepted'
        ? t(
            'notifications.skillRequestAcceptedBody',
            '{name} prijal tvoju žiadosť.',
          ).replace('{name}', actorName)
        : notification.type === 'skill_request_completion_requested'
          ? t(
              'notifications.skillRequestCompletionRequestedBody',
              '{name} označil výmenu ako dokončenú.',
            ).replace('{name}', actorName)
        : notification.type === 'skill_request_completed'
          ? t(
              'notifications.skillRequestCompletedBody',
              '{name} potvrdil dokončenie výmeny.',
            ).replace('{name}', actorName)
        : notification.type === 'review_created'
          ? t(
              'notifications.reviewCreatedBody',
              '{name} napísal recenziu na tvoju kartu.',
            ).replace('{name}', actorName)
        : notification.type === 'review_reply_created'
          ? t(
              'notifications.reviewReplyCreatedBody',
              '{name} odpovedal na tvoju recenziu.',
            ).replace('{name}', actorName)
        : notification.body ||
          t('notifications.genericBody', 'Otvorte upozornenie pre viac detailov.');

  const Icon =
    notification.type === 'group_invitation'
      ? ChatBubbleLeftRightIcon
      : notification.type === 'skill_request' ||
          notification.type === 'skill_request_accepted' ||
          notification.type === 'skill_request_completion_requested' ||
          notification.type === 'skill_request_completed'
        ? InboxIcon
        : BellIcon;

  return (
    <button
      type="button"
      onClick={() => {
        if (!targetUrl) return;
        if (!notification.is_read) {
          onMarkRead?.(notification);
        }
        if (onNavigate) {
          onNavigate(targetUrl);
          return;
        }
        router.push(targetUrl);
      }}
      disabled={!targetUrl}
      className={`w-full rounded-2xl border p-4 text-left transition-colors ${
        notification.is_read
          ? 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-800 dark:bg-black dark:hover:bg-gray-900'
          : 'border-purple-200 bg-purple-50 hover:bg-purple-100 dark:border-purple-800/60 dark:bg-purple-900/20 dark:hover:bg-purple-900/35'
      } ${targetUrl ? '' : 'cursor-default'}`}
    >
      <div className="flex gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            notification.is_read
              ? 'bg-gray-100 text-gray-500 dark:bg-gray-900 dark:text-gray-400'
              : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-200'
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
            {!notification.is_read ? (
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-purple-600" />
            ) : null}
          </div>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{body}</p>
          <div className="mt-2 flex items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span>{formatNotificationDate(notification.created_at, locale)}</span>
            <span>
              {notification.is_read
                ? t('notifications.readLabel', 'Prečítané')
                : t('notifications.unreadLabel', 'Neprečítané')}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
