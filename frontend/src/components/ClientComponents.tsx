'use client';

import dynamic from 'next/dynamic';

// Dynamicky importované komponenty bez SSR
const ServiceWorker = dynamic(() => import('./ServiceWorker'), { ssr: false });
const OfflineIndicator = dynamic(() => import('./OfflineIndicator'), { ssr: false });

export default function ClientComponents() {
  return (
    <>
      <ServiceWorker />
      <OfflineIndicator />
    </>
  );
}
