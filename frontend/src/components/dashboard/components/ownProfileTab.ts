/** Záložka vlastného profilu pri prvom zobrazení; záložka z adresy platí len pre vlastný profil. */

import type { User } from '@/types';
import type { ProfileTab } from '../modules/profile/profileTypes';

export function resolveInitialOwnProfileTab(
  initialRoute: string | undefined,
  initialProfileTab: ProfileTab | undefined,
  user: User | null | undefined,
  initialProfileSlug: string | null | undefined,
  initialViewedUserId: number | null | undefined,
): ProfileTab {
  if (
    initialRoute === 'profile' ||
    initialRoute === 'portfolio-create' ||
    initialRoute === 'portfolio-detail'
  ) {
    return initialProfileTab ?? 'offers';
  }

  if (initialRoute === 'user-profile' && initialProfileTab) {
    const slug = String(initialProfileSlug ?? '').trim();
    const isSelfSlug = Boolean(user?.slug && slug && user.slug === slug);
    const isSelfId =
      initialViewedUserId != null && user?.id != null && initialViewedUserId === user.id;
    if (isSelfSlug || isSelfId) {
      return initialProfileTab;
    }
  }

  return 'offers';
}
