'use client';

import React, { useMemo } from 'react';
import type { SkillRequest } from './types';
import { useLanguage } from '@/contexts/LanguageContext';

type RequestProposalPreviewProps = {
  item: SkillRequest;
  compact?: boolean;
  className?: string;
};

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function RequestProposalPreview({
  item,
  compact = false,
  className = '',
}: RequestProposalPreviewProps) {
  const { locale, t } = useLanguage();
  const description = (item.proposal_description || '').trim();
  const linkedOfferTitle =
    (item.proposed_offer_summary?.subcategory || '').trim() ||
    (item.proposed_offer_summary?.category || '').trim();

  const priceLabel = useMemo(() => {
    if (item.proposal_price_negotiable === true) {
      return t('skills.priceNegotiable', 'Dohodou');
    }
    const price = toNumber(item.proposal_price_from);
    if (price === null) return '';
    const currency = (item.proposal_price_currency || '').trim();
    return `${t('skills.priceFrom', 'Cena od')} ${new Intl.NumberFormat(locale).format(price)}${currency ? ` ${currency}` : ''}`;
  }, [item.proposal_price_currency, item.proposal_price_from, item.proposal_price_negotiable, locale, t]);

  const experienceLabel = useMemo(() => {
    const value = toNumber(item.proposal_experience?.value ?? item.proposal_experience_value);
    const unit = item.proposal_experience?.unit || item.proposal_experience_unit;
    if (value === null || (unit !== 'years' && unit !== 'months')) return '';
    const unitLabel = unit === 'years' ? t('skills.years', 'rokov') : t('skills.months', 'mesiacov');
    return `${t('requests.helpProposalExperience', 'Prax')}: ${new Intl.NumberFormat(locale).format(value)} ${unitLabel}`;
  }, [item.proposal_experience, item.proposal_experience_unit, item.proposal_experience_value, locale, t]);

  if (!description && !linkedOfferTitle && !priceLabel && !experienceLabel) return null;

  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white text-gray-900 dark:border-gray-800 dark:bg-[#111113] dark:text-gray-100 ${
        compact ? 'mt-2 px-3 py-2 text-xs' : 'mt-4 px-4 py-3 text-sm'
      } ${className}`}
    >
      <div className="font-semibold">
        {t('requests.helpProposalTitle', 'Navrhnutá pomoc')}
      </div>
      {description ? (
        <p className={`${compact ? 'mt-1 line-clamp-2' : 'mt-2'} break-words`}>
          {description}
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {linkedOfferTitle ? (
          <span className="rounded-full bg-gray-100 px-2 py-1 font-medium text-gray-700 dark:bg-gray-900 dark:text-gray-200">
            {t('requests.helpProposalLinkedOffer', 'Moja karta')}: {linkedOfferTitle}
          </span>
        ) : null}
        {priceLabel ? (
          <span className="rounded-full bg-gray-100 px-2 py-1 font-medium text-gray-700 dark:bg-gray-900 dark:text-gray-200">
            {priceLabel}
          </span>
        ) : null}
        {experienceLabel ? (
          <span className="rounded-full bg-gray-100 px-2 py-1 font-medium text-gray-700 dark:bg-gray-900 dark:text-gray-200">
            {experienceLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}
