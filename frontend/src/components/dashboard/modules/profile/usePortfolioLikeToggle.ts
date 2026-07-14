'use client';

import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { setPortfolioLikeState, type PortfolioLikeResponse } from './portfolioLikesApi';
import type { PortfolioItem } from './portfolioTypes';

type LikeTogglePortfolioItem = Pick<PortfolioItem, 'id' | 'is_liked_by_me' | 'likes_count'>;

type UsePortfolioLikeToggleOptions = {
  /** Aplikuje like stav do lokálneho state volajúceho (optimistic aj server/rollback). */
  applyLike: (itemId: number, isLiked: boolean, likesCount: number) => void;
};

/**
 * Zdieľaný optimistic like-toggle pre portfolio položky (zoznam aj detail).
 *
 * Postup: optimistic apply → API call → apply server hodnôt; pri chybe rollback
 * na pôvodné hodnoty + toast. Pending sa drží per-item (Set), takže zoznam môže
 * mať naraz rozbehnutých viac toggle-ov bez vzájomného blokovania.
 */
export function usePortfolioLikeToggle({ applyLike }: UsePortfolioLikeToggleOptions) {
  const { t } = useLanguage();
  const [pendingLikeIds, setPendingLikeIds] = useState<Set<number>>(() => new Set());

  const toggleLike = useCallback(
    async (item: LikeTogglePortfolioItem) => {
      if (pendingLikeIds.has(item.id)) return;

      const previousLiked = item.is_liked_by_me === true;
      const previousLikesCount = Math.max(0, Number(item.likes_count ?? 0));
      const nextLiked = !previousLiked;
      const optimisticLikesCount = Math.max(0, previousLikesCount + (nextLiked ? 1 : -1));

      setPendingLikeIds((current) => {
        const next = new Set(current);
        next.add(item.id);
        return next;
      });
      applyLike(item.id, nextLiked, optimisticLikesCount);

      try {
        const data: PortfolioLikeResponse = await setPortfolioLikeState(item.id, nextLiked);
        applyLike(
          data.portfolio_item_id,
          data.is_liked_by_me === true,
          Number(data.likes_count ?? optimisticLikesCount),
        );
      } catch {
        applyLike(item.id, previousLiked, previousLikesCount);
        toast.error(t('portfolio.likeUpdateFailed'));
      } finally {
        setPendingLikeIds((current) => {
          const next = new Set(current);
          next.delete(item.id);
          return next;
        });
      }
    },
    [applyLike, pendingLikeIds, t],
  );

  return { toggleLike, pendingLikeIds };
}
