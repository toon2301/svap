'use client';

import { useState, useEffect } from 'react';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const updateOnlineStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      
      if (!online) {
        setShowBanner(true);
      } else {
        // Hide banner after 3 seconds when back online
        setTimeout(() => {
          setShowBanner(false);
        }, 3000);
      }
    };

    // Initial check
    updateOnlineStatus();

    // Listen for online/offline events
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  if (!showBanner && isOnline) return null;

  return (
    <div className={`
      fixed top-0 left-0 right-0 z-50 p-4 text-center text-white font-medium
      transition-all duration-300 ease-in-out
      ${isOnline 
        ? 'bg-green-600 transform -translate-y-full' 
        : 'bg-red-600 transform translate-y-0'
      }
    `}>
      <div className="flex items-center justify-center gap-2">
        <span className="text-lg">
          {isOnline ? '🟢' : '🔴'}
        </span>
        <span>
          {isOnline 
            ? 'Pripojenie obnovené! Aplikácia je online.' 
            : 'Offline režim - niektoré funkcie môžu byť obmedzené.'
          }
        </span>
      </div>
    </div>
  );
}
