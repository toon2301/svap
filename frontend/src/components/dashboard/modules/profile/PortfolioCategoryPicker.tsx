'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
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
  'z-[10050] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-[#101011]';

const LIST_MAX_HEIGHT_PX = 288;
const LIST_VIEWPORT_PADDING_PX = 16;
const LIST_GAP_PX = 8;

function computeListPosition(button: HTMLElement): CSSProperties {
  const rect = button.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const safeWidth = Math.min(rect.width, viewportWidth - LIST_VIEWPORT_PADDING_PX * 2);
  const left = Math.min(
    Math.max(rect.left, LIST_VIEWPORT_PADDING_PX),
    viewportWidth - safeWidth - LIST_VIEWPORT_PADDING_PX,
  );
  const spaceBelow = viewportHeight - rect.bottom - LIST_GAP_PX - LIST_VIEWPORT_PADDING_PX;
  const spaceAbove = rect.top - LIST_GAP_PX - LIST_VIEWPORT_PADDING_PX;
  const openBelow = spaceBelow >= spaceAbove;

  if (openBelow) {
    return {
      position: 'fixed',
      top: rect.bottom + LIST_GAP_PX,
      left,
      width: safeWidth,
      maxHeight: Math.min(LIST_MAX_HEIGHT_PX, Math.max(spaceBelow, 120)),
    };
  }

  const maxHeight = Math.min(LIST_MAX_HEIGHT_PX, Math.max(spaceAbove, 120));
  return {
    position: 'fixed',
    top: Math.max(LIST_VIEWPORT_PADDING_PX, rect.top - LIST_GAP_PX - maxHeight),
    left,
    width: safeWidth,
    maxHeight,
  };
}

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
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [listPosition, setListPosition] = useState<CSSProperties>({});
  const effectiveButtonId = buttonId || generatedButtonId;

  const updateListPosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;
    setListPosition(computeListPosition(button));
  }, []);

  const openList = useCallback(() => {
    const button = buttonRef.current;
    if (button) {
      setListPosition(computeListPosition(button));
    }
    setIsOpen(true);
  }, []);

  const toggleList = useCallback(() => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    openList();
  }, [isOpen, openList]);

  const selectedLabel = useMemo(() => {
    const category = String(value || '').trim();
    return category ? getPortfolioCategoryLabel(t, category) : placeholder;
  }, [placeholder, t, value]);

  useEffect(() => {
    if (!isOpen) return;

    updateListPosition();

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || listRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    };

    const handleReposition = () => updateListPosition();

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isOpen, updateListPosition]);

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
      toggleList();
    }
  };

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        ref={buttonRef}
        id={effectiveButtonId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-describedby={describedBy}
        data-invalid={invalid ? 'true' : undefined}
        disabled={disabled}
        onClick={toggleList}
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

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label={label}
            className={listClassName}
            style={listPosition}
          >
            <div
              className="subtle-scrollbar overflow-y-auto p-1"
              style={{
                maxHeight: listPosition.maxHeight,
                scrollbarGutter: 'stable',
              }}
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
          </div>,
          document.body,
        )}
    </div>
  );
}
