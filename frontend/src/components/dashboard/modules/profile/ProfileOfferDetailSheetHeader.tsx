'use client';

import React from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import type { useBottomSheetDismiss } from './useBottomSheetDismiss';

type DragHandleProps = ReturnType<typeof useBottomSheetDismiss>['dragHandleProps'];

type ProfileOfferDetailSheetHeaderProps = {
  title: string;
  swipeHint: string;
  closeLabel: string;
  onCloseClick: () => void;
  dragHandleProps: DragHandleProps;
};

export function ProfileOfferDetailSheetHeader({
  title,
  swipeHint,
  closeLabel,
  onCloseClick,
  dragHandleProps,
}: ProfileOfferDetailSheetHeaderProps) {
  return (
    <div
      {...dragHandleProps}
      className="flex shrink-0 cursor-grab flex-col items-center border-b border-gray-200 px-4 pb-3 pt-2 active:cursor-grabbing dark:border-gray-800"
      aria-label={swipeHint}
    >
      <div
        className="mb-2 h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-700"
        aria-hidden="true"
      />
      <button
        type="button"
        onClick={onCloseClick}
        onPointerDown={(event) => event.stopPropagation()}
        className="mb-1 rounded-full p-1 text-gray-400 transition-colors hover:text-gray-600 active:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300 dark:active:text-gray-200"
        aria-label={closeLabel}
      >
        <ChevronDownIcon className="h-5 w-5" aria-hidden="true" />
      </button>
      <h2 className="text-xs font-bold uppercase tracking-wide text-gray-800 dark:text-gray-200">
        {title}
      </h2>
      <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">{swipeHint}</p>
    </div>
  );
}
