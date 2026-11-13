'use client';

import type { Dispatch, SetStateAction } from 'react';
import toast from 'react-hot-toast';
import { api, endpoints } from '@/lib/api';
import { getFieldErrorMessage } from '@/lib/apiError';
import { useLanguage } from '@/contexts/LanguageContext';
import { invalidateOffersCache } from '../profile/profileOffersCache';

/** Príznaky detailu ponuky, ktoré sa po zmazaní vlastnej recenzie menia: ponuku možno znova recenzovať. */
type ReviewableOffer = { already_reviewed?: boolean; can_review?: boolean };

export type UseConfirmDeleteReviewParams<TOffer extends ReviewableOffer> = {
  offerId: number | null;
  /** ID recenzie, ktorej zmazanie sa potvrdzuje; `null` = nič sa nemaže. */
  reviewIdToDelete: number | null;
  viewerUserId: number | null;
  /** ID vlastníka ponuky (kvôli zneplatneniu jeho vyrovnávacej pamäte ponúk); kým sa ponuka nenačíta, nie je číslo. */
  offerOwnerUserId: number | null | undefined;
  /** Načíta zoznam recenzií odznova od 1. strany. */
  reloadReviews: () => Promise<void>;
  setOffer: Dispatch<SetStateAction<TOffer | null>>;
  setReviewIdToDelete: (reviewId: number | null) => void;
  setIsDeletingReview: (isDeleting: boolean) => void;
};

/**
 * Obsluha potvrdenia zmazania vlastnej recenzie na stránke recenzií ponuky (nález 325, prevzatá z `OfferReviewsView`).
 *
 * Vráti funkciu pre `onConfirm` okna `DeleteReviewConfirmModal`. Po úspešnom zmazaní a načítaní zoznamu označí ponuku ako
 * znova recenzovateľnú, zneplatní vyrovnávaciu pamäť ponúk (ikona recenzií na profile sa prepne hneď po návrate), zavrie
 * potvrdenie a ukáže toast „Recenzia bola vymazaná.“ (`reviews.deleteReviewSuccess`). Pri zlyhaní zmazania alebo načítania
 * zoznamu ukáže chybu (text zo servera alebo `reviews.deleteReviewFailed`), potvrdenie ostane otvorené a toast úspechu sa
 * neukáže. Príznak mazania sa uvoľní vždy.
 */
export function useConfirmDeleteReview<TOffer extends ReviewableOffer>({
  offerId,
  reviewIdToDelete,
  viewerUserId,
  offerOwnerUserId,
  reloadReviews,
  setOffer,
  setReviewIdToDelete,
  setIsDeletingReview,
}: UseConfirmDeleteReviewParams<TOffer>): () => Promise<void> {
  const { t } = useLanguage();

  return async () => {
    if (reviewIdToDelete == null || offerId == null) return;
    setIsDeletingReview(true);
    try {
      await api.delete(endpoints.reviews.detail(reviewIdToDelete));
      await reloadReviews();
      setOffer((prev) => (prev ? { ...prev, already_reviewed: false, can_review: true } : prev));

      // Po zmene recenzie invaliduj cache ponúk, aby sa ikona recenzií na profile prepnula hneď po návrate.
      if (viewerUserId != null) invalidateOffersCache(viewerUserId);
      if (typeof offerOwnerUserId === 'number') invalidateOffersCache(offerOwnerUserId);

      setReviewIdToDelete(null);
      toast.success(t('reviews.deleteReviewSuccess', 'Recenzia bola vymazaná.'));
    } catch (error: unknown) {
      console.error('Chyba pri vymazávaní recenzie:', error);
      toast.error(getFieldErrorMessage(error, t('reviews.deleteReviewFailed', 'Nepodarilo sa vymazať recenziu.')));
    } finally {
      setIsDeletingReview(false);
    }
  };
}
