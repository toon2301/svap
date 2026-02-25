'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, endpoints } from '@/lib/api';
import ProfileOfferCard from '../profile/ProfileOfferCard';
import type { Offer } from '../profile/profileOffersTypes';
import type { SkillRequest } from './types';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

type Props = {
  item: SkillRequest;
  onAccept?: () => void;
  onReject?: () => void;
  isBusy?: boolean;
};

export function RequestCardRow({ item, onAccept, onReject, isBusy = false }: Props) {
  const { t } = useLanguage();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!item.offer || typeof item.offer !== 'number') {
      setIsLoading(false);
      return;
    }

    void (async () => {
      try {
        const { data } = await api.get(endpoints.skills.detail(item.offer));
        
        // Mapuj dáta na Offer formát
        const mappedOffer: Offer = {
          id: data.id,
          category: data.category || '',
          subcategory: data.subcategory || '',
          description: data.description || '',
          detailed_description: data.detailed_description || '',
          images: Array.isArray(data.images)
            ? data.images.map((im: any) => ({
                id: im.id,
                image_url: im.image_url || im.image || null,
                order: im.order,
              }))
            : [],
          price_from: typeof data.price_from === 'number' ? data.price_from : null,
          price_currency: data.price_currency || '€',
          district: data.district || '',
          location: data.location || '',
          experience: data.experience
            ? {
                value: typeof data.experience.value === 'number' ? data.experience.value : parseFloat(String(data.experience.value || 0)),
                unit: (data.experience.unit === 'years' || data.experience.unit === 'months' ? data.experience.unit : 'years') as 'years' | 'months',
              }
            : undefined,
          tags: Array.isArray(data.tags) ? data.tags : [],
          opening_hours: data.opening_hours || undefined,
          is_seeking: data.is_seeking === true,
          urgency: data.urgency || '',
          duration_type: data.duration_type || null,
          is_hidden: data.is_hidden === true,
          average_rating: data.average_rating,
          reviews_count: data.reviews_count,
        };
        
        setOffer(mappedOffer);
      } catch {
        // fail-open: ak sa nepodarí načítať kartu, zobrazíme prázdny stav
      } finally {
        setIsLoading(false);
      }
    })();
  }, [item.offer]);

  // Skryj defaultné tlačidlá a zobraz vlastné
  useEffect(() => {
    if (!cardRef.current || item.status !== 'pending') return;
    
    const card = cardRef.current;
    const buttons = card.querySelectorAll('button');
    buttons.forEach((btn) => {
      const text = btn.textContent || '';
      if (text.includes('Požiadať') || text.includes('Správa')) {
        (btn as HTMLElement).style.display = 'none';
      }
    });
  }, [item.status, offer]);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-[#0f0f10] shadow-sm p-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">Načítavam kartu...</div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-[#0f0f10] shadow-sm p-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">Karta sa nepodarilo načítať</div>
      </div>
    );
  }

  return (
    <div ref={cardRef} className="relative request-card-wrapper">
      <ProfileOfferCard
        offer={offer}
        accountType="personal"
        t={t}
        isFlipped={isFlipped}
        onToggleFlip={() => setIsFlipped(!isFlipped)}
        isOtherUserProfile={true}
        onRequestClick={undefined}
        onMessageClick={undefined}
        requestLabel={undefined}
        isRequestDisabled={true}
      />
      
      {/* Vlastné tlačidlá namiesto defaultných */}
      {item.status === 'pending' && (
        <div className="absolute bottom-3 left-3 right-3 flex gap-2 z-50" style={{ pointerEvents: 'auto' }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onReject) onReject();
            }}
            disabled={isBusy}
            className="flex-1 px-3 py-1.5 text-xs font-medium bg-white dark:bg-black text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-800 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-60 flex items-center justify-center gap-1.5"
          >
            <XMarkIcon className="w-3.5 h-3.5" />
            Zamietnuť
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onAccept) onAccept();
            }}
            disabled={isBusy}
            className="flex-1 px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg transition-colors hover:from-purple-700 hover:to-indigo-700 disabled:opacity-60 flex items-center justify-center gap-1.5"
          >
            <CheckIcon className="w-3.5 h-3.5" />
            {t('requests.accept')}
          </button>
        </div>
      )}
    </div>
  );
}

