'use client';

import React from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

type ConversationScrollToBottomButtonProps = {
  ariaLabel: string;
  onClick: () => void;
};

export function ConversationScrollToBottomButton({
  ariaLabel,
  onClick,
}: ConversationScrollToBottomButtonProps) {
  return (
    <button
      type="button"
      data-testid="conversation-scroll-to-bottom"
      aria-label={ariaLabel}
      onClick={onClick}
      className="absolute bottom-3 right-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-700 shadow-lg backdrop-blur transition-colors hover:bg-white focus:outline-none focus:ring-2 focus:ring-brand/40 dark:border-gray-800 dark:bg-[#0f0f10]/95 dark:text-gray-100 dark:hover:bg-[#0f0f10]"
    >
      <ChevronDownIcon className="h-5 w-5" />
    </button>
  );
}
