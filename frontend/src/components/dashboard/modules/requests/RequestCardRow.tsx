'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, endpoints } from '@/lib/api';
import ProfileOfferCard from '../profile/ProfileOfferCard';
import type { Offer } from '../profile/profileOffersTypes';
import type { SkillRequest } from './types';

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
          price_negotiable: data.price_negotiable === true,
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
          likes_count: Math.max(0, Number(data.likes_count ?? 0)),
          is_liked_by_me: data.is_liked_by_me === true,
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
    const fallbackLabels = [
      t('requests.wantToHelpCta', ''),
      t('requests.interestCta', ''),
      t('skills.message', ''),
      'Požiadať',
      'Správa',
      'Mám záujem',
      'Chcem pomôcť',
    ].filter((label): label is string => Boolean(label));
    buttons.forEach((btn) => {
      const text = btn.textContent || '';
      const isDefaultCardAction =
        btn.dataset.defaultCta === 'true' ||
        btn.dataset.messageCta === 'true' ||
        fallbackLabels.some((label) => text.includes(label));
      if (isDefaultCardAction) {
        (btn as HTMLElement).style.display = 'none';
      }
    });
  }, [item.status, offer, t]);

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
            className="flex-1 px-3 py-1.5 text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 rounded-lg transition-colors hover:bg-rose-100 disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:opacity-100 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-200 dark:hover:bg-rose-950/40 dark:disabled:border-gray-800 dark:disabled:bg-gray-900 dark:disabled:text-gray-500 flex items-center justify-center"
          >
            {t('requests.reject')}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onAccept) onAccept();
            }}
            disabled={isBusy}
            className="flex-1 px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white border border-transparent rounded-lg transition-colors hover:bg-emerald-700 disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:opacity-100 dark:disabled:border-gray-800 dark:disabled:bg-gray-900 dark:disabled:text-gray-500 flex items-center justify-center"
          >
            {t('requests.accept')}
          </button>
        </div>
      )}
    </div>
  );
}

