'use client';

import { useCallback, useEffect, useRef } from 'react';

type UseTargetReviewScrollParams = {
  targetReviewId?: number | null;
  reviewsLoading: boolean;
  hasTargetReview: boolean;
  onTargetVisible?: (reviewId: number) => void;
};

export function useTargetReviewScroll<TElement extends HTMLElement>({
  targetReviewId,
  reviewsLoading,
  hasTargetReview,
  onTargetVisible,
}: UseTargetReviewScrollParams) {
  const reviewRefs = useRef<Map<number, TElement>>(new Map());
  const scrolledReviewIdRef = useRef<number | null>(null);
  const onTargetVisibleRef = useRef(onTargetVisible);

  useEffect(() => {
    onTargetVisibleRef.current = onTargetVisible;
  }, [onTargetVisible]);

  const registerReviewElement = useCallback(
    (reviewId: number, element: TElement | null) => {
      if (element) {
        reviewRefs.current.set(reviewId, element);
        return;
      }
      reviewRefs.current.delete(reviewId);
    },
    [],
  );

  useEffect(() => {
    if (targetReviewId == null || reviewsLoading) return;
    if (!hasTargetReview) return;

    const element = reviewRefs.current.get(targetReviewId);
    if (!element || element.getClientRects().length === 0) return;

    onTargetVisibleRef.current?.(targetReviewId);
    if (scrolledReviewIdRef.current === targetReviewId) return;

    const frame = window.requestAnimationFrame(() => {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
      scrolledReviewIdRef.current = targetReviewId;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [hasTargetReview, onTargetVisible, reviewsLoading, targetReviewId]);

  return { registerReviewElement };
}
