'use client';

import { useEffect } from 'react';
import type { User } from '@/types';
import type { ProfileTab } from '../modules/profile/profileTypes';

type OwnProfileTabFromRouteInput = {
  user: User | null | undefined;
  initialRoute: string | undefined;
  initialProfileTab: ProfileTab | undefined;
  initialProfileSlug: string | null | undefined;
  initialViewedUserId: number | null | undefined;
  setOwnProfileTab: (tab: ProfileTab) => void;
};

/** Ak adresa otvára vlastný profil so záložkou, nastaví ju hneď, ako je známy vlastný používateľ. */
export function useOwnProfileTabFromRoute({
  user,
  initialRoute,
  initialProfileTab,
  initialProfileSlug,
  initialViewedUserId,
  setOwnProfileTab,
}: OwnProfileTabFromRouteInput) {
  useEffect(() => {
    if (!user || !initialProfileTab || initialRoute !== 'user-profile') return;

    const slug = String(initialProfileSlug ?? '').trim();
    const isSelfSlug = Boolean(
      user.slug && slug && user.slug === slug,
    );
    const isSelfId =
      initialViewedUserId != null && user.id === initialViewedUserId;
    if (!isSelfSlug && !isSelfId) return;

    setOwnProfileTab(initialProfileTab);
  }, [
    user,
    initialProfileSlug,
    initialProfileTab,
    initialRoute,
    initialViewedUserId,
    setOwnProfileTab,
  ]);
}
