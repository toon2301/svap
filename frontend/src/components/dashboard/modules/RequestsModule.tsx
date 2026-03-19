'use client';

import React from 'react';
import { useIsMobile } from '@/hooks';
import { RequestsDesktop } from './requests/RequestsDesktop';
import { RequestsMobile } from './requests/RequestsMobile';

export default function RequestsModule() {
  const isMobile = useIsMobile();
  return isMobile ? <RequestsMobile /> : <RequestsDesktop />;
}


