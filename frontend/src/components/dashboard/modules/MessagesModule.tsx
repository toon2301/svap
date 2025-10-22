'use client';

import { ChatBubbleLeftRightIcon, InboxIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';

export default function MessagesModule() {
  const { t } = useLanguage();
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('messages.title', 'Správy')}</h2>
        <p className="text-gray-600">{t('messages.subtitle', 'Vaše konverzácie')}</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <InboxIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">{t('messages.none', 'Žiadne správy')}</h3>
        <p className="text-gray-500 mb-6">
          {t('messages.hint', 'Keď vám niekto pošle správu, objaví sa tu')}
        </p>
        <div className="inline-flex items-center text-sm text-purple-600">
          <ChatBubbleLeftRightIcon className="w-5 h-5 mr-2" />
          <span>{t('messages.soon', 'Funkcia správ bude dostupná čoskoro')}</span>
        </div>
      </div>
    </div>
  );
}

