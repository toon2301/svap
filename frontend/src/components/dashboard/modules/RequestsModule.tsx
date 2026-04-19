'use client';

import React from 'react';
import { useIsMobileState } from '@/hooks';
import { RequestsDesktop } from './requests/RequestsDesktop';
import { RequestsMobile } from './requests/RequestsMobile';
import { RequestsSkeletonList } from './requests/ui/RequestsSkeletonList';

/** Skeleton podľa breakpointu do prvého `matchMedia` (rovnaký pattern ako MessagesModule). */
function RequestsViewportPendingState() {
  return (
    <div
      className="w-full text-[var(--foreground)] lg:flex lg:h-full lg:min-h-0 lg:flex-col"
      aria-busy="true"
    >
      <div className="w-full lg:hidden">
        <RequestsSkeletonList variant="mobile" rows={5} />
      </div>
      <div className="hidden h-full min-h-0 w-full lg:flex lg:flex-col">
        <RequestsSkeletonList variant="desktop" rows={4} />
      </div>
    </div>
  );
}

export default function RequestsModule() {
  const { isMobile, isResolved } = useIsMobileState();

  if (!isResolved) {
    return <RequestsViewportPendingState />;
  }

  return isMobile ? <RequestsMobile /> : <RequestsDesktop />;
}
