'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { StarIcon, HeartIcon, ChatBubbleLeftIcon, PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Offer } from '../profile/profileOffersTypes';
import type { Review } from './ReviewCard';
import { OwnerResponseModal } from './OwnerResponseModal';

/** Meno recenzenta: pri pretečení zobrazí horizontálnu animáciu zo strany na stranu */
function ReviewerName({ name }: { name: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [marquee, setMarquee] = useState<{ scrollDistance: number } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;
    const overflow = text.scrollWidth > container.clientWidth;
    if (overflow && container.clientWidth > 0) {
      setMarquee({ scrollDistance: text.scrollWidth - container.clientWidth });
    } else {
      setMarquee(null);
    }
  }, [name]);

  return (
    <div ref={containerRef} className="flex-1 min-w-0 overflow-hidden">
      <span
        ref={textRef}
        className="inline-block whitespace-nowrap text-base font-semibold text-gray-900 dark:text-white"
        style={
          marquee
            ? ({
                animation: 'reviews-marquee 5s ease-in-out infinite',
                '--marquee-distance': `${-marquee.scrollDistance}px`,
              } as React.CSSProperties)
            : undefined
        }
      >
        {name}
      </span>
    </div>
  );
}

type OfferOwnerLike = {
  id?: number;
  display_name?: string | null;
  slug?: string | null;
  company_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

type OfferDetailLike = Offer & {
  owner?: OfferOwnerLike | null;
  user_display_name?: string | null;
  user_id?: number | null;
  owner_user_type?: 'individual' | 'company' | null;
};

export type OfferReviewsMobileProps = {
  offer: OfferDetailLike | null;
  loading: boolean;
  reviews: Review[];
  reviewsLoading: boolean;
  isOwnOffer: boolean;
  isBusinessOwner: boolean;
  /** Z API detailu ponuky – môže pridať recenziu (accepted request, ešte nerecenzoval) */
  can_review: boolean;
  /** Z API detailu ponuky – už túto ponuku recenzoval */
  already_reviewed: boolean;
  displayName: string;
  imageAlt: string;
  locationText: string | null;
  experienceText: string | null;
  priceLabel: string | null;
  headingText: string;
  todayHoursText: string | null;
  currentUserId: number | null;
  onAddReviewClick: () => void;
  onEditReview: (review: Review) => void;
  onDeleteReviewClick: (reviewId: number) => void;
  onOpenHoursClick: () => void;
  onOwnerResponseSaved: (reviewId: number, ownerResponse: string, ownerRespondedAt: string) => void;
};

export function OfferReviewsMobile({
  offer,
  loading,
  reviews,
  reviewsLoading,
  isOwnOffer,
  isBusinessOwner,
  can_review,
  already_reviewed,
  displayName,
  imageAlt,
  locationText,
  experienceText,
  priceLabel,
  headingText,
  todayHoursText,
  currentUserId,
  onAddReviewClick,
  onEditReview,
  onDeleteReviewClick,
  onOpenHoursClick,
  onOwnerResponseSaved,
}: OfferReviewsMobileProps) {
  const { t } = useLanguage();
  const [ownerResponseModalReview, setOwnerResponseModalReview] = useState<Review | null>(null);
  const [ownerResponseModalMode, setOwnerResponseModalMode] = useState<'read' | 'edit'>('read');

  const summary = useMemo(() => {
    if (reviews.length === 0) {
      return {
        averageRating: 0,
        percentage: 0,
        breakdown: {
          5: 0,
          4: 0,
          3: 0,
          2: 0,
          1: 0,
        },
        total: 0,
      };
    }

    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let totalRating = 0;

    reviews.forEach((review) => {
      const rating = Math.round(review.rating * 2) / 2;
      const rounded = Math.round(rating);
      if (rounded >= 5) breakdown[5]++;
      else if (rounded >= 4) breakdown[4]++;
      else if (rounded >= 3) breakdown[3]++;
      else if (rounded >= 2) breakdown[2]++;
      else breakdown[1]++;
      totalRating += rating;
    });

    const averageRating = totalRating / reviews.length;
    const percentage = Math.round((averageRating / 5) * 100);

    return {
      averageRating,
      percentage,
      breakdown,
      total: reviews.length,
    };
  }, [reviews]);

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const fillPct = rating >= i ? 100 : rating >= i - 0.5 ? 50 : 0;
      stars.push(
        <span key={i} className="relative inline-block w-5 h-5">
          <StarIcon className="w-5 h-5 text-gray-300 dark:text-gray-600 absolute inset-0" />
          <span className="absolute inset-0 overflow-hidden" style={{ width: `${fillPct}%` }}>
            <StarIconSolid className="w-5 h-5 text-blue-500" />
          </span>
        </span>
      );
    }
    return stars;
  };

  const renderBreakdownBar = (count: number, maxCount: number) => {
    const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
    return (
      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  };

  const maxCount = Math.max(...Object.values(summary.breakdown));

  // Helper funkcie pre recenzie
  const getInitials = (name: string): string => {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
    }
    if (parts[0]) return parts[0].slice(0, 2).toUpperCase();
    return '?';
  };

  const formatDateOnly = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      
      // Názvy mesiacov v slovenčine (genitív)
      const monthNames = [
        'januára', 'februára', 'marca', 'apríla', 'mája', 'júna',
        'júla', 'augusta', 'septembra', 'októbra', 'novembra', 'decembra'
      ];
      
      return `${day}. ${monthNames[month - 1]} ${year}`;
    } catch {
      return dateString;
    }
  };

  const renderReviewStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const fillPct = rating >= i ? 100 : rating >= i - 0.5 ? 50 : 0;
      stars.push(
        <span key={i} className="relative inline-block w-5 h-5">
          <StarIcon className="w-5 h-5 text-gray-300 dark:text-gray-600 absolute inset-0" />
          <span className="absolute inset-0 overflow-hidden" style={{ width: `${fillPct}%` }}>
            <StarIconSolid className="w-5 h-5 text-blue-500" />
          </span>
        </span>
      );
    }
    return stars;
  };

  return (
    <div className="w-full h-full space-y-0">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes reviews-marquee {
              0%, 100% { transform: translateX(0); }
              50% { transform: translateX(var(--marquee-distance, 0)); }
            }
          `,
        }}
      />
      <div className="px-4 pt-4 space-y-6">
          {/* Celkové hodnotenie na vrchu */}
          <div className="space-y-4">
            <h2 className="text-center text-lg font-semibold text-gray-900 dark:text-white">
              {t('reviews.rating', 'Hodnotenie')}
            </h2>
            {/* Hviezdičky a percento */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex gap-1">{renderStars(summary.averageRating)}</div>
              <div className="text-center">
                <span className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
                  {summary.percentage} %
                </span>
              </div>
            </div>

            {/* Breakdown */}
            {reviews.length > 0 && (
              <div className="space-y-2 pt-2">
                {[5, 4, 3, 2, 1].map((starLevel) => {
                  const count = summary.breakdown[starLevel as keyof typeof summary.breakdown];
                  return (
                    <div key={starLevel} className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-4">
                        {starLevel}
                      </span>
                      <StarIconSolid className="w-4 h-4 text-blue-500 shrink-0" />
                      {renderBreakdownBar(count, maxCount)}
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 tabular-nums min-w-[2.5rem] text-right">
                        {count} ×
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {can_review && !already_reviewed && (
            <button
              type="button"
              onClick={onAddReviewClick}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-transparent text-gray-700 dark:text-gray-300 font-medium text-sm hover:border-gray-400 hover:bg-gray-100 dark:hover:border-gray-500 dark:hover:bg-gray-800/50 transition-colors"
            >
              <PlusIcon className="w-5 h-5 shrink-0" aria-hidden />
              {t('reviews.addReview', 'Pridať recenziu')}
            </button>
          )}

          {/* Zoznam recenzií */}
          {reviewsLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {t('reviews.noReviews', 'Zatiaľ nie sú žiadne recenzie.')}
            </div>
          ) : (
            <div className="space-y-4 pt-4">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="space-y-4 p-4 rounded-xl border border-gray-200/60 dark:border-gray-600/50 bg-gray-50/40 dark:bg-gray-800/25"
                >
                  {/* Avatar + meno + dátum */}
                  <div className="flex items-start gap-3">
                    {review.reviewer_avatar_url ? (
                      <img
                        src={review.reviewer_avatar_url}
                        alt={review.reviewer_display_name}
                        className="w-10 h-10 rounded-full object-cover bg-gray-100 dark:bg-gray-800 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                          {getInitials(review.reviewer_display_name)}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-col flex-1 min-w-0 gap-0.5">
                      <ReviewerName
                        name={review.reviewer_display_name || t('requests.userFallback', 'Používateľ')}
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDateOnly(review.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Hviezdičky + percento */}
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">{renderReviewStars(review.rating)}</div>
                    <span className="text-sm font-medium tabular-nums text-gray-600 dark:text-gray-400">
                      {Math.round((review.rating / 5) * 100)} %
                    </span>
                  </div>

                  {/* Plusy */}
                  {review.pros.length > 0 && (
                    <div className="space-y-2">
                      {review.pros.map((pro, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-green-600 dark:text-green-400 text-xs font-bold">+</span>
                          </span>
                          <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{pro}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Mínusy */}
                  {review.cons.length > 0 && (
                    <div className="space-y-2">
                      {review.cons.map((con, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-red-600 dark:text-red-400 text-xs font-bold">−</span>
                          </span>
                          <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{con}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Text recenzie */}
                  {review.text && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {review.text}
                    </p>
                  )}

                  {/* Páči sa mi to, Zobraziť odpoveď/Odpovedať a pri vlastnej recenzii Upraviť, Odstrániť */}
                  {(() => {
                    const isOwner = currentUserId != null && review.reviewer_id === currentUserId;
                    const Divider = () => (
                      <div className="w-px bg-gray-300 dark:bg-gray-600 shrink-0 self-stretch" aria-hidden="true" />
                    );
                    return (
                      <div className="w-full flex items-stretch pt-3 pb-0 border-t border-gray-300 dark:border-gray-700">
                        <div className="flex-1 flex items-center justify-center">
                          <button
                            type="button"
                            className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
                            aria-label={t('reviews.like', 'Páči sa mi to')}
                          >
                            <HeartIcon className="w-5 h-5" />
                          </button>
                        </div>
                        {review.owner_response && (
                          <>
                            <Divider />
                            <div className="flex-1 flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setOwnerResponseModalReview(review);
                                  setOwnerResponseModalMode('read');
                                }}
                                className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                                aria-label={t('reviews.viewOwnerResponse', 'Zobraziť odpoveď')}
                              >
                                <ChatBubbleLeftIcon className="w-5 h-5" />
                              </button>
                            </div>
                          </>
                        )}
                        {!review.owner_response && isOwnOffer && (
                          <>
                            <Divider />
                            <div className="flex-1 flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setOwnerResponseModalReview(review);
                                  setOwnerResponseModalMode('edit');
                                }}
                                className="p-2 rounded-lg text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                                aria-label={t('reviews.addOwnerResponse', 'Odpovedať')}
                              >
                                <ChatBubbleLeftIcon className="w-5 h-5" />
                              </button>
                            </div>
                          </>
                        )}
                        {isOwner && (
                          <>
                            <Divider />
                            <div className="flex-1 flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => onEditReview(review)}
                                className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                                aria-label={t('common.edit', 'Upraviť')}
                              >
                                <PencilIcon className="w-5 h-5" />
                              </button>
                            </div>
                            <Divider />
                            <div className="flex-1 flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => onDeleteReviewClick(review.id)}
                                className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                aria-label={t('common.delete', 'Vymazať')}
                              >
                                <TrashIcon className="w-5 h-5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
      </div>

      <OwnerResponseModal
        open={ownerResponseModalReview !== null}
        onClose={() => setOwnerResponseModalReview(null)}
        reviewId={ownerResponseModalReview?.id ?? 0}
        mode={ownerResponseModalMode}
        ownerResponse={ownerResponseModalReview?.owner_response ?? ''}
        ownerRespondedAt={ownerResponseModalReview?.owner_responded_at ?? null}
        onSave={
          ownerResponseModalReview
            ? (ownerResponse, ownerRespondedAt) => {
                onOwnerResponseSaved(
                  ownerResponseModalReview.id,
                  ownerResponse,
                  ownerRespondedAt
                );
                setOwnerResponseModalReview((prev) =>
                  prev
                    ? { ...prev, owner_response: ownerResponse, owner_responded_at: ownerRespondedAt }
                    : null
                );
              }
            : undefined
        }
        onSwitchToEdit={
          ownerResponseModalReview && isOwnOffer
            ? () => setOwnerResponseModalMode('edit')
            : undefined
        }
      />
    </div>
  );
}
