'use client';

import React from 'react';
import { RequestsDesktop } from './requests/RequestsDesktop';
import { RequestsMobile } from './requests/RequestsMobile';

export default function RequestsModule() {
  // Dôležité: desktop komponent nechávame nedotknutý.
  // Mobil má vlastnú UX (lg breakpoint sa používa naprieč dashboardom).
  return (
    <>
      <div className="lg:hidden">
        <RequestsMobile />
      </div>
      <div className="hidden lg:block">
        <RequestsDesktop />
      </div>
    </>
  );
}


