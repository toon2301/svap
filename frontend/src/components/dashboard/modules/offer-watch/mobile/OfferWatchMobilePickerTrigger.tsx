'use client';

import { ChevronRightIcon } from '@heroicons/react/24/outline';

type OfferWatchMobilePickerTriggerProps = {
  id: string;
  label: string;
  valueLabel: string;
  placeholder: string;
  onOpen: () => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
};

export default function OfferWatchMobilePickerTrigger({
  id,
  label,
  valueLabel,
  placeholder,
  onOpen,
  disabled = false,
  invalid = false,
  describedBy,
}: OfferWatchMobilePickerTriggerProps) {
  return (
    <button
      id={id}
      type='button'
      aria-label={`${label}: ${valueLabel || placeholder}`}
      aria-haspopup='dialog'
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={onOpen}
      className={`flex min-h-11 w-full items-center gap-3 rounded-xl border bg-white px-3 py-2 text-left text-sm outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-black ${
        invalid
          ? 'border-red-400 text-gray-900 focus:border-red-400 focus:ring-red-400/25 dark:border-red-700 dark:text-white'
          : 'border-gray-300 text-gray-900 focus:border-purple-400 focus:ring-purple-400/25 dark:border-gray-700 dark:text-white'
      }`}
    >
      <span className={`min-w-0 flex-1 truncate ${valueLabel ? '' : 'text-gray-500 dark:text-gray-400'}`}>
        {valueLabel || placeholder}
      </span>
      <ChevronRightIcon className='h-5 w-5 shrink-0 text-gray-400' aria-hidden='true' />
    </button>
  );
}
