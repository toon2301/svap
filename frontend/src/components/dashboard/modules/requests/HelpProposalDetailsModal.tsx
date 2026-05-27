'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import { RequestProposalPreview } from './RequestProposalPreview';
import type { SkillRequest } from './types';

type HelpProposalDetailsModalProps = {
  open: boolean;
  item: SkillRequest | null;
  onClose: () => void;
};

export function HelpProposalDetailsModal({
  open,
  item,
  onClose,
}: HelpProposalDetailsModalProps) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  if (!mounted || !open || !item) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:px-4 sm:py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-proposal-details-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-3xl border-t border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-[#111113] sm:max-w-lg sm:rounded-2xl sm:border">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div>
            <h2 id="help-proposal-details-title" className="text-lg font-semibold text-gray-950 dark:text-white">
              {t('requests.showProposalModalTitle', 'Ponuka pomoci')}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t('requests.showProposalModalSubtitle', 'Detaily, ktoré odosielateľ vyplnil pri ponuke pomoci.')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-gray-100"
            aria-label={t('common.close', 'Zavrieť')}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 sm:pb-4">
          <RequestProposalPreview item={item} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
