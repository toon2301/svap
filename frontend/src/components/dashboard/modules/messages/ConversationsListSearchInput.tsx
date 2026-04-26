'use client';

import React from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

export function ConversationsListSearchInput({
  value,
  maxLength,
  placeholder,
  clearLabel,
  className = '',
  inputRef,
  onChange,
  onClear,
  onEnter,
}: {
  value: string;
  maxLength: number;
  placeholder: string;
  clearLabel: string;
  className?: string;
  inputRef: React.RefObject<HTMLInputElement>;
  onChange: (value: string) => void;
  onClear: () => void;
  onEnter: () => void;
}) {
  return (
    <div className={`relative ${className}`}>
      <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        maxLength={maxLength}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return;
          event.preventDefault();
          onEnter();
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        className="block w-full rounded-2xl border border-gray-300 bg-white py-2.5 pl-10 pr-10 text-sm text-gray-900 focus:border-transparent focus:ring-1 focus:ring-purple-300 dark:border-gray-700 dark:bg-black dark:text-white"
      />
      {value ? (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          aria-label={clearLabel}
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
