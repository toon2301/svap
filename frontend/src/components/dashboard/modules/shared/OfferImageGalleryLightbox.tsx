'use client';

/* eslint-disable @next/next/no-img-element */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bars3Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import { ReportPhotoModal, type ReportPhotoTarget } from './ReportPhotoModal';

type OfferGalleryImage = {
  id?: number;
  image_url?: string | null;
  image?: string | null;
  order?: number | null;
};

type PreparedGalleryImage = {
  key: string;
  id?: number;
  src: string;
  order: number;
};

type LightboxReportTarget =
  | { type: 'offer_image'; skillId: number }
  | { type: 'user_avatar'; userId: number };

type OfferImageGalleryLightboxProps = {
  open: boolean;
  images?: OfferGalleryImage[];
  initialIndex?: number;
  alt: string;
  onClose: () => void;
  reportTarget?: LightboxReportTarget;
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
  reportTarget,
}: OfferImageGalleryLightboxProps) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isReportMenuOpen, setIsReportMenuOpen] = useState(false);
  const [reportModalTarget, setReportModalTarget] = useState<ReportPhotoTarget | null>(null);
  const [reportedTargetKeys, setReportedTargetKeys] = useState<Set<string>>(() => new Set());

  const preparedImages: PreparedGalleryImage[] = useMemo(() => {
    if (!Array.isArray(images)) {
      return [];
    }

    return images
      .map((img, index) => {
        const src = img?.image_url || img?.image || '';
        return {
          key: String(img?.id ?? `${index}-${src}`),
          id: typeof img?.id === 'number' ? img.id : undefined,
          src,
          order: typeof img?.order === 'number' ? img.order : index,
        };
      })
      .filter((img) => Boolean(img.src))
      .sort((a, b) => a.order - b.order);
  }, [images]);

  const hasMultipleImages = preparedImages.length > 1;
  const activeImage = preparedImages[activeIndex] ?? null;

  const activeReportTarget: ReportPhotoTarget | null = useMemo(() => {
    if (!reportTarget || !activeImage) return null;

    if (reportTarget.type === 'user_avatar') {
      return {
        type: 'user_avatar',
        userId: reportTarget.userId,
      };
    }

    if (typeof activeImage.id !== 'number') return null;

    return {
      type: 'offer_image',
      skillId: reportTarget.skillId,
      imageId: activeImage.id,
    };
  }, [activeImage, reportTarget]);

  const activeReportTargetKey = useMemo(() => {
    if (!activeReportTarget) return null;
    if (activeReportTarget.type === 'offer_image') {
      return `offer:${activeReportTarget.skillId}:${activeReportTarget.imageId}`;
    }
    return `avatar:${activeReportTarget.userId}`;
  }, [activeReportTarget]);

  const isActiveReportTargetReported =
    activeReportTargetKey !== null && reportedTargetKeys.has(activeReportTargetKey);

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
      setIsReportMenuOpen(false);
      setReportModalTarget(null);
      return;
    }

    setActiveIndex(clampIndex(initialIndex, preparedImages.length));
  }, [initialIndex, open, preparedImages.length]);

  useEffect(() => {
    setIsReportMenuOpen(false);
  }, [activeIndex]);

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
      if (reportModalTarget) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        if (isReportMenuOpen) {
          setIsReportMenuOpen(false);
          return;
        }
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
  }, [goToNext, goToPrevious, isReportMenuOpen, onClose, open, reportModalTarget]);

  const openReportModal = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      if (!activeReportTarget || isActiveReportTargetReported) return;
      setReportModalTarget(activeReportTarget);
      setIsReportMenuOpen(false);
    },
    [activeReportTarget, isActiveReportTargetReported],
  );

  const handleReportSuccess = useCallback((target: ReportPhotoTarget) => {
    const targetKey =
      target.type === 'offer_image'
        ? `offer:${target.skillId}:${target.imageId}`
        : `avatar:${target.userId}`;
    setReportedTargetKeys((current) => {
      const next = new Set(current);
      next.add(targetKey);
      return next;
    });
  }, []);

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
      <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
        {activeReportTarget && (
          <div className="relative">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setIsReportMenuOpen((current) => !current);
              }}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white transition-colors hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white/60"
              aria-label={t('skills.photoActions', 'Moznosti fotky')}
              aria-haspopup="menu"
              aria-expanded={isReportMenuOpen}
            >
              <Bars3Icon className="h-5 w-5" />
            </button>

            {isReportMenuOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-xl border border-white/15 bg-black/85 p-1 shadow-2xl backdrop-blur"
                role="menu"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={openReportModal}
                  disabled={isActiveReportTargetReported}
                  className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:text-white/45 disabled:hover:bg-transparent"
                  role="menuitem"
                >
                  {isActiveReportTargetReported
                    ? t('skills.reportedPhoto', 'Nahlasene')
                    : t('skills.reportPhoto', 'Nahlasit fotku')}
                </button>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white transition-colors hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white/60"
          aria-label={t('common.close', 'Zavrieť')}
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

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

      <ReportPhotoModal
        open={Boolean(reportModalTarget)}
        target={reportModalTarget}
        onClose={() => setReportModalTarget(null)}
        onSuccess={handleReportSuccess}
      />
    </div>,
    portalNode,
  );
}
