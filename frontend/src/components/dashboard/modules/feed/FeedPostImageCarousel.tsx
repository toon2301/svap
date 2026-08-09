'use client';

/* eslint-disable @next/next/no-img-element */

/**
 * Fotky príspevku (1–5).
 *
 * Jedna fotka = presne ako do Fázy 4.3, žiadne ovládanie navyše. Pri dvoch a
 * viac pribudnú šípky + bodky a šípky na klávesnici.
 *
 * ZÁMERNE nie `OfferImageCarousel`: ten sa automaticky pretáča časovačom, čo
 * je vhodné pre náhľad ponuky v zozname, ale nie pre feed – čítajúcemu by
 * fotka utiekla spod ruky. Prebrané je z neho vizuálne stvárnenie stavov
 * spracovania (pending/rejected), aby appka vyzerala jednotne.
 */

import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { FeedPostImage } from '@/lib/feedApi';

type FeedPostImageCarouselProps = {
  images: FeedPostImage[];
  alt: string;
};

function ProcessingOverlay({ image }: { image: FeedPostImage }) {
  const { t } = useLanguage();
  const rejected = image.status === 'rejected';

  return (
    <div
      data-testid="feed-image-status"
      className={`flex h-full min-h-[12rem] w-full items-center justify-center ${
        rejected
          ? 'bg-gradient-to-br from-red-50 via-gray-50 to-gray-100 dark:from-[#1a0f0f] dark:via-[#0f0f10] dark:to-[#0a0a0b]'
          : 'bg-gradient-to-br from-gray-100 via-gray-50 to-gray-200 dark:from-[#141415] dark:via-[#0f0f10] dark:to-[#0a0a0b]'
      }`}
    >
      <div
        className={`flex flex-col items-center px-4 text-center ${
          rejected
            ? 'text-red-400 dark:text-red-500'
            : 'text-gray-400 dark:text-gray-500'
        }`}
      >
        <span className="text-[11px] uppercase tracking-wide opacity-70">
          {rejected
            ? t('skills.imageRejected', 'Fotka zamietnutá')
            : t('skills.imageProcessing', 'Spracúva sa…')}
        </span>
        {rejected && image.rejected_reason ? (
          <span className="mt-1 text-xs opacity-80">{image.rejected_reason}</span>
        ) : null}
      </div>
    </div>
  );
}

function Slide({ image, alt }: { image: FeedPostImage; alt: string }) {
  const src = image.large_url || image.thumbnail_url || '';
  if (!src) return <ProcessingOverlay image={image} />;
  return (
    <img
      src={src}
      alt={alt}
      className="max-h-[28rem] w-full bg-gray-100 object-cover dark:bg-gray-800"
      loading="lazy"
    />
  );
}

export default function FeedPostImageCarousel({
  images,
  alt,
}: FeedPostImageCarouselProps) {
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);
  const total = images.length;

  // Po obnovení feedu môže fotiek ubudnúť – index mimo rozsahu by vykreslil nič.
  useEffect(() => {
    setIndex((current) => (current >= total ? 0 : current));
  }, [total]);

  const go = useCallback(
    (delta: number) => {
      // Cyklicky: z poslednej doprava na prvú a naopak.
      setIndex((current) => (current + delta + total) % total);
    },
    [total],
  );

  if (total === 0) return null;

  // Jedna fotka: bez ovládania, presne ako pred Fázou 4.4.
  if (total === 1) {
    return (
      <div data-testid="feed-post-image">
        <Slide image={images[0]} alt={alt} />
      </div>
    );
  }

  const active = images[Math.min(index, total - 1)];

  return (
    <div
      data-testid="feed-post-image"
      className="relative focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60"
      role="group"
      aria-roledescription="carousel"
      aria-label={t('feed.imageCarousel', 'Fotky príspevku')}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          go(-1);
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          go(1);
        }
      }}
    >
      <Slide image={active} alt={`${alt} (${index + 1}/${total})`} />

      <button
        type="button"
        onClick={() => go(-1)}
        data-testid="feed-image-prev"
        aria-label={t('feed.imagePrev', 'Predchádzajúca fotka')}
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white transition-colors hover:bg-black/65"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => go(1)}
        data-testid="feed-image-next"
        aria-label={t('feed.imageNext', 'Ďalšia fotka')}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white transition-colors hover:bg-black/65"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <div
        className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/35 px-2 py-1"
        data-testid="feed-image-dots"
      >
        {images.map((image, dotIndex) => (
          <button
            key={image.id}
            type="button"
            onClick={() => setIndex(dotIndex)}
            aria-label={t('feed.imageGoTo', 'Zobraziť fotku {n}').replace(
              '{n}',
              String(dotIndex + 1),
            )}
            aria-current={dotIndex === index}
            className={`h-1.5 w-1.5 rounded-full transition-colors ${
              dotIndex === index ? 'bg-white' : 'bg-white/45 hover:bg-white/70'
            }`}
          />
        ))}
      </div>

      {/* Počet je aj textovo – bodky sú pri piatich fotkách ťažko spočítateľné. */}
      <span className="absolute right-2 top-2 rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-medium tabular-nums text-white">
        {index + 1}/{total}
      </span>
    </div>
  );
}
