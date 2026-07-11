'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { CameraIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
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
  variant?: 'row' | 'panel';
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
  variant = 'row',
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
    if (nextError) {
      toast.error(nextError);
    }
  };

  const removeFileAt = (index: number) => {
    onChange(files.filter((_, currentIndex) => currentIndex !== index));
    setSelectionError(null);
  };

  const isLimitReached = files.length >= PORTFOLIO_IMAGE_MAX_COUNT;
  const remainingText = portfolioPhotosRemainingText(
    t,
    Math.max(0, PORTFOLIO_IMAGE_MAX_COUNT - files.length),
  );

  const input = (
    <input
      ref={inputRef}
      data-testid="portfolio-create-photo-input"
      type="file"
      multiple
      accept={PORTFOLIO_IMAGE_ACCEPT}
      className="hidden"
      onChange={handleFileChange}
    />
  );

  if (variant === 'panel') {
    return (
      <div className="w-full">
        {!isLimitReached && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="flex min-h-[132px] w-full flex-col items-center justify-center rounded-[24px] border border-dashed border-purple-200 bg-purple-50/40 px-5 py-6 text-center text-gray-700 transition hover:border-purple-300 hover:bg-purple-50 focus:outline-none focus:ring-4 focus:ring-purple-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-purple-900/60 dark:bg-purple-950/10 dark:text-gray-200 dark:hover:bg-purple-950/20 dark:focus:ring-purple-950/40"
            aria-label={t('portfolio.selectPhotos')}
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-purple-600 shadow-sm ring-1 ring-purple-100 dark:bg-[#151517] dark:text-purple-300 dark:ring-purple-900/60">
              <CameraIcon className="h-7 w-7" aria-hidden="true" />
            </span>
            <span className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">
              {t('portfolio.selectPhotos')}
            </span>
          </button>
        )}

        {previews.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            {previews.map((preview, index) => (
              <div
                key={`${preview.file.name}-${preview.file.size}-${index}`}
                className="relative aspect-square overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 shadow-sm dark:border-gray-800 dark:bg-[#101011]"
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
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/65 text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label={t('portfolio.removePhoto')}
                >
                  <XMarkIcon className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}

        {input}

        {selectionError && (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
            {selectionError}
          </p>
        )}
        <p className="mt-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
          {remainingText}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-start">
        <span className="w-36 shrink-0 pl-2 pr-3 pt-7 text-base font-medium text-gray-900 dark:text-white sm:w-40">
          {t('portfolio.photosLabel')}
        </span>
        <div className="flex min-w-0 flex-1 items-start pr-2">
          <div className="mr-3 mt-7 h-5 w-px shrink-0 bg-gray-300 dark:bg-gray-700" />
          <div className="w-full">
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
          </div>
        </div>
      </div>

      {previews.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-3 px-2">
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
      )}

      {input}

      {selectionError && (
        <p className="mx-2 mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
          {selectionError}
        </p>
      )}
      <p className="mt-2 px-2 text-xs text-gray-500 dark:text-gray-400">
        {remainingText}
      </p>
    </div>
  );
}
