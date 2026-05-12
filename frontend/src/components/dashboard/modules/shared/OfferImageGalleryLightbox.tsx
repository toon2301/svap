'use client';

/* eslint-disable @next/next/no-img-element */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';

type OfferGalleryImage = {
  id?: number;
  image_url?: string | null;
  image?: string | null;
  order?: number | null;
};

type PreparedGalleryImage = {
  key: string;
  src: string;
  order: number;
};

type OfferImageGalleryLightboxProps = {
  open: boolean;
  images?: OfferGalleryImage[];
  initialIndex?: number;
  alt: string;
  onClose: () => void;
};

function clampIndex(index: number, length: number) {
  if (length <= 0) return 0;
  return Math.min(Math.max(index, 0), length - 1);
}

export default function OfferImageGalleryLightbox({
  open,
  images,
  initialIndex = 0,
  alt,
  onClose,
}: OfferImageGalleryLightboxProps) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const preparedImages: PreparedGalleryImage[] = useMemo(() => {
    if (!Array.isArray(images)) {
      return [];
    }

    return images
      .map((img, index) => {
        const src = img?.image_url || img?.image || '';
        return {
          key: String(img?.id ?? `${index}-${src}`),
          src,
          order: typeof img?.order === 'number' ? img.order : index,
        };
      })
      .filter((img) => Boolean(img.src))
      .sort((a, b) => a.order - b.order);
  }, [images]);

  const hasMultipleImages = preparedImages.length > 1;
  const activeImage = preparedImages[activeIndex] ?? null;

  const goToPrevious = useCallback(() => {
    if (preparedImages.length <= 1) return;
    setActiveIndex((current) =>
      current === 0 ? preparedImages.length - 1 : current - 1,
    );
  }, [preparedImages.length]);

  const goToNext = useCallback(() => {
    if (preparedImages.length <= 1) return;
    setActiveIndex((current) => (current + 1) % preparedImages.length);
  }, [preparedImages.length]);

  useEffect(() => {
    setMounted(true);
    if (typeof document === 'undefined') {
      return;
    }

    setPortalNode(document.getElementById('app-root') ?? document.body);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    setActiveIndex(clampIndex(initialIndex, preparedImages.length));
  }, [initialIndex, open, preparedImages.length]);

  useEffect(() => {
    if (open && preparedImages.length === 0) {
      onClose();
    }
  }, [onClose, open, preparedImages.length]);

  useEffect(() => {
    if (!open || typeof document === 'undefined') {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goToPrevious();
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrevious, onClose, open]);

  if (!open || !activeImage || !mounted || !portalNode) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[112] flex items-center justify-center bg-black/95 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('skills.photos', 'Fotky')}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        className="absolute right-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white transition-colors hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white/60"
        aria-label={t('common.close', 'Zavrieť')}
      >
        <XMarkIcon className="h-5 w-5" />
      </button>

      {hasMultipleImages && (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              goToPrevious();
            }}
            className="absolute left-3 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white transition-colors hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white/60 sm:left-6"
            aria-label={t('common.previous', 'Predchádzajúce')}
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              goToNext();
            }}
            className="absolute right-3 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white transition-colors hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white/60 sm:right-6"
            aria-label={t('common.next', 'Ďalej')}
          >
            <ChevronRightIcon className="h-6 w-6" />
          </button>
        </>
      )}

      <div
        className="flex max-h-full max-w-full items-center justify-center"
        onClick={(event) => event.stopPropagation()}
      >
        <img
          src={activeImage.src}
          alt={alt}
          className="max-h-[calc(100vh-2rem)] max-w-full rounded-2xl object-contain shadow-2xl"
        />
      </div>

      {hasMultipleImages && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white">
          {activeIndex + 1} / {preparedImages.length}
        </div>
      )}
    </div>,
    portalNode,
  );
}
