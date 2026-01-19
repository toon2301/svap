'use client';

import React from 'react';
import { RequestsDesktop } from './requests/RequestsDesktop';

export default function RequestsModule() {
  // Desktop-first: mobilnú UX doladíme neskôr, zatiaľ renderujeme rovnaký komponent.
  return <RequestsDesktop />;
}


