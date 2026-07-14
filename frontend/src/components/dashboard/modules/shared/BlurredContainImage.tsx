'use client';

/* eslint-disable @next/next/no-img-element */

import React from 'react';
import { useProtectedImage } from './useProtectedImage';

type BlurredContainImageProps = {
  src: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  loading?: React.ImgHTMLAttributes<HTMLImageElement>['loading'];
  decoding?: React.ImgHTMLAttributes<HTMLImageElement>['decoding'];
};

export default function BlurredContainImage({
  src,
  alt,
  className = '',
  imageClassName = '',
  loading,
  decoding = 'async',
}: BlurredContainImageProps) {
  // Chránený portfolio obrázok načítame raz; rovnakú object URL použijeme pre
  // rozmazané pozadie aj hlavný obrázok. Verejné obrázky prejdú priamo.
  const { resolvedSrc } = useProtectedImage(src);
  const imageProps = { src: resolvedSrc ?? '', loading, decoding };

  return (
    <div className={`h-full w-full overflow-hidden bg-gray-100 dark:bg-[#0e0e0f] ${className}`}>
      <div className="relative h-full w-full">
        {/* Počas načítania/chyby ostáva len neutrálne pozadie (žiadna broken-image ikona). */}
        {resolvedSrc ? (
          <>
            <img
              {...imageProps}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl brightness-90"
            />
            <div className="absolute inset-0 bg-black/10 dark:bg-black/20" aria-hidden="true" />
            <img
              {...imageProps}
              alt={alt}
              className={`absolute inset-0 h-full w-full object-contain ${imageClassName}`}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
