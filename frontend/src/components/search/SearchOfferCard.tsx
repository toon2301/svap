'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { useIsMobileState } from '@/hooks/useIsMobile';
import ProfileOfferCard from '@/components/dashboard/modules/profile/ProfileOfferCard';
import { SearchOfferCardMobile } from './SearchOfferCardMobile';

/** Keep desktop search unchanged and reset mobile details when the result query/page changes. */
export default function SearchOfferCard(props: React.ComponentProps<typeof ProfileOfferCard>) {
  const { isMobile, isResolved } = useIsMobileState();
  const searchParams = useSearchParams();

  // Do not flash a desktop flip card on a mobile viewport before hydration resolves it.
  if (!isResolved) {
    return <div className="hidden lg:block"><ProfileOfferCard {...props} /></div>;
  }
  if (!isMobile) return <ProfileOfferCard {...props} />;

  return (
    <SearchOfferCardMobile
      key={`${props.offer.id}:${searchParams?.toString() ?? ''}`}
      offer={props.offer}
      accountType={props.accountType}
      t={props.t}
      compactTop={props.compactTop}
    />
  );
}
