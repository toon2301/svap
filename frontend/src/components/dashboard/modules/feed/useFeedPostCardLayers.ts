'use client';

/**
 * Stav vrstiev a dialógov karty príspevku: zoznam lajkujúcich, nahlásenie, zdieľanie, úprava, zmazanie a odstránenie
 * označenia (deväť vlajok: šesť otvorení okien, príznaky „prebieha“ pri odstraňovaní označenia a mazaní a príznak „už
 * nahlásené“).
 *
 * Presunuté z `FeedPostCard.tsx` bez zmeny (krok c delenia karty, nález 333, R23): riadky `useState` sú rovnaké ako
 * predtým a hook vracia hodnoty aj nastavovače pod tými istými menami. Karta ho volá na mieste prvej z presunutých
 * vlajok a poradie jej efektov (`useEffect`, `useLayoutEffect`) sa nemení.
 *
 * V karte ostali TRI vlajky vrstiev: prehliadač fotky (`photoViewerIndex`), fotoprehliadač repostu (`sharedPhotoOpen`)
 * a obrazovka detailu (`mobileDetailOpen`). Ich nastavovače volajú efekty pristátia po zdieľaní a zmiznutého príspevku
 * (závislosti `[]` a `[post.id]`); pravidlo `react-hooks/exhaustive-deps` pozná ako stabilné len nastavovače zo
 * `useState` priamo v komponente, takže z vlastného hooku by chcelo doplniť ich do závislostí, a tie sa meniť nesmú.
 */

import { useState } from 'react';

export function useFeedPostCardLayers() {
  const [reportOpen, setReportOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [reported, setReported] = useState(false);
  const [tagRemoveOpen, setTagRemoveOpen] = useState(false);
  const [removingTag, setRemovingTag] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [likersOpen, setLikersOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return {
    reportOpen,
    setReportOpen,
    shareOpen,
    setShareOpen,
    reported,
    setReported,
    tagRemoveOpen,
    setTagRemoveOpen,
    removingTag,
    setRemovingTag,
    deleteOpen,
    setDeleteOpen,
    editOpen,
    setEditOpen,
    likersOpen,
    setLikersOpen,
    deleting,
    setDeleting,
  };
}
