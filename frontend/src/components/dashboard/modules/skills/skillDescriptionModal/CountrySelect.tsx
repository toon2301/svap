'use client';

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getSupportedOfferCountries,
  type OfferCountryCode,
} from '@/shared/districtRegistry';

interface CountrySelectProps {
  value: OfferCountryCode;
  onChange: (value: OfferCountryCode) => void;
  id?: string;
}

const COUNTRY_LABEL_FALLBACKS: Record<OfferCountryCode, string> = {
  SK: 'Slovensko',
  CZ: 'Česko',
  PL: 'Poľsko',
  HU: 'Maďarsko',
  AT: 'Rakúsko',
  DE: 'Nemecko',
};

export default function CountrySelect({ value, onChange, id }: CountrySelectProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const listboxId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);

  const countries = useMemo(() => getSupportedOfferCountries(), []);

  const labelFor = (code: OfferCountryCode) =>
    t(`skills.offerCountries.${code}`, COUNTRY_LABEL_FALLBACKS[code]);

  const selectedIndex = Math.max(0, countries.indexOf(value));
  const activeCode = countries[activeIndex] ?? countries[0];
  const optionIdFor = useCallback(
    (code: OfferCountryCode) => `${listboxId}-option-${code}`,
    [listboxId],
  );

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = rect.width;
    const estimatedMenuH = countries.length * 40 + 12;
    const gap = 6;
    const canOpenDown = rect.bottom + gap + estimatedMenuH <= window.innerHeight;
    const top = canOpenDown ? rect.bottom + gap : Math.max(8, rect.top - gap - estimatedMenuH);
    setPos({ left: rect.left, top, width });
  }, [countries.length]);

  const focusListbox = useCallback(() => {
    requestAnimationFrame(() => {
      updatePosition();
      menuRef.current?.focus();
    });
  }, [updatePosition]);

  const openListbox = useCallback((nextActiveIndex = selectedIndex) => {
    setActiveIndex(nextActiveIndex);
    setOpen(true);
    focusListbox();
  }, [focusListbox, selectedIndex]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const target = document.getElementById('app-root') ?? document.body;
    setPortalRoot(target);
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    requestAnimationFrame(() => {
      menuRef.current?.focus();
    });
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const handleReflow = () => updatePosition();
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('resize', handleReflow);
    window.addEventListener('scroll', handleReflow, true);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('resize', handleReflow);
      window.removeEventListener('scroll', handleReflow, true);
    };
  }, [open, countries.length, updatePosition]);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, countries.length - 1));
  }, [countries.length]);

  useEffect(() => {
    if (!open || !activeCode) return;
    document.getElementById(optionIdFor(activeCode))?.scrollIntoView?.({ block: 'nearest' });
  }, [activeCode, open, optionIdFor]);

  const handleSelect = (code: OfferCountryCode) => {
    onChange(code);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleListboxKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % countries.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + countries.length) % countries.length);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(countries.length - 1);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (activeCode) {
        handleSelect(activeCode);
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
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
        aria-label={t('skills.countryTitle', 'Krajina ponuky')}
        onClick={() => {
          if (open) {
            setOpen(false);
          } else {
            openListbox(selectedIndex);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            openListbox(0);
          }
        }}
        className="w-full flex items-center justify-between gap-3 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white text-left focus:outline-none focus:ring-1 focus:ring-purple-300 focus:border-transparent"
      >
        <span className="text-sm font-medium">{labelFor(value)}</span>
        <svg
          className={`w-4 h-4 shrink-0 text-gray-400 dark:text-gray-400 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open &&
        portalRoot &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            id={listboxId}
            role="listbox"
            tabIndex={-1}
            aria-label={t('skills.countryTitle', 'Krajina ponuky')}
            aria-activedescendant={activeCode ? optionIdFor(activeCode) : undefined}
            onKeyDown={handleListboxKeyDown}
            style={{ position: 'fixed', left: pos.left, top: pos.top, width: pos.width }}
            className="z-[9999] bg-white dark:bg-[#0f0f10] border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-64 overflow-y-auto overflow-x-hidden district-dropdown-scrollbar"
          >
            <div className="py-1">
              {countries.map((code, index) => {
                const isSelected = value === code;
                const isActive = activeIndex === index;

                return (
                  <button
                    key={code}
                    id={optionIdFor(code)}
                    type="button"
                    role="option"
                    tabIndex={-1}
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(event) => {
                      event.preventDefault();
                    }}
                    onClick={() => handleSelect(code)}
                    className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 dark:focus-visible:ring-purple-600 ${
                      isSelected || isActive
                        ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-900 dark:text-purple-200'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    } ${index === 0 ? 'rounded-t-lg' : ''} ${
                      index === countries.length - 1 ? 'rounded-b-lg' : ''
                    }`}
                  >
                    {labelFor(code)}
                  </button>
                );
              })}
            </div>
          </div>,
          portalRoot,
        )}
    </div>
  );
}
