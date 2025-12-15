'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { SkillsDescriptionScreenState } from './skillDescriptionModal/hooks/useSkillsDescriptionScreenState';

interface SkillsDescriptionMobileLayoutProps {
  category: string;
  subcategory: string;
  state: SkillsDescriptionScreenState;
}

export default function SkillsDescriptionMobileLayout({
  category,
  subcategory,
  state,
}: SkillsDescriptionMobileLayoutProps) {
  const { t } = useLanguage();

  const {
    isSeeking,
    accountType,
    description,
    detailedDescription,
    tags,
    district,
    location,
    experience,
    priceFrom,
    priceCurrency,
    urgency,
    durationType,
    openingHours,
    validExistingImages,
    imagePreviews,
    totalImagesCount,
    canRemoveExistingImages,
    setIsDescriptionModalOpen,
    setIsDetailedDescriptionModalOpen,
    setIsTagsModalOpen,
    setIsLocationModalOpen,
    setIsExperienceModalOpen,
    setIsPriceModalOpen,
    setIsOpeningHoursModalOpen,
    setIsUrgencyModalOpen,
    setIsDurationModalOpen,
    handleImageInputChange,
    handleRemoveExistingImageClick,
    handleRemoveNewImage,
  } = state;

  return (
    <div className="block lg:hidden w-full -mt-3">
      <div className="flex flex-col w-full">
        {/* Category breadcrumb */}
        <div className="mb-4 px-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 break-words">
            {category === subcategory ? (
              <span className="font-medium text-gray-800 dark:text-gray-200 break-words">{category}</span>
            ) : (
              <>
                <span className="font-medium text-gray-800 dark:text-gray-200 break-words">{category}</span>
                {subcategory && (
                  <>
                    <span className="mx-2 whitespace-nowrap">→</span>
                    <span className="text-gray-700 dark:text-gray-300 break-words">{subcategory}</span>
                  </>
                )}
              </>
            )}
          </p>
        </div>

        {/* Fields wrapper */}
        <div className="border-t border-gray-200 dark:border-gray-800">
          {/* Skryť kartu */}
          <div className="py-4 pl-2 pr-0 border-t border-gray-100 dark:border-gray-800">
            {/* Prepínač pre skrytie karty */}
            <div className="flex items-center justify-between px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg">
              <span className="text-xs font-medium text-gray-900 dark:text-white">
                {t('skills.hideCardToggle', 'Skryť túto kartu')}
              </span>
              <button
                type="button"
                onClick={() => {
                  // TODO: Implementovať funkcionalitu skrytia karty
                }}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                  false ? 'bg-purple-400 border border-purple-400' : 'bg-gray-300 dark:bg-gray-600'
                }`}
                style={{
                  transform: 'scaleY(0.8)',
                  transformOrigin: 'left center',
                }}
              >
                <span
                  className={`absolute h-3 w-3 rounded-full bg-white shadow-sm transition-all duration-200 ease-in-out ${
                    false ? 'left-5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Popis */}
          <div
            className="flex items-center py-4 pl-2 pr-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 border-t border-gray-100 dark:border-gray-800"
            onClick={() => setIsDescriptionModalOpen(true)}
          >
            <span className="text-gray-900 dark:text-white font-medium w-40">
              {t('skills.description', 'Popis')}
            </span>
            <div className="flex items-center flex-1 ml-4 pr-2">
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mr-3" />
              <span className="text-gray-600 dark:text-gray-300 text-sm truncate">
                {description ? t('skills.editDescription', 'Upraviť popis') : t('skills.addDescription', 'Pridať popis')}
              </span>
            </div>
          </div>

          {/* Podrobný opis */}
          <div
            className="flex items-center py-4 pl-2 pr-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 border-t border-gray-100 dark:border-gray-800"
            onClick={() => setIsDetailedDescriptionModalOpen(true)}
          >
            <span className="text-gray-900 dark:text-white font-medium w-40 whitespace-nowrap">
              {t('skills.detailedDescription', 'Podrobný opis')}
            </span>
            <div className="flex items-center flex-1 ml-4 pr-2">
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mr-3" />
              <span className="text-gray-600 dark:text-gray-300 text-sm truncate">
                {detailedDescription ? t('skills.edit', 'Upraviť') : t('skills.detailedDescription', 'Podrobný opis')}
              </span>
            </div>
          </div>

          {/* Tagy */}
          <div
            className="flex items-center py-4 pl-2 pr-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 border-t border-gray-100 dark:border-gray-800"
            onClick={() => setIsTagsModalOpen(true)}
          >
            <span className="text-gray-900 dark:text-white font-medium w-40 whitespace-nowrap">
              {t('skills.tags', 'Tagy')}
            </span>
            <div className="flex items-center flex-1 ml-4 pr-2">
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mr-3" />
              <span className="text-gray-600 dark:text-gray-300 text-sm truncate">
                {tags.length > 0
                  ? (() => {
                      const count = tags.length;
                      if (count === 1) {
                        return `${count} ${t('skills.tagSingular', 'tag')}`;
                      }
                      if (count >= 2 && count <= 4) {
                        return `${count} ${t('skills.tagsPlural24', 'tagy')}`;
                      }
                      return `${count} ${t('skills.tagsPlural5Plus', 'tagov')}`;
                    })()
                  : t('skills.addTags', 'Pridať tagy')}
              </span>
            </div>
          </div>

          {/* Okres */}
          <div
            className="flex items-center py-4 pl-2 pr-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 border-t border-gray-100 dark:border-gray-800"
            onClick={() => setIsLocationModalOpen(true)}
          >
            {/* Label vľavo */}
            <span className="text-gray-900 dark:text-white font-medium whitespace-nowrap">
              {t('skills.district', 'Okres')}
            </span>

            {/* Vertikálna čiara + okres zarovnané doprava, rozširujú sa doľava podľa dĺžky textu */}
            <div className="flex items-center flex-1 min-w-0 justify-end pr-2 ml-4">
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mr-3 flex-shrink-0" />
              {(() => {
                const displayText =
                  location && location.trim()
                    ? location
                    : district
                      ? district
                      : t('skills.addDistrict', 'Pridať okres');

                // Rovnaká logika ako pri lokalite v "Upraviť profil" – ale s limitom 21 znakov
                const isLong = displayText.length > 21;

                return (
                  <span
                    className={`text-gray-600 dark:text-gray-300 ${
                      isLong
                        ? 'text-xs leading-tight break-words line-clamp-2 max-w-full flex-1 min-w-0' // >21 znakov
                        : 'text-sm whitespace-nowrap' // ≤21 znakov
                    }`}
                  >
                    {displayText}
                  </span>
                );
              })()}
            </div>
          </div>

          {/* Dĺžka praxe */}
          <div
            className="flex items-center py-4 pl-2 pr-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 border-t border-gray-100 dark:border-gray-800"
            onClick={() => setIsExperienceModalOpen(true)}
          >
            <span className="text-gray-900 dark:text-white font-medium w-40 whitespace-nowrap">
              {t('skills.experienceLength', 'Dĺžka praxe')}
            </span>
            <div className="flex items-center flex-1 ml-4 pr-2">
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mr-3" />
              <span className="text-gray-600 dark:text-gray-300 text-sm">
                {experience
                  ? (() => {
                      if (experience.unit === 'years') {
                        const value = experience.value;
                        let yearsText;
                        if (value === 1) {
                          yearsText = t('skills.yearSingular', 'rok');
                        } else if (value >= 2 && value <= 4) {
                          yearsText = t('skills.yearsPlural24', 'roky');
                        } else {
                          yearsText = t('skills.yearsPlural5Plus', 'rokov');
                        }
                        return `${value} ${yearsText}`;
                      }
                      const value = experience.value;
                      let monthsText;
                      if (value === 1) {
                        monthsText = t('skills.monthSingular', 'mesiac');
                      } else if (value >= 2 && value <= 4) {
                        monthsText = t('skills.monthsPlural24', 'mesiace');
                      } else {
                        monthsText = t('skills.monthsPlural5Plus', 'mesiacov');
                      }
                      return `${value} ${monthsText}`;
                    })()
                  : t('skills.addExperience', 'Pridať dĺžku praxe')}
              </span>
            </div>
          </div>

          {/* Cena */}
          <div
            className="flex items-center py-4 pl-2 pr-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 border-t border-gray-100 dark:border-gray-800"
            onClick={() => setIsPriceModalOpen(true)}
          >
            <span className="text-gray-900 dark:text-white font-medium w-40 whitespace-nowrap">
              {isSeeking ? t('skills.priceTo', 'Cena do') : t('skills.priceFrom', 'Cena od')}
            </span>
            <div className="flex items-center flex-1 ml-4 pr-2">
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mr-3" />
              <span className="text-gray-600 dark:text-gray-300 text-sm">
                {priceFrom && parseFloat(priceFrom) > 0
                  ? `${parseFloat(priceFrom).toLocaleString('sk-SK', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })} ${priceCurrency}`
                  : t('skills.addPrice', 'Pridať cenu')}
              </span>
            </div>
          </div>

          {/* Urgentnosť - len pre Hľadám */}
          {isSeeking && (
            <div
              className="flex items-center py-4 pl-2 pr-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 border-t border-gray-100 dark:border-gray-800"
              onClick={() => setIsUrgencyModalOpen(true)}
            >
              <span className="text-gray-900 dark:text-white font-medium w-40 whitespace-nowrap">
                {t('skills.urgency', 'Urgentnosť')}
              </span>
              <div className="flex items-center flex-1 ml-4 pr-2">
                <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mr-3" />
                <span className="text-gray-600 dark:text-gray-300 text-sm">
                  {urgency === 'low'
                    ? t('skills.urgencyLow', 'Nízka')
                    : urgency === 'medium'
                      ? t('skills.urgencyMedium', 'Stredná')
                      : urgency === 'high'
                        ? t('skills.urgencyHigh', 'Vysoká')
                        : t('skills.urgencyLow', 'Nízka')}
                </span>
              </div>
            </div>
          )}

          {/* Trvanie - len pre Hľadám */}
          {isSeeking && (
            <div
              className="flex items-center py-4 pl-2 pr-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 border-t border-gray-100 dark:border-gray-800"
              onClick={() => setIsDurationModalOpen(true)}
            >
              <span className="text-gray-900 dark:text-white font-medium w-40 whitespace-nowrap">
                {t('skills.duration', 'Trvanie')}
              </span>
              <div className="flex items-center flex-1 ml-4 pr-2">
                <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mr-3" />
                <span className="text-gray-600 dark:text-gray-300 text-sm">
                  {durationType === 'one_time'
                    ? t('skills.durationOneTime', 'Jednorazovo')
                    : durationType === 'long_term'
                      ? t('skills.durationLongTerm', 'Dlhodobo')
                      : durationType === 'project'
                        ? t('skills.durationProject', 'Zákazka')
                        : t('skills.selectDuration', 'Vyber trvanie')}
                </span>
              </div>
            </div>
          )}

          {/* Otváracia doba - len pre firemné účty a len v Ponúkam */}
          {accountType === 'business' && !isSeeking && (
            <div
              className="flex items-center py-4 pl-2 pr-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 border-t border-gray-100 dark:border-gray-800"
              onClick={() => setIsOpeningHoursModalOpen(true)}
            >
              <span className="text-gray-900 dark:text-white font-medium w-40 whitespace-nowrap">
                {t('skills.openingHours.title', 'Otváracia doba')}
              </span>
              <div className="flex items-center flex-1 ml-4 pr-2">
                <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mr-3" />
                <span className="text-gray-600 dark:text-gray-300 text-sm truncate">
                  {Object.keys(openingHours).length > 0
                    ? t('skills.editOpeningHours', 'Upraviť')
                    : t('skills.addOpeningHours', 'Pridať otváraciu dobu')}
                </span>
              </div>
            </div>
          )}

          {/* Fotky */}
          <div className="border-t border-gray-100 dark:border-gray-800 py-4 pl-2 pr-0">
            {/* Riadok s labelom a tlačidlom na pridanie */}
            <div className="flex items-center mb-3">
              <span className="text-gray-900 dark:text-white font-medium w-40 whitespace-nowrap">
                {t('skills.photos', 'Fotky')}
              </span>
              <div className="flex-1 ml-4 pr-2">
                {totalImagesCount < 6 && (
                  <label className="w-20 h-20 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleImageInputChange}
                    />
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      className="w-7 h-7"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.6}
                        d="M9.75 6.75L11.25 4.5h1.5l1.5 2.25H18a2.25 2.25 0 012.25 2.25v7.5A2.25 2.25 0 0118 18.75H6a2.25 2.25 0 01-2.25-2.25v-7.5A2.25 2.25 0 016 6.75h3.75z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.6}
                        d="M12 10.5a3 3 0 100 6 3 3 0 000-6z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.6}
                        d="M18.75 6.75v3"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.6}
                        d="M20.25 8.25h-3"
                      />
                    </svg>
                  </label>
                )}
              </div>
            </div>
            {/* Čiara nad fotkami */}
            {(validExistingImages.length > 0 || imagePreviews.length > 0) && (
              <div className="border-t border-gray-200 dark:border-gray-800 pt-3 mb-3 -ml-2 mr-2" />
            )}
            {/* Fotky pod čiarou, z ľavej strany */}
            {(validExistingImages.length > 0 || imagePreviews.length > 0) && (
              <div className="pr-2">
                <div className="flex flex-wrap gap-3">
                  {validExistingImages.map((img) => {
                    const src = img.image_url || img.image || '';
                    return (
                      <div
                        key={`${img.id ?? src}`}
                        className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700"
                      >
                        <img
                          src={src}
                          alt={t('skills.existingPhotoAlt', 'Existujúca fotka')}
                          className="w-full h-full object-cover"
                        />
                        {canRemoveExistingImages && img.id && (
                          <button
                            type="button"
                            aria-label={t('skills.removeExistingPhoto', 'Odstrániť existujúcu fotku')}
                            className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black/80 transition"
                            onClick={() => {
                              handleRemoveExistingImageClick(img.id!);
                            }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {imagePreviews.map((src, idx) => (
                    <div
                      key={idx}
                      className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700"
                    >
                      <img
                        src={src}
                        alt={`${t('skills.preview', 'Náhľad')} ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        aria-label={t('skills.removePhoto', 'Odstrániť obrázok')}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                        onClick={() => {
                          handleRemoveNewImage(idx);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


