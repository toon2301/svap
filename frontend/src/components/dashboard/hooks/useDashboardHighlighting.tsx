"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export interface DashboardHighlightingProps {
  highlightedSkillId: number | null;
  setHighlightedSkillId: (skillId: number | null) => void;
  highlightTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  clearHighlighting: () => void;
}

interface UseDashboardHighlightingParams {
  activeModule: string;
  initialHighlightedSkillId?: number | null;
}

/**
 * Custom hook pre highlighting logiku skill kariet v Dashboard
 */
export function useDashboardHighlighting({
  activeModule,
  initialHighlightedSkillId,
}: UseDashboardHighlightingParams): DashboardHighlightingProps {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [highlightedSkillId, setHighlightedSkillId] = useState<number | null>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevActiveModuleRef = useRef<string>(activeModule);

  // Inicializácia highlight ID ak je poskytnuté
  useEffect(() => {
    if (initialHighlightedSkillId != null) {
      setHighlightedSkillId(initialHighlightedSkillId);
    }
  }, [initialHighlightedSkillId]);

  // Funkcia pre vyčistenie highlighting
  const clearHighlighting = () => {
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }
    setHighlightedSkillId(null);
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('highlightedSkillId');
        sessionStorage.removeItem('highlightedSkillTime');
      }
    } catch {
      // ignore
    }
  };

  // Synchronizácia highlightedSkillId s URL parametrom 'highlight'
  // A záloha v sessionStorage pre prípad full refreshu (len ak sme na user-profile module)
  useEffect(() => {
    // Ak nie sme na user-profile module, neobnovovať zo sessionStorage
    if (activeModule !== 'user-profile') {
      return;
    }

    const highlightParam = searchParams.get('highlight');
    if (highlightParam) {
      const id = Number(highlightParam);
      if (!isNaN(id)) {
        setHighlightedSkillId(id);
        // Uložiť do session storage pre persistenciu
        try {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('highlightedSkillId', String(id));
            sessionStorage.setItem('highlightedSkillTime', String(Date.now()));
          }
        } catch (e) {
          // ignore
        }
      }
    } else {
      // Ak v URL nie je parameter, skúsime obnoviť zo sessionStorage (ak sme po refreshi)
      // Ale len ak neubehol čas
      try {
        if (typeof window !== 'undefined') {
          const storedId = sessionStorage.getItem('highlightedSkillId');
          const storedTime = sessionStorage.getItem('highlightedSkillTime');
          
          if (storedId && storedTime) {
            const timeDiff = Date.now() - Number(storedTime);
            if (timeDiff < 1 * 60 * 1000) { // Menej ako 1 minúta
              setHighlightedSkillId(Number(storedId));
              // Obnovíme aj URL parameter, aby to bolo konzistentné
              // Ale opatrne, aby sme nespôsobili loop
              const currentUrl = new URL(window.location.href);
              if (!currentUrl.searchParams.has('highlight')) {
                 currentUrl.searchParams.set('highlight', storedId);
                 router.replace(currentUrl.pathname + currentUrl.search);
              }
              return; // Koniec, obnovili sme
            } else {
              // Expirovalo
              sessionStorage.removeItem('highlightedSkillId');
              sessionStorage.removeItem('highlightedSkillTime');
            }
          }
        }
      } catch (e) {
        // ignore
      }

      // Ak nič z toho, zrušíme zvýraznenie
      if (!highlightTimeoutRef.current) {
        setHighlightedSkillId(null);
      }
    }
  }, [searchParams, router, activeModule]);

  // Zrušiť zvýraznenie pri opustení user-profile modulu
  useEffect(() => {
    const prevModule = prevActiveModuleRef.current;
    
    // Ak sa zmenil activeModule z 'user-profile' na niečo iné
    if (prevModule === 'user-profile' && activeModule !== 'user-profile') {
      // Zmenil sa activeModule z 'user-profile' na niečo iné - zrušiť zvýraznenie
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = null;
      }
      setHighlightedSkillId(null);
      try {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('highlightedSkillId');
          sessionStorage.removeItem('highlightedSkillTime');
          
          // Odstrániť parameter highlight z URL
          const currentUrl = new URL(window.location.href);
          if (currentUrl.searchParams.has('highlight')) {
            currentUrl.searchParams.delete('highlight');
            window.history.replaceState(null, '', currentUrl.pathname + currentUrl.search);
          }
        }
      } catch {
        // ignore
      }
    }
    
    // Vždy aktualizovať ref na aktuálnu hodnotu
    prevActiveModuleRef.current = activeModule;
  }, [activeModule]);

  // Inteligentný časovač pre zvýraznenie:
  useEffect(() => {
    if (highlightedSkillId != null) {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }

      // Vypočítať zostávajúci čas (ak obnovujeme zo storage)
      let remainingTime = 1 * 60 * 1000;
      try {
        if (typeof window !== 'undefined') {
          const storedTime = sessionStorage.getItem('highlightedSkillTime');
          if (storedTime) {
            const elapsed = Date.now() - Number(storedTime);
            remainingTime = Math.max(1000, 1 * 60 * 1000 - elapsed);
          }
        }
      } catch (e) {
        // ignore
      }

      highlightTimeoutRef.current = setTimeout(() => {
        setHighlightedSkillId(null);
        highlightTimeoutRef.current = null;
        
        // Vyčistiť URL a Storage
        try {
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('highlightedSkillId');
            sessionStorage.removeItem('highlightedSkillTime');
            
            const currentUrl = new URL(window.location.href);
            if (currentUrl.searchParams.has('highlight')) {
              currentUrl.searchParams.delete('highlight');
              router.replace(currentUrl.pathname + currentUrl.search);
            }
          }
        } catch (e) {
          // ignore
        }
      }, remainingTime);
    }

    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, [highlightedSkillId, router]);

  // Vyčistenie timeru pri unmount-e Dashboardu
  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  return {
    highlightedSkillId,
    setHighlightedSkillId,
    highlightTimeoutRef,
    clearHighlighting,
  };
}
