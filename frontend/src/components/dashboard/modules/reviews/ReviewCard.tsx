'use client';

import React from 'react';
import { StarIcon, PencilIcon, TrashIcon, HeartIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { useLanguage } from '@/contexts/LanguageContext';

export type Review = {
  id: number;
  reviewer_id: number;
  reviewer_display_name: string;
  reviewer_avatar_url?: string | null;
  rating: number;
  text: string;
  pros: string[];
  cons: string[];
  owner_response?: string | null;
  owner_responded_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type ReviewCardProps = {
  review: Review;
  /** ID prihláseného používateľa - na kontrolu, či môže editovať/vymazať */
  currentUserId?: number | null;
  /** true ak aktuálny používateľ je vlastník ponuky (môže odpovedať) */
  isOfferOwner?: boolean;
  /** Callback pre edit recenzie */
  onEdit?: (review: Review) => void;
  /** Callback pri kliknutí na vymazať – otvorí sa potvrdzovací modal */
  onDeleteClick?: (reviewId: number) => void;
  /** Callback pri kliknutí na Zobraziť odpoveď */
  onViewOwnerResponse?: (review: Review) => void;
  /** Callback pri kliknutí na Odpovedať (iba pre vlastníka ponuky) */
  onAddOwnerResponse?: (review: Review) => void;
};

function getInitials(name: string): string {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
  }
  if (parts[0]) return parts[0].slice(0, 2).toUpperCase();
  return '?';
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1; // getMonth() vracia 0-11
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}.${month}.${year} o ${hours}:${minutes}`;
  } catch {
    return dateString;
  }
}

export default function ReviewCard({
  review,
  currentUserId,
  isOfferOwner,
  onEdit,
  onDeleteClick,
  onViewOwnerResponse,
  onAddOwnerResponse,
}: ReviewCardProps) {
  const { t } = useLanguage();
  
  const isOwner = currentUserId != null && review.reviewer_id === currentUserId;

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const fillPct = rating >= i ? 100 : rating >= i - 0.5 ? 50 : 0;
      stars.push(
        <span key={i} className="relative inline-block w-5 h-5">
          <StarIcon className="w-5 h-5 text-gray-300 dark:text-gray-600 absolute inset-0" />
          <span className="absolute inset-0 overflow-hidden" style={{ width: `${fillPct}%` }}>
            <StarIconSolid className="w-5 h-5 text-amber-400" />
          </span>
        </span>
      );
    }
    return stars;
  };

  return (
    <div className="space-y-4 w-full">
      {/* Avatar + meno + dátum + všetok obsah */}
      <div className="flex items-start gap-3 w-full">
        {/* Avatar - vľavo */}
        {review.reviewer_avatar_url ? (
          <img
            src={review.reviewer_avatar_url}
            alt={review.reviewer_display_name}
            className="w-12 h-12 rounded-full object-cover bg-gray-100 dark:bg-gray-800 shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shrink-0">
            <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
              {getInitials(review.reviewer_display_name)}
            </span>
          </div>
        )}
        
        {/* Všetok obsah zarovnaný s menom */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Meno + dátum + tlačidlá Edit/Delete */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <span className="text-base font-semibold text-gray-900 dark:text-white truncate block">
                {review.reviewer_display_name || t('requests.userFallback', 'Používateľ')}
              </span>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {t('reviews.addedOn', 'pridané')} {formatDate(review.created_at)}
              </p>
            </div>
            {isOwner && (onEdit || onDeleteClick) && (
              <div className="flex items-center gap-2 shrink-0">
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(review)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:text-gray-400 dark:hover:text-purple-400 dark:hover:bg-purple-900/20 transition-colors"
                    aria-label={t('common.edit', 'Upraviť')}
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                )}
                {onDeleteClick && (
                  <button
                    type="button"
                    onClick={() => onDeleteClick(review.id)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                    aria-label={t('common.delete', 'Vymazať')}
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Hodnotenie ponuky */}
          <div className="mt-6">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('reviews.ratesOffer', 'Hodnotenie ponuky')}
            </p>
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">{renderStars(review.rating)}</div>
              <span className="text-sm font-medium tabular-nums text-gray-600 dark:text-gray-400">
                {Math.round((review.rating / 5) * 100)} %
              </span>
            </div>
          </div>

          {/* Plusy a minusy */}
          {(review.pros.length > 0 || review.cons.length > 0) && (
            <div className="grid grid-cols-2 gap-4">
              {/* Plusy */}
              {review.pros.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    {t('reviews.pros', 'Plusy')}
                  </h4>
                  <ul className="space-y-1.5">
                    {review.pros.map((pro, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-green-600 dark:text-green-400 text-xs font-bold">+</span>
                        </span>
                        <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{pro}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Minusy */}
              {review.cons.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    {t('reviews.cons', 'Minusy')}
                  </h4>
                  <ul className="space-y-1.5">
                    {review.cons.map((con, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-red-600 dark:text-red-400 text-xs font-bold">−</span>
                        </span>
                        <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Text recenzie */}
          {review.text && (
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {review.text}
              </p>
            </div>
          )}

          {/* Akcie - Páči sa mi to, Zobraziť odpoveď / Odpovedať */}
          <div className="flex items-center gap-4 pt-2 border-t border-gray-300 dark:border-gray-700 flex-wrap">
            <button
              type="button"
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
              aria-label={t('reviews.like', 'Páči sa mi to')}
            >
              <HeartIcon className="w-5 h-5" />
              <span>{t('reviews.like', 'Páči sa mi to')}</span>
            </button>
            {review.owner_response && onViewOwnerResponse && (
              <button
                type="button"
                onClick={() => onViewOwnerResponse(review)}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                aria-label={t('reviews.viewOwnerResponse', 'Zobraziť odpoveď')}
              >
                <ChatBubbleLeftIcon className="w-5 h-5" />
                <span>{t('reviews.viewOwnerResponse', 'Zobraziť odpoveď')}</span>
              </button>
            )}
            {!review.owner_response && isOfferOwner && onAddOwnerResponse && (
              <button
                type="button"
                onClick={() => onAddOwnerResponse(review)}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                aria-label={t('reviews.addOwnerResponse', 'Odpovedať')}
              >
                <ChatBubbleLeftIcon className="w-5 h-5" />
                <span>{t('reviews.addOwnerResponse', 'Odpovedať')}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
