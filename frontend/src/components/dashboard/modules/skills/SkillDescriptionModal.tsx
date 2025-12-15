'use client';

import React, { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import DescriptionSection from './skillDescriptionModal/sections/DescriptionSection';
import TagsSection from './skillDescriptionModal/sections/TagsSection';
import ImagesSection from './skillDescriptionModal/sections/ImagesSection';
import LocationSection from './skillDescriptionModal/sections/LocationSection';
import ExperienceSection from './skillDescriptionModal/sections/ExperienceSection';
import PriceSection from './skillDescriptionModal/sections/PriceSection';
import DurationSection from './skillDescriptionModal/sections/DurationSection';
import DetailedDescriptionModal from './skillDescriptionModal/DetailedDescriptionModal';
import OpeningHoursModal from './skillDescriptionModal/OpeningHoursModal';
import { SkillDescriptionModalProps } from './skillDescriptionModal/types';
import { slugifyLabel } from './skillDescriptionModal/utils';
import { useSkillDescriptionState } from './skillDescriptionModal/hooks/useSkillDescriptionState';
import {
  handleSave,
  handleExperienceValueChange,
  handlePriceChange,
  handleLocationBlur,
} from './skillDescriptionModal/handlers/skillDescriptionHandlers';
import styles from './SkillsCategoryModal.module.css';
import MasterToggle from '../notifications/MasterToggle';

export default function SkillDescriptionModal({ 
  isOpen, 
  onClose, 
  category, 
  subcategory, 
  onSave,
  initialDescription = '',
  initialExperience,
  initialTags = [],
  initialImages = [],
  onRemoveExistingImage,
  initialPriceFrom = null,
  initialPriceCurrency = '€',
  initialLocation = '',
  initialDistrict = '',
  onLocationSave,
  initialDetailedDescription = '',
  initialOpeningHours,
  accountType = 'personal',
  isSeeking = false,
  initialUrgency = 'low',
  onUrgencyChange,
  initialDurationType = null,
  onDurationTypeChange,
}: SkillDescriptionModalProps) {
  const { locale, t } = useLanguage();
  const categorySlug = useMemo(() => (category ? slugifyLabel(category) : ''), [category]);
  const subcategorySlug = useMemo(() => (subcategory ? slugifyLabel(subcategory) : ''), [subcategory]);
  const translatedCategory = useMemo(() => {
    if (category && categorySlug) {
      return t(`skillsCatalog.categories.${categorySlug}`, category);
    }
    return category;
  }, [category, categorySlug, t]);
  const translatedSubcategory = useMemo(() => {
    if (subcategory && categorySlug && subcategorySlug) {
      return t(`skillsCatalog.subcategories.${categorySlug}.${subcategorySlug}`, subcategory);
    }
    return subcategory;
  }, [subcategory, categorySlug, subcategorySlug, t]);

  const state = useSkillDescriptionState({
    isOpen,
    locale,
    initialDescription,
    initialExperience,
    initialTags,
    initialImages,
    initialPriceFrom,
    initialPriceCurrency,
    initialLocation,
    initialDistrict,
    initialDetailedDescription,
    initialOpeningHours,
    initialUrgency,
    initialDurationType,
  });

  const onSaveClick = () => {
    handleSave({
      description: state.description,
      experienceValue: state.experienceValue,
      experienceUnit: state.experienceUnit,
      tags: state.tags,
      images: state.images,
      priceFrom: state.priceFrom,
      priceCurrency: state.priceCurrency,
      location: state.location,
      district: state.district,
      detailedDescription: state.detailedDescription,
      openingHours: state.openingHours,
      existingImages: state.existingImages,
      initialDescription,
      initialExperience,
      initialTags,
      initialDetailedDescription,
      initialLocation,
      initialDistrict,
      initialOpeningHours,
      initialPriceFrom,
      urgency: state.urgency,
      durationType: state.durationType,
      onSave,
      setError: state.setError,
      setExperienceError: state.setExperienceError,
      setPriceError: state.setPriceError,
      t,
    });
  };

  const onExperienceValueChange = (val: string) => {
    handleExperienceValueChange(val, state.setExperienceValue, state.setExperienceError);
  };

  const onPriceChange = (val: string) => {
    handlePriceChange(val, state.setPriceFrom, state.setPriceError);
  };

  const onLocationBlur = async () => {
    await handleLocationBlur({
      location: state.location,
      lastSavedLocationRef: state.lastSavedLocationRef,
      onLocationSave,
      setLocation: state.setLocation,
      setLocationError: state.setLocationError,
      setIsLocationSaving: state.setIsLocationSaving,
      t,
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="w-full max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl 2xl:max-w-2xl"
          onClick={(e) => e.stopPropagation()}
        >
        <div className="rounded-2xl bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2 md:px-6 md:pt-6 md:pb-3">
            <h2 className="text-lg md:text-xl font-semibold">
              {isSeeking 
                ? t('skills.describeWhatYouSeek', 'Opíš čo presne hľadáš')
                : t('skills.describeSkillTitle', 'Opíš svoju službu/zručnosť')}
            </h2>
            <button 
              aria-label="Close" 
              onClick={onClose} 
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className={`px-6 pb-4 ${styles.scrollArea}`} style={{ maxHeight: 'calc(80vh - 80px)' }}>
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {translatedCategory ? (
                  <span className="font-medium text-gray-800 dark:text-gray-200">{translatedCategory}</span>
                ) : null}
                {translatedCategory && translatedSubcategory ? <span className="mx-2">→</span> : null}
                {translatedSubcategory ? (
                  <span className="text-gray-700 dark:text-gray-300">{translatedSubcategory}</span>
                ) : null}
              </p>
            </div>

            <DescriptionSection
              description={state.description}
              onChange={state.setDescription}
              error={state.error}
              onErrorChange={state.setError}
              isOpen={isOpen}
              isSeeking={isSeeking}
            />

            <div className="mb-0">
              <button
                type="button"
                onClick={() => state.setIsDetailedModalOpen(true)}
                className="text-sm text-purple-700 dark:text-purple-300 font-medium hover:underline"
              >
                {state.detailedDescription 
                  ? t('skills.editDetailedDescription', 'Upraviť podrobný opis')
                  : `+ ${t('skills.addDetailedDescription', 'Pridať podrobný opis')}`}
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              {isSeeking
                ? t('skills.descriptionInfoSeeking', 'Opíš podrobne čo hľadáš tak, aby používatelia získali čo najviac dôležitých informácií.')
                : t('skills.descriptionInfo', 'Opíš svoju službu alebo zručnosť tak, aby používatelia získali čo najviac dôležitých informácií.')}
            </p>

            <TagsSection tags={state.tags} onTagsChange={state.setTags} isOpen={isOpen} />

            <ImagesSection
              images={state.images}
              setImages={state.setImages}
              imagePreviews={state.imagePreviews}
              setImagePreviews={state.setImagePreviews}
              existingImages={state.existingImages}
              setExistingImages={state.setExistingImages}
              onRemoveExistingImage={onRemoveExistingImage}
              isOpen={isOpen}
            />

            <LocationSection
              value={state.location}
              onChange={(val) => {
                state.setLocation(val);
                state.setLocationError('');
                }}
              onBlur={onLocationBlur}
              error={state.locationError}
              isSaving={state.isLocationSaving}
              district={state.district}
              onDistrictChange={state.setDistrict}
              isSeeking={isSeeking}
            />

            <ExperienceSection
              value={state.experienceValue}
              onChange={onExperienceValueChange}
              unit={state.experienceUnit}
              onUnitChange={state.setExperienceUnit}
              error={state.experienceError}
              isSeeking={isSeeking}
            />

            <PriceSection
              value={state.priceFrom}
              onChange={onPriceChange}
              currency={state.priceCurrency}
              onCurrencyChange={(val) => {
                state.setPriceCurrency(val);
                state.setUserTouchedCurrency(true);
              }}
              error={state.priceError}
              isSeeking={isSeeking}
            />

            {isSeeking && (
              <DurationSection
                value={state.durationType}
                onChange={(val) => {
                  state.setDurationType(val);
                  onDurationTypeChange?.(val);
                }}
              />
            )}

          {/* Urgentnosť – len pre Hľadám */}
          {isSeeking && (
            <div className="mt-4">
              <div className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                {t('skills.urgency', 'Urgentnosť')}
              </div>
              <div className="flex flex-wrap gap-2">
                {([
                  { key: 'low', label: t('skills.urgencyLow', 'Nízka') },
                  { key: 'medium', label: t('skills.urgencyMedium', 'Stredná') },
                  { key: 'high', label: t('skills.urgencyHigh', 'Vysoká') },
                ] as const).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      state.setUrgency(item.key);
                      onUrgencyChange?.(item.key);
                    }}
                    className={`px-3 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                      state.urgency === item.key
                        ? item.key === 'low'
                          ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800'
                          : item.key === 'medium'
                            ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800'
                            : 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-[#0f0f10] dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-900'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {t('skills.urgencyInfo', 'Zadaj, ako urgentne hľadáš službu alebo zručnosť.')}
              </p>
            </div>
          )}

            {accountType === 'business' && !isSeeking && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => state.setIsOpeningHoursModalOpen(true)}
                  className="text-sm text-purple-700 dark:text-purple-300 font-medium hover:underline flex items-center gap-1"
                >
                  {Object.keys(state.openingHours).length > 0 ? (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="w-4 h-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {t('skills.editOpeningHours', 'Upraviť otváraciu dobu')}
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="w-4 h-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {t('skills.addOpeningHours', 'Pridať otváraciu dobu')}
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Skryť kartu */}
            <div className="mt-4 mb-4 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg">
              <MasterToggle
                enabled={state.isHideCardEnabled}
                onChange={(value) => {
                  state.setIsHideCardEnabled(value);
                  // TODO: Implementovať funkcionalitu skrytia karty
                }}
                label={t('skills.hideCardToggle', 'Skryť túto kartu')}
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-2xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {t('common.cancel', 'Zrušiť')}
              </button>
              <button
                onClick={onSaveClick}
                className="flex-1 px-4 py-2 rounded-2xl bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={
                  state.existingImages.length > 0 || initialDescription || initialExperience || (initialTags && initialTags.length) || initialDetailedDescription || initialLocation || initialDistrict || (initialOpeningHours && Object.keys(initialOpeningHours).length > 0) || (initialPriceFrom !== null && initialPriceFrom > 0)
                    ? false
                    : !state.description.trim()
                }
              >
                {state.existingImages.length || initialDescription || initialExperience || (initialTags && initialTags.length)
                  ? t('common.update', 'Aktualizovať')
                  : t('common.add', 'Pridať')}
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>

      <DetailedDescriptionModal
        isOpen={state.isDetailedModalOpen}
        onClose={() => state.setIsDetailedModalOpen(false)}
        initialValue={state.detailedDescription}
        onSave={(val) => state.setDetailedDescription(val)}
        isSeeking={isSeeking}
      />

      <OpeningHoursModal
        isOpen={state.isOpeningHoursModalOpen}
        onClose={() => state.setIsOpeningHoursModalOpen(false)}
        initialValue={state.openingHours}
        onSave={(val) => state.setOpeningHours(val)}
      />
    </>
  );
}

