'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  t: (k: string, def?: string) => string;
  birthDay: string; birthMonth: string; birthYear: string;
  gender: string;
  errors: Record<string, string>;
  onDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent, field: string) => void;
  onGenderChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  bindSelectHandlers: {
    onTouchStart: (e: React.TouchEvent, field: string) => void;
    onTouchEnd: (e: React.TouchEvent, field: string) => void;
    onFocus: (field: string) => void;
    onBlur: (field: string) => void;
  };
}

const GENDER_OPTIONS = [
  { value: '', labelKey: 'auth.selectGender' },
  { value: 'male', labelKey: 'auth.male' },
  { value: 'female', labelKey: 'auth.female' },
  { value: 'other', labelKey: 'auth.other' },
] as const;

export default function BirthGenderSection({ t, birthDay, birthMonth, birthYear, gender, errors, onDateChange, onKeyDown, onGenderChange, bindSelectHandlers }: Props) {
  const dateValue = birthDay && birthMonth && birthYear ? `${birthYear}-${birthMonth}-${birthDay}` : '';
  
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const target = document.getElementById('app-root') ?? document.body;
    setPortalRoot(target);
  }, []);

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.max(200, rect.width);
    const estimatedMenuH = GENDER_OPTIONS.length * 36 + 12;
    const gap = 6;
    const canOpenDown = rect.bottom + gap + estimatedMenuH <= window.innerHeight;
    const top = canOpenDown ? rect.bottom + gap : Math.max(8, rect.top - gap - estimatedMenuH);
    const left = rect.left + rect.width - width;
    setPos({ left, top, width });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
      bindSelectHandlers.onBlur('gender');
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        bindSelectHandlers.onBlur('gender');
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
  }, [open, bindSelectHandlers]);

  const handleValueChange = (newValue: string) => {
    // Vytvoríme syntetický event objekt pre kompatibilitu s existujúcou logikou
    const syntheticEvent = {
      target: {
        name: 'gender',
        value: newValue,
      },
    } as React.ChangeEvent<HTMLSelectElement>;
    
    onGenderChange(syntheticEvent);
    setOpen(false);
    triggerRef.current?.focus();
    bindSelectHandlers.onBlur('gender');
  };

  const getDisplayLabel = () => {
    if (!gender) return t('auth.selectGender');
    const option = GENDER_OPTIONS.find(o => o.value === gender);
    return option ? t(option.labelKey) : t('auth.selectGender');
  };

  return (
    <>
      <div>
        <label htmlFor="birth_date" className="block text-base font-normal text-gray-600 dark:text-gray-300 mb-1.5 max-lg:text-base max-lg:mb-1">{t('auth.birthDate')} *</label>
        <input
          id="birth_date"
          type="date"
          name="birth_date"
          value={dateValue}
          onChange={onDateChange}
          onKeyDown={(e) => onKeyDown(e, 'birth_date')}
          className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent outline-none transition-all bg-white dark:bg-black text-gray-900 dark:text-white ${
            errors.birth_day || errors.birth_month || errors.birth_year ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
          }`}
          aria-label={t('auth.birthDateHelp')}
          aria-required="true"
          aria-invalid={errors.birth_day || errors.birth_month || errors.birth_year ? 'true' : 'false'}
          aria-describedby={errors.birth_day || errors.birth_month || errors.birth_year ? 'birth-date-error' : 'birth-date-help'}
          tabIndex={5}
        />
        <div id="birth-date-help" className="sr-only">{t('auth.birthDateHelp')}</div>
        {(errors.birth_day || errors.birth_month || errors.birth_year) && (
          <p id="birth-date-error" className="text-red-500 text-sm mt-1" role="alert" aria-live="polite">{errors.birth_day || errors.birth_month || errors.birth_year}</p>
        )}
      </div>

      <div>
        <label htmlFor="gender" className="block text-base font-normal text-gray-600 dark:text-gray-300 mb-1.5 max-lg:text-base max-lg:mb-1">{t('auth.gender')} *</label>
        <div className="relative w-full">
          <button
            ref={triggerRef}
            type="button"
            id="gender"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-label={t('auth.selectGender')}
            aria-required="true"
            tabIndex={6}
            onClick={() => {
              setOpen((prev) => !prev);
              if (!open) {
                bindSelectHandlers.onFocus('gender');
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setOpen(true);
                requestAnimationFrame(updatePosition);
                bindSelectHandlers.onFocus('gender');
              } else {
                onKeyDown(e, 'gender');
              }
            }}
            onTouchStart={(e) => bindSelectHandlers.onTouchStart(e, 'gender')}
            onTouchEnd={(e) => bindSelectHandlers.onTouchEnd(e, 'gender')}
            onFocus={() => bindSelectHandlers.onFocus('gender')}
            onBlur={() => {
              // Delay blur, aby sa dropdown stihol otvoriť
              setTimeout(() => {
                if (!open) {
                  bindSelectHandlers.onBlur('gender');
                }
              }, 200);
            }}
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent outline-none transition-all bg-white dark:bg-black text-gray-900 dark:text-white text-left flex items-center justify-between cursor-pointer hover:border-gray-400 dark:hover:border-gray-600 ${
              errors.gender ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
            }`}
          >
            <span className={!gender ? 'text-gray-500 dark:text-gray-400' : ''}>{getDisplayLabel()}</span>
            <span className="pointer-events-none text-gray-400 dark:text-gray-400">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </button>

          {open && portalRoot && pos && createPortal(
            <div
              ref={menuRef}
              role="listbox"
              style={{ position: 'fixed', left: pos.left, top: pos.top, width: pos.width }}
              className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-[#0d0d10]/95 backdrop-blur-sm shadow-[0_12px_30px_rgba(99,102,241,0.18)] overflow-hidden z-[9999] p-1"
            >
              {GENDER_OPTIONS.map(({ value: v, labelKey }) => (
                <button
                  key={v || 'empty'}
                  role="option"
                  aria-selected={gender === v}
                  onClick={() => handleValueChange(v)}
                  className={`w-full text-left px-4 py-2 text-sm rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 dark:focus-visible:ring-purple-600 ${
                    gender === v
                      ? 'bg-purple-100 text-purple-700 font-semibold dark:bg-purple-900/30 dark:text-purple-200'
                      : v === ''
                      ? 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/90 dark:hover:bg-[#18181c]'
                      : 'text-gray-800 hover:bg-gray-100/90 dark:text-gray-100 dark:hover:bg-[#18181c]'
                  }`}
                >
                  {t(labelKey)}
                </button>
              ))}
            </div>,
            portalRoot
          )}
        </div>
        {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender}</p>}
      </div>
    </>
  );
}


