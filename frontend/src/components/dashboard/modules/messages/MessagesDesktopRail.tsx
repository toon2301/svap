'use client';

import React from 'react';
import { PlusIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import { ConversationsList, MESSAGING_CREATE_GROUP_OPEN_EVENT } from './ConversationsList';

export function MessagesDesktopRail({
  currentUserId,
  selectedConversationId,
}: {
  currentUserId: number;
  selectedConversationId?: number | null;
}) {
  const { t } = useLanguage();
  const createGroupTooltip = t(
    'messages.createGroupTooltip',
    'Vytvoriť novú skupinovú konverzáciu. Pozvaní používatelia musia pozvánku potvrdiť v správach.',
  );

  return (
    <div className="flex h-full flex-col bg-white dark:bg-black border-l border-gray-200 dark:border-gray-800">
      <div className="flex h-[69px] items-center justify-between border-b border-gray-200 px-4 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('messages.title', 'Správy')}
        </h2>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(MESSAGING_CREATE_GROUP_OPEN_EVENT))}
          title={createGroupTooltip}
          className="inline-flex h-9 items-center justify-center gap-0.5 rounded-full px-2.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400/50 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-purple-200"
          aria-label={createGroupTooltip}
        >
          <PlusIcon className="h-4 w-4 shrink-0" strokeWidth={2.25} />
          <UserGroupIcon className="h-5 w-5 shrink-0" />
        </button>
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
