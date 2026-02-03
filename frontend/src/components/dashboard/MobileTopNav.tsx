'use client';

import { 
  HomeIcon, 
  MagnifyingGlassIcon, 
  InboxIcon,
  ChatBubbleLeftRightIcon,
  BellIcon 
} from '@heroicons/react/24/outline';
import { useRequestsNotifications } from './contexts/RequestsNotificationsContext';

interface MobileTopNavProps {
  activeItem: string;
  onItemClick: (itemId: string) => void;
}

export default function MobileTopNav({ activeItem, onItemClick }: MobileTopNavProps) {
  const { unreadCount } = useRequestsNotifications();
  const navItems = [
    { id: 'home', icon: HomeIcon, label: 'Domov' },
    { id: 'search', icon: MagnifyingGlassIcon, label: 'Hľadať' },
    { id: 'requests', icon: InboxIcon, label: 'Žiadosti' },
    { id: 'messages', icon: ChatBubbleLeftRightIcon, label: 'Správy' },
    { id: 'notifications', icon: BellIcon, label: 'Upozornenia' },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[60] bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800 shadow-lg overflow-visible">
      <div className="flex items-center justify-between px-2 py-0 overflow-visible">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onItemClick(item.id)}
              className={`
                relative flex flex-col items-center justify-center p-2 rounded-lg transition-all overflow-visible
                ${isActive 
                  ? 'text-purple-600' 
                  : 'text-gray-600 dark:text-gray-300 hover:text-purple-600 hover:bg-gray-50 dark:hover:bg-gray-900'
                }
              `}
              aria-label={item.label}
            >
              <span className="relative inline-block overflow-visible">
                <Icon className="w-6 h-6 shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                {item.id === 'requests' && unreadCount > 0 && (
                  <span
                    className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-purple-600 text-white text-[11px] font-bold -translate-y-1/2 translate-x-1/2 z-10"
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

