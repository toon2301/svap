'use client';

type MessagesTab = 'messages' | 'requests';

export function MessageConversationTabs({
  activeTab,
  requestCount,
  onChange,
  t,
}: {
  activeTab: MessagesTab;
  requestCount: number;
  onChange: (tab: MessagesTab) => void;
  t: (key: string, fallback: string) => string;
}) {
  const tabs: Array<{ id: MessagesTab; label: string }> = [
    { id: 'messages', label: t('messages.messagesTab', 'Správy') },
    { id: 'requests', label: t('messages.requestsTab', 'Žiadosti') },
  ];

  return (
    <div className="flex rounded-2xl bg-gray-100 p-1 dark:bg-gray-900">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`relative flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
              isActive
                ? 'bg-white text-gray-900 shadow-sm dark:bg-black dark:text-white'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            <span className="truncate">{tab.label}</span>
            {tab.id === 'requests' && requestCount > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-purple-600 px-1.5 text-[11px] font-bold text-white">
                {requestCount > 99 ? '99+' : requestCount}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export type { MessagesTab };
