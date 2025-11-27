'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { UNIT_OPTIONS, UnitOption } from './types';

interface ExperienceUnitSelectProps {
  value: UnitOption;
  onChange: (value: UnitOption) => void;
}

export default function ExperienceUnitSelect({ value, onChange }: ExperienceUnitSelectProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const target = document.getElementById('app-root') ?? document.body;
    setPortalRoot(target);
  }, []);

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.max(120, rect.width);
    const estimatedMenuH = UNIT_OPTIONS.length * 36 + 12;
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
  }, [open]);

  const labelFor = (opt: UnitOption) => (opt === 'years' ? t('skills.years', 'rokov') : t('skills.months', 'mesiacov'));

  return (
    <div className="relative h-full flex items-center">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
            requestAnimationFrame(updatePosition);
          }
        }}
        className="relative h-full flex items-center gap-2 px-3 pr-9 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 dark:focus-visible:ring-purple-600 rounded-r-lg cursor-pointer"
      >
        {labelFor(value)}
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400 dark:text-gray-400">
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
          {UNIT_OPTIONS.map(({ value: v }) => (
            <button
              key={v}
              role="option"
              aria-selected={value === v}
              onClick={() => {
                onChange(v);
                setOpen(false);
                triggerRef.current?.focus();
              }}
              className={`w-full text-left px-4 py-2 text-sm rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 dark:focus-visible:ring-purple-600 ${
                value === v
                  ? 'bg-purple-100 text-purple-700 font-semibold dark:bg-purple-900/30 dark:text-purple-200'
                  : 'text-gray-800 hover:bg-gray-100/90 dark:text-gray-100 dark:hover:bg-[#18181c]'
              }`}
            >
              {labelFor(v)}
            </button>
          ))}
        </div>,
        portalRoot
      )}
    </div>
  );
}

