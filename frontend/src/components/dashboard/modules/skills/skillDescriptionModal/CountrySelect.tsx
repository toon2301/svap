'use client';

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getOfferCountryEntries,
  getOfferCountryFallbackName,
  type OfferCountryCode,
} from '@/shared/countryRegistry';

interface CountrySelectProps {
  value: OfferCountryCode;
  onChange: (value: OfferCountryCode) => void;
  id?: string;
  label?: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
}

type DisplayCountry = {
  code: OfferCountryCode;
  label: string;
  fallbackName: string;
};

const normalizeSearchText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .trim();

export default function CountrySelect({
  value,
  onChange,
  id,
  label,
  disabled = false,
  invalid = false,
  describedBy,
}: CountrySelectProps) {
  const { locale, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const listboxId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);

  const countries = useMemo<DisplayCountry[]>(() => {
    let displayNames: Intl.DisplayNames | null = null;
    try {
      displayNames = new Intl.DisplayNames([locale], { type: 'region' });
    } catch {
      displayNames = null;
    }

    return getOfferCountryEntries()
      .map((entry) => ({
        code: entry.code,
        fallbackName: entry.name,
        label: displayNames?.of(entry.code) || entry.name,
      }))
      .sort((first, second) => first.label.localeCompare(second.label, locale));
  }, [locale]);

  const filteredCountries = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return countries;
    const exactCodeMatch = countries.find(
      (country) => country.code.toLocaleLowerCase() === normalizedQuery,
    );
    if (exactCodeMatch) return [exactCodeMatch];
    return countries.filter((country) =>
      [country.label, country.fallbackName, country.code].some((candidate) =>
        normalizeSearchText(candidate).includes(normalizedQuery),
      ),
    );
  }, [countries, query]);

  const selectedLabel =
    countries.find((country) => country.code === value)?.label ||
    getOfferCountryFallbackName(value) ||
    t('skills.countryPlaceholder', 'Vyber krajinu');
  const accessibleLabel = label || t('skills.countryTitle', 'Krajina ponuky');
  const activeCountry = filteredCountries[activeIndex];
  const optionIdFor = useCallback(
    (code: OfferCountryCode) => `${listboxId}-option-${code}`,
    [listboxId],
  );

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menuHeight = Math.min(336, Math.max(144, window.innerHeight - 16));
    const gap = 6;
    const canOpenDown = rect.bottom + gap + menuHeight <= window.innerHeight;
    const top = canOpenDown ? rect.bottom + gap : Math.max(8, rect.top - gap - menuHeight);
    setPos({ left: rect.left, top, width: rect.width });
  }, []);

  const focusSearch = useCallback(() => {
    requestAnimationFrame(() => {
      updatePosition();
      searchRef.current?.focus();
    });
  }, [updatePosition]);

  const openListbox = useCallback(() => {
    if (disabled) return;
    const selectedIndex = countries.findIndex((country) => country.code === value);
    setQuery('');
    setActiveIndex(Math.max(0, selectedIndex));
    setOpen(true);
    focusSearch();
  }, [countries, disabled, focusSearch, value]);

  const closeListbox = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    setQuery('');
    if (restoreFocus) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }, []);

  useEffect(() => {
    if (disabled && open) closeListbox(false);
  }, [closeListbox, disabled, open]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    setPortalRoot(document.getElementById('app-root') ?? document.body);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    updatePosition();
    requestAnimationFrame(() => searchRef.current?.focus());
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      closeListbox(false);
    };
    const handleReflow = () => updatePosition();
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('resize', handleReflow);
    window.addEventListener('scroll', handleReflow, true);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('resize', handleReflow);
      window.removeEventListener('scroll', handleReflow, true);
    };
  }, [closeListbox, open, updatePosition]);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(0, filteredCountries.length - 1)));
  }, [filteredCountries.length]);

  useEffect(() => {
    if (!open || !activeCountry) return;
    document.getElementById(optionIdFor(activeCountry.code))?.scrollIntoView?.({ block: 'nearest' });
  }, [activeCountry, open, optionIdFor]);

  const handleSelect = (code: OfferCountryCode) => {
    onChange(code);
    closeListbox(true);
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (filteredCountries.length) {
        setActiveIndex((current) => (current + 1) % filteredCountries.length);
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (filteredCountries.length) {
        setActiveIndex((current) => (current - 1 + filteredCountries.length) % filteredCountries.length);
      }
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(Math.max(0, filteredCountries.length - 1));
    } else if (event.key === 'Enter' && activeCountry) {
      event.preventDefault();
      handleSelect(activeCountry.code);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeListbox(true);
    }
  };

  return (
    <div className="relative w-full">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={accessibleLabel}
        aria-describedby={describedBy}
        data-invalid={invalid || undefined}
        disabled={disabled}
        onClick={() => (open ? closeListbox(false) : openListbox())}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (!open) openListbox();
          }
        }}
        className={`w-full flex items-center justify-between gap-3 px-3 py-2 border rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white text-left focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-60 ${
          invalid
            ? 'border-red-400 focus:ring-red-300 dark:border-red-700'
            : 'border-gray-300 dark:border-gray-700 focus:ring-purple-300 focus:border-transparent'
        }`}
      >
        <span className="text-sm font-medium truncate">{selectedLabel}</span>
        <svg
          className={`w-4 h-4 shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && portalRoot && pos && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', left: pos.left, top: pos.top, width: pos.width }}
          className="z-[9999] bg-white dark:bg-[#0f0f10] border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden"
        >
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <input
              ref={searchRef}
              type="search"
              role="combobox"
              aria-expanded="true"
              aria-controls={listboxId}
              aria-activedescendant={activeCountry ? optionIdFor(activeCountry.code) : undefined}
              aria-autocomplete="list"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder={t('skills.countrySearchPlaceholder', 'Vyhľadaj krajinu')}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-300"
            />
          </div>
          <div
            id={listboxId}
            role="listbox"
            aria-label={accessibleLabel}
            className="max-h-64 overflow-y-auto overflow-x-hidden district-dropdown-scrollbar py-1"
          >
            {filteredCountries.map((country, index) => {
              const isSelected = value === country.code;
              const isActive = activeIndex === index;
              return (
                <button
                  key={country.code}
                  id={optionIdFor(country.code)}
                  type="button"
                  role="option"
                  tabIndex={-1}
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelect(country.code)}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium text-left transition-colors focus:outline-none ${
                    isSelected || isActive
                      ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-900 dark:text-purple-200'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <span className="truncate">{country.label}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{country.code}</span>
                </button>
              );
            })}
            {filteredCountries.length === 0 && (
              <p className="px-4 py-5 text-sm text-center text-gray-500 dark:text-gray-400" role="status">
                {t('skills.countryNoResults', 'Nenašla sa žiadna krajina.')}
              </p>
            )}
          </div>
        </div>,
        portalRoot,
      )}
    </div>
  );
}
