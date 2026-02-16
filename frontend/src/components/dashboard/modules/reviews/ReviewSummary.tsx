'use client';

import React, { useMemo } from 'react';
import { StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Review } from './ReviewCard';

export type ReviewSummaryProps = {
  reviews: Review[];
};

export default function ReviewSummary({ reviews }: ReviewSummaryProps) {
  const { t } = useLanguage();

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
      const rating = Math.round(review.rating * 2) / 2; // Zaokrúhliť na najbližšiu 0.5
      const rounded = Math.round(rating); // Pre breakdown zaokrúhliť na celé číslo
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
        <span key={i} className="relative inline-block w-6 h-6">
          <StarIcon className="w-6 h-6 text-gray-300 dark:text-gray-600 absolute inset-0" />
          <span className="absolute inset-0 overflow-hidden" style={{ width: `${fillPct}%` }}>
            <StarIconSolid className="w-6 h-6 text-blue-500" />
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

  return (
    <div className="p-5">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {t('reviews.ratingSummary', 'Hodnotenie')}
      </h3>

      <div className="flex flex-col gap-6">
        {/* Celkové hodnotenie */}
        <div className="flex flex-col items-start">
          <div className="flex gap-1 mb-2">{renderStars(summary.averageRating)}</div>
          <span className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
            {summary.percentage} %
          </span>
        </div>

        {/* Breakdown pod percentami */}
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((starLevel) => {
            const count = summary.breakdown[starLevel as keyof typeof summary.breakdown];
            return (
              <div key={starLevel} className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-4">
                  {starLevel}
                </span>
                <StarIconSolid className="w-4 h-4 text-blue-500 shrink-0" />
                {renderBreakdownBar(count, maxCount)}
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400 tabular-nums min-w-[3rem] text-right">
                  {count} x
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
