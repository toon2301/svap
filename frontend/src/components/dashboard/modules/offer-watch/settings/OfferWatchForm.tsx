'use client';

import type { FormEvent } from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import { getDistrictOptions, isInactiveOfferDistrictCode } from '@/shared/districtRegistry';
import CountrySelect from '../../skills/skillDescriptionModal/CountrySelect';
import {
  selectOfferWatchCategory,
  selectOfferWatchCountry,
  selectOfferWatchDistrict,
} from '../offerWatchDraft';
import {
  OFFER_WATCH_PRICE_CURRENCIES,
  type OfferWatchDraft,
  type OfferWatchDraftField,
  type OfferWatchPriceCurrency,
  type OfferWatchValidationErrors,
} from '../types';
import OfferWatchCategoryField from './OfferWatchCategoryField';
import OfferWatchDistrictField from './OfferWatchDistrictField';
import { offerWatchValidationMessage } from './offerWatchUi';

type OfferWatchFormProps = {
  idPrefix: string;
  draft: OfferWatchDraft;
  errors: OfferWatchValidationErrors;
  onChange: (
    nextDraft: OfferWatchDraft,
    clearFields?: OfferWatchDraftField[],
  ) => void;
  onSubmit: () => void;
  submitLabel: string;
  submittingLabel: string;
  isSubmitting: boolean;
  disabled?: boolean;
  disabledMessage?: string;
  secondaryLabel?: string;
  onSecondary?: () => void;
  persistCountrySelection?: boolean;
};

function FieldError({
  id,
  field,
  errors,
}: {
  id: string;
  field: OfferWatchDraftField;
  errors: OfferWatchValidationErrors;
}) {
  const { t } = useLanguage();
  const code = errors[field];
  if (!code) return null;
  return (
    <p id={id} className='mt-1.5 text-xs font-medium text-red-600 dark:text-red-400' role='alert'>
      {offerWatchValidationMessage(t, field, code)}
    </p>
  );
}

export default function OfferWatchForm({
  idPrefix,
  draft,
  errors,
  onChange,
  onSubmit,
  submitLabel,
  submittingLabel,
  isSubmitting,
  disabled = false,
  disabledMessage,
  secondaryLabel,
  onSecondary,
  persistCountrySelection = true,
}: OfferWatchFormProps) {
  const { t, setCountry } = useLanguage();
  const categoryErrorId = `${idPrefix}-category-error`;
  const countryErrorId = `${idPrefix}-country-error`;
  const districtErrorId = `${idPrefix}-district-error`;
  const priceMinErrorId = `${idPrefix}-price-min-error`;
  const priceMaxErrorId = `${idPrefix}-price-max-error`;
  const currencyErrorId = `${idPrefix}-currency-error`;
  const hasDistricts = Boolean(draft.countryCode && getDistrictOptions(draft.countryCode).length);
  const hasInactiveDistrict = isInactiveOfferDistrictCode(draft.countryCode, draft.districtCode);
  const categoryError = errors.subcategory || errors.category;
  const controlsDisabled = disabled || isSubmitting;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!controlsDisabled) onSubmit();
  };

  const changePrice = (field: 'priceMin' | 'priceMax', value: string) => {
    const nextDraft = { ...draft, [field]: value };
    if (!nextDraft.priceMin.trim() && !nextDraft.priceMax.trim()) {
      nextDraft.priceCurrency = '';
    }
    onChange(nextDraft, [field, 'priceCurrency']);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {disabledMessage ? (
        <div className='mb-5 flex items-start gap-2 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-800 dark:border-purple-900/60 dark:bg-purple-950/25 dark:text-purple-200' role='status'>
          <InformationCircleIcon className='mt-0.5 h-5 w-5 shrink-0' aria-hidden='true' />
          <span>{disabledMessage}</span>
        </div>
      ) : null}

      <fieldset disabled={controlsDisabled} className='space-y-5'>
        <div>
          <label htmlFor={`${idPrefix}-category`} className='mb-1.5 block text-sm font-medium text-gray-800 dark:text-gray-200'>
            {t('offerWatch.categoryLabel', 'Podkategória')}
          </label>
          <OfferWatchCategoryField
            id={`${idPrefix}-category`}
            category={draft.category}
            subcategory={draft.subcategory}
            onChange={(category, subcategory) => onChange(
              selectOfferWatchCategory(draft, category, subcategory),
              ['category', 'subcategory'],
            )}
            disabled={controlsDisabled}
            invalid={Boolean(categoryError)}
            describedBy={categoryError ? categoryErrorId : undefined}
          />
          {categoryError ? (
            <p id={categoryErrorId} className='mt-1.5 text-xs font-medium text-red-600 dark:text-red-400' role='alert'>
              {offerWatchValidationMessage(t, errors.subcategory ? 'subcategory' : 'category', categoryError)}
            </p>
          ) : (
            <p className='mt-1.5 text-xs text-gray-500 dark:text-gray-400'>
              {t('offerWatch.categoryHelp', 'Napíš názov a vyber jednu z ponúknutých podkategórií.')}
            </p>
          )}
        </div>

        <div>
          <span className='mb-1.5 block text-sm font-medium text-gray-800 dark:text-gray-200'>
            {t('offerWatch.typeLabel', 'Typ karty')}
          </span>
          <div className='grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1 dark:bg-gray-900' role='group' aria-label={t('offerWatch.typeLabel', 'Typ karty')}>
            <button
              type='button'
              aria-pressed={!draft.isSeeking}
              onClick={() => onChange({ ...draft, isSeeking: false })}
              className={`min-h-10 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                !draft.isSeeking
                  ? 'bg-white text-purple-700 shadow-sm dark:bg-[#1b1b1e] dark:text-purple-300'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              {t('offerWatch.offers', 'Ponuky')}
            </button>
            <button
              type='button'
              aria-pressed={draft.isSeeking}
              onClick={() => onChange({ ...draft, isSeeking: true })}
              className={`min-h-10 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                draft.isSeeking
                  ? 'bg-white text-purple-700 shadow-sm dark:bg-[#1b1b1e] dark:text-purple-300'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              {t('offerWatch.requests', 'Dopyty')}
            </button>
          </div>
        </div>

        <div className={`grid gap-4 ${hasDistricts ? 'md:grid-cols-2' : ''}`}>
          <div>
            <label htmlFor={`${idPrefix}-country`} className='mb-1.5 block text-sm font-medium text-gray-800 dark:text-gray-200'>
              {t('offerWatch.countryLabel', 'Krajina')}
            </label>
            <CountrySelect
              id={`${idPrefix}-country`}
              value={draft.countryCode}
              label={t('offerWatch.countryLabel', 'Krajina')}
              onChange={(countryCode) => {
                if (persistCountrySelection) setCountry(countryCode);
                onChange(selectOfferWatchCountry(draft, countryCode), ['countryCode', 'districtCode']);
              }}
              disabled={controlsDisabled}
              invalid={Boolean(errors.countryCode)}
              describedBy={errors.countryCode ? countryErrorId : undefined}
            />
            <FieldError id={countryErrorId} field='countryCode' errors={errors} />
          </div>

          {hasDistricts ? (
            <div>
              <label htmlFor={`${idPrefix}-district`} className='mb-1.5 block text-sm font-medium text-gray-800 dark:text-gray-200'>
                {t('offerWatch.districtLabel', 'Okres (voliteľný)')}
              </label>
              <OfferWatchDistrictField
                id={`${idPrefix}-district`}
                countryCode={draft.countryCode}
                districtCode={draft.districtCode}
                onChange={(districtCode) => onChange(
                  selectOfferWatchDistrict(draft, districtCode),
                  ['districtCode'],
                )}
                disabled={controlsDisabled}
                invalid={Boolean(errors.districtCode) || hasInactiveDistrict}
                describedBy={errors.districtCode || hasInactiveDistrict ? districtErrorId : undefined}
              />
              {errors.districtCode || hasInactiveDistrict ? (
                <p id={districtErrorId} className='mt-1.5 text-xs font-medium text-red-600 dark:text-red-400' role='alert'>
                  {offerWatchValidationMessage(t, 'districtCode', errors.districtCode || 'invalid_district')}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div>
          <span className='mb-1.5 block text-sm font-medium text-gray-800 dark:text-gray-200'>
            {t('offerWatch.priceLabel', 'Cena (voliteľná)')}
          </span>
          <div className='grid gap-3 md:grid-cols-[1fr_1fr_120px]'>
            <div>
              <label htmlFor={`${idPrefix}-price-min`} className='sr-only'>{t('offerWatch.priceMin', 'Cena od')}</label>
              <input
                id={`${idPrefix}-price-min`}
                type='text'
                inputMode='decimal'
                maxLength={16}
                value={draft.priceMin}
                onChange={(event) => changePrice('priceMin', event.target.value)}
                placeholder={t('offerWatch.priceMin', 'Cena od')}
                aria-invalid={Boolean(errors.priceMin) || undefined}
                aria-describedby={errors.priceMin ? priceMinErrorId : undefined}
                className={`min-h-11 w-full rounded-xl border bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 dark:bg-black dark:text-white ${
                  errors.priceMin
                    ? 'border-red-400 focus:ring-red-400/25 dark:border-red-700'
                    : 'border-gray-300 focus:border-purple-400 focus:ring-purple-400/25 dark:border-gray-700'
                }`}
              />
              <FieldError id={priceMinErrorId} field='priceMin' errors={errors} />
            </div>
            <div>
              <label htmlFor={`${idPrefix}-price-max`} className='sr-only'>{t('offerWatch.priceMax', 'Cena do')}</label>
              <input
                id={`${idPrefix}-price-max`}
                type='text'
                inputMode='decimal'
                maxLength={16}
                value={draft.priceMax}
                onChange={(event) => changePrice('priceMax', event.target.value)}
                placeholder={t('offerWatch.priceMax', 'Cena do')}
                aria-invalid={Boolean(errors.priceMax) || undefined}
                aria-describedby={errors.priceMax ? priceMaxErrorId : undefined}
                className={`min-h-11 w-full rounded-xl border bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 dark:bg-black dark:text-white ${
                  errors.priceMax
                    ? 'border-red-400 focus:ring-red-400/25 dark:border-red-700'
                    : 'border-gray-300 focus:border-purple-400 focus:ring-purple-400/25 dark:border-gray-700'
                }`}
              />
              <FieldError id={priceMaxErrorId} field='priceMax' errors={errors} />
            </div>
            <div>
              <label htmlFor={`${idPrefix}-currency`} className='sr-only'>{t('offerWatch.currency', 'Mena')}</label>
              <select
                id={`${idPrefix}-currency`}
                value={draft.priceCurrency}
                onChange={(event) => onChange(
                  { ...draft, priceCurrency: event.target.value as OfferWatchPriceCurrency | '' },
                  ['priceCurrency'],
                )}
                disabled={controlsDisabled || (!draft.priceMin.trim() && !draft.priceMax.trim())}
                aria-invalid={Boolean(errors.priceCurrency) || undefined}
                aria-describedby={errors.priceCurrency ? currencyErrorId : undefined}
                className={`min-h-11 w-full rounded-xl border bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-black dark:text-white ${
                  errors.priceCurrency
                    ? 'border-red-400 focus:ring-red-400/25 dark:border-red-700'
                    : 'border-gray-300 focus:border-purple-400 focus:ring-purple-400/25 dark:border-gray-700'
                }`}
              >
                <option value=''>{t('offerWatch.currency', 'Mena')}</option>
                {OFFER_WATCH_PRICE_CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>{currency}</option>
                ))}
              </select>
              <FieldError id={currencyErrorId} field='priceCurrency' errors={errors} />
            </div>
          </div>
        </div>

        <div className={`pt-1 ${secondaryLabel && onSecondary ? 'grid grid-cols-2 gap-3' : 'flex justify-end'}`}>
          {secondaryLabel && onSecondary ? (
            <button
              type='button'
              onClick={onSecondary}
              disabled={controlsDisabled}
              className='min-h-11 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-400/30 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900'
            >
              {secondaryLabel}
            </button>
          ) : null}
          <button
            type='submit'
            disabled={controlsDisabled}
            className='inline-flex min-h-11 min-w-40 items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400/50 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-purple-500 dark:hover:bg-purple-600'
          >
            {isSubmitting ? <span className='h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' aria-hidden='true' /> : null}
            {isSubmitting ? submittingLabel : submitLabel}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
