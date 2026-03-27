'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ConversationsList } from './ConversationsList';

export function MessagesDesktopRail({
  currentUserId,
  selectedConversationId,
}: {
  currentUserId: number;
  selectedConversationId?: number | null;
}) {
  const { t } = useLanguage();

  return (
    <div className="flex h-full flex-col bg-white dark:bg-black border-l border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('messages.title', 'Správy')}
        </h2>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-4 overflow-y-auto subtle-scrollbar">
        <div>
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-3">
            {t('messages.sidebarSubtitle', 'Zoznam konverzácií')}
          </h3>
          <ConversationsList
            currentUserId={currentUserId}
            selectedConversationId={selectedConversationId ?? null}
            variant="rail"
            className="space-y-2"
          />
        </div>
      </nav>
    </div>
  );
}
