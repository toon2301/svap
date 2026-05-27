'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckIcon, ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { api, endpoints } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import CurrencySelect from '../skills/skillDescriptionModal/CurrencySelect';
import ExperienceUnitSelect from '../skills/skillDescriptionModal/ExperienceUnitSelect';
import type { CurrencyOption, UnitOption } from '../skills/skillDescriptionModal/types';
import type { Offer } from './profileOffersTypes';
import { mapApiOfferToProfileOffer } from './profileOfferMapper';
import {
  createSkillRequest,
  getApiErrorMessage,
  type SkillRequestCreatePayload,
} from '../requests/requestsApi';

type HelpRequestModalProps = {
  open: boolean;
  offer: Offer | null;
  onClose: () => void;
  onSubmitted: (offerId: number, requestId: number | null) => void;
};

const DESCRIPTION_MAX_LENGTH = 200;

function toCurrency(value: string | undefined): CurrencyOption {
  return value === 'Kč' || value === '$' || value === 'zł' || value === 'Ft' ? value : '€';
}

function numberInputValue(value: number | null | undefined): string {
  return value === null || value === undefined || !Number.isFinite(Number(value))
    ? ''
    : String(value);
}

export function HelpRequestModal({ open, offer, onClose, onSubmitted }: HelpRequestModalProps) {
  const { t } = useLanguage();
  const [ownOffers, setOwnOffers] = useState<Offer[]>([]);
  const [hasLoadedOffers, setHasLoadedOffers] = useState(false);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [priceFrom, setPriceFrom] = useState('');
  const [priceCurrency, setPriceCurrency] = useState<CurrencyOption>('€');
  const [experienceValue, setExperienceValue] = useState('');
  const [experienceUnit, setExperienceUnit] = useState<UnitOption>('years');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOfferPickerOpen, setIsOfferPickerOpen] = useState(false);

  const resetProposalFields = useCallback(() => {
    setDescription('');
    setPriceFrom('');
    setPriceCurrency('€');
    setExperienceValue('');
    setExperienceUnit('years');
    setError('');
  }, []);

  useEffect(() => {
    if (!open) return;
    setSelectedOfferId('');
    setIsOfferPickerOpen(false);
    resetProposalFields();
  }, [open, offer?.id, resetProposalFields]);

  useEffect(() => {
    if (!open || hasLoadedOffers) return;
    let cancelled = false;

    void (async () => {
      try {
        setIsLoadingOffers(true);
        const { data } = await api.get(endpoints.skills.list);
        const mapped = (Array.isArray(data) ? data : [])
          .map(mapApiOfferToProfileOffer)
          .filter((item) => item.is_seeking !== true && item.is_hidden !== true);
        if (!cancelled) {
          setOwnOffers(mapped);
          setHasLoadedOffers(true);
        }
      } catch {
        if (!cancelled) {
          toast.error(t('requests.helpModalOffersLoadFailed', 'Ponuky sa nepodarilo načítať.'));
          setOwnOffers([]);
          setHasLoadedOffers(false);
        }
      } finally {
        if (!cancelled) setIsLoadingOffers(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasLoadedOffers, open, t]);

  const selectedOffer = useMemo(
    () => ownOffers.find((item) => item.id === selectedOfferId) ?? null,
    [ownOffers, selectedOfferId],
  );

  const remainingChars = DESCRIPTION_MAX_LENGTH - description.length;

  const handleSelectOffer = (value: string) => {
    const id = Number(value);
    const nextId = Number.isFinite(id) && id > 0 ? id : '';
    setSelectedOfferId(nextId);
    setIsOfferPickerOpen(false);
    const nextOffer = ownOffers.find((item) => item.id === nextId) ?? null;
    if (!nextOffer) {
      resetProposalFields();
      return;
    }

    setDescription((nextOffer.description || '').slice(0, DESCRIPTION_MAX_LENGTH));
    setPriceFrom(numberInputValue(nextOffer.price_from));
    setPriceCurrency(toCurrency(nextOffer.price_currency));
    setExperienceValue(numberInputValue(nextOffer.experience?.value));
    setExperienceUnit(nextOffer.experience?.unit ?? 'years');
    setError('');
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setIsOfferPickerOpen(false);
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!offer || typeof offer.id !== 'number') return;

    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      setError(t('requests.helpModalDescriptionRequired', 'Opis je povinný.'));
      return;
    }
    if (trimmedDescription.length > DESCRIPTION_MAX_LENGTH) {
      setError(t('requests.helpModalDescriptionTooLong', 'Opis môže mať maximálne 200 znakov.'));
      return;
    }

    const normalizedPrice = priceFrom.trim() === '' ? null : Number(priceFrom);
    if (normalizedPrice !== null && (!Number.isFinite(normalizedPrice) || normalizedPrice < 0)) {
      setError(t('skills.priceNonNegative', 'Cena musí byť nezáporné číslo'));
      return;
    }

    const normalizedExperience = experienceValue.trim() === '' ? null : Number(experienceValue);
    if (normalizedExperience !== null && (!Number.isFinite(normalizedExperience) || normalizedExperience < 0)) {
      setError(t('skills.experiencePositive', 'Dĺžka praxe musí byť kladné číslo'));
      return;
    }

    const payload: SkillRequestCreatePayload = {
      offer_id: offer.id,
      proposed_offer_id: selectedOffer?.id ?? null,
      proposal_description: trimmedDescription,
      proposal_price_negotiable: false,
      proposal_price_from: normalizedPrice,
      proposal_price_currency: normalizedPrice === null ? '' : priceCurrency,
      proposal_experience_value: normalizedExperience,
      proposal_experience_unit: normalizedExperience === null ? '' : experienceUnit,
    };

    try {
      setIsSubmitting(true);
      setError('');
      const { data } = await createSkillRequest(payload);
      const requestId = data?.id != null ? Number(data.id) : NaN;
      onSubmitted(offer.id, Number.isFinite(requestId) && requestId >= 1 ? requestId : null);
      toast.success(t('requests.helpModalSubmitSuccess', 'Ponuka pomoci bola odoslaná.'));
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, t('requests.helpModalSubmitFailed', 'Ponuku pomoci sa nepodarilo odoslať.')));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open || !offer) return null;

  const selectedOfferLabel =
    selectedOffer?.subcategory ||
    selectedOffer?.category ||
    t('requests.helpModalOfferSelectPlaceholder', 'Bez prepojenej karty');

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={t('requests.helpModalTitle', 'Chcem pomôcť')}
      onClick={handleClose}
    >
      <div
        className="absolute inset-x-0 bottom-0 flex max-h-[90dvh] flex-col overflow-hidden rounded-t-3xl border border-gray-200 bg-white/95 shadow-[0_24px_80px_rgba(15,23,42,0.24)] ring-1 ring-black/5 backdrop-blur-xl dark:border-gray-800 dark:bg-[#0f0f10]/95 dark:ring-white/10 sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:h-auto sm:max-h-[86dvh] sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-200 bg-gray-50/70 px-5 py-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 h-10 w-1.5 shrink-0 rounded-full bg-purple-500 dark:bg-purple-400" />
            <div className="min-w-0">
              <h2 className="text-xl font-semibold leading-7 text-gray-950 dark:text-white">
                {t('requests.helpModalTitle', 'Chcem pomôcť')}
              </h2>
              <p className="mt-1 line-clamp-2 text-sm leading-5 text-gray-600 dark:text-gray-400">
                {offer.description || offer.subcategory || offer.category}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-white hover:text-gray-800 disabled:opacity-60 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
            aria-label={t('common.close', 'Zavrieť')}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form className="flex min-h-0 flex-1 flex-col overflow-hidden" onSubmit={handleSubmit}>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
            {isLoadingOffers ? (
              <p className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
                {t('requests.helpModalOffersLoading', 'Načítavam tvoje ponuky...')}
              </p>
            ) : ownOffers.length > 0 ? (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('requests.helpModalOfferSelectLabel', 'Vybrať moju kartu Ponúkam')}
                </span>
                <div
                  className="relative"
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                      setIsOfferPickerOpen(false);
                    }
                  }}
                >
                  <button
                    type="button"
                    disabled={isSubmitting}
                    aria-haspopup="listbox"
                    aria-expanded={isOfferPickerOpen}
                    onClick={() => setIsOfferPickerOpen((current) => !current)}
                    className="flex h-12 w-full items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 text-left text-sm text-gray-900 shadow-sm transition-colors hover:bg-white focus:border-purple-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-800 dark:bg-black/40 dark:text-white dark:hover:bg-black dark:focus:border-purple-700 dark:focus:bg-black dark:focus:ring-purple-900/40"
                  >
                    <span className="min-w-0 truncate">{selectedOfferLabel}</span>
                    <ChevronDownIcon
                      className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${
                        isOfferPickerOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isOfferPickerOpen ? (
                    <div
                      role="listbox"
                      className="absolute left-0 right-0 top-full z-30 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-1 shadow-[0_18px_45px_rgba(15,23,42,0.18)] ring-1 ring-black/5 dark:border-gray-800 dark:bg-[#111114] dark:ring-white/10"
                    >
                      <button
                        type="button"
                        role="option"
                        aria-selected={selectedOfferId === ''}
                        onClick={() => handleSelectOffer('')}
                        className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-gray-800 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-200 dark:text-gray-100 dark:hover:bg-white/5 dark:focus:ring-purple-900/40"
                      >
                        <span className="min-w-0 truncate">
                          {t('requests.helpModalOfferSelectPlaceholder', 'Bez prepojenej karty')}
                        </span>
                        {selectedOfferId === '' ? <CheckIcon className="h-4 w-4 shrink-0 text-purple-600" /> : null}
                      </button>

                      {ownOffers.map((item) => {
                        const label = item.subcategory || item.category || t('requests.noTitle', 'Bez názvu');
                        const isSelected = item.id === selectedOfferId;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => handleSelectOffer(String(item.id))}
                            className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900/40 ${
                              isSelected
                                ? 'bg-purple-50 font-semibold text-purple-800 dark:bg-purple-900/30 dark:text-purple-100'
                                : 'text-gray-800 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-white/5'
                            }`}
                          >
                            <span className="min-w-0 truncate">{label}</span>
                            {isSelected ? <CheckIcon className="h-4 w-4 shrink-0 text-purple-600" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </label>
            ) : null}

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('requests.helpModalDescriptionLabel', 'Opis')}
              </span>
              <textarea
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value.slice(0, DESCRIPTION_MAX_LENGTH));
                  setError('');
                }}
                disabled={isSubmitting}
                maxLength={DESCRIPTION_MAX_LENGTH}
                rows={4}
                className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200 dark:border-gray-800 dark:bg-black/40 dark:text-white dark:focus:border-purple-700 dark:focus:bg-black dark:focus:ring-purple-900/40"
                placeholder={t('requests.helpModalDescriptionPlaceholder', 'Napíš krátko, ako vieš pomôcť.')}
              />
              <span className="mt-1 block text-right text-xs text-gray-400 dark:text-gray-500">
                {remainingChars}
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('skills.priceFrom', 'Cena od')}
              </span>
              <div className="flex h-12 items-stretch overflow-visible rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-black/40">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={priceFrom}
                  onChange={(event) => setPriceFrom(event.target.value)}
                  disabled={isSubmitting}
                  placeholder={t('skills.priceFrom', 'Cena od')}
                  className="h-full min-w-0 flex-1 border-0 bg-transparent px-4 text-sm text-gray-900 focus:outline-none focus:ring-0 dark:text-white"
                />
                <div className="w-px self-stretch bg-gray-300 dark:bg-gray-600" />
                <CurrencySelect value={priceCurrency} onChange={setPriceCurrency} />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('requests.helpModalExperienceLabel', 'Dĺžka praxe')}
              </span>
              <div className="flex h-12 items-stretch overflow-visible rounded-xl border border-gray-200 bg-gray-50 shadow-sm dark:border-gray-800 dark:bg-black/40">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={experienceValue}
                  onChange={(event) => setExperienceValue(event.target.value)}
                  disabled={isSubmitting}
                  placeholder="0"
                  className="h-full min-w-0 flex-1 border-0 bg-transparent px-4 text-sm text-gray-900 focus:outline-none focus:ring-0 dark:text-white"
                />
                <div className="w-px self-stretch bg-gray-300 dark:bg-gray-600" />
                <ExperienceUnitSelect value={experienceUnit} onChange={setExperienceUnit} />
              </div>
            </label>

            {error ? <div className="error-alert-modern px-3 py-2 text-sm">{error}</div> : null}
          </div>

          <div className="flex shrink-0 gap-3 border-t border-gray-200 bg-white/95 p-5 pt-4 dark:border-gray-800 dark:bg-[#0f0f10]/95 sm:px-6">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-200 disabled:opacity-60 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              {t('common.cancel', 'Zrušiť')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-2xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-purple-500/20 transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? t('common.sending', 'Odosielam...') : t('common.submit', 'Odoslať')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
