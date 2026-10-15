'use client';

import React, { useCallback, useState } from 'react';
import type ProfileOfferCard from '@/components/dashboard/modules/profile/ProfileOfferCard';
import { ProfileOfferCardMobile } from '@/components/dashboard/modules/profile/ProfileOfferCardMobile';
import { ProfileOfferDetailMobile } from '@/components/dashboard/modules/profile/ProfileOfferDetailMobile';
import { ProfileOpeningHoursMobileModal } from '@/components/dashboard/modules/profile/ProfileOpeningHoursMobileModal';
import type { OpeningHours } from '@/components/dashboard/modules/skills/skillDescriptionModal/types';
import { useSearchOfferLike } from './useSearchOfferLike';

type SearchOfferCardMobileProps = Pick<
  React.ComponentProps<typeof ProfileOfferCard>, 'offer' | 'accountType' | 't' | 'compactTop'
>;

/** Reuse the profile's mobile card and two-tap detail without adding profile-only search actions. */
export function SearchOfferCardMobile({ offer, accountType, t, compactTop }: SearchOfferCardMobileProps) {
  const [isTapped, setIsTapped] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [hours, setHours] = useState<OpeningHours | null>(null);
  const { offer: displayOffer, isPending, toggleLike } = useSearchOfferLike(offer, t);

  const closeDetail = useCallback(() => {
    setIsDetailOpen(false);
    setHours(null);
    setIsTapped(false);
  }, []);

  return (
    <>
      <ProfileOfferCardMobile
        offer={displayOffer}
        accountType={accountType}
        isOtherUserProfile
        isTapped={isTapped}
        onCardClick={() => {
          if (!isTapped) {
            setIsTapped(true);
          } else {
            setIsTapped(false);
            setIsDetailOpen(true);
          }
        }}
        compactTop={compactTop}
        showProfileActions={false}
        onToggleLike={toggleLike}
        isLikePending={isPending}
      />
      <ProfileOfferDetailMobile
        offer={isDetailOpen ? displayOffer : null}
        accountType={accountType}
        onClose={closeDetail}
        onShowHours={setHours}
      />
      <ProfileOpeningHoursMobileModal hours={hours} onClose={() => setHours(null)} />
    </>
  );
}
