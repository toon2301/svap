'use client';

import { 
  HomeIcon, 
  MagnifyingGlassIcon, 
  PlusCircleIcon,
  ChatBubbleLeftRightIcon,
  Bars3Icon 
} from '@heroicons/react/24/outline';

interface MobileTopNavProps {
  activeItem: string;
  onItemClick: (itemId: string) => void;
  onMenuClick: () => void;
}

export default function MobileTopNav({ activeItem, onItemClick, onMenuClick }: MobileTopNavProps) {
  const navItems = [
    { id: 'home', icon: HomeIcon, label: 'Domov' },
    { id: 'search', icon: MagnifyingGlassIcon, label: 'Hľadať' },
    { id: 'create', icon: PlusCircleIcon, label: 'Pridať', isSpecial: true },
    { id: 'messages', icon: ChatBubbleLeftRightIcon, label: 'Správy' },
  ];

  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          
          if (item.isSpecial) {
            // Špeciálne tlačidlo s krúžkom a pluskom
            return (
              <button
                key={item.id}
                onClick={() => onItemClick(item.id)}
                className="flex flex-col items-center justify-center p-2 relative group"
                aria-label={item.label}
              >
                <div className={`
                  w-12 h-12 rounded-full flex items-center justify-center transition-all
                  ${isActive 
                    ? 'bg-purple-600 text-white shadow-lg' 
                    : 'bg-purple-100 text-purple-600 group-hover:bg-purple-200'
                  }
                `}>
                  <Icon className="w-7 h-7" strokeWidth={2.5} />
                </div>
              </button>
            );
          }
          
          return (
            <button
              key={item.id}
              onClick={() => onItemClick(item.id)}
              className={`
                flex flex-col items-center justify-center p-2 rounded-lg transition-all
                ${isActive 
                  ? 'text-purple-600' 
                  : 'text-gray-600 hover:text-purple-600 hover:bg-gray-50'
                }
              `}
              aria-label={item.label}
            >
              <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
            </button>
          );
        })}
        
        {/* Hamburger menu */}
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center p-2 rounded-lg text-gray-600 hover:text-purple-600 hover:bg-gray-50 transition-all"
          aria-label="Menu"
        >
          <Bars3Icon className="w-6 h-6" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

