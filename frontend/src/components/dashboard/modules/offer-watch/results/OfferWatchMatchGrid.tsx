'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearchOfferCardAuthorHeader } from '@/components/search/SearchOfferCardAuthorHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import ProfileOfferCard from '../../profile/ProfileOfferCard';
import { openUserProfileFromSearch } from '../../profile/openUserProfileFromSearch';
import { isOfferWatchMatchNew } from '../offerWatchMatchFreshness';
import type { OfferWatchMatch } from '../types';

type OfferWatchMatchGridProps = {
  matches: OfferWatchMatch[];
  watchUpdatedAt: string;
};

const FRESHNESS_TICK_MS = 60_000;

/** Vykreslí živé zhody pomocou rovnakej desktopovej karty ako vyhľadávanie. */
export default function OfferWatchMatchGrid({
  matches,
  watchUpdatedAt,
}: OfferWatchMatchGridProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [flippedCards, setFlippedCards] = useState<Set<number>>(() => new Set());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), FRESHNESS_TICK_MS);
    return () => window.clearInterval(interval);
  }, []);

  const toggleCard = (offerId: number) => {
    setFlippedCards((current) => {
      const next = new Set(current);
      if (next.has(offerId)) next.delete(offerId);
      else next.add(offerId);
      return next;
    });
  };

  return (
    <div className='grid grid-cols-1 gap-[clamp(1rem,2vw,1.5rem)] md:grid-cols-2 xl:grid-cols-3'>
      {matches.map((match) => {
        const { offer } = match;
        const displayName = offer.user_display_name?.trim()
          || t('requests.userFallback', 'Používateľ');
        const identifier = offer.owner_slug?.trim()
          || (offer.user_id != null ? String(offer.user_id) : '');

        return (
          <article key={offer.id} className='relative min-w-0'>
            {isOfferWatchMatchNew(match, watchUpdatedAt, now) && (
              <span className='absolute -top-2 right-3 z-10 rounded-full bg-purple-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm'>
                {t('offerWatchResults.newBadge', 'Nové')}
              </span>
            )}
            <div className='overflow-visible rounded-2xl border border-gray-200 bg-white/70 shadow-sm transition-shadow hover:shadow dark:border-gray-800 dark:bg-[#0f0f10]'>
              <SearchOfferCardAuthorHeader
                displayName={displayName}
                avatarUrl={offer.owner_avatar_url}
                ownerUserType={offer.owner_user_type}
                onProfileClick={() => {
                  if (!identifier) return;
                  openUserProfileFromSearch(router, identifier, {
                    highlightSkillId: offer.id,
                  });
                }}
              />
              <ProfileOfferCard
                offer={offer}
                accountType={offer.owner_user_type === 'company' ? 'business' : 'personal'}
                t={t}
                isFlipped={flippedCards.has(offer.id)}
                onToggleFlip={() => toggleCard(offer.id)}
                isOtherUserProfile={true}
                ownerDisplayName={displayName}
                onRequestClick={undefined}
                onMessageClick={undefined}
                requestLabel={undefined}
                isRequestDisabled={false}
                compactTop={true}
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}
