'use client';

import React, { useEffect, useState } from 'react';
import { AddReviewModalDesktop } from './AddReviewModalDesktop';
import { AddReviewModalMobile } from './AddReviewModalMobile';
import type { AddReviewModalProps } from './addReviewModalShared';

export type { AddReviewModalProps } from './addReviewModalShared';

const DESKTOP_BREAKPOINT = 1024;

/**
 * Modal na pridanie/úpravu recenzie – na desktop AddReviewModalDesktop,
 * na mobile AddReviewModalMobile. Rozdelené do dvoch súborov, aby sa obsah nemiešal.
 */
export function AddReviewModal(props: AddReviewModalProps) {
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);
    const handler = () => setIsDesktop(mql.matches);
    setIsDesktop(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return isDesktop ? <AddReviewModalDesktop {...props} /> : <AddReviewModalMobile {...props} />;
}
