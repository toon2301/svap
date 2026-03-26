/* eslint-disable @next/next/no-img-element */
'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ConversationsList } from './messages/ConversationsList';
import { ConversationDetail } from './messages/ConversationDetail';

export default function MessagesModule({
  conversationId,
  currentUserId,
}: {
  conversationId?: number | null;
  currentUserId: number;
}) {
  const { t } = useLanguage();

  return (
    <div className="w-full">
      <div className="max-w-4xl mx-auto mb-4">
        <div className="bg-white dark:bg-black rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-5">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {t('messages.title', 'Správy')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('messages.subtitle', 'Vaše konverzácie')}
          </p>
        </div>
      </div>

      {conversationId ? (
        <ConversationDetail conversationId={conversationId} currentUserId={currentUserId} />
      ) : (
        <ConversationsList currentUserId={currentUserId} />
      )}
    </div>
  );
}

