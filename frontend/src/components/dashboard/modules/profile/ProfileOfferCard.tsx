'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import type { Offer } from './profileOffersTypes';
import { slugifyLabel } from './profileOffersTypes';
import { OfferCardBack } from './offerCard/OfferCardBack';
import { OfferCardFront } from './offerCard/OfferCardFront';
import { setOfferLikeState, type OfferLikeResponse } from './offerLikesApi';

interface ProfileOfferCardProps {
  offer: Offer;
  accountType: 'personal' | 'business';
  t: (key: string, defaultValue: string) => string;
  isFlipped: boolean;
  onToggleFlip: () => void;
  onOpenHoursClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  isHighlighted?: boolean;
  isOtherUserProfile?: boolean;
  /** Meno/názov majiteľa profilu (kvôli recenziám v URL). */
  ownerDisplayName?: string;
  onRequestClick?: (offerId: number) => void;
  onMessageClick?: (offerId: number) => void;
  onToggleLike?: (offerId: number) => void;
  isLikePending?: boolean;
  requestLabel?: string;
  isRequestDisabled?: boolean;
  messageLabel?: string;
  isMessageDisabled?: boolean;
  /** Keď true, karta nemá zaoblený horný okraj ani horný border – pre použitie pod SearchOfferCardAuthorHeader. */
  compactTop?: boolean;
}

export default function ProfileOfferCard({
  offer,
  accountType,
  t,
  isFlipped,
  onToggleFlip,
  onOpenHoursClick,
  isHighlighted = false,
  isOtherUserProfile = false,
  ownerDisplayName,
  onRequestClick,
  onMessageClick,
  onToggleLike,
  isLikePending = false,
  requestLabel,
  isRequestDisabled = false,
  messageLabel,
  isMessageDisabled = false,
  compactTop = false,
}: ProfileOfferCardProps) {
  const [localLikeState, setLocalLikeState] = useState(() => ({
    isLiked: offer.is_liked_by_me === true,
    likesCount: Math.max(0, Number(offer.likes_count ?? 0)),
  }));
  const [isLocalLikePending, setIsLocalLikePending] = useState(false);

  useEffect(() => {
    setLocalLikeState({
      isLiked: offer.is_liked_by_me === true,
      likesCount: Math.max(0, Number(offer.likes_count ?? 0)),
    });
  }, [offer.id, offer.is_liked_by_me, offer.likes_count]);

  const effectiveOffer = useMemo(
    () =>
      onToggleLike
        ? offer
        : {
            ...offer,
            is_liked_by_me: localLikeState.isLiked,
            likes_count: localLikeState.likesCount,
          },
    [localLikeState.isLiked, localLikeState.likesCount, offer, onToggleLike],
  );

  const handleInternalToggleLike = useCallback(
    async (offerId: number) => {
      if (onToggleLike) {
        onToggleLike(offerId);
        return;
      }
      if (isLocalLikePending) return;

      const previousLiked = localLikeState.isLiked;
      const previousLikesCount = localLikeState.likesCount;
      const nextLiked = !previousLiked;
      const optimisticLikesCount = Math.max(0, previousLikesCount + (nextLiked ? 1 : -1));

      setIsLocalLikePending(true);
      setLocalLikeState({ isLiked: nextLiked, likesCount: optimisticLikesCount });

      try {
        const data: OfferLikeResponse = await setOfferLikeState(offerId, nextLiked);
        setLocalLikeState({
          isLiked: data.is_liked_by_me === true,
          likesCount: Math.max(0, Number(data.likes_count ?? optimisticLikesCount)),
        });
      } catch {
        setLocalLikeState({ isLiked: previousLiked, likesCount: previousLikesCount });
        toast.error(t('reviews.likeUpdateFailed', 'Nepodarilo sa aktualizovať páči sa mi.'));
      } finally {
        setIsLocalLikePending(false);
      }
    },
    [isLocalLikePending, localLikeState.isLiked, localLikeState.likesCount, onToggleLike, t],
  );

  const effectiveIsLikePending = onToggleLike ? isLikePending : isLocalLikePending;
  const displayOffer = effectiveOffer;
  const catSlug = displayOffer.category ? slugifyLabel(displayOffer.category) : '';
  const subSlug = displayOffer.subcategory ? slugifyLabel(displayOffer.subcategory) : '';

  const translatedLabel =
    displayOffer.subcategory && catSlug && subSlug
      ? t(`skillsCatalog.subcategories.${catSlug}.${subSlug}`, displayOffer.subcategory)
      : displayOffer.category && catSlug
        ? t(`skillsCatalog.categories.${catSlug}`, displayOffer.category)
        : displayOffer.subcategory || displayOffer.category || '';

  const imageAlt =
    (displayOffer.description && displayOffer.description.trim()) ||
    translatedLabel ||
    t('skills.offer', 'Ponúkam');

  const headline =
    (displayOffer.description && displayOffer.description.trim()) ||
    translatedLabel ||
    t('skills.noDescription', 'Bez popisu');

  const label = translatedLabel;

  const priceLabel =
    displayOffer.price_from !== null && displayOffer.price_from !== undefined
      ? `${Number(displayOffer.price_from).toLocaleString('sk-SK', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })} ${displayOffer.price_currency || '€'}`
      : null;

  const locationText = displayOffer.location && displayOffer.location.trim();
  const districtText = displayOffer.district && displayOffer.district.trim();
  const displayLocationText = locationText || districtText || null;

  const imageCount = displayOffer.images?.filter((img) => img?.image_url || img?.image).length || 0;
  const hasMultipleImages = imageCount > 1;

  const isHidden = displayOffer.is_hidden === true && !isOtherUserProfile;

  return (
    <div
      className={`group overflow-visible border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-[#0f0f10] shadow-sm hover:shadow transition-shadow relative ${
        compactTop ? 'rounded-b-2xl border-0 shadow-none' : 'rounded-2xl'
      } ${isHighlighted ? 'highlight-offer-card' : ''} ${isHidden ? 'opacity-60' : ''}`}
    >
      {/* Označenie skrytej karty - len vo vlastnom profile */}
      {isHidden && (
        <div className="absolute top-2 left-2 z-50 px-2 py-1 rounded-md bg-gray-800/90 dark:bg-gray-700/90 text-white text-[10px] font-semibold flex items-center gap-1 backdrop-blur-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-3 h-3"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.774 3.162 10.066 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
            />
          </svg>
          {t('skills.hiddenCard', 'Skrytá')}
        </div>
      )}

      {/* Veľký text "Ponúkam" alebo "Hľadám" uprostred celej karty - cez foto aj obsah - len na prednej strane */}
      {!isFlipped && (
        <div className="absolute left-0 right-0 top-[52.5%] -translate-y-1/2 pointer-events-none z-30 group-hover:opacity-0 group-hover:scale-90 transition-all duration-300">
          <div className="w-full py-1 border border-transparent rounded-none bg-white/80 dark:bg-[#0f0f10]/80 backdrop-blur-sm shadow-lg">
            <p className="text-xl md:text-2xl font-black text-gray-800 dark:text-gray-100 uppercase tracking-[0.2em] leading-tight text-center">
              {displayOffer.is_seeking ? t('skills.search', 'Hľadám') : t('skills.offering', 'Ponúkam')}
            </p>
          </div>
        </div>
      )}

      <OfferCardFront
        offer={displayOffer}
        accountType={accountType}
        t={t}
        onToggleFlip={onToggleFlip}
        isFlipped={isFlipped}
        isHidden={isHidden}
        isHighlighted={isHighlighted}
        imageAlt={imageAlt}
        label={label}
        headline={headline}
        priceLabel={priceLabel}
        displayLocationText={displayLocationText}
        hasMultipleImages={hasMultipleImages}
        imageCount={imageCount}
        isOtherUserProfile={isOtherUserProfile}
        ownerDisplayName={ownerDisplayName}
        onRequestClick={onRequestClick}
        onMessageClick={onMessageClick}
        onToggleLike={handleInternalToggleLike}
        isLikePending={effectiveIsLikePending}
        requestLabel={requestLabel}
        isRequestDisabled={isRequestDisabled}
        messageLabel={messageLabel}
        isMessageDisabled={isMessageDisabled}
        compactTop={compactTop}
      />

      <OfferCardBack
        offer={displayOffer}
        accountType={accountType}
        t={t}
        onToggleFlip={onToggleFlip}
        onOpenHoursClick={onOpenHoursClick}
        isFlipped={isFlipped}
        ownerDisplayName={ownerDisplayName}
        compactTop={compactTop}
      />
    </div>
  );
}
