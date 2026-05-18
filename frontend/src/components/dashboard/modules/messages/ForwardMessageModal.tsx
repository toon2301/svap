'use client';

import React, { useEffect, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { forwardMessage, getMessagingErrorMessage } from './messagingApi';
import { requestConversationsRefresh, suppressPassiveMessagingRefresh } from './messagesEvents';
import { GroupUserPicker } from './GroupUserPicker';
import { resolveMessagingImageUrl } from './resolveMessagingImageUrl';
import type { GroupMemberCandidate, MessageItem } from './types';

type ForwardMessageModalProps = {
  open: boolean;
  conversationId: number;
  message: MessageItem | null;
  onClose: () => void;
};

const FORWARD_PASSIVE_REFRESH_SUPPRESSION_MS = 2_000;

function messagePreviewText(message: MessageItem | null): string {
  if (!message || message.is_deleted) return '';
  return (message.text || '').trim();
}

export function ForwardMessageModal({
  open,
  conversationId,
  message,
  onClose,
}: ForwardMessageModalProps) {
  const { t } = useLanguage();
  const [selectedRecipients, setSelectedRecipients] = useState<GroupMemberCandidate[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) return;
    setSelectedRecipients([]);
    setIsSubmitting(false);
  }, [open]);

  if (!open || !message) return null;

  const previewText = messagePreviewText(message);
  const previewImageUrl = resolveMessagingImageUrl(message.image_url);
  const hasForwardableContent = Boolean(previewText || previewImageUrl || message.has_image);

  const handleClose = () => {
    if (isSubmitting) return;
    setSelectedRecipients([]);
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!hasForwardableContent) {
      toast.error(t('messages.forwardUnavailable', 'Túto správu nie je možné preposlať.'));
      return;
    }
    if (selectedRecipients.length === 0) {
      toast.error(t('messages.forwardRecipientsRequired', 'Vyberte aspoň jedného príjemcu.'));
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await forwardMessage(
        conversationId,
        message.id,
        selectedRecipients.map((recipient) => recipient.id),
      );
      if (result.sent.length === 0) {
        toast.error(t('messages.forwardFailed', 'Správu sa nepodarilo preposlať.'));
        return;
      }
      setSelectedRecipients([]);
      suppressPassiveMessagingRefresh(FORWARD_PASSIVE_REFRESH_SUPPRESSION_MS);
      onClose();
      requestConversationsRefresh();
      toast.success(
        result.failed.length > 0
          ? t('messages.forwardPartialSuccess', 'Správa bola preposlaná niektorým príjemcom.')
          : t('messages.forwardSuccess', 'Správa bola preposlaná.'),
      );
    } catch (error) {
      toast.error(
        getMessagingErrorMessage(error, {
          fallback: t('messages.forwardFailed', 'Správu sa nepodarilo preposlať.'),
          rateLimitFallback: t(
            'messages.sendRateLimited',
            'Posielate príliš rýchlo. Skúste chvíľu počkať.',
          ),
          unavailableFallback: t('messages.forwardUnavailable', 'Túto správu nie je možné preposlať.'),
        }),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/45" role="dialog" aria-modal="true">
      <div className="absolute inset-x-0 bottom-0 flex h-[88dvh] max-h-[88dvh] flex-col overflow-hidden rounded-t-3xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-[#0f0f10] sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:h-auto sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-200 p-5 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('messages.forwardMessageTitle', 'Preposlať správu')}
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {t('messages.forwardMessageHint', 'Vyberte jedného alebo viacerých príjemcov.')}
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

        <form className="flex min-h-0 flex-1 flex-col overflow-hidden" onSubmit={handleSubmit}>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-black">
              {previewImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewImageUrl}
                  alt={t('messages.imagePreview', 'Náhľad obrázka')}
                  className="mb-2 max-h-40 rounded-xl object-contain"
                />
              ) : null}
              <div className="line-clamp-3 whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-gray-200">
                {previewText || t('messages.imageOnlyPreview', 'Obrázok')}
              </div>
            </div>

            <GroupUserPicker
              selectedUsers={selectedRecipients}
              onSelectedUsersChange={setSelectedRecipients}
              maxSelected={20}
              disabled={isSubmitting}
              placeholder={t('messages.forwardRecipientsSearchPlaceholder', 'Hľadať príjemcov...')}
            />
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
              disabled={isSubmitting || selectedRecipients.length === 0}
              className="flex-1 rounded-2xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? t('common.sending', 'Odosielam...') : t('messages.forwardSend', 'Preposlať')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
