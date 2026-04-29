'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { GroupParticipantBrief } from './types';

export function GroupMembersList({
  participants = [],
  canRemove,
  busyUserId,
  onRemove,
}: {
  participants?: GroupParticipantBrief[];
  canRemove: boolean;
  busyUserId: number | null;
  onRemove: (userId: number) => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="space-y-2">
      {participants.map((participant) => {
        const isOwner = participant.role === 'owner';
        const isInvited = participant.status === 'invited';
        return (
          <div
            key={participant.id}
            className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-black"
          >
            <div className="h-9 w-9 overflow-hidden rounded-full bg-purple-100 dark:bg-purple-900/40">
              {participant.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={participant.avatar_url} alt={participant.display_name} className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-xs font-bold text-purple-700 dark:text-purple-300">
                  {(participant.display_name || 'U').slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                {participant.display_name || t('messages.unknownUser', 'Používateľ')}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {isOwner
                  ? t('messages.groupOwner', 'Zakladateľ')
                  : isInvited
                    ? t('messages.groupInvited', 'Pozvaný')
                    : t('messages.groupMember', 'Člen')}
              </div>
            </div>
            {canRemove && !isOwner ? (
              <button
                type="button"
                onClick={() => onRemove(participant.id)}
                disabled={busyUserId === participant.id}
                className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50"
              >
                {t('messages.removeMember', 'Odobrať')}
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
