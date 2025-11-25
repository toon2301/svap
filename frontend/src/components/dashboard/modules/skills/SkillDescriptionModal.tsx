'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import DescriptionSection from './skillDescriptionModal/sections/DescriptionSection';
import TagsSection from './skillDescriptionModal/sections/TagsSection';
import ImagesSection from './skillDescriptionModal/sections/ImagesSection';
import LocationSection from './skillDescriptionModal/sections/LocationSection';
import ExperienceSection from './skillDescriptionModal/sections/ExperienceSection';
import PriceSection from './skillDescriptionModal/sections/PriceSection';
import DetailedDescriptionModal from './skillDescriptionModal/DetailedDescriptionModal';
import OpeningHoursModal from './skillDescriptionModal/OpeningHoursModal';
import { CurrencyOption, SkillDescriptionModalProps, SkillImage, OpeningHours, UnitOption } from './skillDescriptionModal/types';
import { currencyFromLocale, ensureCurrencyOption, slugifyLabel } from './skillDescriptionModal/utils';

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

  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [experienceValue, setExperienceValue] = useState('');
  const [experienceUnit, setExperienceUnit] = useState<UnitOption>('years');
  const [experienceError, setExperienceError] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<SkillImage[]>([]);
  const [priceFrom, setPriceFrom] = useState('');
  const [priceCurrency, setPriceCurrency] = useState<CurrencyOption>('€');
  const [userTouchedCurrency, setUserTouchedCurrency] = useState(false);
  const [priceError, setPriceError] = useState('');
  const [location, setLocation] = useState('');
  const [locationError, setLocationError] = useState('');
  const [isLocationSaving, setIsLocationSaving] = useState(false);
  const lastSavedLocationRef = useRef('');
  const [district, setDistrict] = useState('');
  const [detailedDescription, setDetailedDescription] = useState('');
  const [isDetailedModalOpen, setIsDetailedModalOpen] = useState(false);
  const [openingHours, setOpeningHours] = useState<OpeningHours>({});
  const [isOpeningHoursModalOpen, setIsOpeningHoursModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDescription(initialDescription || '');
      setError('');
      if (initialExperience) {
        setExperienceValue(initialExperience.value.toString());
        setExperienceUnit(initialExperience.unit);
      } else {
        setExperienceValue('');
        setExperienceUnit('years');
      }
      setExperienceError('');
      setTags(Array.isArray(initialTags) ? initialTags : []);
      setImages([]);
      setImagePreviews([]);
      setExistingImages(Array.isArray(initialImages) ? initialImages : []);
      setPriceFrom(initialPriceFrom !== null && initialPriceFrom !== undefined ? String(initialPriceFrom) : '');
      if ((initialPriceCurrency ?? '') === '' && (initialPriceFrom === null || initialPriceFrom === undefined)) {
        setPriceCurrency(currencyFromLocale(locale));
      } else {
        setPriceCurrency(ensureCurrencyOption(initialPriceCurrency));
      }
      setUserTouchedCurrency(false);
      setPriceError('');
      setDistrict(initialDistrict || '');
      setDetailedDescription(initialDetailedDescription || '');
      setOpeningHours(initialOpeningHours || {});
    } else {
      setDescription('');
      setError('');
      setExperienceValue('');
      setExperienceUnit('years');
      setExperienceError('');
      setTags([]);
      setImages([]);
      setImagePreviews([]);
      setExistingImages([]);
      setPriceFrom('');
      setPriceCurrency(currencyFromLocale(locale));
      setUserTouchedCurrency(false);
      setPriceError('');
      setDistrict('');
      setDetailedDescription('');
      setOpeningHours({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
  
  useEffect(() => {
    if (!isOpen) {
      setDistrict('');
      return;
    }
    setDistrict(initialDistrict || '');
  }, [initialDistrict, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setExistingImages(Array.isArray(initialImages) ? initialImages : []);
    }
  }, [initialImages, isOpen]);
  
  useEffect(() => {
    if (!isOpen) {
      setLocation('');
      setLocationError('');
      setIsLocationSaving(false);
      lastSavedLocationRef.current = '';
      return;
    }
    const trimmedInitial = (initialLocation || '').trim();
    setLocation(initialLocation || '');
    setLocationError('');
    setIsLocationSaving(false);
    lastSavedLocationRef.current = trimmedInitial;
  }, [initialLocation, isOpen]);
  
  useEffect(() => {
    if (!isOpen) return;
    if (userTouchedCurrency) return;
    const hasNoPrice = !priceFrom || priceFrom.trim() === '';
    if (hasNoPrice) {
      setPriceCurrency(currencyFromLocale(locale));
    }
  }, [locale, isOpen, userTouchedCurrency, priceFrom]);

  useEffect(() => {
    if (isOpen) {
      setDetailedDescription(initialDetailedDescription || '');
      setOpeningHours(initialOpeningHours || {});
    }
  }, [initialDetailedDescription, initialOpeningHours, isOpen]);


  const prevInitialDescriptionRef = React.useRef<string | undefined>();
  useEffect(() => {
    if (isOpen && initialDescription !== prevInitialDescriptionRef.current) {
      prevInitialDescriptionRef.current = initialDescription;
      if (initialDescription !== undefined) {
        setDescription(initialDescription);
      }
    }
  }, [isOpen, initialDescription]);

  const handleExperienceValueChange = (val: string) => {
    if (val === '' || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100)) {
      setExperienceValue(val);
      setExperienceError('');
    }
  };

  const handlePriceChange = (val: string) => {
    if (val === '' || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0)) {
      setPriceFrom(val);
      setPriceError('');
    }
  };

  const handleLocationBlur = async () => {
    if (!onLocationSave) {
      return;
    }
    const trimmed = location.trim();
    if (trimmed === lastSavedLocationRef.current) {
      return;
    }
    try {
      setIsLocationSaving(true);
      setLocationError('');
      await onLocationSave(trimmed);
      lastSavedLocationRef.current = trimmed;
      setLocation(trimmed);
    } catch (err: any) {
      const apiMessage = err?.response?.data?.error || err?.response?.data?.detail;
      const fallback = t('skills.locationSaveError', 'Miesto sa nepodarilo uložiť. Skús to znova.');
      setLocationError(apiMessage || fallback);
      setLocation(lastSavedLocationRef.current);
    } finally {
      setIsLocationSaving(false);
    }
  };

  const handleSave = () => {
    const trimmed = description.trim();
    
    if (!trimmed) {
      setError(t('skills.descriptionRequired', 'Popis zručnosti je povinný'));
      return;
    }

    if (trimmed.length > 100) {
      setError(t('skills.descriptionTooLong', 'Popis zručnosti môže mať maximálne 100 znakov'));
      return;
    }

    let experience: { value: number; unit: UnitOption } | undefined;
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
      experience = {
        value: numValue,
        unit: experienceUnit,
      };
    }

    setExperienceError('');
    let priceValue: number | null = null;
    if (priceFrom.trim()) {
      const parsed = parseFloat(priceFrom.trim().replace(',', '.'));
      if (isNaN(parsed) || parsed < 0) {
        setPriceError(t('skills.priceNonNegative', 'Cena musí byť nezáporné číslo'));
        return;
      }
      priceValue = parsed;
    }
    setPriceError('');
    const locationValue = location.trim();
    const districtValue = district.trim();
    
    // Validácia okresu
    if (districtValue) {
      // Importujeme zoznam okresov z LocationSection
      const SLOVAK_DISTRICTS = [
        'Bánovce nad Bebravou', 'Banská Bystrica', 'Banská Štiavnica', 'Bardejov',
        'Bratislava I', 'Bratislava II', 'Bratislava III', 'Bratislava IV', 'Bratislava V',
        'Brezno', 'Bytča', 'Čadca', 'Detva', 'Dolný Kubín', 'Dunajská Streda',
        'Galanta', 'Gelnica', 'Hlohovec', 'Humenné', 'Ilava', 'Kežmarok', 'Komárno',
        'Košice I', 'Košice II', 'Košice III', 'Košice IV', 'Košice-okolie',
        'Krupina', 'Kysucké Nové Mesto', 'Levice', 'Levoča', 'Liptovský Mikuláš',
        'Lučenec', 'Malacky', 'Martin', 'Medzilaborce', 'Michalovce', 'Myjava',
        'Námestovo', 'Nitra', 'Nové Mesto nad Váhom', 'Nové Zámky', 'Partizánske',
        'Pezinok', 'Piešťany', 'Poltár', 'Poprad', 'Považská Bystrica', 'Prešov',
        'Prievidza', 'Púchov', 'Revúca', 'Rimavská Sobota', 'Rožňava', 'Ružomberok',
        'Sabinov', 'Senec', 'Senica', 'Skalica', 'Snina', 'Sobrance', 'Spišská Nová Ves',
        'Stará Ľubovňa', 'Stropkov', 'Svidník', 'Šaľa', 'Topoľčany', 'Trebišov',
        'Trenčín', 'Trnava', 'Turčianske Teplice', 'Tvrdošín', 'Veľký Krtíš',
        'Vranov nad Topľou', 'Zlaté Moravce', 'Zvolen', 'Žarnovica', 'Žiar nad Hronom', 'Žilina',
      ];
      
      const removeDiacritics = (str: string): string => {
        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      };
      
      const normalizedInput = removeDiacritics(districtValue.trim());
      const isValid = SLOVAK_DISTRICTS.some((d) => 
        removeDiacritics(d).toLowerCase() === normalizedInput.toLowerCase()
      );
      
      if (!isValid) {
        // Necháme LocationSection zobraziť chybu, len zastavíme uloženie
        // Scrollneme na pole okresu, aby používateľ videl chybu
        setTimeout(() => {
          const districtInput = document.querySelector('input[placeholder*="okres" i]') as HTMLInputElement;
          if (districtInput) {
            districtInput.focus();
            districtInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
        return;
      }
    }
    
    const detailedValue = detailedDescription.trim();
    const openingHoursValue = Object.keys(openingHours).length > 0 ? openingHours : undefined;
    onSave(trimmed, experience, tags, images, priceValue, priceCurrency, locationValue, detailedValue, openingHoursValue, districtValue);
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
        <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="rounded-2xl bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] shadow-xl overflow-visible">
          <div className="flex items-center justify-between px-6 pt-6 pb-3">
            <h2 className="text-xl font-semibold">{t('skills.describeSkillTitle', 'Opíš svoju službu/zručnosť')}</h2>
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

          <div className="px-6 pb-4">
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
              description={description}
              onChange={setDescription}
              error={error}
              onErrorChange={setError}
              isOpen={isOpen}
            />

            <div className="mb-0">
              <button
                type="button"
                onClick={() => setIsDetailedModalOpen(true)}
                className="text-sm text-purple-700 dark:text-purple-300 font-medium hover:underline"
              >
                {detailedDescription 
                  ? t('skills.editDetailedDescription', 'Upraviť podrobný opis')
                  : `+ ${t('skills.addDetailedDescription', 'Pridať podrobný opis')}`}
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              {t('skills.descriptionInfo', 'Opíš svoju službu alebo zručnosť tak, aby používatelia získali čo najviac dôležitých informácií.')}
            </p>

            <TagsSection tags={tags} onTagsChange={setTags} isOpen={isOpen} />

            <ImagesSection
              images={images}
              setImages={setImages}
              imagePreviews={imagePreviews}
              setImagePreviews={setImagePreviews}
              existingImages={existingImages}
              setExistingImages={setExistingImages}
              onRemoveExistingImage={onRemoveExistingImage}
              isOpen={isOpen}
            />

            <LocationSection
                value={location}
              onChange={(val) => {
                setLocation(val);
                  setLocationError('');
                }}
                onBlur={handleLocationBlur}
              error={locationError}
              isSaving={isLocationSaving}
              district={district}
              onDistrictChange={setDistrict}
            />

            <ExperienceSection
                  value={experienceValue}
              onChange={handleExperienceValueChange}
              unit={experienceUnit}
              onUnitChange={setExperienceUnit}
              error={experienceError}
            />

            <PriceSection
                  value={priceFrom}
              onChange={handlePriceChange}
              currency={priceCurrency}
              onCurrencyChange={(val) => {
                setPriceCurrency(val);
                setUserTouchedCurrency(true);
              }}
              error={priceError}
            />

            {accountType === 'business' && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => setIsOpeningHoursModalOpen(true)}
                  className="text-sm text-purple-700 dark:text-purple-300 font-medium hover:underline flex items-center gap-1"
                >
                  {Object.keys(openingHours).length > 0 ? (
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

            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-2xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {t('common.cancel', 'Zrušiť')}
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 rounded-2xl bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!description.trim()}
              >
                {existingImages.length || initialDescription || initialExperience || (initialTags && initialTags.length)
                  ? t('common.update', 'Zmeniť')
                  : t('common.add', 'Pridať')}
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>

      <DetailedDescriptionModal
        isOpen={isDetailedModalOpen}
        onClose={() => setIsDetailedModalOpen(false)}
        initialValue={detailedDescription}
        onSave={(val) => setDetailedDescription(val)}
      />

      <OpeningHoursModal
        isOpen={isOpeningHoursModalOpen}
        onClose={() => setIsOpeningHoursModalOpen(false)}
        initialValue={openingHours}
        onSave={(val) => setOpeningHours(val)}
      />
    </>
  );
}

