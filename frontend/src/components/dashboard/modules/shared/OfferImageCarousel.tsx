'use client';

/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import BlurredContainImage from './BlurredContainImage';

interface OfferImage {
  id?: number;
  image_url?: string | null;
  image?: string | null;
  order?: number | null;
  status?: string | null;
  rejected_reason?: string | null;
}

interface OfferImageCarouselProps {
  images?: OfferImage[];
  alt: string;
  intervalMs?: number;
  variant?: 'cover' | 'contain-blur';
}

type PreparedImage = {
  key: string;
  src: string;
  order: number;
};

const DEFAULT_INTERVAL = 5000;

/** Plocha „Bez fotografie“: ponuka nemá fotku, alebo sa žiadna z jej fotiek nenačítala. */
function NoPhotoPlaceholder() {
  const { t } = useLanguage();

  return (
    <div className="absolute inset-0 bg-gradient-to-br from-gray-100 via-gray-50 to-gray-200 dark:from-[#141415] dark:via-[#0f0f10] dark:to-[#0a0a0b] flex items-center justify-center">
      <div className="flex flex-col items-center text-gray-400 dark:text-gray-500">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="w-10 h-10 mb-1.5 opacity-60"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.75 7.5l1.027-1.37A1.5 1.5 0 0 1 9 5.5h6a1.5 1.5 0 0 1 1.223.63L17.25 7.5H19.5A1.5 1.5 0 0 1 21 9v7.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.5V9A1.5 1.5 0 0 1 4.5 7.5h2.25Z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
        </svg>
        <span className="text-[11px] uppercase tracking-wide opacity-70">{t('skills.noPhoto', 'Bez fotografie')}</span>
      </div>
    </div>
  );
}

/**
 * Automaticky sa pretáčajúce fotky ponuky. Fotka, ktorú sa nepodarilo načítať (zmazaný alebo nedostupný súbor), sa
 * v rotácii vynechá a „Bez fotografie“ sa ukáže až vtedy, keď zlyhajú všetky; platí pre oba varianty.
 */
const OfferImageCarousel: React.FC<OfferImageCarouselProps> = ({
  images,
  alt,
  intervalMs = DEFAULT_INTERVAL,
  variant = 'cover',
}) => {
  const { t } = useLanguage();
  const preparedImages: PreparedImage[] = useMemo(() => {
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

  const hasPendingImage = useMemo(() => {
    if (!Array.isArray(images)) return false;
    return images.some((img) => img.status === 'pending' && !img.image_url && !img.image);
  }, [images]);

  const hasRejectedImage = useMemo(() => {
    if (!Array.isArray(images)) return false;
    return images.some((img) => img.status === 'rejected' && !img.image_url && !img.image);
  }, [images]);

  const [activeIndex, setActiveIndex] = useState(0);

  // Adresy fotiek, ktorých načítanie zlyhalo. Viažu sa na adresu, takže nová adresa tej istej fotky sa skúsi znova.
  const [failedSrcs, setFailedSrcs] = useState<readonly string[]>([]);
  /** Zapíše adresu fotky, ktorej načítanie zlyhalo (opakované hlásenie tej istej adresy nič nezmení). */
  const markFailed = (src: string) =>
    setFailedSrcs((prev) => (prev.includes(src) ? prev : [...prev, src]));

  // Zobraziť sa dajú len fotky, ktoré nezlyhali; rotácia ide cez ne.
  const visibleImages = useMemo(
    () => preparedImages.filter((img) => !failedSrcs.includes(img.src)),
    [preparedImages, failedSrcs],
  );
  const visibleCountRef = useRef(visibleImages.length);
  visibleCountRef.current = visibleImages.length;

  useEffect(() => {
    setActiveIndex(0);

    if (preparedImages.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      // Počet zobraziteľných fotiek sa mení, keď niektorá zlyhá, preto sa číta z referencie, nie z uzáveru.
      const count = visibleCountRef.current;
      setActiveIndex((prev) => (count > 1 ? (prev + 1) % count : 0));
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [preparedImages, intervalMs]);

  if (preparedImages.length === 0) {
    if (hasPendingImage) {
      return (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 via-gray-50 to-gray-200 dark:from-[#141415] dark:via-[#0f0f10] dark:to-[#0a0a0b] flex items-center justify-center">
          <div className="flex flex-col items-center text-gray-400 dark:text-gray-500">
            <svg
              className="w-8 h-8 mb-1.5 opacity-70 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 12a8 8 0 018-8" />
            </svg>
            <span className="text-[11px] uppercase tracking-wide opacity-70">
              {t('skills.imageProcessing', 'Spracúva sa…')}
            </span>
          </div>
        </div>
      );
    }

    if (hasRejectedImage) {
      return (
        <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-gray-50 to-gray-100 dark:from-[#1a0f0f] dark:via-[#0f0f10] dark:to-[#0a0a0b] flex items-center justify-center">
          <div className="flex flex-col items-center text-red-400 dark:text-red-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="w-8 h-8 mb-1.5 opacity-70"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <span className="text-[11px] uppercase tracking-wide opacity-70">
              {t('skills.imageRejected', 'Fotka zamietnutá')}
            </span>
          </div>
        </div>
      );
    }

  }

  // Ponuka nemá fotku, alebo sa nenačítala ani jedna.
  if (visibleImages.length === 0) {
    return <NoPhotoPlaceholder />;
  }

  // Index po zlyhaní fotky môže presiahnuť počet zobraziteľných; ďalšia fotka tak nastúpi na jej miesto.
  const shownIndex = activeIndex % visibleImages.length;

  return (
    <div className="absolute inset-0">
      {visibleImages.map((img, idx) => {
        const imageClassName = `absolute inset-0 transition-opacity duration-700 ease-in-out ${
          idx === shownIndex ? 'opacity-100' : 'opacity-0'
        }`;
        const loading = idx === 0 ? 'eager' : 'lazy';

        return variant === 'contain-blur' ? (
          <BlurredContainImage
            key={img.key}
            src={img.src}
            alt={alt}
            className={imageClassName}
            loading={loading}
            onError={() => markFailed(img.src)}
          />
        ) : (
          <img
            key={img.key}
            src={img.src}
            alt={alt}
            className={`${imageClassName} h-full w-full object-cover`}
            loading={loading}
            onError={() => markFailed(img.src)}
          />
        );
      })}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/15 via-transparent to-transparent" />
    </div>
  );
};

export default OfferImageCarousel;
