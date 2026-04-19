'use client';

import React from 'react';
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';

export function MessageComposerImagePreview({
  previewUrl,
  fileName,
  disabled = false,
  onRemove,
}: {
  previewUrl: string;
  fileName: string;
  disabled?: boolean;
  onRemove: () => void;
}) {
  const { t } = useLanguage();

  return (
    <div
      data-testid="message-composer-image-preview"
      className="border-b border-gray-200 px-3 pb-3 pt-3 dark:border-gray-800"
    >
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-[#141416]">
        <img
          src={previewUrl}
          alt={t('messages.imagePreview', 'Náhľad obrázka')}
          className="block max-h-56 w-full object-cover"
        />
        <button
          type="button"
          data-testid="message-composer-image-remove"
          onClick={onRemove}
          disabled={disabled}
          className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/60 bg-black/60 text-white transition-colors hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white/60 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={t('messages.removeAttachment', 'Odstrániť prílohu')}
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
        <PhotoIcon className="h-4 w-4 shrink-0" />
        <span className="truncate">{fileName}</span>
      </div>
    </div>
  );
}
