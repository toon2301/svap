'use client';

import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { createGroupConversation, getMessagingErrorMessage } from './messagingApi';
import { GroupUserPicker } from './GroupUserPicker';
import type { ConversationListItem, GroupMemberCandidate } from './types';

type CreateGroupConversationModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (conversation: ConversationListItem) => void;
};

export function CreateGroupConversationModal({
  open,
  onClose,
  onCreated,
}: CreateGroupConversationModalProps) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<GroupMemberCandidate[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      toast.error(t('messages.groupNameRequired', 'Zadajte názov skupiny.'));
      return;
    }

    setIsSubmitting(true);
    try {
      const conversation = await createGroupConversation({
        name: cleanName,
        invited_user_ids: selectedMembers.map((member) => member.id),
      });
      onCreated(conversation);
      setName('');
      setSelectedMembers([]);
      onClose();
      toast.success(t('messages.groupCreated', 'Skupina bola vytvorená.'));
    } catch (error) {
      toast.error(
        getMessagingErrorMessage(error, {
          fallback: t('messages.groupCreateFailed', 'Skupinu sa nepodarilo vytvoriť.'),
        }),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/45" role="dialog" aria-modal="true">
      <div className="absolute inset-x-0 bottom-0 flex h-[92dvh] max-h-[92dvh] flex-col overflow-hidden rounded-t-3xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-[#0f0f10] sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:h-auto sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-200 p-5 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('messages.createGroupTitle', 'Nová skupina')}
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {t(
                'messages.createGroupHint',
                'Pozvaní používatelia musia členstvo potvrdiť priamo v správach.',
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-60 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
            aria-label={t('common.close', 'Zavrieť')}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form
          className="flex min-h-0 flex-1 flex-col overflow-hidden sm:max-h-[calc(92dvh-5.5rem)] sm:flex-none"
          onSubmit={handleSubmit}
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
            <label className="block">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {t('messages.groupNameLabel', 'Názov skupiny')}
              </span>
              <input
                value={name}
                maxLength={120}
                onChange={(event) => setName(event.target.value)}
                disabled={isSubmitting}
                className="mt-1 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-200 disabled:opacity-60 dark:border-gray-800 dark:bg-black dark:text-white dark:focus:ring-purple-900/40"
                placeholder={t('messages.groupNamePlaceholder', 'Napr. Projektový tím')}
              />
            </label>

            <div>
              <div className="mb-2 text-sm font-medium text-gray-800 dark:text-gray-200">
                {t('messages.groupMembersToInvite', 'Členovia na pozvanie')}
              </div>
              <GroupUserPicker
                selectedUsers={selectedMembers}
                onSelectedUsersChange={setSelectedMembers}
                maxSelected={49}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="flex shrink-0 gap-3 border-t border-gray-200 bg-white p-5 pt-3 dark:border-gray-800 dark:bg-[#0f0f10]">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-200 disabled:opacity-60 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              {t('common.cancel', 'Zrušiť')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-2xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
            >
              {isSubmitting ? t('common.saving', 'Ukladám...') : t('messages.createGroupAction', 'Vytvoriť')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
