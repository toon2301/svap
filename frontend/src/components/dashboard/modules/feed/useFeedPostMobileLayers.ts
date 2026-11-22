'use client';

/**
 * Stav mobilných vrstiev karty (prehliadač fotky, fotoprehliadač repostu, obrazovka detailu) a efekty, ktoré ich zatvárajú:
 * pristátie po zdieľaní (E6) a zmiznutý príspevok (E7).
 *
 * Presunuté z `FeedPostCard.tsx` bez zmeny (krok f delenia karty, etapa 3, nález 333, R23): tri riadky `useState` aj oba
 * efekty s komentármi sú rovnaké ako predtým, mení sa len `post.id` na `postId` (v E7 pri porovnaní a v závislostiach).
 * Stav a efekty idú spolu preto, že nastavovače zo `useState` priamo v hooku pozná `react-hooks/exhaustive-deps` ako
 * stabilné: závislosti `[]` a `[postId]` ostali rovnaké a nové varovanie nepribudlo (z karty ako parametre by ich pravidlo
 * vyžadovalo v závislostiach, a tie sa meniť nesmú). Karta hook volá na mieste pôvodného E6 (po E5, pred počtami), takže
 * poradie efektov sa nemení; efekty sa v sonde poznajú podľa modulov `./feedShareLanding` a `./feedPostDeletedEvents`,
 * preto sú importy rovnaké.
 */

import { useEffect, useState } from 'react';
import { onFeedPostDeleted } from './feedPostDeletedEvents';
import { onFeedShareLanding } from './feedShareLanding';

export function useFeedPostMobileLayers(postId: number) {
  const [photoViewerIndex, setPhotoViewerIndex] = useState<number | null>(null);
  const [sharedPhotoOpen, setSharedPhotoOpen] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  // Po zdieľaní sa pristáva na Nástenku, takže žiadna vrstva nad kartou nesmie
  // ostať otvorená – ani tá, z ktorej sa zdieľalo. Zatvárajú sa tu spoločne,
  // rovnako ako pri zmiznutom príspevku nižšie.
  useEffect(
    () =>
      onFeedShareLanding(() => {
        setMobileDetailOpen(false);
        setPhotoViewerIndex(null);
        setSharedPhotoOpen(false);
      }),
    [],
  );

  // Príspevok zmizol (zmazal ho niekto iný, alebo to zistila iná interakcia).
  // Kartu odstráni zoznam, ale otvorené vrstvy nad ňou treba zavrieť tu –
  // karta sa vykresľuje aj tam, kde zoznam signál nespracúva (profil).
  useEffect(
    () =>
      onFeedPostDeleted((deletedId) => {
        if (deletedId !== postId) return;
        setMobileDetailOpen(false);
        setPhotoViewerIndex(null);
        setSharedPhotoOpen(false);
      }),
    [postId],
  );

  return {
    photoViewerIndex,
    setPhotoViewerIndex,
    sharedPhotoOpen,
    setSharedPhotoOpen,
    mobileDetailOpen,
    setMobileDetailOpen,
  };
}
