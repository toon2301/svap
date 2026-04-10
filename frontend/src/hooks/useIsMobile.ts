'use client';

import { useEffect, useState } from 'react';

/** Tailwind lg breakpoint = 1024px. Mobile = viewport < 1024px. */
const LG_BREAKPOINT = '(max-width: 1023px)';

type IsMobileState = {
  isMobile: boolean;
  isResolved: boolean;
};

/**
 * Detekuje či je viewport v mobile rozlíšení (pod lg breakpointom).
 * Používa window.matchMedia pre spoľahlivú detekciu a korektné prepnutie pri resize.
 */
export function useIsMobileState(): IsMobileState {
  const [state, setState] = useState<IsMobileState>({
    isMobile: false,
    isResolved: false,
  });

  useEffect(() => {
    const mq = window.matchMedia(LG_BREAKPOINT);

    const update = () =>
      setState({
        isMobile: mq.matches,
        isResolved: true,
      });
    update();

    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return state;
}

export function useIsMobile(): boolean {
  return useIsMobileState().isMobile;
}
