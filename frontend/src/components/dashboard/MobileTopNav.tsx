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
  useNotificationsUnread,
  useRequestsNotifications,
} from './contexts/RequestsNotificationsContext';

interface MobileTopNavProps {
  activeItem: string;
  onItemClick: (itemId: string) => void;
}

export default function MobileTopNav({ activeItem, onItemClick }: MobileTopNavProps) {
  const { unreadCount } = useRequestsNotifications();
  const { unreadCount: messageUnreadCount } = useMessagesNotifications();
  const { unreadCount: notificationsUnreadCount } = useNotificationsUnread();
  const navItems = [
    { id: 'home', icon: HomeIcon, label: 'Domov' },
    { id: 'search', icon: MagnifyingGlassIcon, label: 'Hľadať' },
    { id: 'messages', icon: ChatBubbleLeftRightIcon, label: 'Správy' },
    { id: 'requests', icon: InboxIcon, label: 'Spolupráce' },
    { id: 'notifications', icon: BellIcon, label: 'Upozornenia' },
  ];

  return (
    <div
      data-mobile-bottom-nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] lg:hidden"
    >
      <nav className="pointer-events-auto grid h-16 w-full max-w-sm grid-cols-5 items-center gap-1 overflow-visible rounded-[1.75rem] border border-white/70 bg-white/70 p-1.5 shadow-[0_10px_35px_rgba(15,23,42,0.18)] backdrop-blur-xl backdrop-saturate-150 dark:border-white/10 dark:bg-gray-950/70 dark:shadow-[0_10px_35px_rgba(0,0,0,0.5)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onItemClick(item.id)}
              data-onboarding={
                item.id === 'search'
                  ? 'search-nav-icon'
                  : item.id === 'messages'
                    ? 'messages-nav-icon'
                  : item.id === 'requests'
                    ? 'requests-nav-icon'
                    : undefined
              }
              className={`
                relative flex h-12 min-w-0 items-center justify-center overflow-visible rounded-[1.15rem] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/70
                ${isActive 
                  ? 'bg-gray-900 text-white shadow-sm dark:bg-white/[0.14] dark:text-white'
                  : 'text-gray-600 hover:bg-black/[0.05] hover:text-gray-950 dark:text-gray-300 dark:hover:bg-white/[0.08] dark:hover:text-white'
                }
              `}
              aria-label={item.label}
            >
              <span className="relative inline-block overflow-visible">
                <Icon className="h-5 w-5 shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                {item.id === 'messages' && activeItem !== 'messages' && messageUnreadCount > 0 && (
                  <span
                    className="absolute right-0 top-0 z-10 flex h-4 min-w-[16px] -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full bg-rose-500 px-0.5 text-[10px] font-bold text-white ring-2 ring-white/80 dark:ring-gray-950/80"
                    aria-label={`${messageUnreadCount} ${messageUnreadCount === 1 ? 'nová správa' : 'nové správy'}`}
                  >
                    {messageUnreadCount > 99 ? '99+' : messageUnreadCount}
                  </span>
                )}
                {item.id === 'requests' && unreadCount > 0 && (
                  <span
                    className="absolute right-0 top-0 z-10 flex h-4 min-w-[16px] -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full bg-rose-500 px-0.5 text-[10px] font-bold text-white ring-2 ring-white/80 dark:ring-gray-950/80"
                    aria-label={`${unreadCount} ${unreadCount === 1 ? 'nová žiadosť' : 'nové žiadosti'}`}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
                {item.id === 'notifications' && activeItem !== 'notifications' && notificationsUnreadCount > 0 && (
                  <span
                    className="absolute right-0 top-0 z-10 flex h-4 min-w-[16px] -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full bg-rose-500 px-0.5 text-[10px] font-bold text-white ring-2 ring-white/80 dark:ring-gray-950/80"
                    aria-hidden="true"
                  >
                    {notificationsUnreadCount > 99 ? '99+' : notificationsUnreadCount}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

