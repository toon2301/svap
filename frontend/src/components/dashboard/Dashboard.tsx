'use client';

import React, { Suspense } from 'react';
import type { User } from '../../types';
import type { ProfileTab } from './modules/profile/profileTypes';
import DashboardContent from './components/DashboardContent';

export interface DashboardProps {
  initialUser?: User;
  initialRoute?: string;
  initialViewedUserId?: number | null;
  initialHighlightedSkillId?: number | null;
  initialProfileTab?: ProfileTab;
  // Pri routovaní cez slug (napr. /dashboard/users/[slug])
  initialProfileSlug?: string | null;
  // Ak je nastavený, otvorí po načítaní príslušnú sekciu pravého sidebaru na vlastnom profile
  initialRightItem?: string | null;
  /** ID karty (ponuky) pre view recenzií (/dashboard/offers/[offerId]/reviews). */
  initialOfferId?: number | null;
}

// Hlavný komponent - wrapped v Suspense pre useSearchParams()
export default function Dashboard(props: DashboardProps) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-gray-500">Loading...</div></div>}>
      <DashboardContent {...props} />
    </Suspense>
  );
}