'use client';

/**
 * Fotky príspevku (1–5).
 *
 * Jedna fotka = bez ovládania. Pri dvoch a viac pribudnú šípky + bodky a šípky
 * na klávesnici.
 *
 * ZÁMERNE nie `OfferImageCarousel`: ten sa automaticky pretáča časovačom, čo je
 * vhodné pre náhľad ponuky v zozname, ale nie pre feed – čítajúcemu by fotka
 * utiekla spod ruky.
 *
 * ZAMIETNUTÉ fotky sa NEZOBRAZUJÚ vôbec (ani autorovi ako slide) – autor dostane
 * len diskrétnu poznámku pod médiom. Keď po odfiltrovaní nezostane žiadna
 * zobraziteľná fotka, komponent nevykreslí médiovú plochu a príspevok pôsobí
 * ako čisto textový (žiadne prázdne miesto).
 *
 * Výška plochy je JEDNOTNÁ pre všetky fotky a obrázok sa do nej vkladá cez
 * `object-contain` s rozmazaným pozadím – `BlurredContainImage` je ten istý
 * komponent, aký na letterbox používa portfólio/ponuky.
 *
 * Klik na fotku otvára `ImageLightbox` – to isté jadro, aké má fullscreen
 * prehliadač portfólia, takže ovládanie (X, Escape, šípky, swipe) je zhodné.
 * Do prehliadača idú LEN fotky, ktoré sa dajú zobraziť: zamietnuté sú
 * odfiltrované rovnako ako na karte a rozpracovaná fotka ešte nemá URL, takže
 * sa nedá ani otvoriť.
 */

import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import BlurredContainImage from '../shared/BlurredContainImage';
import { ImageLightbox } from '../shared/ImageLightbox';
import { translateImageRejection } from './feedImageRejection';
import type { FeedPostImage } from '@/lib/feedApi';

type FeedPostImageCarouselProps = {
  images: FeedPostImage[];
  alt: string;
  /**
   * Prepíše, čo sa stane po kliknutí na fotku.
   *
   * Vo feede otvára klik OKNO DETAILU (fotka je vstup do príspevku, nie do
   * galérie); bez tejto funkcie ostáva pôvodné správanie – fullscreen
   * prehliadač priamo, čo platí práve vnútri okna detailu.
   */
  onPhotoClick?: () => void;
};

/** Jednotná výška médiovej plochy – nič sa neoreže, dopĺňa sa rozmazaním. */
const MEDIA_HEIGHT = 'h-80 sm:h-96';

function imageSrc(image: FeedPostImage): string {
  return image.large_url || image.thumbnail_url || '';
}

/** Rozpracovaná fotka: jemný stav, žiadny nápadný blok. */
function ProcessingSlide() {
  const { t } = useLanguage();
  return (
    <div
      data-testid="feed-image-status"
      className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 via-gray-50 to-gray-200 dark:from-[#141415] dark:via-[#0f0f10] dark:to-[#0a0a0b]"
    >
      <span className="text-[11px] uppercase tracking-wide text-gray-400 opacity-70 dark:text-gray-500">
        {t('skills.imageProcessing', 'Spracúva sa…')}
      </span>
    </div>
  );
}

function Slide({
  image,
  alt,
  onOpen,
}: {
  image: FeedPostImage;
  alt: string;
  /** Chýba pri fotke bez URL – rozpracovanú nie je čo otvárať. */
  onOpen?: () => void;
}) {
  const { t } = useLanguage();
  const src = imageSrc(image);
  if (!src) return <ProcessingSlide />;
  const media = <BlurredContainImage src={src} alt={alt} loading="lazy" />;
  if (!onOpen) return media;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={t('feed.imageOpen', 'Otvoriť fotku na celú obrazovku')}
      data-testid={`feed-image-open-${image.id}`}
      className="block h-full w-full cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60"
    >
      {media}
    </button>
  );
}

export default function FeedPostImageCarousel({
  images,
  alt,
  onPhotoClick,
}: FeedPostImageCarouselProps) {
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);
  // Index do zoznamu ZOBRAZITEĽNÝCH fotiek; null = prehliadač je zatvorený.
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Zamietnuté sa nezobrazujú; cudziemu divákovi ich backend ani neposiela.
  const slides = images.filter((image) => image.status !== 'rejected');
  const rejected = images.filter((image) => image.status === 'rejected');
  const total = slides.length;

  // Do prehliadača ide len to, čo má skutočnú URL – rozpracovaná fotka je na
  // karte len stavová plocha a otvárať sa nedá.
  const viewable = slides.filter((image) => imageSrc(image));
  const lightboxSources = viewable.map(imageSrc);

  // Po obnovení feedu môže fotiek ubudnúť – index mimo rozsahu by vykreslil nič.
  useEffect(() => {
    setIndex((current) => (current >= total ? 0 : current));
  }, [total]);

  const openLightbox = useCallback(
    (image: FeedPostImage) => {
      if (onPhotoClick) {
        onPhotoClick();
        return;
      }
      const at = viewable.findIndex((candidate) => candidate.id === image.id);
      if (at < 0) return;
      setLightboxIndex(at);
    },
    [viewable, onPhotoClick],
  );

  const lightbox = (
    <ImageLightbox
      open={lightboxIndex !== null}
      sources={lightboxSources}
      initialIndex={lightboxIndex ?? 0}
      alt={alt}
      onClose={() => setLightboxIndex(null)}
      testId="feed-image-lightbox"
      labels={{
        dialog: t('feed.imageCarousel', 'Fotky príspevku'),
        close: t('common.close', 'Zavrieť'),
        previous: t('feed.imagePrev', 'Predchádzajúca fotka'),
        next: t('feed.imageNext', 'Ďalšia fotka'),
        // Rovnaký tvar ako počítadlo na karte, z ktorej sa prehliadač otvoril.
        counter: (current, count) => `${current}/${count}`,
      }}
    />
  );

  const go = useCallback(
    (delta: number) => {
      // Cyklicky: z poslednej doprava na prvú a naopak.
      setIndex((current) => (current + delta + total) % total);
    },
    [total],
  );

  // Diskrétna poznámka pre autora – nie nápadný blok. Cudzí divák sa o
  // zamietnutej fotke nedozvie vôbec (backend mu ju neposiela).
  const rejectedNote =
    rejected.length > 0 ? (
      <p
        data-testid="feed-image-rejected-note"
        className="px-4 pt-3 text-xs text-gray-500 dark:text-gray-400"
      >
        {translateImageRejection(t, rejected[0].rejected_reason)}
      </p>
    ) : null;

  if (total === 0) return rejectedNote;

  const active = slides[Math.min(index, total - 1)];

  if (total === 1) {
    return (
      <>
        <div data-testid="feed-post-image" className={`w-full ${MEDIA_HEIGHT}`}>
          <Slide
            image={active}
            alt={alt}
            onOpen={imageSrc(active) ? () => openLightbox(active) : undefined}
          />
        </div>
        {rejectedNote}
        {lightbox}
      </>
    );
  }

  return (
    <>
      <div
        data-testid="feed-post-image"
        className={`relative w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 ${MEDIA_HEIGHT}`}
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
        <Slide
          image={active}
          alt={`${alt} (${index + 1}/${total})`}
          onOpen={imageSrc(active) ? () => openLightbox(active) : undefined}
        />

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
          {slides.map((image, dotIndex) => (
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
      {rejectedNote}
      {lightbox}
    </>
  );
}
