'use client';

import { useEffect, useState } from 'react';

/** Tailwind lg breakpoint = 1024px. Mobile = viewport < 1024px. */
const LG_BREAKPOINT = '(max-width: 1023px)';

/**
 * Detekuje či je viewport v mobile rozlíšení (pod lg breakpointom).
 * Používa window.matchMedia pre spoľahlivú detekciu a korektné prepnutie pri resize.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(LG_BREAKPOINT);

    const update = () => setIsMobile(mq.matches);
    update();

    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return isMobile;
}
