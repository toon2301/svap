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
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
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
        avatar: avatarFile,
      });
      onCreated(conversation);
      setName('');
      setSelectedMembers([]);
      setAvatarFile(null);
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
      <div className="absolute inset-x-0 bottom-0 max-h-[92dvh] overflow-hidden rounded-t-3xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-[#0f0f10] sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 p-5 dark:border-gray-800">
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

        <form className="max-h-[calc(92dvh-5.5rem)] space-y-4 overflow-y-auto p-5" onSubmit={handleSubmit}>
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

          <label className="block">
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {t('messages.groupAvatarLabel', 'Profilová fotka skupiny')}
            </span>
            <input
              type="file"
              accept="image/*"
              disabled={isSubmitting}
              onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)}
              className="mt-1 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none file:mr-3 file:rounded-xl file:border-0 file:bg-purple-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-purple-700 hover:file:bg-purple-100 disabled:opacity-60 dark:border-gray-800 dark:bg-black dark:text-white dark:file:bg-purple-900/30 dark:file:text-purple-100"
            />
            <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
              {avatarFile
                ? t('messages.groupAvatarSelected', 'Vybrané: {name}').replace('{name}', avatarFile.name)
                : t('messages.groupAvatarHint', 'Voliteľné. Bez fotky sa zobrazia fotky členov.')}
            </span>
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

          <div className="flex gap-3 pt-1">
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
