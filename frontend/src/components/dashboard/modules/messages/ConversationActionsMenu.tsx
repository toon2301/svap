'use client';

import React, { useMemo } from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';

type ConversationActionsMenuProps = {
  open: boolean;
  isMobile: boolean;
  anchorRect: DOMRect | null;
  onClose: () => void;
  onDeleteConversation: () => void;
};

export function ConversationActionsMenu({
  open,
  isMobile,
  anchorRect,
  onClose,
  onDeleteConversation,
}: ConversationActionsMenuProps) {
  const { t } = useLanguage();

  const desktopPosition = useMemo(() => {
    if (typeof window === 'undefined' || !anchorRect) {
      return null;
    }

    const menuWidth = 224;
    const horizontalPadding = 8;
    const top = Math.min(anchorRect.bottom + 8, window.innerHeight - 80);
    const left = Math.max(
      horizontalPadding,
      Math.min(anchorRect.right - menuWidth, window.innerWidth - menuWidth - horizontalPadding),
    );

    return { top, left };
  }, [anchorRect]);

  if (!open) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[108] ${isMobile ? 'bg-black/35' : 'bg-transparent'}`}
      onClick={onClose}
      data-testid="conversation-actions-menu"
    >
      {isMobile ? (
        <div className="absolute inset-x-0 bottom-0 rounded-t-3xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-gray-800 dark:bg-[#0f0f10]">
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-700" />
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDeleteConversation();
            }}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            data-testid="conversation-delete-action"
          >
            <TrashIcon className="h-5 w-5" />
            <span>{t('messages.deleteConversationAction', 'Vymazať konverzáciu')}</span>
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
            className="mt-2 flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/60"
          >
            {t('common.cancel', 'Zrušiť')}
          </button>
        </div>
      ) : (
        <div
          className="absolute w-56 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-2xl dark:border-gray-800 dark:bg-[#0f0f10]"
          style={desktopPosition ?? undefined}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={onDeleteConversation}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            data-testid="conversation-delete-action"
          >
            <TrashIcon className="h-4 w-4" />
            <span>{t('messages.deleteConversationAction', 'Vymazať konverzáciu')}</span>
          </button>
        </div>
      )}
    </div>
  );
}
