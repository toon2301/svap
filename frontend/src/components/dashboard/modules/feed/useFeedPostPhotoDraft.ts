'use client';

/**
 * Draft fotiek pri úprave príspevku – čo bude na príspevku PO uložení.
 *
 * Kým je edit modal otvorený, nič sa na server neposiela: existujúce fotky sa
 * len ZNAČIA na odobratie (nemiznú, aby bolo vidieť, čo sa zmení) a novo
 * vybrané súbory čakajú na upload. „Zrušiť" znamená zahodiť tento stav,
 * „Uložiť" ho premietnuť na server – preto draft žije tu, mimo modalu, a nie
 * v priebežných requestoch.
 *
 * Nové fotky idú vždy NA KONIEC; prehadzovanie poradia tento draft nerieši.
 */

import { useCallback, useEffect, useState } from 'react';
import { MAX_FEED_POST_IMAGES } from '@/lib/feedImageUpload';
import type { FeedPostImage } from '@/lib/feedApi';

export type ExistingPhotoDraft = {
  image: FeedPostImage;
  /** Označená na odobratie – zmizne až po „Uložiť". */
  removed: boolean;
};

export type FeedPostPhotoDraft = {
  existing: ExistingPhotoDraft[];
  added: File[];
  addedPreviews: string[];
  /** Koľko fotiek bude mať príspevok po uložení. */
  keptCount: number;
  remainingSlots: number;
  removedIds: number[];
  toggleRemoved: (imageId: number) => void;
  addFiles: (files: File[]) => void;
  dropAdded: (index: number) => void;
  /** Preberie stav zo servera (po uložení) – draft začína odznova. */
  reset: (images: FeedPostImage[]) => void;
};

export function useFeedPostPhotoDraft(
  initialImages: FeedPostImage[],
): FeedPostPhotoDraft {
  // Init-once: draft patrí jednému otvoreniu modalu. Preberať prop priebežne
  // by používateľovi prepísalo rozrobené zmeny pod rukami.
  const [existing, setExisting] = useState<ExistingPhotoDraft[]>(() =>
    initialImages.map((image) => ({ image, removed: false })),
  );
  const [added, setAdded] = useState<File[]>([]);
  const [addedPreviews, setAddedPreviews] = useState<string[]>([]);

  // Náhľady cez object URL – vždy uvoľniť, inak Blob visí v pamäti do reloadu
  // (rovnaký vzor ako composer).
  useEffect(() => {
    if (!added.length || typeof URL.createObjectURL !== 'function') {
      setAddedPreviews([]);
      return;
    }
    const urls = added.map((file) => URL.createObjectURL(file));
    setAddedPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [added]);

  const keptCount =
    existing.filter((entry) => !entry.removed).length + added.length;

  const toggleRemoved = useCallback((imageId: number) => {
    setExisting((current) =>
      current.map((entry) =>
        entry.image.id === imageId
          ? { ...entry, removed: !entry.removed }
          : entry,
      ),
    );
  }, []);

  const addFiles = useCallback((files: File[]) => {
    if (!files.length) return;
    setAdded((current) => [...current, ...files]);
  }, []);

  const dropAdded = useCallback((index: number) => {
    setAdded((current) => current.filter((_, position) => position !== index));
  }, []);

  const reset = useCallback((images: FeedPostImage[]) => {
    setExisting(images.map((image) => ({ image, removed: false })));
    setAdded([]);
  }, []);

  return {
    existing,
    added,
    addedPreviews,
    keptCount,
    remainingSlots: Math.max(MAX_FEED_POST_IMAGES - keptCount, 0),
    removedIds: existing
      .filter((entry) => entry.removed)
      .map((entry) => entry.image.id),
    toggleRemoved,
    addFiles,
    dropAdded,
    reset,
  };
}
