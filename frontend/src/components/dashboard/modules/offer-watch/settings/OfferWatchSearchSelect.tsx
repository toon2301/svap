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
import { readVisualViewportBounds } from '../../../hooks/useVisualViewportBounds';
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

type PopupPlacement = 'above' | 'below';

type PopupLayout = {
  placement: PopupPlacement;
  style: CSSProperties;
};

const VIEWPORT_PADDING = 16;
const LIST_MAX_HEIGHT = 304;
const PREFERRED_BELOW_HEIGHT = 160;
const OPEN_EVENT = 'svaply:offer-watch-search-select-open';

function popupLayout(trigger: HTMLElement): PopupLayout {
  const rect = trigger.getBoundingClientRect();
  const viewport = readVisualViewportBounds() ?? {
    top: 0,
    left: 0,
    width: window.innerWidth,
    height: window.innerHeight,
    right: window.innerWidth,
    bottom: window.innerHeight,
  };
  const availableWidth = Math.max(0, viewport.width - VIEWPORT_PADDING * 2);
  const width = Math.min(rect.width, availableWidth);
  const minimumLeft = viewport.left + VIEWPORT_PADDING;
  const maximumLeft = Math.max(minimumLeft, viewport.right - width - VIEWPORT_PADDING);
  const left = Math.min(
    Math.max(rect.left, minimumLeft),
    maximumLeft,
  );
  const below = Math.max(0, viewport.bottom - rect.bottom - VIEWPORT_PADDING);
  const above = Math.max(0, rect.top - viewport.top - VIEWPORT_PADDING);
  const openBelow = below >= PREFERRED_BELOW_HEIGHT || below >= above;
  const maxHeight = Math.min(LIST_MAX_HEIGHT, openBelow ? below : above);
  return {
    placement: openBelow ? 'below' : 'above',
    style: {
      position: 'fixed',
      left,
      width,
      maxHeight,
      ...(openBelow
        ? { top: rect.bottom }
        : { top: rect.top, transform: 'translateY(-100%)' }),
    },
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
  const [layout, setLayout] = useState<PopupLayout>({
    placement: 'below',
    style: {},
  });

  const uniqueOptions = useMemo(() => {
    const seenKeys = new Set<string>();
    return options.filter((option) => {
      if (seenKeys.has(option.key)) return false;
      seenKeys.add(option.key);
      return true;
    });
  }, [options]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeOfferWatchSearch(query);
    if (!normalizedQuery) return requireQuery ? [] : uniqueOptions;
    return uniqueOptions.filter((option) =>
      normalizeOfferWatchSearch(
        `${option.label} ${option.secondaryLabel || ''} ${option.searchText || ''}`,
      ).includes(normalizedQuery),
    );
  }, [query, requireQuery, uniqueOptions]);

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    setQuery('');
    setActiveIndex(null);
    if (restoreFocus) inputRef.current?.focus();
  }, []);

  const updatePosition = useCallback(() => {
    if (inputRef.current) setLayout(popupLayout(inputRef.current));
  }, []);

  const openPopup = useCallback(() => {
    if (disabled || !inputRef.current) return;
    window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: instanceId }));
    setLayout(popupLayout(inputRef.current));
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
    const viewport = window.visualViewport;
    viewport?.addEventListener('resize', handleReflow);
    viewport?.addEventListener('scroll', handleReflow);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('resize', handleReflow);
      window.removeEventListener('scroll', handleReflow, true);
      viewport?.removeEventListener('resize', handleReflow);
      viewport?.removeEventListener('scroll', handleReflow);
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
        type='text'
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
        className={`min-h-11 w-full border bg-white px-3 py-2 pr-10 text-sm text-gray-900 outline-none transition placeholder:text-gray-500 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-black dark:text-white dark:placeholder:text-gray-400 ${
          open
            ? layout.placement === 'below'
              ? 'rounded-t-xl rounded-b-none'
              : 'rounded-b-xl rounded-t-none'
            : 'rounded-xl'
        } ${
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
          data-placement={layout.placement}
          className={`z-[10050] flex flex-col overflow-hidden border bg-white shadow-2xl dark:bg-[#0f0f10] ${
            invalid
              ? 'border-red-400 dark:border-red-700'
              : 'border-purple-400 dark:border-purple-400'
          } ${
            layout.placement === 'below'
              ? 'rounded-b-xl rounded-t-none border-t-0'
              : 'rounded-t-xl rounded-b-none border-b-0'
          }`}
          style={layout.style}
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
                  className={`flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                    selected || active
                      ? 'bg-purple-100 text-purple-900 dark:bg-purple-900/40 dark:text-purple-100'
                      : 'text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-900'
                  }`}
                >
                  <span className='min-w-0 flex-1'>
                    <span className='block whitespace-normal break-words font-medium leading-5'>{option.label}</span>
                    {option.secondaryLabel ? (
                      <span className='mt-0.5 block whitespace-normal break-words text-xs leading-4 text-gray-500 dark:text-gray-400'>{option.secondaryLabel}</span>
                    ) : null}
                  </span>
                  {selected ? <CheckIcon className='mt-0.5 h-4 w-4 shrink-0' aria-hidden='true' /> : null}
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
