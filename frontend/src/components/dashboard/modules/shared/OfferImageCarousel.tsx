'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import ImageWithStatusOverlay from '@/components/shared/ImageWithStatusOverlay';

interface OfferImage {
  id?: number;
  image_url?: string | null;
  image?: string | null;
  order?: number | null;
  status?: 'pending' | 'approved' | 'rejected' | string;
  rejected_reason?: string | null;
}

interface OfferImageCarouselProps {
  images?: OfferImage[];
  alt: string;
  intervalMs?: number;
}

type PreparedImage = {
  key: string;
  src: string | null;
  order: number;
  status?: OfferImage['status'];
  rejected_reason?: OfferImage['rejected_reason'];
};

const DEFAULT_INTERVAL = 5000;

const OfferImageCarousel: React.FC<OfferImageCarouselProps> = ({
  images,
  alt,
  intervalMs = DEFAULT_INTERVAL,
}) => {
  const { t } = useLanguage();
  const preparedImages: PreparedImage[] = useMemo(() => {
    if (!Array.isArray(images)) {
      return [];
    }

    return images
      .map((img, index) => {
        const src = img?.image_url || img?.image || null;
        return {
          key: String(img?.id ?? `${index}-${src ?? 'no-src'}`),
          src,
          order:
            typeof img?.order === 'number'
              ? img.order
              : index,
          status: img?.status,
          rejected_reason: img?.rejected_reason,
        };
      })
      .sort((a, b) => a.order - b.order);
  }, [images]);

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);

    if (preparedImages.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % preparedImages.length);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [preparedImages, intervalMs]);

  if (preparedImages.length === 0) {
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
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
            />
          </svg>
          <span className="text-[11px] uppercase tracking-wide opacity-70">
            {t('skills.noPhoto', 'Bez fotografie')}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      {preparedImages.map((img, idx) => {
        const isActive = idx === activeIndex;
        return (
          <ImageWithStatusOverlay
            key={img.key}
            image_url={img.src}
            alt={alt}
            status={img.status}
            rejected_reason={img.rejected_reason ?? null}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            imgClassName="h-full w-full object-cover"
          />
        );
      })}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/15 via-transparent to-transparent" />
    </div>
  );
};

export default OfferImageCarousel;


