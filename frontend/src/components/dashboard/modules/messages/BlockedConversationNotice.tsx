'use client';

import { NoSymbolIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';

type BlockedConversationNoticeProps = {
  onUnblock?: () => void;
  isUnblocking?: boolean;
};

export function BlockedConversationNotice({
  onUnblock,
  isUnblocking = false,
}: BlockedConversationNoticeProps) {
  const { t } = useLanguage();

  return (
    <div
      className="shrink-0 border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-black sm:px-6 lg:px-8"
      data-testid="blocked-conversation-notice"
      role="status"
    >
      <div className="flex min-h-11 flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-xl bg-gray-100 px-4 py-2.5 text-center text-sm font-medium text-gray-600 dark:bg-[#141416] dark:text-gray-300">
        <span className="inline-flex items-center gap-2">
          <NoSymbolIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>{t('profile.blockSuccess', 'Používateľ bol zablokovaný.')}</span>
        </span>
        {onUnblock ? (
          <button
            type="button"
            onClick={onUnblock}
            disabled={isUnblocking}
            className="inline-flex items-center rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-200 disabled:opacity-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
            data-testid="conversation-unblock-action"
          >
            {isUnblocking
              ? t('blockedUsers.unblocking', 'Odblokujem...')
              : t('blockedUsers.unblock', 'Odblokovať')}
          </button>
        ) : null}
      </div>
    </div>
  );
}
