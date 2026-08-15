'use client';

import type React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import BlurredContainImage from '../shared/BlurredContainImage';
import type { PortfolioItem } from './portfolioTypes';
import { PortfolioLikeButton } from './PortfolioLikeButton';
import ShareIcon from '../feed/ShareIcon';

type PortfolioCardProps = {
  item: PortfolioItem;
  categoryLabel: string;
  featured?: boolean;
  loading?: React.ImgHTMLAttributes<HTMLImageElement>['loading'];
  onClick?: () => void;
  onToggleLike?: (item: PortfolioItem) => void;
  isLikePending?: boolean;
  /** Zdieľanie na Nástenku – dialóg vlastní rodič (ako pri ponukách). */
  onShareToBoard?: (item: PortfolioItem) => void;
};

function PortfolioImageSlot({
  item,
  featured = false,
  loading = 'lazy',
}: Pick<PortfolioCardProps, 'item' | 'featured' | 'loading'>) {
  const { t } = useLanguage();
  const thumbnailUrl = item.cover_image?.thumbnail_url?.trim() || '';
  const aspectClass = featured ? 'aspect-[16/9]' : 'aspect-[4/3]';

  if (!thumbnailUrl) {
    return (
      <div className={`${aspectClass} flex items-center justify-center bg-gray-100 text-xs text-gray-500 dark:bg-[#0e0e0f] dark:text-gray-400`}>
        <span>{t('portfolio.noCoverImage')}</span>
      </div>
    );
  }

  return (
    <div className={aspectClass}>
      <BlurredContainImage
        src={thumbnailUrl}
        alt={item.title}
        loading={loading}
        className="rounded-t-2xl"
      />
    </div>
  );
}

function PortfolioShareButton({
  onShare,
  label,
  className = '',
}: {
  onShare: () => void;
  label: string;
  className?: string;
}) {
  return (
    // Vizuálne zhodné s PortfolioLikeButton v compact variante (rovnaká výška,
    // rám, podklad aj hover) – obe akcie stoja vedľa seba v jednom rohu karty,
    // takže musia pôsobiť ako jedna rodina. Predtým bola ikona natrvalo fialovo
    // vyplnená, čím vedľa neutrálneho lajku vyzerala ako aktívny stav.
    <button
      type="button"
      data-testid="portfolio-share-button"
      onClick={(event) => {
        // Karta je klikateľná (otvára detail) – bez zastavenia by klik na
        // ikonu otvoril aj položku.
        event.stopPropagation();
        onShare();
      }}
      aria-label={label}
      title={label}
      className={[
        'inline-flex h-8 w-8 items-center justify-center rounded-full border font-semibold shadow-sm transition active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-400/60',
        'border-gray-200 bg-white/90 text-gray-700 hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700 dark:border-gray-800 dark:bg-[#101011]/90 dark:text-gray-200 dark:hover:border-purple-800/70 dark:hover:bg-purple-950/30 dark:hover:text-purple-200',
        className,
      ].filter(Boolean).join(' ')}
    >
      <ShareIcon />
    </button>
  );
}

export function PortfolioCard({
  item,
  categoryLabel,
  featured = false,
  loading = 'lazy',
  onClick,
  onToggleLike,
  isLikePending = false,
  onShareToBoard,
}: PortfolioCardProps) {
  const { t } = useLanguage();
  const className = [
    'group w-full overflow-hidden rounded-2xl border border-gray-200 bg-white/75 text-left shadow-sm transition',
    onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-purple-400/60' : 'hover:-translate-y-0.5 hover:shadow-md',
    'dark:border-gray-800 dark:bg-[#0f0f10]',
  ].join(' ');

  const content = (
    <>
      <PortfolioImageSlot item={item} featured={featured} loading={loading} />
      <div className={featured ? 'p-5' : 'p-4'}>
        <p className="text-xs font-medium uppercase tracking-wide text-purple-700 dark:text-purple-300">
          {categoryLabel}
        </p>
        <h3 className={`${featured ? 'mt-2 text-lg' : 'mt-1 text-base'} font-semibold leading-snug text-gray-950 dark:text-white`}>
          {item.title}
        </h3>
      </div>
    </>
  );

  // Akcie v jednom rohu (rovnaký vzor ako OfferCardFront) – lajk si drží
  // pôvodné miesto, zdieľanie pribúda vedľa neho.
  const actions =
    onToggleLike || onShareToBoard ? (
      <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
        {onShareToBoard ? (
          <PortfolioShareButton
            label={t('feed.shareToBoard', 'Zdieľať na Nástenku')}
            onShare={() => onShareToBoard(item)}
            // Rovnako ako lajk vedľa – nad fotkou karty musia obe pôsobiť
            // rovnako „sklene".
            className="backdrop-blur"
          />
        ) : null}
        {onToggleLike ? (
          <PortfolioLikeButton
            isLiked={item.is_liked_by_me === true}
            likesCount={Math.max(0, Number(item.likes_count ?? 0))}
            label={t('portfolio.likeAction')}
            isPending={isLikePending}
            compact
            onToggle={() => onToggleLike(item)}
            className="backdrop-blur"
          />
        ) : null}
      </div>
    ) : null;

  if (onClick) {
    return (
      <article
        data-testid={featured ? 'portfolio-featured-card' : 'portfolio-grid-card'}
        className={`relative ${className}`}
      >
        <button
          type="button"
          onClick={onClick}
          aria-label={item.title}
          className="block w-full text-left focus:outline-none focus:ring-2 focus:ring-purple-400/60"
        >
          {content}
        </button>
        {actions}
      </article>
    );
  }

  return (
    <article
      data-testid={featured ? 'portfolio-featured-card' : 'portfolio-grid-card'}
      className={`relative ${className}`}
    >
      {content}
      {actions}
    </article>
  );
}
