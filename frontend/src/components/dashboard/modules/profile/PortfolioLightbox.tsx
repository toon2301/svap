'use client';

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import type { PortfolioDisplayImage } from './portfolioDisplay';
import { formatPortfolioPhotoCounter } from './portfolioDisplay';

type PortfolioLightboxProps = {
  open: boolean;
  images: PortfolioDisplayImage[];
  initialIndex: number;
  alt: string;
  onClose: () => void;
};

const SWIPE_MIN_DISTANCE = 50;
const SWIPE_HORIZONTAL_DOMINANCE_RATIO = 1.25;

function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return Math.min(Math.max(index, 0), length - 1);
}

export function PortfolioLightbox({
  open,
  images,
  initialIndex,
  alt,
  onClose,
}: PortfolioLightboxProps) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const activeImage = images[clampIndex(activeIndex, images.length)];
  const hasMultipleImages = images.length > 1;

  const goToPrevious = useCallback(() => {
    if (!hasMultipleImages) return;
    setActiveIndex((current) => (current === 0 ? images.length - 1 : current - 1));
  }, [hasMultipleImages, images.length]);

  const goToNext = useCallback(() => {
    if (!hasMultipleImages) return;
    setActiveIndex((current) => (current + 1) % images.length);
  }, [hasMultipleImages, images.length]);

  const counterText = useMemo(
    () =>
      formatPortfolioPhotoCounter(
        t('portfolio.photoCounter'),
        clampIndex(activeIndex, images.length) + 1,
        images.length,
      ),
    [activeIndex, images.length, t],
  );

  useEffect(() => {
    setMounted(true);
    if (typeof document !== 'undefined') {
      setPortalNode(document.getElementById('app-root') ?? document.body);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setActiveIndex(clampIndex(initialIndex, images.length));
  }, [images.length, initialIndex, open]);

  useEffect(() => {
    if (open && images.length === 0) {
      onClose();
    }
  }, [images.length, onClose, open]);

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
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

  if (!mounted || !portalNode || !open || !activeImage) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[112] flex items-center justify-center bg-black/95 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('portfolio.gallery')}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        className="absolute right-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white transition-colors hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white/60"
        aria-label={t('portfolio.closeLightbox')}
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
            className="absolute left-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white transition-colors hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white/60 sm:inline-flex"
            aria-label={t('portfolio.previousPhoto')}
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              goToNext();
            }}
            className="absolute right-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white transition-colors hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white/60 sm:inline-flex"
            aria-label={t('portfolio.nextPhoto')}
          >
            <ChevronRightIcon className="h-6 w-6" />
          </button>
        </>
      )}

      <div
        className="flex max-h-full max-w-full items-center justify-center"
        onClick={(event) => event.stopPropagation()}
        onTouchStart={(event) => {
          const touch = event.touches[0];
          touchStartRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
        }}
        onTouchEnd={(event) => {
          const start = touchStartRef.current;
          const touch = event.changedTouches[0];
          touchStartRef.current = null;
          if (!start || !touch || !hasMultipleImages) return;
          const deltaX = touch.clientX - start.x;
          const deltaY = touch.clientY - start.y;
          if (
            Math.abs(deltaX) < SWIPE_MIN_DISTANCE ||
            Math.abs(deltaX) < Math.abs(deltaY) * SWIPE_HORIZONTAL_DOMINANCE_RATIO
          ) {
            return;
          }
          if (deltaX < 0) {
            goToNext();
          } else {
            goToPrevious();
          }
        }}
      >
        <img
          src={activeImage.largeSrc}
          alt={alt}
          className="max-h-[calc(100vh-2rem)] max-w-full rounded-2xl object-contain shadow-2xl"
        />
      </div>

      {hasMultipleImages && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white">
          {counterText}
        </div>
      )}
    </div>,
    portalNode,
  );
}
