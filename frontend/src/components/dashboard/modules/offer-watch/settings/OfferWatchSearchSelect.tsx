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
import { CheckIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
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
const OPEN_EVENT = 'svaply:offer-watch-search-select-open';

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

function isRendered(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
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
  const instanceId = useId();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
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

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    setQuery('');
    setActiveIndex(null);
    if (restoreFocus) inputRef.current?.focus();
  }, []);

  const updatePosition = useCallback(() => {
    if (inputRef.current) setPosition(popupPosition(inputRef.current));
  }, []);

  const openPopup = useCallback(() => {
    if (disabled || !inputRef.current) return;
    window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: instanceId }));
    setPosition(popupPosition(inputRef.current));
    setQuery('');
    setActiveIndex(null);
    setOpen(true);
  }, [disabled, instanceId]);

  useEffect(() => {
    const closeWhenPeerOpens = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== instanceId) close(false);
    };
    window.addEventListener(OPEN_EVENT, closeWhenPeerOpens);
    return () => window.removeEventListener(OPEN_EVENT, closeWhenPeerOpens);
  }, [close, instanceId]);

  useEffect(() => {
    if (disabled && open) close(false);
  }, [close, disabled, open]);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (inputRef.current?.contains(target) || popupRef.current?.contains(target)) return;
      close(false);
    };
    const handleReflow = (event: Event) => {
      if (
        event.type === 'scroll'
        && event.target instanceof Node
        && popupRef.current?.contains(event.target)
      ) {
        return;
      }
      if (!inputRef.current || !isRendered(inputRef.current)) {
        close(false);
        return;
      }
      updatePosition();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('resize', handleReflow);
    window.addEventListener('scroll', handleReflow, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('resize', handleReflow);
      window.removeEventListener('scroll', handleReflow, true);
    };
  }, [close, open, updatePosition]);

  useEffect(() => {
    setActiveIndex((current) => {
      if (current === null || filteredOptions.length === 0) return null;
      return Math.min(current, filteredOptions.length - 1);
    });
  }, [filteredOptions.length]);

  const activeOption = activeIndex === null ? undefined : filteredOptions[activeIndex];
  const activeOptionId = activeOption && activeIndex !== null
    ? `${listboxId}-option-${activeIndex}`
    : undefined;

  useEffect(() => {
    if (!open || !activeOptionId) return;
    document.getElementById(activeOptionId)?.scrollIntoView?.({ block: 'nearest' });
  }, [activeOptionId, open]);

  const choose = (option: OfferWatchSearchOption) => {
    onSelect(option);
    close(true);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      close(true);
      return;
    }
    if (!open && ['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) {
      event.preventDefault();
      openPopup();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (filteredOptions.length) {
        setActiveIndex((current) => current === null
          ? 0
          : (current + 1) % filteredOptions.length);
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (filteredOptions.length) {
        setActiveIndex((current) => current === null
          ? filteredOptions.length - 1
          : (current - 1 + filteredOptions.length) % filteredOptions.length);
      }
    } else if (event.key === 'Home' && filteredOptions.length) {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End' && filteredOptions.length) {
      event.preventDefault();
      setActiveIndex(filteredOptions.length - 1);
    } else if (event.key === 'Enter') {
      const enterOption = activeOption
        || (filteredOptions.length === 1 ? filteredOptions[0] : undefined);
      if (enterOption) {
        event.preventDefault();
        choose(enterOption);
      }
    }
  };

  return (
    <div className='relative w-full'>
      <input
        ref={inputRef}
        id={id}
        type='search'
        role='combobox'
        aria-label={label}
        aria-haspopup='listbox'
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={activeOptionId}
        aria-autocomplete='list'
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        autoComplete='off'
        spellCheck={false}
        disabled={disabled}
        value={open ? query : valueLabel}
        placeholder={open ? searchPlaceholder : placeholder}
        onFocus={() => {
          if (!open) openPopup();
        }}
        onChange={(event) => {
          if (!open) openPopup();
          setQuery(event.target.value);
          setActiveIndex(null);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          requestAnimationFrame(() => {
            if (!popupRef.current?.contains(document.activeElement)) close(false);
          });
        }}
        className={`min-h-11 w-full rounded-xl border bg-white px-3 py-2 pr-10 text-sm text-gray-900 outline-none transition placeholder:text-gray-500 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-black dark:text-white dark:placeholder:text-gray-400 ${
          invalid
            ? 'border-red-400 focus:border-red-400 focus:ring-red-400/25 dark:border-red-700'
            : 'border-gray-300 focus:border-purple-400 focus:ring-purple-400/25 dark:border-gray-700'
        }`}
      />
      <ChevronDownIcon
        className={`pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 transition ${open ? 'rotate-180' : ''}`}
        aria-hidden='true'
      />

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={popupRef}
          className='z-[10050] flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-[#0f0f10]'
          style={position}
        >
          <div
            id={listboxId}
            role='listbox'
            aria-label={label}
            className='district-dropdown-scrollbar min-h-0 flex-1 overflow-y-auto p-1'
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
                  data-active={active || undefined}
                  onPointerDown={(event) => event.preventDefault()}
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
