'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  t: (k: string, def?: string) => string;
  value: 'individual' | 'company';
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onKeyDown: (e: React.KeyboardEvent, field: string) => void;
  onTouchStart: (e: React.TouchEvent, field: string) => void;
  onTouchEnd: (e: React.TouchEvent, field: string) => void;
  onFocus: (field: string) => void;
  onBlur: (field: string) => void;
}

const ACCOUNT_TYPE_OPTIONS = [
  { value: 'individual' as const, labelKey: 'auth.individual' },
  { value: 'company' as const, labelKey: 'auth.company' },
] as const;

export default function AccountTypeSelect({ t, value, onChange, onKeyDown, onTouchStart, onTouchEnd, onFocus, onBlur }: Props) {
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
    const estimatedMenuH = ACCOUNT_TYPE_OPTIONS.length * 36 + 12;
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
      onBlur('user_type');
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        onBlur('user_type');
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
  }, [open, onBlur]);

  const handleValueChange = (newValue: 'individual' | 'company') => {
    // Vytvoríme syntetický event objekt pre kompatibilitu s existujúcou logikou
    const syntheticEvent = {
      target: {
        name: 'user_type',
        value: newValue,
      },
    } as React.ChangeEvent<HTMLSelectElement>;
    
    onChange(syntheticEvent);
    setOpen(false);
    triggerRef.current?.focus();
    onBlur('user_type');
  };

  const labelFor = (opt: 'individual' | 'company') => {
    const option = ACCOUNT_TYPE_OPTIONS.find(o => o.value === opt);
    return option ? t(option.labelKey) : '';
  };

  return (
    <div>
      <label className="block text-base font-normal text-gray-600 dark:text-gray-300 mb-1.5 max-lg:text-base max-lg:mb-1">
        {t('auth.accountType')}
      </label>
      <div className="relative w-full">
        <button
          ref={triggerRef}
          type="button"
          id="user_type"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={t('auth.selectAccountType')}
          aria-required="true"
          aria-describedby="user-type-help"
          tabIndex={1}
          onClick={() => {
            setOpen((prev) => !prev);
            if (!open) {
              onFocus('user_type');
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setOpen(true);
              requestAnimationFrame(updatePosition);
              onFocus('user_type');
            } else {
              onKeyDown(e, 'user_type');
            }
          }}
          onTouchStart={(e) => onTouchStart(e, 'user_type')}
          onTouchEnd={(e) => onTouchEnd(e, 'user_type')}
          onFocus={() => onFocus('user_type')}
          onBlur={() => {
            // Delay blur, aby sa dropdown stihol otvoriť
            setTimeout(() => {
              if (!open) {
                onBlur('user_type');
              }
            }, 200);
          }}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent outline-none transition-all bg-white dark:bg-black text-gray-900 dark:text-white text-left flex items-center justify-between cursor-pointer hover:border-gray-400 dark:hover:border-gray-600"
        >
          <span>{labelFor(value)}</span>
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
            {ACCOUNT_TYPE_OPTIONS.map(({ value: v }) => (
              <button
                key={v}
                role="option"
                aria-selected={value === v}
                onClick={() => handleValueChange(v)}
                className={`w-full text-left px-4 py-2 text-sm rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 dark:focus-visible:ring-purple-600 ${
                  value === v
                    ? 'bg-purple-100 text-purple-700 font-semibold dark:bg-purple-900/30 dark:text-purple-200'
                    : 'text-gray-800 hover:bg-gray-100/90 dark:text-gray-100 dark:hover:bg-[#18181c]'
                }`}
              >
                {t(ACCOUNT_TYPE_OPTIONS.find(o => o.value === v)!.labelKey)}
              </button>
            ))}
          </div>,
          portalRoot
        )}
      </div>
      <div id="user-type-help" className="sr-only">{t('auth.selectAccountTypeHelp')}</div>
    </div>
  );
}


