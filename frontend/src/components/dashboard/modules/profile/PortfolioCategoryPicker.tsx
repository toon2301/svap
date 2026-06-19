'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { CheckIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import { getPortfolioCategoryLabel } from './portfolioDisplay';
import { PORTFOLIO_CATEGORY_OPTIONS } from './portfolioFormUtils';

type PortfolioCategoryPickerProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  label: string;
  placeholder: string;
  buttonId?: string;
  describedBy?: string;
  buttonClassName?: string;
  listClassName?: string;
};

const defaultButtonClassName =
  'flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-900 outline-none transition hover:bg-gray-50 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-[#101011] dark:text-white dark:hover:bg-[#171719]';

const defaultListClassName =
  'absolute left-0 right-0 z-20 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-1 shadow-xl dark:border-gray-800 dark:bg-[#101011]';

export function PortfolioCategoryPicker({
  value,
  onChange,
  disabled = false,
  invalid = false,
  label,
  placeholder,
  buttonId,
  describedBy,
  buttonClassName = defaultButtonClassName,
  listClassName = defaultListClassName,
}: PortfolioCategoryPickerProps) {
  const { t } = useLanguage();
  const generatedButtonId = useId();
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const effectiveButtonId = buttonId || generatedButtonId;

  const selectedLabel = useMemo(() => {
    const category = String(value || '').trim();
    return category ? getPortfolioCategoryLabel(t, category) : placeholder;
  }, [placeholder, t, value]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen]);

  const handleSelect = (category: string) => {
    onChange(category);
    setIsOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsOpen((current) => !current);
    }
  };

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        id={effectiveButtonId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-describedby={describedBy}
        data-invalid={invalid ? 'true' : undefined}
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={handleKeyDown}
        className={`${buttonClassName} ${
          invalid
            ? 'border-red-300 focus:border-red-400 focus:ring-red-400/30 dark:border-red-800'
            : ''
        }`}
      >
        <span
          className={
            value
              ? 'min-w-0 truncate text-gray-900 dark:text-white'
              : 'min-w-0 truncate text-gray-500 dark:text-gray-400'
          }
        >
          {selectedLabel}
        </span>
        <ChevronDownIcon
          className={`h-5 w-5 shrink-0 text-gray-500 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={label}
          className={listClassName}
        >
          {PORTFOLIO_CATEGORY_OPTIONS.map((category) => {
            const isSelected = category === value;
            return (
              <button
                key={category}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(category)}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${
                  isSelected
                    ? 'bg-purple-50 font-semibold text-purple-700 dark:bg-purple-950/40 dark:text-purple-200'
                    : 'text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-[#171719]'
                }`}
              >
                <span className="min-w-0 truncate">
                  {getPortfolioCategoryLabel(t, category)}
                </span>
                {isSelected && (
                  <CheckIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
