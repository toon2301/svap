'use client';

import { NoSymbolIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';

export function BlockedConversationNotice() {
  const { t } = useLanguage();

  return (
    <div
      className="shrink-0 border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-black sm:px-6 lg:px-8"
      data-testid="blocked-conversation-notice"
      role="status"
    >
      <div className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 text-center text-sm font-medium text-gray-600 dark:bg-[#141416] dark:text-gray-300">
        <NoSymbolIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span>{t('profile.blockSuccess', 'Používateľ bol zablokovaný.')}</span>
      </div>
    </div>
  );
}
