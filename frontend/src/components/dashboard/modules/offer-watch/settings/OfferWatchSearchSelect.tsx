'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { CheckIcon, ChevronDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { normalizeOfferWatchSearch } from './offerWatchUi';

export type OfferWatchSearchOption = {
  key: string;
  label: string;
  secondaryLabel?: string;
  searchText?: string;
};

type OfferWatchSearchSelectProps = {
  id: string;
  label: string;
  valueKey: string;
  valueLabel: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  startTypingMessage?: string;
  options: OfferWatchSearchOption[];
  onSelect: (option: OfferWatchSearchOption) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  requireQuery?: boolean;
};

const VIEWPORT_PADDING = 16;
const LIST_GAP = 8;
const LIST_MAX_HEIGHT = 304;

function popupPosition(trigger: HTMLElement): CSSProperties {
  const rect = trigger.getBoundingClientRect();
  const width = Math.min(rect.width, window.innerWidth - VIEWPORT_PADDING * 2);
  const left = Math.min(
    Math.max(rect.left, VIEWPORT_PADDING),
    window.innerWidth - width - VIEWPORT_PADDING,
  );
  const below = window.innerHeight - rect.bottom - LIST_GAP - VIEWPORT_PADDING;
  const above = rect.top - LIST_GAP - VIEWPORT_PADDING;
  const openBelow = below >= above;
  const maxHeight = Math.min(LIST_MAX_HEIGHT, Math.max(openBelow ? below : above, 160));
  return {
    position: 'fixed',
    left,
    width,
    maxHeight,
    ...(openBelow
      ? { top: rect.bottom + LIST_GAP }
      : { top: Math.max(VIEWPORT_PADDING, rect.top - LIST_GAP - maxHeight) }),
  };
}

export default function OfferWatchSearchSelect({
  id,
  label,
  valueKey,
  valueLabel,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  startTypingMessage,
  options,
  onSelect,
  disabled = false,
  invalid = false,
  describedBy,
  requireQuery = false,
}: OfferWatchSearchSelectProps) {
  const listboxId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState<CSSProperties>({});

  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeOfferWatchSearch(query);
    if (!normalizedQuery) return requireQuery ? [] : options;
    return options.filter((option) =>
      normalizeOfferWatchSearch(
        `${option.label} ${option.secondaryLabel || ''} ${option.searchText || ''}`,
      ).includes(normalizedQuery),
    );
  }, [options, query, requireQuery]);

  const updatePosition = useCallback(() => {
    if (triggerRef.current) setPosition(popupPosition(triggerRef.current));
  }, []);

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    setQuery('');
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  const openPopup = useCallback(() => {
    if (disabled || !triggerRef.current) return;
    setPosition(popupPosition(triggerRef.current));
    setQuery('');
    setActiveIndex(Math.max(0, options.findIndex((option) => option.key === valueKey)));
    setOpen(true);
    requestAnimationFrame(() => searchRef.current?.focus());
  }, [disabled, options, valueKey]);

  useEffect(() => {
    if (disabled && open) close(false);
  }, [close, disabled, open]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || popupRef.current?.contains(target)) return;
      close(false);
    };
    const handleReflow = (event: Event) => {
      if (event.type === 'scroll' && event.target instanceof Node && popupRef.current?.contains(event.target)) {
        return;
      }
      updatePosition();
    };
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('resize', handleReflow);
    window.addEventListener('scroll', handleReflow, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('resize', handleReflow);
      window.removeEventListener('scroll', handleReflow, true);
    };
  }, [close, open, updatePosition]);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(0, filteredOptions.length - 1)));
  }, [filteredOptions.length]);

  const choose = (option: OfferWatchSearchOption) => {
    onSelect(option);
    close(true);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (filteredOptions.length) {
        setActiveIndex((current) => (current + 1) % filteredOptions.length);
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (filteredOptions.length) {
        setActiveIndex((current) => (current - 1 + filteredOptions.length) % filteredOptions.length);
      }
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(Math.max(0, filteredOptions.length - 1));
    } else if (event.key === 'Enter' && filteredOptions[activeIndex]) {
      event.preventDefault();
      choose(filteredOptions[activeIndex]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
    }
  };

  const activeOption = filteredOptions[activeIndex];
  const activeOptionId = activeOption
    ? `${listboxId}-option-${activeIndex}`
    : undefined;

  return (
    <div className='relative w-full'>
      <button
        ref={triggerRef}
        id={id}
        type='button'
        aria-label={label}
        aria-haspopup='listbox'
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-describedby={describedBy}
        data-invalid={invalid || undefined}
        disabled={disabled}
        onClick={() => (open ? close(false) : openPopup())}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (!open) openPopup();
          } else if (event.key === 'Escape' && open) {
            event.preventDefault();
            close(true);
          }
        }}
        className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2 text-left text-sm outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-black ${
          invalid
            ? 'border-red-400 focus:border-red-400 focus:ring-red-400/25 dark:border-red-700'
            : 'border-gray-300 focus:border-purple-400 focus:ring-purple-400/25 dark:border-gray-700'
        }`}
      >
        <span className={valueLabel ? 'truncate text-gray-900 dark:text-white' : 'truncate text-gray-500 dark:text-gray-400'}>
          {valueLabel || placeholder}
        </span>
        <ChevronDownIcon className={`h-5 w-5 shrink-0 text-gray-400 transition ${open ? 'rotate-180' : ''}`} aria-hidden='true' />
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={popupRef}
          className='z-[10050] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-[#0f0f10]'
          style={position}
        >
          <div className='border-b border-gray-200 p-2 dark:border-gray-700'>
            <div className='relative'>
              <MagnifyingGlassIcon className='pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400' aria-hidden='true' />
              <input
                ref={searchRef}
                type='search'
                role='combobox'
                aria-label={searchPlaceholder}
                aria-expanded='true'
                aria-controls={listboxId}
                aria-activedescendant={activeOptionId}
                aria-autocomplete='list'
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder={searchPlaceholder}
                className='w-full rounded-xl border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/25 dark:border-gray-700 dark:bg-black dark:text-white'
              />
            </div>
          </div>
          <div
            id={listboxId}
            role='listbox'
            aria-label={label}
            className='district-dropdown-scrollbar overflow-y-auto p-1'
            style={{ maxHeight: position.maxHeight }}
          >
            {filteredOptions.map((option, index) => {
              const selected = option.key === valueKey;
              const active = index === activeIndex;
              return (
                <button
                  key={option.key}
                  id={`${listboxId}-option-${index}`}
                  type='button'
                  role='option'
                  tabIndex={-1}
                  aria-selected={selected}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => choose(option)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                    selected || active
                      ? 'bg-purple-100 text-purple-900 dark:bg-purple-900/40 dark:text-purple-100'
                      : 'text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-900'
                  }`}
                >
                  <span className='min-w-0'>
                    <span className='block truncate font-medium'>{option.label}</span>
                    {option.secondaryLabel ? (
                      <span className='mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400'>{option.secondaryLabel}</span>
                    ) : null}
                  </span>
                  {selected ? <CheckIcon className='h-4 w-4 shrink-0' aria-hidden='true' /> : null}
                </button>
              );
            })}
            {!query.trim() && requireQuery ? (
              <p className='px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400' role='status'>
                {startTypingMessage || searchPlaceholder}
              </p>
            ) : null}
            {query.trim() && filteredOptions.length === 0 ? (
              <p className='px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400' role='status'>
                {emptyMessage}
              </p>
            ) : null}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
