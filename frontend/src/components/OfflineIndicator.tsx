'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

/** Pruh o stave pripojenia (červený pri výpadku, zelený po obnovení); texty sú v jazyku aplikácie. */
export default function OfflineIndicator() {
  const { t } = useLanguage();
  const [isOnline, setIsOnline] = useState(true);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Časovač, ktorý po obnovení pripojenia schová zelený pruh. Nová udalosť pripojenia ho nahradí a odpojenie
    // komponentu ho zruší, takže starý časovač nemôže pruh zhasnúť predčasne ani po odpojení.
    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    /** Zruší rozbehnuté skrývanie pruhu, ak nejaké beží. */
    const clearHideTimer = () => {
      if (hideTimer !== null) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
    };

    /** Prečíta stav pripojenia: pri výpadku ukáže pruh, po obnovení ho nechá na obrazovke 3 s a potom schová. */
    const updateOnlineStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      clearHideTimer();

      if (!online) {
        setShowBanner(true);
      } else {
        // Hide banner after 3 seconds when back online
        hideTimer = setTimeout(() => {
          hideTimer = null;
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
      clearHideTimer();
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
        ? 'bg-green-600 transform translate-y-0'
        : 'bg-red-600 transform translate-y-0'
      }
    `}>
      <div className="flex items-center justify-center gap-2">
        <span className="text-lg">
          {isOnline ? '🟢' : '🔴'}
        </span>
        <span>
          {isOnline
            ? t('common.backOnlineBanner', 'Pripojenie obnovené! Aplikácia je online.')
            : t('common.offlineBanner', 'Offline režim - niektoré funkcie môžu byť obmedzené.')
          }
        </span>
      </div>
    </div>
  );
}
