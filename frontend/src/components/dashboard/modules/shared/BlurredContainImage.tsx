'use client';

/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useRef } from 'react';
import { useProtectedImage } from './useProtectedImage';

type BlurredContainImageProps = {
  src: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  loading?: React.ImgHTMLAttributes<HTMLImageElement>['loading'];
  decoding?: React.ImgHTMLAttributes<HTMLImageElement>['decoding'];
  /**
   * Volané, keď sa obrázok nepodarilo načítať: verejná adresa (napr. zmazaná fotka) aj chránený obrázok, ktorého
   * stiahnutie zlyhalo. Rodič tak môže namiesto pokazeného obrázka ukázať náhradu; bez neho ostáva len neutrálne pozadie.
   */
  onError?: () => void;
};

/** Obrázok vložený do rámu cez `object-contain` s rozmazaným pozadím; zlyhanie načítania hlási cez `onError`. */
export default function BlurredContainImage({
  src,
  alt,
  className = '',
  imageClassName = '',
  loading,
  decoding = 'async',
  onError,
}: BlurredContainImageProps) {
  // Chránený portfolio obrázok načítame raz; rovnakú object URL použijeme pre
  // rozmazané pozadie aj hlavný obrázok. Verejné obrázky prejdú priamo.
  const { resolvedSrc, isError } = useProtectedImage(src);
  const imageProps = { src: resolvedSrc ?? '', loading, decoding };

  // Najnovší `onError` bez toho, aby jeho nová identita pri každom vykreslení znovu spúšťala efekt nižšie. Zápis patrí do
  // efektu, nie do tela komponentu (zápis počas renderu porušuje čistotu renderu). MUSÍ byť pred efektom, ktorý chybu
  // hlási: efekty bežia v poradí deklarácie, takže ten nižšie vidí handler z toho istého vykreslenia.
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Chránený obrázok, ktorého stiahnutie zlyhalo, sa nevykreslí vôbec (nie je z čoho), takže zlyhanie hlási hook.
  useEffect(() => {
    if (isError) onErrorRef.current?.();
  }, [isError]);

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
              onError={onError}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
