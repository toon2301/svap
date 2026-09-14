'use client';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { CheckIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import {
  filterOfferWatchSelectionOptions,
  type OfferWatchSelectionOption,
} from '../offerWatchSelectionOptions';
import OfferWatchMobileShell from './OfferWatchMobileShell';

type OfferWatchMobilePickerScreenProps = {
  title: string;
  searchPlaceholder: string;
  emptyMessage: string;
  startTypingMessage?: string;
  options: OfferWatchSelectionOption[];
  selectedKey: string;
  requireQuery?: boolean;
  onBack: () => void;
  onSelect: (option: OfferWatchSelectionOption) => void;
};

export default function OfferWatchMobilePickerScreen({
  title,
  searchPlaceholder,
  emptyMessage,
  startTypingMessage,
  options,
  selectedKey,
  requireQuery = false,
  onBack,
  onSelect,
}: OfferWatchMobilePickerScreenProps) {
  const listboxId = useId();
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectionPendingRef = useRef(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const filteredOptions = useMemo(
    () => filterOfferWatchSelectionOptions(options, query, requireQuery),
    [options, query, requireQuery],
  );
  const selectedFilteredIndex = filteredOptions.findIndex(
    (option) => option.key === selectedKey,
  );
  const tabbableOptionIndex = selectedFilteredIndex >= 0 ? selectedFilteredIndex : 0;

  useEffect(() => {
    setActiveIndex((current) => {
      if (current === null || filteredOptions.length === 0) return null;
      return Math.min(current, filteredOptions.length - 1);
    });
  }, [filteredOptions.length]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => backButtonRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (
      (event.key === 'ArrowDown' || event.key === 'ArrowUp')
      && filteredOptions.length
    ) {
      event.preventDefault();
      const targetIndex = event.key === 'ArrowUp' ? filteredOptions.length - 1 : 0;
      setActiveIndex(targetIndex);
      optionRefs.current[targetIndex]?.focus();
      return;
    }
    if (event.key === 'Enter' && filteredOptions.length === 1) {
      event.preventDefault();
      selectOption(filteredOptions[0]);
    }
  };

  const selectOption = (option: OfferWatchSelectionOption) => {
    if (selectionPendingRef.current) return;
    selectionPendingRef.current = true;
    onSelect(option);
  };

  const handleOptionKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowDown') {
      nextIndex = (index + 1) % filteredOptions.length;
    } else if (event.key === 'ArrowUp') {
      nextIndex = (index - 1 + filteredOptions.length) % filteredOptions.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = filteredOptions.length - 1;
    }
    if (nextIndex === null) return;
    event.preventDefault();
    setActiveIndex(nextIndex);
    optionRefs.current[nextIndex]?.focus();
  };

  return (
    <OfferWatchMobileShell
      title={title}
      onBack={onBack}
      initialFocusRef={backButtonRef}
      contentScrollable={false}
    >
      <div className='flex h-full min-h-0 flex-col'>
        <div className='shrink-0 border-b border-gray-200 px-4 py-3 dark:border-gray-800 sm:px-6'>
          <div className='relative'>
            <MagnifyingGlassIcon
              className='pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400'
              aria-hidden='true'
            />
            <input
              type='text'
              role='searchbox'
              autoComplete='off'
              spellCheck={false}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(null);
              }}
              onKeyDown={handleSearchKeyDown}
              aria-label={searchPlaceholder}
              aria-controls={listboxId}
              placeholder={searchPlaceholder}
              className='min-h-11 w-full rounded-xl border border-gray-300 bg-white py-2 pl-10 pr-3 text-base text-gray-900 outline-none transition placeholder:text-gray-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/25 dark:border-gray-700 dark:bg-black dark:text-white dark:placeholder:text-gray-400'
            />
          </div>
        </div>

        <div
          className='elegant-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain'
          data-testid='offer-watch-mobile-picker-list'
        >
          <div id={listboxId} role='listbox' aria-label={title}>
            {filteredOptions.map((option, index) => {
              const selected = option.key === selectedKey;
              return (
                <button
                  key={option.key}
                  ref={(element) => { optionRefs.current[index] = element; }}
                  type='button'
                  role='option'
                  aria-selected={selected}
                  tabIndex={index === (activeIndex ?? tabbableOptionIndex) ? 0 : -1}
                  onFocus={() => setActiveIndex(index)}
                  onKeyDown={(event) => handleOptionKeyDown(event, index)}
                  onClick={() => selectOption(option)}
                  className={`flex min-h-14 w-full items-start justify-between gap-3 border-b border-gray-200 px-4 py-3 text-left transition focus:outline-none focus-visible:bg-purple-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-400/50 dark:border-gray-800 dark:focus-visible:bg-purple-950/30 sm:px-6 ${
                    selected
                      ? 'bg-purple-50 text-purple-900 dark:bg-purple-950/30 dark:text-purple-100'
                      : 'bg-white text-gray-900 active:bg-gray-100 dark:bg-black dark:text-gray-100 dark:active:bg-gray-900'
                  }`}
                >
                  <span className='min-w-0 flex-1'>
                    <span className='block whitespace-normal break-words text-base font-medium leading-6'>
                      {option.label}
                    </span>
                    {option.secondaryLabel ? (
                      <span className='mt-0.5 block whitespace-normal break-words text-sm leading-5 text-gray-500 dark:text-gray-400'>
                        {option.secondaryLabel}
                      </span>
                    ) : null}
                  </span>
                  {selected ? (
                    <CheckIcon className='mt-0.5 h-5 w-5 shrink-0 text-purple-600 dark:text-purple-300' aria-hidden='true' />
                  ) : null}
                </button>
              );
            })}
          </div>

          {!query.trim() && requireQuery ? (
            <p className='px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400' role='status'>
              {startTypingMessage || searchPlaceholder}
            </p>
          ) : null}
          {query.trim() && filteredOptions.length === 0 ? (
            <p className='px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400' role='status'>
              {emptyMessage}
            </p>
          ) : null}
        </div>
      </div>
    </OfferWatchMobileShell>
  );
}
