'use client';

import React, { useEffect, useRef, useState } from 'react';
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
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);

  const countries = getSupportedOfferCountries();

  const labelFor = (code: OfferCountryCode) =>
    t(`skills.offerCountries.${code}`, COUNTRY_LABEL_FALLBACKS[code]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const target = document.getElementById('app-root') ?? document.body;
    setPortalRoot(target);
  }, []);

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = rect.width;
    const estimatedMenuH = countries.length * 40 + 12;
    const gap = 6;
    const canOpenDown = rect.bottom + gap + estimatedMenuH <= window.innerHeight;
    const top = canOpenDown ? rect.bottom + gap : Math.max(8, rect.top - gap - estimatedMenuH);
    setPos({ left: rect.left, top, width });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
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
  }, [open, countries.length]);

  const handleSelect = (code: OfferCountryCode) => {
    onChange(code);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className="relative w-full">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('skills.countryTitle', 'Krajina ponuky')}
        onClick={() => {
          setOpen((prev) => !prev);
          if (!open) {
            requestAnimationFrame(updatePosition);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
            requestAnimationFrame(updatePosition);
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
            role="listbox"
            aria-label={t('skills.countryTitle', 'Krajina ponuky')}
            style={{ position: 'fixed', left: pos.left, top: pos.top, width: pos.width }}
            className="z-[9999] bg-white dark:bg-[#0f0f10] border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-64 overflow-y-auto overflow-x-hidden district-dropdown-scrollbar"
          >
            <div className="py-1">
              {countries.map((code, index) => (
                <button
                  key={code}
                  type="button"
                  role="option"
                  aria-selected={value === code}
                  onMouseDown={(event) => {
                    event.preventDefault();
                  }}
                  onClick={() => handleSelect(code)}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 dark:focus-visible:ring-purple-600 ${
                    value === code
                      ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-900 dark:text-purple-200'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  } ${index === 0 ? 'rounded-t-lg' : ''} ${
                    index === countries.length - 1 ? 'rounded-b-lg' : ''
                  }`}
                >
                  {labelFor(code)}
                </button>
              ))}
            </div>
          </div>,
          portalRoot,
        )}
    </div>
  );
}
