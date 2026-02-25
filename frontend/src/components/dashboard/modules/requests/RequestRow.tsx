'use client';

import React from 'react';
import type { SkillRequest } from './types';
import { RequestSummaryCard } from './RequestSummaryCard';

type Props = {
  item: SkillRequest;
  variant: 'received' | 'sent';
  onAccept?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
  onHide?: () => void;
  isBusy?: boolean;
  showCompletionActions?: boolean;
  onRequestCompletion?: (id: number) => void;
  onConfirmCompletion?: (id: number) => void;
  showReviewButton?: boolean;
  onOpenReview?: (offerId: number) => void;
};

export function RequestRow({
  item,
  variant,
  onAccept,
  onReject,
  onCancel,
  onHide,
  isBusy = false,
  showCompletionActions = false,
  onRequestCompletion,
  onConfirmCompletion,
  showReviewButton = false,
  onOpenReview,
}: Props) {
  return (
    <RequestSummaryCard
      item={item}
      variant={variant}
      onAccept={onAccept}
      onReject={onReject}
      onCancel={onCancel}
      onHide={onHide}
      isBusy={isBusy}
      showCompletionActions={showCompletionActions}
      onRequestCompletion={onRequestCompletion}
      onConfirmCompletion={onConfirmCompletion}
      showReviewButton={showReviewButton}
      onOpenReview={onOpenReview}
    />
  );
}


