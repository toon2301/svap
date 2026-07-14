'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { resolveProtectedPortfolioImageRequestUrl } from '@/lib/protectedImageUrl';

export type ProtectedImageState = {
  /** URL použiteľná v `<img src>`: pôvodné src (verejné) alebo object URL (chránené). */
  resolvedSrc: string | null;
  isProtected: boolean;
  isLoading: boolean;
  isError: boolean;
};

/**
 * Načíta chránený portfolio obrázok cez axios klient `api` ako blob a vráti
 * object URL. Verejné obrázky vracia priamo (bez axios requestu). Object URL sa
 * uvoľní pri zmene src aj pri unmount; prebiehajúci request sa abortne.
 */
export function useProtectedImage(src: string | null | undefined): ProtectedImageState {
  const requestUrl = resolveProtectedPortfolioImageRequestUrl(src);
  const isProtected = requestUrl !== null;
  const publicSrc = typeof src === 'string' && src.trim() ? src : null;

  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(isProtected);
  const [isError, setIsError] = useState<boolean>(false);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    // Pri zmene src uvoľni prípadnú predošlú object URL a začni od neutrálneho stavu.
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setObjectUrl(null);

    // Verejný/prázdny obrázok → žiadny axios request (req #6).
    if (requestUrl === null) {
      setIsLoading(false);
      setIsError(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setIsLoading(true);
    setIsError(false);

    api
      .get(requestUrl, { responseType: 'blob', signal: controller.signal })
      .then((response) => {
        if (cancelled) return;
        const nextUrl = URL.createObjectURL(response.data as Blob);
        objectUrlRef.current = nextUrl;
        setObjectUrl(nextUrl);
        setIsLoading(false);
      })
      .catch(() => {
        // Abort (rýchly re-render/unmount) nie je chyba; inak zobraz neutrálny stav (req #10).
        if (cancelled || controller.signal.aborted) return;
        setIsError(true);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [requestUrl]);

  if (!isProtected) {
    return { resolvedSrc: publicSrc, isProtected: false, isLoading: false, isError: false };
  }
  return { resolvedSrc: objectUrl, isProtected: true, isLoading, isError };
}
