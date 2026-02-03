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
};

export function RequestRow({ item, variant, onAccept, onReject, onCancel, onHide, isBusy = false }: Props) {
  return (
    <RequestSummaryCard
      item={item}
      variant={variant}
      onAccept={onAccept}
      onReject={onReject}
      onCancel={onCancel}
      onHide={onHide}
      isBusy={isBusy}
    />
  );
}


