'use client';

import { 
  HomeIcon, 
  MagnifyingGlassIcon, 
  InboxIcon,
  ChatBubbleLeftRightIcon,
  BellIcon 
} from '@heroicons/react/24/outline';
import {
  useMessagesNotifications,
  useRequestsNotifications,
} from './contexts/RequestsNotificationsContext';

interface MobileTopNavProps {
  activeItem: string;
  onItemClick: (itemId: string) => void;
}

export default function MobileTopNav({ activeItem, onItemClick }: MobileTopNavProps) {
  const { unreadCount } = useRequestsNotifications();
  const { unreadCount: messageUnreadCount } = useMessagesNotifications();
  const navItems = [
    { id: 'home', icon: HomeIcon, label: 'Domov' },
    { id: 'search', icon: MagnifyingGlassIcon, label: 'Hľadať' },
    { id: 'messages', icon: ChatBubbleLeftRightIcon, label: 'Správy' },
    { id: 'requests', icon: InboxIcon, label: 'Spolupráce' },
    { id: 'notifications', icon: BellIcon, label: 'Upozornenia' },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[60] bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800 shadow-lg overflow-visible">
      <div className="flex items-start justify-between overflow-visible px-2 pt-1 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onItemClick(item.id)}
              className={`
                relative flex min-h-[44px] min-w-[44px] flex-col items-center justify-start rounded-lg px-2 pt-0.5 pb-0 transition-all overflow-visible
                ${isActive 
                  ? 'text-purple-600' 
                  : 'text-gray-600 dark:text-gray-300 hover:text-purple-600 hover:bg-gray-50 dark:hover:bg-gray-900'
                }
              `}
              aria-label={item.label}
            >
              <span className="relative inline-block overflow-visible">
                <Icon className="h-6 w-6 shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                {item.id === 'messages' && activeItem !== 'messages' && messageUnreadCount > 0 && (
                  <span
                    className="absolute right-0 top-0 z-10 flex h-4 min-w-[16px] -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full bg-purple-600 px-0.5 text-[10px] font-bold text-white"
                    aria-label={`${messageUnreadCount} ${messageUnreadCount === 1 ? 'nová správa' : 'nové správy'}`}
                  >
                    {messageUnreadCount > 99 ? '99+' : messageUnreadCount}
                  </span>
                )}
                {item.id === 'requests' && unreadCount > 0 && (
                  <span
                    className="absolute right-0 top-0 z-10 flex h-4 min-w-[16px] -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full bg-purple-600 px-0.5 text-[10px] font-bold text-white"
                    aria-label={`${unreadCount} ${unreadCount === 1 ? 'nová žiadosť' : 'nové žiadosti'}`}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

