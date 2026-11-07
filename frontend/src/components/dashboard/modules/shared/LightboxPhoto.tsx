'use client';

/* eslint-disable @next/next/no-img-element */

import { useState } from 'react';
import ImageLoadFailed from './ImageLoadFailed';
import { useProtectedImage } from './useProtectedImage';

type LightboxPhotoProps = {
  /** Adresa fotky: verejná, alebo chránená portfólio adresa, ktorú treba stiahnuť cez `api`. */
  src: string;
  alt: string;
  /** Základ test id: obrázok dostane `${testId}-image`, náhrada zlyhanej fotky `${testId}-failed`. */
  testId: string;
  /** Fotka dostane pevný rámec (celá plocha prehliadača) namiesto rámca podľa vlastných rozmerov. */
  fixedFrame?: boolean;
};

/** Rámec náhrady (načítavanie aj zlyhanie): rovnaká plocha, aby sa pri prechode medzi stavmi nič neposúvalo. */
const PLACEHOLDER_FRAME = 'h-[70vh] max-h-[calc(100vh-2rem)] w-[70vw] max-w-full overflow-hidden rounded-2xl';

/**
 * Jedna fotka vo fullscreen prehliadači (`ImageLightbox`, `OfferImageGalleryLightbox`): sama rieši načítanie chránenej
 * adresy aj zlyhanie načítania. Zlyhanú fotku (zmazaný súbor, chyba siete) nahradí viditeľnou náhradou namiesto
 * pokazeného obrázka s alt textom alebo prázdneho rámika (nález 291).
 *
 * Stav zlyhania patrí jednej fotke, preto ju rodič musí vykresľovať s `key` = adresa fotky. Pri prepnutí na ďalšiu fotku
 * sa tak začne odznova a nezdedí ani zlyhanie predošlej, ani zastaraný `isError` z `useProtectedImage`, ktorý hook pri
 * zmene adresy drží ešte jedno vykreslenie.
 */
export default function LightboxPhoto({ src, alt, testId, fixedFrame = false }: LightboxPhotoProps) {
  const { resolvedSrc, isError } = useProtectedImage(src);
  const [imageFailed, setImageFailed] = useState(false);

  if (isError || imageFailed) {
    return (
      <div className={PLACEHOLDER_FRAME}>
        <ImageLoadFailed variant="onDark" testId={`${testId}-failed`} />
      </div>
    );
  }

  if (!resolvedSrc) {
    // Počas sťahovania chránenej fotky: neutrálny rámik (žiadna broken-image ikona).
    return <div aria-hidden="true" className={`${PLACEHOLDER_FRAME} bg-white/5`} />;
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      data-testid={`${testId}-image`}
      className={
        fixedFrame
          ? 'h-full w-full object-contain'
          : 'max-h-[calc(100vh-2rem)] max-w-full rounded-2xl object-contain shadow-2xl'
      }
      onError={() => setImageFailed(true)}
    />
  );
}
