'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import DescriptionSection from './skillDescriptionModal/sections/DescriptionSection';
import TagsSection, { TagsSectionRef } from './skillDescriptionModal/sections/TagsSection';
import LocationSection from './skillDescriptionModal/sections/LocationSection';
import ExperienceSection from './skillDescriptionModal/sections/ExperienceSection';
import PriceSection from './skillDescriptionModal/sections/PriceSection';
import ImagesSection from './skillDescriptionModal/sections/ImagesSection';
import OpeningHoursContent from './skillDescriptionModal/OpeningHoursContent';
import { UnitOption, CurrencyOption, SkillImage, OpeningHours, DurationOption } from './skillDescriptionModal/types';
import MobileFullScreenModal from '../profile-edit/shared/MobileFullScreenModal';
import MasterToggle from '../notifications/MasterToggle';
import UrgencyModal from './skillDescriptionModal/UrgencyModal';
import DurationModal from './skillDescriptionModal/DurationModal';

interface SkillsDescriptionScreenProps {
  category: string;
  subcategory: string;
  onBack: () => void;
  isSeeking?: boolean;
  initialDescription?: string;
  onDescriptionChange?: (description: string) => void;
  initialDetailedDescription?: string;
  onDetailedDescriptionChange?: (description: string) => void;
  initialTags?: string[];
  onTagsChange?: (tags: string[]) => void;
  initialDistrict?: string;
  onDistrictChange?: (district: string) => void;
  initialLocation?: string;
  onLocationChange?: (location: string) => void;
  initialExperience?: { value: number; unit: UnitOption };
  onExperienceChange?: (experience: { value: number; unit: UnitOption } | undefined) => void;
  initialPriceFrom?: number | null;
  initialPriceCurrency?: string;
  onPriceChange?: (priceFrom: number | null, priceCurrency: string) => void;
  initialUrgency?: 'low' | 'medium' | 'high' | '';
  onUrgencyChange?: (urgency: 'low' | 'medium' | 'high' | '') => void;
  initialDurationType?: DurationOption | '' | null;
  onDurationTypeChange?: (durationType: DurationOption | '') => void;
  initialImages?: SkillImage[];
  onImagesChange?: (images: File[]) => void;
  onExistingImagesChange?: (existingImages: SkillImage[]) => void;
  onRemoveExistingImage?: (imageId: number) => Promise<SkillImage[] | void>;
  initialOpeningHours?: OpeningHours;
  onOpeningHoursChange?: (openingHours: OpeningHours) => void;
  accountType?: 'personal' | 'business';
}

const MAX_DETAILED_LENGTH = 1000;

export default function SkillsDescriptionScreen({
  category,
  subcategory,
  onBack,
  isSeeking = false,
  initialDescription = '',
  onDescriptionChange,
  initialDetailedDescription = '',
  onDetailedDescriptionChange,
  initialTags = [],
  onTagsChange,
  initialDistrict = '',
  onDistrictChange,
  initialLocation = '',
  onLocationChange,
  initialExperience,
  onExperienceChange,
  initialPriceFrom = null,
  initialPriceCurrency = '€',
  onPriceChange,
  initialUrgency = 'low',
  onUrgencyChange,
  initialDurationType = null,
  onDurationTypeChange,
  initialImages = [],
  onImagesChange,
  onExistingImagesChange,
  onRemoveExistingImage,
  initialOpeningHours,
  onOpeningHoursChange,
  accountType = 'personal',
}: SkillsDescriptionScreenProps) {
  const { t } = useLanguage();
  const [description, setDescription] = useState(initialDescription);
  const [originalDescription] = useState(initialDescription);
  const [detailedDescription, setDetailedDescription] = useState(initialDetailedDescription);
  const [originalDetailedDescription] = useState(initialDetailedDescription);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [originalTags, setOriginalTags] = useState<string[]>(initialTags);
  const [district, setDistrict] = useState(initialDistrict);
  const [originalDistrict] = useState(initialDistrict);
  const [location, setLocation] = useState(initialLocation);
  const [originalLocation] = useState(initialLocation);
  const [experience, setExperience] = useState<{ value: number; unit: UnitOption } | undefined>(initialExperience);
  const [originalExperience] = useState<{ value: number; unit: UnitOption } | undefined>(initialExperience);
  const [experienceValue, setExperienceValue] = useState(initialExperience ? initialExperience.value.toString() : '');
  const [experienceUnit, setExperienceUnit] = useState<UnitOption>(initialExperience?.unit || 'years');
  const [priceFrom, setPriceFrom] = useState(initialPriceFrom !== null && initialPriceFrom !== undefined ? String(initialPriceFrom) : '');
  const [originalPriceFrom] = useState(initialPriceFrom);
  const [priceCurrency, setPriceCurrency] = useState<CurrencyOption>((initialPriceCurrency || '€') as CurrencyOption);
  const [originalPriceCurrency] = useState(initialPriceCurrency || '€');
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high' | ''>(initialUrgency || 'low');
  const originalUrgencyRef = useRef<'low' | 'medium' | 'high' | ''>(initialUrgency || 'low');
  const [durationType, setDurationType] = useState<DurationOption | ''>(initialDurationType || '');
  const originalDurationTypeRef = useRef<DurationOption | ''>(initialDurationType || '');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<SkillImage[]>(initialImages);

  useEffect(() => {
    setExistingImages(initialImages);
  }, [initialImages]);

  const validExistingImages = useMemo(() => {
    const result: SkillImage[] = [];
    const seen = new Set<string>();
    for (const img of existingImages) {
      const src = img?.image_url || img?.image || '';
      if (!src) continue;
      const key = img?.id ? `id-${img.id}` : `src-${src}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(img);
    }
    return result;
  }, [existingImages]);

  const totalImagesCount = validExistingImages.length + imagePreviews.length;
  
  // Update state when initial values change
  useEffect(() => {
    setTags(initialTags);
    setOriginalTags(initialTags);
  }, [initialTags]);

  useEffect(() => {
    setDistrict(initialDistrict);
  }, [initialDistrict]);

  useEffect(() => {
    setLocation(initialLocation);
  }, [initialLocation]);

  useEffect(() => {
    setExperience(initialExperience);
    if (initialExperience) {
      setExperienceValue(initialExperience.value.toString());
      setExperienceUnit(initialExperience.unit);
    } else {
      setExperienceValue('');
      setExperienceUnit('years');
    }
  }, [initialExperience]);

  useEffect(() => {
    setPriceFrom(initialPriceFrom !== null && initialPriceFrom !== undefined ? String(initialPriceFrom) : '');
    setPriceCurrency((initialPriceCurrency || '€') as CurrencyOption);
  }, [initialPriceFrom, initialPriceCurrency]);

  useEffect(() => {
    const newUrgency = initialUrgency || 'low';
    setUrgency(newUrgency);
    originalUrgencyRef.current = newUrgency;
  }, [initialUrgency]);

  useEffect(() => {
    const newDurationType = initialDurationType || '';
    setDurationType(newDurationType);
    originalDurationTypeRef.current = newDurationType;
  }, [initialDurationType]);

  const [error, setError] = useState('');
  const [detailedError, setDetailedError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [experienceError, setExperienceError] = useState('');
  const [priceError, setPriceError] = useState('');
  const [isLocationSaving, setIsLocationSaving] = useState(false);
  const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);
  const [isDetailedDescriptionModalOpen, setIsDetailedDescriptionModalOpen] = useState(false);
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isExperienceModalOpen, setIsExperienceModalOpen] = useState(false);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [isOpeningHoursModalOpen, setIsOpeningHoursModalOpen] = useState(false);
  const [isUrgencyModalOpen, setIsUrgencyModalOpen] = useState(false);
  const [isDurationModalOpen, setIsDurationModalOpen] = useState(false);
  const [openingHours, setOpeningHours] = useState<OpeningHours>(initialOpeningHours || {});
  const [originalOpeningHours] = useState<OpeningHours>(initialOpeningHours || {});
  const detailedTextareaRef = useRef<HTMLTextAreaElement>(null);
  const tagsSectionRef = useRef<TagsSectionRef>(null);

  useEffect(() => {
    setOpeningHours(initialOpeningHours || {});
  }, [initialOpeningHours]);

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    if (onDescriptionChange) {
      onDescriptionChange(value);
    }
  };

  const handleDetailedDescriptionChange = (value: string) => {
    if (value.length <= MAX_DETAILED_LENGTH) {
      setDetailedDescription(value);
      setDetailedError('');
      if (onDetailedDescriptionChange) {
        onDetailedDescriptionChange(value);
      }
    }
  };

  const handleDescriptionSave = () => {
    setIsDescriptionModalOpen(false);
  };

  const handleDescriptionBack = () => {
    setDescription(originalDescription);
    setIsDescriptionModalOpen(false);
  };

  const handleDetailedDescriptionSave = () => {
    setIsDetailedDescriptionModalOpen(false);
  };

  const handleDetailedDescriptionBack = () => {
    setDetailedDescription(originalDetailedDescription);
    setIsDetailedDescriptionModalOpen(false);
  };

  const handleTagsChange = (newTags: string[]) => {
    setTags(newTags);
  };

  const handleTagsSave = () => {
    setOriginalTags(tags);
    if (onTagsChange) {
      onTagsChange(tags);
    }
    setIsTagsModalOpen(false);
  };

  const handleTagsBack = () => {
    setTags(originalTags);
    setIsTagsModalOpen(false);
  };

  const handleDistrictChange = (newDistrict: string) => {
    setDistrict(newDistrict);
    if (onDistrictChange) {
      onDistrictChange(newDistrict);
    }
  };

  const handleLocationChange = (newLocation: string) => {
    setLocation(newLocation);
    if (onLocationChange) {
      onLocationChange(newLocation);
    }
  };

  const handleLocationBlur = async () => {
    // Location sa ukladá automaticky, tu len aktualizujeme state
    setIsLocationSaving(true);
    setLocationError('');
    setTimeout(() => {
      setIsLocationSaving(false);
    }, 500);
  };

  const handleLocationSave = () => {
    setIsLocationModalOpen(false);
  };

  const handleLocationBack = () => {
    setDistrict(originalDistrict);
    setLocation(originalLocation);
    setIsLocationModalOpen(false);
  };

  const handleExperienceValueChange = (value: string) => {
    setExperienceValue(value);
    setExperienceError('');
  };

  const handleExperienceSave = () => {
    let newExperience: { value: number; unit: UnitOption } | undefined;
    if (experienceValue.trim()) {
      const numValue = parseFloat(experienceValue.trim());
      if (isNaN(numValue) || numValue <= 0) {
        setExperienceError(t('skills.experiencePositive', 'Dĺžka praxe musí byť kladné číslo'));
        return;
      }
      if (numValue > 100) {
        setExperienceError(t('skills.experienceTooLarge', 'Dĺžka praxe nemôže byť väčšia ako 100'));
        return;
      }
      newExperience = {
        value: numValue,
        unit: experienceUnit,
      };
    }
    setExperience(newExperience);
    if (onExperienceChange) {
      onExperienceChange(newExperience);
    }
    setExperienceError('');
    setIsExperienceModalOpen(false);
  };

  const handleExperienceBack = () => {
    setExperience(originalExperience);
    if (originalExperience) {
      setExperienceValue(originalExperience.value.toString());
      setExperienceUnit(originalExperience.unit);
    } else {
      setExperienceValue('');
      setExperienceUnit('years');
    }
    setExperienceError('');
    setIsExperienceModalOpen(false);
  };

  const handlePriceValueChange = (value: string) => {
    setPriceFrom(value);
    setPriceError('');
  };

  const handlePriceSave = () => {
    let newPriceFrom: number | null = null;
    if (priceFrom.trim()) {
      const parsed = parseFloat(priceFrom.trim().replace(',', '.'));
      if (isNaN(parsed) || parsed < 0) {
        setPriceError(t('skills.priceNonNegative', 'Cena musí byť nezáporné číslo'));
        return;
      }
      newPriceFrom = parsed;
    }
    setPriceError('');
    if (onPriceChange) {
      onPriceChange(newPriceFrom, priceCurrency);
    }
    setIsPriceModalOpen(false);
  };

  const handlePriceBack = () => {
    setPriceFrom(originalPriceFrom !== null && originalPriceFrom !== undefined ? String(originalPriceFrom) : '');
    setPriceCurrency(originalPriceCurrency as CurrencyOption);
    setPriceError('');
    setIsPriceModalOpen(false);
  };

  const handleUrgencySave = (value: 'low' | 'medium' | 'high') => {
    setUrgency(value);
    originalUrgencyRef.current = value;
    if (onUrgencyChange) {
      onUrgencyChange(value);
    }
    setIsUrgencyModalOpen(false);
  };

  const handleUrgencyBack = () => {
    setUrgency(originalUrgencyRef.current || 'low');
    setIsUrgencyModalOpen(false);
  };

  const handleDurationSave = (value: DurationOption | '') => {
    setDurationType(value);
    originalDurationTypeRef.current = value;
    if (onDurationTypeChange) {
      onDurationTypeChange(value);
    }
    setIsDurationModalOpen(false);
  };

  const handleDurationBack = () => {
    setDurationType(originalDurationTypeRef.current || '');
    setIsDurationModalOpen(false);
  };

  const handleOpeningHoursSave = (newOpeningHours: OpeningHours) => {
    setOpeningHours(newOpeningHours);
    if (onOpeningHoursChange) {
      onOpeningHoursChange(newOpeningHours);
    }
    setIsOpeningHoursModalOpen(false);
  };

  const handleOpeningHoursBack = () => {
    setOpeningHours(originalOpeningHours);
    setIsOpeningHoursModalOpen(false);
  };

  const buildOpeningHoursSummary = (hours: OpeningHours): string => {
    const DAYS = [
      { key: 'monday' as const, shortLabel: 'Po' },
      { key: 'tuesday' as const, shortLabel: 'Ut' },
      { key: 'wednesday' as const, shortLabel: 'St' },
      { key: 'thursday' as const, shortLabel: 'Št' },
      { key: 'friday' as const, shortLabel: 'Pi' },
      { key: 'saturday' as const, shortLabel: 'So' },
      { key: 'sunday' as const, shortLabel: 'Ne' },
    ];
    
    const groups: { from: string; to: string; days: string[] }[] = [];
    
    DAYS.forEach((day) => {
      const data = hours[day.key];
      if (!data?.enabled) return;
      const from = data.from || '00:00';
      const to = data.to || '23:59';
      const last = groups[groups.length - 1];
      if (last && last.from === from && last.to === to) {
        last.days.push(day.shortLabel);
      } else {
        groups.push({ from, to, days: [day.shortLabel] });
      }
    });
    
    const parts = groups.map((g) => {
      if (g.days.length === 1) return `${g.days[0]}: ${g.from}–${g.to}`;
      return `${g.days[0]}–${g.days[g.days.length - 1]}: ${g.from}–${g.to}`;
    });
    
    return parts.join(', ');
  };

  const remainingDetailedChars = MAX_DETAILED_LENGTH - detailedDescription.length;

  return (
    <div className="text-[var(--foreground)]">
      {/* Mobile layout */}
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
                <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mr-3"></div>
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
                <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mr-3"></div>
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
                <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mr-3"></div>
                <span className="text-gray-600 dark:text-gray-300 text-sm truncate">
                  {tags.length > 0 
                    ? (() => {
                        const count = tags.length;
                        if (count === 1) {
                          return `${count} ${t('skills.tagSingular', 'tag')}`;
                        } else if (count >= 2 && count <= 4) {
                          return `${count} ${t('skills.tagsPlural24', 'tagy')}`;
                        } else {
                          return `${count} ${t('skills.tagsPlural5Plus', 'tagov')}`;
                        }
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
                <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mr-3 flex-shrink-0"></div>
                {(() => {
                  const displayText = location && location.trim()
                    ? location
                    : (district 
                        ? district
                        : t('skills.addDistrict', 'Pridať okres'));

                  // Rovnaká logika ako pri lokalite v \"Upraviť profil\" – ale s limitom 21 znakov
                  const isLong = displayText.length > 21;

                  return (
                    <span 
                      className={`text-gray-600 dark:text-gray-300 ${
                        isLong 
                          ? 'text-xs leading-tight break-words line-clamp-2 max-w-full flex-1 min-w-0'  // >21 znakov: menšie písmo, max 2 riadky, môže expandovať
                          : 'text-sm whitespace-nowrap'                                                 // ≤21 znakov: jeden riadok, bez zalomenia, zarovnané doprava
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
                <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mr-3"></div>
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
                        } else {
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
                        }
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
                <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mr-3"></div>
                <span className="text-gray-600 dark:text-gray-300 text-sm">
                  {priceFrom && parseFloat(priceFrom) > 0
                    ? `${parseFloat(priceFrom).toLocaleString('sk-SK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${priceCurrency}`
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
                  <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mr-3"></div>
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
                  <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mr-3"></div>
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
                  <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mr-3"></div>
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
                        onChange={(event) => {
                          const files = Array.from(event.target.files || []);
                          if (files.length === 0) return;
                          const allowed = 6 - totalImagesCount;
                          if (allowed <= 0) {
                            event.currentTarget.value = '';
                            return;
                          }
                          const selected = files.slice(0, allowed);
                          const validFiles: File[] = [];
                          const newPreviews: string[] = [];
                          for (const f of selected) {
                            const isImageType = f.type && f.type.startsWith('image/');
                            const isHeicByName = /\.(heic|heif)$/i.test(f.name || '');
                            if (!isImageType && !isHeicByName) continue;
                            validFiles.push(f);
                            newPreviews.push(URL.createObjectURL(f));
                          }
                          if (validFiles.length > 0) {
                            setImages((prev) => [...prev, ...validFiles]);
                            setImagePreviews((prev) => [...prev, ...newPreviews]);
                            if (onImagesChange) {
                              onImagesChange([...images, ...validFiles]);
                            }
                          }
                          event.currentTarget.value = '';
                        }}
                      />
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-7 h-7">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M9.75 6.75L11.25 4.5h1.5l1.5 2.25H18a2.25 2.25 0 012.25 2.25v7.5A2.25 2.25 0 0118 18.75H6a2.25 2.25 0 01-2.25-2.25v-7.5A2.25 2.25 0 016 6.75h3.75z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 10.5a3 3 0 100 6 3 3 0 000-6z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M18.75 6.75v3" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M20.25 8.25h-3" />
                      </svg>
                    </label>
                  )}
                </div>
              </div>
              {/* Čiara nad fotkami */}
              {(validExistingImages.length > 0 || imagePreviews.length > 0) && (
                <div className="border-t border-gray-200 dark:border-gray-800 pt-3 mb-3 -ml-2 mr-2"></div>
              )}
              {/* Fotky pod čiarou, z ľavej strany */}
              {(validExistingImages.length > 0 || imagePreviews.length > 0) && (
                <div className="pr-2">
                  <div className="flex flex-wrap gap-3">
                    {validExistingImages.map((img) => {
                      const src = img.image_url || img.image || '';
                      return (
                        <div key={`${img.id ?? src}`} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700">
                          <img src={src} alt={t('skills.existingPhotoAlt', 'Existujúca fotka')} className="w-full h-full object-cover" />
                          {onRemoveExistingImage && img.id && (
                            <button
                              type="button"
                              aria-label={t('skills.removeExistingPhoto', 'Odstrániť existujúcu fotku')}
                              className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black/80 transition"
                              onClick={async () => {
                                try {
                                  const updated = await onRemoveExistingImage(img.id!);
                                  if (Array.isArray(updated)) {
                                    setExistingImages(updated);
                                    if (onExistingImagesChange) {
                                      onExistingImagesChange(updated);
                                    }
                                  } else {
                                    const newImages = existingImages.filter((i) => i.id !== img.id);
                                    setExistingImages(newImages);
                                    if (onExistingImagesChange) {
                                      onExistingImagesChange(newImages);
                                    }
                                  }
                                } catch (err: any) {
                                  alert(err?.response?.data?.error || err?.message || 'Odstránenie obrázka zlyhalo');
                                }
                              }}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {imagePreviews.map((src, idx) => (
                      <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700">
                        <img src={src} alt={`${t('skills.preview', 'Náhľad')} ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          aria-label={t('skills.removePhoto', 'Odstrániť obrázok')}
                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                          onClick={() => {
                            setImages((prev) => prev.filter((_, i) => i !== idx));
                            setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
                            if (onImagesChange) {
                              onImagesChange(images.filter((_, i) => i !== idx));
                            }
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
                  ? t('skills.detailedDescriptionHintSeeking', 'Opíš detailne čo hľadáš – postup, čo je zahrnuté, očakávania a výsledok.')
                  : t('skills.detailedDescriptionPlaceholder', 'Opíš detaily služby – postup, čo je zahrnuté, očakávania a výsledok.')
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

        {detailedError && (
          <p className="mt-1 text-sm text-red-500">{detailedError}</p>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {isSeeking
            ? t('skills.detailedDescriptionHintSeeking', 'Opíš detailne čo hľadáš – postup, čo je zahrnuté, očakávania a výsledok.')
            : t('skills.detailedDescriptionHint', 'Opíš detaily služby – postup, čo je zahrnuté, očakávania a výsledok.')}
        </p>
      </MobileFullScreenModal>

      {/* Tags Modal */}
      <MobileFullScreenModal
        isOpen={isTagsModalOpen}
        title={t('skills.tags', 'Tagy')}
        onBack={handleTagsBack}
        onSave={handleTagsSave}
      >
        <TagsSection
          ref={tagsSectionRef}
          tags={tags}
          onTagsChange={handleTagsChange}
          isOpen={isTagsModalOpen}
        />
      </MobileFullScreenModal>

      {/* Location Modal */}
      <MobileFullScreenModal
        isOpen={isLocationModalOpen}
        title={isSeeking ? t('skills.districtTitleSeeking', 'Okres (povinné)') : t('skills.district', 'Okres')}
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
        title={isSeeking ? t('skills.experienceOptionalSeeking', 'Minimálna prax (voliteľné)') : t('skills.experienceLength', 'Dĺžka praxe')}
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
            ? t('skills.experienceHintSeeking', 'Zadaj, akú dlhú prax má mať človek, ktorého hľadáš.')
            : t('skills.experienceHint', 'Daj ostatným vedieť, ako dlho sa venuješ svojej odbornosti.')}
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
          <OpeningHoursContent
            openingHours={openingHours}
            setOpeningHours={setOpeningHours}
          />
        </MobileFullScreenModal>
      )}

      {/* Urgency Modal - Mobile Fullscreen (len pre Hľadám) */}
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

      {/* Desktop layout - hidden */}
      <div className="hidden lg:block"></div>
    </div>
  );
}

