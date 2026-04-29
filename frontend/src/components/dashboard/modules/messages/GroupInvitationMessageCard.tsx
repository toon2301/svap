'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { GroupInvitationMessage } from './types';

export function GroupInvitationMessageCard({
  invitation,
  isBusy,
  onRespond,
}: {
  invitation: GroupInvitationMessage;
  isBusy: boolean;
  onRespond: (invitationId: number, action: 'accept' | 'decline') => void;
}) {
  const { t } = useLanguage();
  const invitedName = invitation.invited_user.display_name || t('messages.unknownUser', 'Používateľ');
  const inviterName = invitation.invited_by.display_name || t('messages.unknownUser', 'Používateľ');

  return (
    <div className="mx-auto max-w-sm rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3 text-center shadow-sm dark:border-purple-800/50 dark:bg-purple-900/20">
      <div className="text-sm font-semibold text-purple-900 dark:text-purple-100">
        {t('messages.groupInvitationTitle', 'Pozvánka do skupiny')}
      </div>
      <p className="mt-1 text-sm text-purple-800/90 dark:text-purple-100/90">
        {t('messages.groupInvitationBody', '{inviter} pozýva používateľa {user} do skupiny.')
          .replace('{inviter}', inviterName)
          .replace('{user}', invitedName)}
      </p>
      {invitation.status === 'pending' && invitation.can_respond ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onRespond(invitation.id, 'accept')}
            className="rounded-xl bg-purple-600 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
          >
            {t('messages.acceptInvitation', 'Prijať')}
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onRespond(invitation.id, 'decline')}
            className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-100 disabled:opacity-60 dark:bg-black dark:text-purple-200 dark:hover:bg-purple-950/40"
          >
            {t('messages.declineInvitation', 'Odmietnuť')}
          </button>
        </div>
      ) : (
        <div className="mt-2 text-xs font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-300">
          {t(`messages.groupInvitationStatus.${invitation.status}`, invitation.status)}
        </div>
      )}
    </div>
  );
}
