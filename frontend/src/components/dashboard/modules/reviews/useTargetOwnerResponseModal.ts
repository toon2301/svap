'use client';

import { useCallback, useRef, type Dispatch, type SetStateAction } from 'react';

import type { Review } from './ReviewCard';

type OwnerResponseModalMode = 'read' | 'edit';

type UseTargetOwnerResponseModalParams = {
  targetOwnerResponseReviewId?: number | null;
  reviews: Review[];
  setOwnerResponseModalReview: Dispatch<SetStateAction<Review | null>>;
  setOwnerResponseModalMode: Dispatch<SetStateAction<OwnerResponseModalMode>>;
};

export function useTargetOwnerResponseModal({
  targetOwnerResponseReviewId,
  reviews,
  setOwnerResponseModalReview,
  setOwnerResponseModalMode,
}: UseTargetOwnerResponseModalParams) {
  const openedReviewIdRef = useRef<number | null>(null);

  return useCallback(
    (visibleReviewId: number) => {
      if (
        targetOwnerResponseReviewId == null ||
        visibleReviewId !== targetOwnerResponseReviewId ||
        openedReviewIdRef.current === visibleReviewId
      ) {
        return;
      }

      const review = reviews.find((item) => item.id === visibleReviewId);
      if (!review || !String(review.owner_response ?? '').trim()) return;

      openedReviewIdRef.current = visibleReviewId;
      setOwnerResponseModalMode('read');
      setOwnerResponseModalReview(review);
    },
    [
      reviews,
      setOwnerResponseModalMode,
      setOwnerResponseModalReview,
      targetOwnerResponseReviewId,
    ],
  );
}
