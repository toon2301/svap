'use client';

import React, { useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileFullScreenModal from '../profile-edit/shared/MobileFullScreenModal';
import DescriptionSection from './skillDescriptionModal/sections/DescriptionSection';
import TagsSection, { TagsSectionRef } from './skillDescriptionModal/sections/TagsSection';
import LocationSection from './skillDescriptionModal/sections/LocationSection';
import ExperienceSection from './skillDescriptionModal/sections/ExperienceSection';
import PriceSection from './skillDescriptionModal/sections/PriceSection';
import OpeningHoursContent from './skillDescriptionModal/OpeningHoursContent';
import UrgencyModal from './skillDescriptionModal/UrgencyModal';
import DurationModal from './skillDescriptionModal/DurationModal';
import { MAX_DETAILED_LENGTH } from './skillDescriptionModal/types';
import type { SkillsDescriptionScreenState } from './skillDescriptionModal/hooks/useSkillsDescriptionScreenState';

interface SkillsDescriptionMobileModalsProps {
  state: SkillsDescriptionScreenState;
}

export default function SkillsDescriptionMobileModals({ state }: SkillsDescriptionMobileModalsProps) {
  const { t } = useLanguage();
  const detailedTextareaRef = useRef<HTMLTextAreaElement>(null);
  const tagsSectionRef = useRef<TagsSectionRef>(null);

  const {
    isSeeking,
    accountType,
    description,
    detailedDescription,
    tags,
    district,
    location,
    experienceValue,
    experienceUnit,
    priceFrom,
    priceCurrency,
    urgency,
    durationType,
    openingHours,
    error,
    setError,
    detailedError,
    locationError,
    experienceError,
    priceError,
    isLocationSaving,
    isDescriptionModalOpen,
    isDetailedDescriptionModalOpen,
    isTagsModalOpen,
    isLocationModalOpen,
    isExperienceModalOpen,
    isPriceModalOpen,
    isOpeningHoursModalOpen,
    isUrgencyModalOpen,
    isDurationModalOpen,
    remainingDetailedChars,
    setPriceCurrency,
    setExperienceUnit,
    setOpeningHours,
    handleDescriptionChange,
    handleDetailedDescriptionChange,
    handleDescriptionSave,
    handleDescriptionBack,
    handleDetailedDescriptionSave,
    handleDetailedDescriptionBack,
    handleTagsChange,
    handleTagsSave,
    handleTagsBack,
    handleDistrictChange,
    handleLocationChange,
    handleLocationBlur,
    handleLocationSave,
    handleLocationBack,
    handleExperienceValueChange,
    handleExperienceSave,
    handleExperienceBack,
    handlePriceValueChange,
    handlePriceSave,
    handlePriceBack,
    handleOpeningHoursSave,
    handleOpeningHoursBack,
    handleUrgencySave,
    handleUrgencyBack,
    handleDurationSave,
    handleDurationBack,
  } = state;

  return (
    <>
      {/* Description Modal */}
      <MobileFullScreenModal
        isOpen={isDescriptionModalOpen}
        title={t('skills.description', 'Popis')}
        onBack={handleDescriptionBack}
        onSave={handleDescriptionSave}
      >
        <DescriptionSection
          description={description}
          onChange={handleDescriptionChange}
          error={error}
          onErrorChange={setError}
          isOpen={isDescriptionModalOpen}
        />
      </MobileFullScreenModal>

      {/* Detailed Description Modal */}
      <MobileFullScreenModal
        isOpen={isDetailedDescriptionModalOpen}
        title={t('skills.detailedDescription', 'Podrobný opis')}
        onBack={handleDetailedDescriptionBack}
        onSave={handleDetailedDescriptionSave}
      >
        <div className="mb-2 relative">
          <div className="relative">
            <textarea
              ref={detailedTextareaRef}
              value={detailedDescription}
              onChange={(e) => handleDetailedDescriptionChange(e.target.value)}
              placeholder={
                isSeeking
                  ? t(
                      'skills.detailedDescriptionHintSeeking',
                      'Opíš detailne čo hľadáš – postup, čo je zahrnuté, očakávania a výsledok.',
                    )
                  : t(
                      'skills.detailedDescriptionPlaceholder',
                      'Opíš detaily služby – postup, čo je zahrnuté, očakávania a výsledok.',
                    )
              }
              className="w-full px-3 pt-2 pb-6 pr-16 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent resize-none skill-description-textarea-scrollbar"
              rows={6}
              maxLength={MAX_DETAILED_LENGTH}
              autoFocus
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-end pr-3 pb-2">
              <span
                className={`text-xs font-medium ${
                  remainingDetailedChars < 50 ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'
                }`}
                aria-live="polite"
                aria-atomic="true"
                title={t('skills.charsSuffix', 'znakov')}
              >
                {remainingDetailedChars}
              </span>
            </div>
          </div>
        </div>

        {detailedError && <p className="mt-1 text-sm text-red-500">{detailedError}</p>}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {isSeeking
            ? t(
                'skills.detailedDescriptionHintSeeking',
                'Opíš detailne čo hľadáš – postup, čo je zahrnuté, očakávania a výsledok.',
              )
            : t(
                'skills.detailedDescriptionHint',
                'Opíš detaily služby – postup, čo je zahrnuté, očakávania a výsledok.',
              )}
        </p>
      </MobileFullScreenModal>

      {/* Tags Modal */}
      <MobileFullScreenModal
        isOpen={isTagsModalOpen}
        title={t('skills.tags', 'Tagy')}
        onBack={handleTagsBack}
        onSave={handleTagsSave}
      >
        <TagsSection ref={tagsSectionRef} tags={tags} onTagsChange={handleTagsChange} isOpen={isTagsModalOpen} />
      </MobileFullScreenModal>

      {/* Location Modal */}
      <MobileFullScreenModal
        isOpen={isLocationModalOpen}
        title={
          isSeeking ? t('skills.districtTitleSeeking', 'Okres (povinné)') : t('skills.district', 'Okres')
        }
        onBack={handleLocationBack}
        onSave={handleLocationSave}
      >
        <LocationSection
          value={location}
          onChange={handleLocationChange}
          onBlur={handleLocationBlur}
          error={locationError}
          isSaving={isLocationSaving}
          district={district}
          onDistrictChange={handleDistrictChange}
          isSeeking={isSeeking}
        />
      </MobileFullScreenModal>

      {/* Experience Modal */}
      <MobileFullScreenModal
        isOpen={isExperienceModalOpen}
        title={
          isSeeking
            ? t('skills.experienceOptionalSeeking', 'Minimálna prax (voliteľné)')
            : t('skills.experienceLength', 'Dĺžka praxe')
        }
        onBack={handleExperienceBack}
        onSave={handleExperienceSave}
      >
        <ExperienceSection
          value={experienceValue}
          onChange={handleExperienceValueChange}
          unit={experienceUnit}
          onUnitChange={setExperienceUnit}
          error={experienceError}
          isSeeking={isSeeking}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          {isSeeking
            ? t(
                'skills.experienceHintSeeking',
                'Zadaj, akú dlhú prax má mať človek, ktorého hľadáš.',
              )
            : t(
                'skills.experienceHint',
                'Daj ostatným vedieť, ako dlho sa venuješ svojej odbornosti.',
              )}
        </p>
      </MobileFullScreenModal>

      {/* Price Modal */}
      <MobileFullScreenModal
        isOpen={isPriceModalOpen}
        title={isSeeking ? t('skills.priceToOptional', 'Cena do (voliteľné)') : t('skills.priceFrom', 'Cena od')}
        onBack={handlePriceBack}
        onSave={handlePriceSave}
      >
        <PriceSection
          value={priceFrom}
          onChange={handlePriceValueChange}
          currency={priceCurrency}
          onCurrencyChange={(val) => setPriceCurrency(val)}
          error={priceError}
          isSeeking={isSeeking}
        />
      </MobileFullScreenModal>

      {/* Opening Hours Modal - Mobile Fullscreen (len pre Ponúkam) */}
      {accountType === 'business' && !isSeeking && (
        <MobileFullScreenModal
          isOpen={isOpeningHoursModalOpen}
          title={t('skills.openingHours.title', 'Otváracia doba')}
          onBack={handleOpeningHoursBack}
          onSave={() => {
            handleOpeningHoursSave(openingHours);
          }}
        >
          <OpeningHoursContent openingHours={openingHours} setOpeningHours={setOpeningHours} />
        </MobileFullScreenModal>
      )}

      {/* Urgency & Duration Modals - Mobile Fullscreen (len pre Hľadám) */}
      {isSeeking && (
        <>
          <UrgencyModal
            isOpen={isUrgencyModalOpen}
            onClose={handleUrgencyBack}
            onSave={handleUrgencySave}
            initialValue={urgency || 'low'}
          />
          <DurationModal
            isOpen={isDurationModalOpen}
            onClose={handleDurationBack}
            onSave={handleDurationSave}
            initialValue={durationType || null}
          />
        </>
      )}
    </>
  );
}


