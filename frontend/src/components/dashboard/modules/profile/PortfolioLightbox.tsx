'use client';

/**
 * Fullscreen prehliadač fotiek portfólia.
 *
 * Samotný obal (prekrytie, „X", šípky, počítadlo, swipe, klávesnica) žije
 * v spoločnom `ImageLightbox` – tu ostáva len to, čo je portfóliové: tvar dát
 * a hlášky. Nástenka používa to isté jadro s vlastnými hláškami, takže sa obe
 * miesta ovládajú rovnako.
 */

import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ImageLightbox } from '../shared/ImageLightbox';
import type { PortfolioDisplayImage } from './portfolioDisplay';
import { formatPortfolioPhotoCounter } from './portfolioDisplay';

type PortfolioLightboxProps = {
  open: boolean;
  images: PortfolioDisplayImage[];
  initialIndex: number;
  alt: string;
  onClose: () => void;
};

export function PortfolioLightbox({
  open,
  images,
  initialIndex,
  alt,
  onClose,
}: PortfolioLightboxProps) {
  const { t } = useLanguage();
  const sources = useMemo(
    () => images.map((image) => image.largeSrc),
    [images],
  );

  return (
    <ImageLightbox
      open={open}
      sources={sources}
      initialIndex={initialIndex}
      alt={alt}
      onClose={onClose}
      testId="portfolio-lightbox"
      labels={{
        dialog: t('portfolio.gallery'),
        close: t('portfolio.closeLightbox'),
        previous: t('portfolio.previousPhoto'),
        next: t('portfolio.nextPhoto'),
        counter: (current, total) =>
          formatPortfolioPhotoCounter(t('portfolio.photoCounter'), current, total),
      }}
    />
  );
}
