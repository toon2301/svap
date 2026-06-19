'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { CameraIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  PORTFOLIO_ALLOWED_IMAGE_EXTENSIONS,
  PORTFOLIO_IMAGE_ACCEPT,
  PORTFOLIO_IMAGE_MAX_BYTES,
  PORTFOLIO_IMAGE_MAX_COUNT,
  portfolioPhotosRemainingText,
} from './portfolioFormUtils';

type PortfolioCreatePhotoPickerProps = {
  files: File[];
  disabled?: boolean;
  onChange: (files: File[]) => void;
};

type PreviewItem = {
  file: File;
  url: string;
};

const allowedExtensions = new Set<string>(PORTFOLIO_ALLOWED_IMAGE_EXTENSIONS);

function fileExtension(file: File): string {
  const name = String(file.name || '');
  const dotIndex = name.lastIndexOf('.');
  return dotIndex >= 0 ? name.slice(dotIndex + 1).toLowerCase() : '';
}

function isSupportedImage(file: File): boolean {
  return allowedExtensions.has(fileExtension(file));
}

function createPreviewUrl(file: File): string {
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return '';
  }
  return URL.createObjectURL(file);
}

function revokePreviewUrl(url: string): void {
  if (!url || typeof URL === 'undefined' || typeof URL.revokeObjectURL !== 'function') {
    return;
  }
  URL.revokeObjectURL(url);
}

export function PortfolioCreatePhotoPicker({
  files,
  disabled = false,
  onChange,
}: PortfolioCreatePhotoPickerProps) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previews, setPreviews] = useState<PreviewItem[]>([]);
  const [selectionError, setSelectionError] = useState<string | null>(null);

  useEffect(() => {
    const nextPreviews = files.map((file) => ({
      file,
      url: createPreviewUrl(file),
    }));
    setPreviews(nextPreviews);

    return () => {
      nextPreviews.forEach((preview) => revokePreviewUrl(preview.url));
    };
  }, [files]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.currentTarget.value = '';
    if (selectedFiles.length === 0 || disabled) return;

    let slotsLeft = Math.max(0, PORTFOLIO_IMAGE_MAX_COUNT - files.length);
    const accepted: File[] = [];
    let nextError: string | null = null;

    for (const file of selectedFiles) {
      if (slotsLeft <= 0) {
        nextError = t('portfolio.maxPhotosLimit');
        break;
      }
      if (!isSupportedImage(file)) {
        nextError = t('portfolio.invalidPhotoType');
        continue;
      }
      if (file.size > PORTFOLIO_IMAGE_MAX_BYTES) {
        nextError = t('portfolio.photoTooLarge');
        continue;
      }
      accepted.push(file);
      slotsLeft -= 1;
    }

    if (accepted.length > 0) {
      onChange([...files, ...accepted]);
    }
    setSelectionError(nextError);
  };

  const removeFileAt = (index: number) => {
    onChange(files.filter((_, currentIndex) => currentIndex !== index));
    setSelectionError(null);
  };

  const isLimitReached = files.length >= PORTFOLIO_IMAGE_MAX_COUNT;

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-3">
        {!isLimitReached && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-gray-300 text-gray-500 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-400/50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-900/40"
            aria-label={t('portfolio.selectPhotos')}
          >
            <CameraIcon className="h-7 w-7" aria-hidden="true" />
          </button>
        )}
        {previews.map((preview, index) => (
          <div
            key={`${preview.file.name}-${preview.file.size}-${index}`}
            className="relative h-20 w-20 overflow-hidden rounded-lg border border-gray-300 bg-gray-100 dark:border-gray-700 dark:bg-[#101011]"
          >
            {preview.url ? (
              <img
                src={preview.url}
                alt={`${t('portfolio.photoPreview')} ${index + 1}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center px-2 text-center text-xs text-gray-500 dark:text-gray-400">
                {preview.file.name}
              </div>
            )}
            <button
              type="button"
              disabled={disabled}
              onClick={() => removeFileAt(index)}
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/65 text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label={t('portfolio.removePhoto')}
            >
              <XMarkIcon className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>

      <input
        ref={inputRef}
        data-testid="portfolio-create-photo-input"
        type="file"
        multiple
        accept={PORTFOLIO_IMAGE_ACCEPT}
        className="hidden"
        onChange={handleFileChange}
      />

      {selectionError && (
        <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
          {selectionError}
        </p>
      )}
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        {portfolioPhotosRemainingText(t, Math.max(0, PORTFOLIO_IMAGE_MAX_COUNT - files.length))}
      </p>
    </div>
  );
}
