'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';
import { formatNotificationTimestamp } from '@/utils/formatNotificationTimestamp';

import { getTerminationReasonLabel } from '../requests/terminationReasons';
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

function getActorName(notification: DashboardNotification, fallback: string): string {
  return (notification.actor?.display_name || '').trim() || fallback;
}

function getInitials(value: string): string {
  const parts = String(value || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
  }
  if (parts[0]) return parts[0].slice(0, 2).toUpperCase();
  return '?';
}

function highlightActorName(body: string, actorName: string): ReactNode {
  if (!actorName) return body;
  const index = body.indexOf(actorName);
  if (index < 0) return body;
  const before = body.slice(0, index);
  const after = body.slice(index + actorName.length);

  return (
    <>
      {before}
      <span className="font-semibold text-gray-900 dark:text-white">{actorName}</span>
      {after}
    </>
  );
}

function NotificationActorAvatar({
  displayName,
  fallbackLabel,
  avatarUrl,
}: {
  displayName: string;
  fallbackLabel: string;
  avatarUrl?: string | null;
}) {
  const [imageError, setImageError] = useState(false);
  const cleanAvatarUrl = (avatarUrl || '').trim();
  const hasAvatar = Boolean(cleanAvatarUrl && !imageError);
  const label = displayName.trim() || fallbackLabel;

  useEffect(() => {
    setImageError(false);
  }, [cleanAvatarUrl]);

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-200">
      {hasAvatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cleanAvatarUrl}
          alt={label}
          className="h-full w-full object-cover"
          onError={() => setImageError(true)}
          referrerPolicy="no-referrer"
        />
      ) : (
        <span aria-hidden="true" className="text-sm font-semibold">
          {getInitials(displayName)}
        </span>
      )}
    </div>
  );
}

export default function NotificationItem({
  notification,
  onNavigate,
  onMarkRead,
}: NotificationItemProps) {
  const router = useRouter();
  const { locale, t } = useLanguage();
  const actorName = getActorName(notification, t('notifications.unknownActor', 'Používateľ'));
  const actorDisplayName = (notification.actor?.display_name || '').trim();
  const targetUrl = safeInternalTarget(notification.target_url);
  const terminationReasonLabel = getTerminationReasonLabel(
    notification.data?.termination_reason,
    t,
  );

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
        : notification.type === 'skill_request_terminated'
          ? notification.title ||
            t(
              'notifications.skillRequestTerminatedTitle',
              'Výmena skončila',
            )
        : notification.type === 'review_created'
          ? notification.title || t('notifications.reviewCreatedTitle', 'Nová recenzia')
        : notification.type === 'review_reply_created'
          ? t('notifications.reviewReplyCreatedTitle', 'Odpoveď na recenziu')
        : notification.type === 'review_liked'
          ? t('notifications.reviewLikedTitle', 'Páči sa mi tvoja recenzia')
        : notification.type === 'offer_liked'
          ? t('notifications.offerLikedTitle', 'Páči sa mi tvoja ponuka')
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
        : notification.type === 'skill_request_terminated'
          ? t(
              'notifications.skillRequestTerminatedBody',
              '{name} skončil výmenu. Dôvod: {reason}.',
            )
              .replace('{name}', actorName)
              .replace(
                '{reason}',
                terminationReasonLabel || t('notifications.reasonUnknown', 'neuvedený'),
              )
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
        : notification.type === 'review_liked'
          ? t(
              'notifications.reviewLikedBody',
              '{name} označil tvoju recenziu ako páči sa mi.',
            ).replace('{name}', actorName)
        : notification.type === 'offer_liked'
          ? t(
              'notifications.offerLikedBody',
              '{name} označil tvoju ponuku ako páči sa mi.',
            ).replace('{name}', actorName)
        : notification.body ||
          t('notifications.genericBody', 'Otvorte upozornenie pre viac detailov.');
  const highlightedBody = highlightActorName(body, actorName);

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
      className={`w-full rounded-2xl px-2 py-1.5 text-left transition-colors lg:px-3 lg:py-2.5 ${
        notification.is_read
          ? 'bg-white hover:bg-gray-50 dark:bg-black dark:hover:bg-gray-900'
          : 'bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/35'
      } ${targetUrl ? '' : 'cursor-default'}`}
    >
      <div className="flex gap-1.5 lg:gap-2.5">
        <NotificationActorAvatar
          displayName={actorDisplayName}
          fallbackLabel={actorName}
          avatarUrl={notification.actor?.avatar_url}
        />
        <div className="min-w-0 flex-1">
          {notification.is_read ? (
            <span className="sr-only">{title}</span>
          ) : (
            <div className="mb-0.5 flex items-start justify-end gap-2">
              <span className="sr-only">{title}</span>
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-purple-600" aria-hidden />
            </div>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {highlightedBody}
          </p>
          <div className="mt-0.5 text-xs text-gray-500 lg:mt-1.5 dark:text-gray-400">
            <span>
              {formatNotificationTimestamp(notification.created_at, locale, {
                minutes: t('notifications.timeMinutesShort', 'm'),
                hours: t('notifications.timeHoursShort', 'h'),
                days: t('notifications.timeDaysShort', 'd'),
              })}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
