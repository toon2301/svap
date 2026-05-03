'use client';

import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  deleteGroupConversation,
  getMessagingErrorMessage,
  inviteUserToGroup,
  leaveGroup,
  removeGroupMember,
  updateGroupConversation,
} from './messagingApi';
import { GroupMembersList } from './GroupMembersList';
import { GroupUserPicker } from './GroupUserPicker';
import type { ConversationListItem, GroupMemberCandidate } from './types';

export function GroupSettingsModal({
  open,
  conversation,
  onClose,
  onUpdated,
  onDeleted,
}: {
  open: boolean;
  conversation: ConversationListItem | null;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}) {
  const { t } = useLanguage();
  const [name, setName] = useState(conversation?.name || '');
  const [busy, setBusy] = useState(false);
  const [busyUserId, setBusyUserId] = useState<number | null>(null);
  const [pickerVersion, setPickerVersion] = useState(0);

  React.useEffect(() => {
    setName(conversation?.name || '');
    setPickerVersion((current) => current + 1);
  }, [conversation?.id, conversation?.name]);

  if (!open || !conversation?.is_group) return null;

  const isOwner = conversation.current_user_role === 'owner';

  const handleSave = async () => {
    const cleanName = name.trim();
    if (!cleanName) {
      toast.error(t('messages.groupNameRequired', 'Zadajte názov skupiny.'));
      return;
    }
    setBusy(true);
    try {
      await updateGroupConversation(conversation.id, {
        name: cleanName,
      });
      toast.success(t('messages.groupUpdated', 'Skupina bola upravená.'));
      onUpdated();
    } catch (error) {
      toast.error(
        getMessagingErrorMessage(error, {
          fallback: t('messages.groupUpdateFailed', 'Skupinu sa nepodarilo upraviť.'),
        }),
      );
    } finally {
      setBusy(false);
    }
  };

  const handleInvite = async (user: GroupMemberCandidate) => {
    setBusyUserId(user.id);
    try {
      await inviteUserToGroup(conversation.id, user.id);
      toast.success(t('messages.groupInviteSent', 'Pozvánka bola odoslaná.'));
      setPickerVersion((current) => current + 1);
      onUpdated();
    } catch (error) {
      toast.error(
        getMessagingErrorMessage(error, {
          fallback: t('messages.groupInviteFailed', 'Pozvánku sa nepodarilo odoslať.'),
        }),
      );
    } finally {
      setBusyUserId(null);
    }
  };

  const handleRemove = async (userId: number) => {
    setBusyUserId(userId);
    try {
      await removeGroupMember(conversation.id, userId);
      toast.success(t('messages.memberRemoved', 'Člen bol odobratý.'));
      onUpdated();
    } catch (error) {
      toast.error(
        getMessagingErrorMessage(error, {
          fallback: t('messages.memberRemoveFailed', 'Člena sa nepodarilo odobrať.'),
        }),
      );
    } finally {
      setBusyUserId(null);
    }
  };

  const handleLeave = async () => {
    setBusy(true);
    try {
      await leaveGroup(conversation.id);
      toast.success(t('messages.groupLeft', 'Opustili ste skupinu.'));
      onDeleted();
    } catch (error) {
      toast.error(
        getMessagingErrorMessage(error, {
          fallback: t('messages.groupLeaveFailed', 'Skupinu sa nepodarilo opustiť.'),
        }),
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await deleteGroupConversation(conversation.id);
      toast.success(t('messages.groupDeleted', 'Skupina bola vymazaná.'));
      onDeleted();
    } catch (error) {
      toast.error(
        getMessagingErrorMessage(error, {
          fallback: t('messages.groupDeleteFailed', 'Skupinu sa nepodarilo vymazať.'),
        }),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] bg-black/45" role="dialog" aria-modal="true">
      <div className="absolute inset-x-0 bottom-0 max-h-[92dvh] overflow-hidden rounded-t-3xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-[#0f0f10] sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 p-5 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('messages.groupSettingsTitle', 'Nastavenia skupiny')}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t('messages.groupMembersCount', '{count} členov').replace(
                '{count}',
                String(conversation.participant_count ?? conversation.participants?.length ?? 0),
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
            aria-label={t('common.close', 'Zavrieť')}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(92dvh-7rem)] space-y-5 overflow-y-auto p-5">
          {isOwner ? (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
                {t('messages.groupNameLabel', 'Názov skupiny')}
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={120}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-200 dark:border-gray-800 dark:bg-black dark:text-white dark:focus:ring-purple-900/40"
                />
              </label>

              <button
                type="button"
                onClick={handleSave}
                disabled={busy}
                className="w-full rounded-2xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
              >
                {t('common.save', 'Uložiť')}
              </button>
            </div>
          ) : null}

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {t('messages.inviteMember', 'Pozvať člena')}
            </h3>
            <GroupUserPicker
              key={`${conversation.id}-${pickerVersion}`}
              conversationId={conversation.id}
              disabled={busyUserId !== null}
              placeholder={t('messages.groupInviteSearchPlaceholder', 'Hľadať člena podľa mena...')}
              onPickUser={handleInvite}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {t('messages.groupMembers', 'Členovia')}
            </h3>
            <GroupMembersList
              participants={conversation.participants ?? []}
              canRemove={isOwner}
              busyUserId={busyUserId}
              onRemove={handleRemove}
            />
          </div>

          <div className="space-y-2 border-t border-gray-200 pt-4 dark:border-gray-800">
            {isOwner ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                className="w-full rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {t('messages.deleteGroup', 'Vymazať skupinu')}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLeave}
                disabled={busy}
                className="w-full rounded-2xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-200 disabled:opacity-60 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                {t('messages.leaveGroup', 'Opustiť skupinu')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
