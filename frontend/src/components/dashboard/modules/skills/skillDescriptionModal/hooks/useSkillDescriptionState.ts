'use client';

import { useEffect, useRef, useState } from 'react';
import { CurrencyOption, SkillImage, OpeningHours, UnitOption, ExperienceValue, DurationOption } from '../types';
import { currencyFromLocale, ensureCurrencyOption } from '../utils';

interface UseSkillDescriptionStateProps {
  isOpen: boolean;
  locale: string;
  initialDescription?: string;
  initialExperience?: ExperienceValue;
  initialTags?: string[];
  initialImages?: SkillImage[];
  initialPriceFrom?: number | null;
  initialPriceCurrency?: string;
  initialLocation?: string;
  initialDistrict?: string;
  initialDetailedDescription?: string;
  initialOpeningHours?: OpeningHours;
  initialUrgency?: 'low' | 'medium' | 'high' | '';
  initialDurationType?: DurationOption | '' | null;
}

export const useSkillDescriptionState = ({
  isOpen,
  locale,
  initialDescription = '',
  initialExperience,
  initialTags = [],
  initialImages = [],
  initialPriceFrom = null,
  initialPriceCurrency = '€',
  initialLocation = '',
  initialDistrict = '',
  initialDetailedDescription = '',
  initialOpeningHours,
  initialUrgency = 'low',
  initialDurationType = null,
}: UseSkillDescriptionStateProps) => {
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
  const [isHideCardEnabled, setIsHideCardEnabled] = useState(false);
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high' | ''>(initialUrgency || 'low');
  const [durationType, setDurationType] = useState<DurationOption | ''>(initialDurationType || '');

  // Hlavná inicializácia pri otvorení/zatvorení modalu
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
      setUrgency(initialUrgency || 'low');
      setDurationType(initialDurationType || '');
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
      setUrgency('low');
      setDurationType('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Synchronizácia okresu
  useEffect(() => {
    if (!isOpen) {
      setDistrict('');
      return;
    }
    setDistrict(initialDistrict || '');
  }, [initialDistrict, isOpen]);

  // Synchronizácia existujúcich obrázkov
  const prevInitialImagesRef = useRef<SkillImage[]>([]);
  useEffect(() => {
    if (isOpen) {
      const currentImages = Array.isArray(initialImages) ? initialImages : [];
      // Porovnaj obsah poľa, nie referenciu
      const imagesChanged = 
        prevInitialImagesRef.current.length !== currentImages.length ||
        prevInitialImagesRef.current.some((img, idx) => 
          img.id !== currentImages[idx]?.id || 
          img.image_url !== currentImages[idx]?.image_url
        );
      if (imagesChanged) {
        prevInitialImagesRef.current = currentImages;
        setExistingImages(currentImages);
      }
    } else {
      prevInitialImagesRef.current = [];
    }
  }, [initialImages, isOpen]);

  // Synchronizácia lokácie
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

  // Automatická zmena meny podľa locale
  useEffect(() => {
    if (!isOpen) return;
    if (userTouchedCurrency) return;
    const hasNoPrice = !priceFrom || priceFrom.trim() === '';
    if (hasNoPrice) {
      setPriceCurrency(currencyFromLocale(locale));
    }
  }, [locale, isOpen, userTouchedCurrency, priceFrom]);

  // Synchronizácia podrobného popisu a otváracích hodín
  useEffect(() => {
    if (isOpen) {
      setDetailedDescription(initialDetailedDescription || '');
      setOpeningHours(initialOpeningHours || {});
    }
  }, [initialDetailedDescription, initialOpeningHours, isOpen]);

  useEffect(() => {
    setUrgency(initialUrgency || 'low');
  }, [initialUrgency, isOpen]);

  // Synchronizácia popisu pri zmene initialDescription
  const prevInitialDescriptionRef = useRef<string | undefined>();
  useEffect(() => {
    if (isOpen && initialDescription !== prevInitialDescriptionRef.current) {
      prevInitialDescriptionRef.current = initialDescription;
      if (initialDescription !== undefined) {
        setDescription(initialDescription);
      }
    }
  }, [isOpen, initialDescription]);

  return {
    // State
    description,
    setDescription,
    error,
    setError,
    experienceValue,
    setExperienceValue,
    experienceUnit,
    setExperienceUnit,
    experienceError,
    setExperienceError,
    tags,
    setTags,
    images,
    setImages,
    imagePreviews,
    setImagePreviews,
    existingImages,
    setExistingImages,
    priceFrom,
    setPriceFrom,
    priceCurrency,
    setPriceCurrency,
    userTouchedCurrency,
    setUserTouchedCurrency,
    priceError,
    setPriceError,
    location,
    setLocation,
    locationError,
    setLocationError,
    isLocationSaving,
    setIsLocationSaving,
    lastSavedLocationRef,
    district,
    setDistrict,
    detailedDescription,
    setDetailedDescription,
    isDetailedModalOpen,
    setIsDetailedModalOpen,
    openingHours,
    setOpeningHours,
    isOpeningHoursModalOpen,
    setIsOpeningHoursModalOpen,
    isHideCardEnabled,
    setIsHideCardEnabled,
    urgency,
    setUrgency,
    durationType,
    setDurationType,
  };
};

