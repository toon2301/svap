'use client';

import { useState, useRef, useEffect, useMemo, ChangeEvent } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  CurrencyOption,
  DurationOption,
  MAX_DETAILED_LENGTH,
  OpeningHours,
  SkillImage,
  UnitOption,
  SkillsDescriptionScreenProps,
} from '../types';

export function useSkillsDescriptionScreenState({
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
  const [priceFrom, setPriceFrom] = useState(
    initialPriceFrom !== null && initialPriceFrom !== undefined ? String(initialPriceFrom) : '',
  );
  const [originalPriceFrom] = useState(initialPriceFrom);
  const [priceCurrency, setPriceCurrency] = useState<CurrencyOption>(
    (initialPriceCurrency || '€') as CurrencyOption,
  );
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

  // Synchronizácia pri zmene initial hodnôt z rodiča
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

  const remainingDetailedChars = MAX_DETAILED_LENGTH - detailedDescription.length;

  const handleImageInputChange = (event: ChangeEvent<HTMLInputElement>) => {
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
  };

  const handleRemoveExistingImageClick = async (imageId: number) => {
    if (!onRemoveExistingImage || !imageId) return;
    try {
      const updated = await onRemoveExistingImage(imageId);
      if (Array.isArray(updated)) {
        setExistingImages(updated);
        if (onExistingImagesChange) {
          onExistingImagesChange(updated);
        }
      } else {
        const newImages = existingImages.filter((i) => i.id !== imageId);
        setExistingImages(newImages);
        if (onExistingImagesChange) {
          onExistingImagesChange(newImages);
        }
      }
    } catch (err: any) {
      // eslint-disable-next-line no-alert
      alert(err?.response?.data?.error || err?.message || 'Odstránenie obrázka zlyhalo');
    }
  };

  const handleRemoveNewImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    if (onImagesChange) {
      onImagesChange(images.filter((_, i) => i !== index));
    }
  };

  const canRemoveExistingImages = Boolean(onRemoveExistingImage);

  return {
    // konfigurácia
    isSeeking,
    accountType,

    // hlavné hodnoty
    description,
    detailedDescription,
    tags,
    district,
    location,
    experience,
    experienceValue,
    experienceUnit,
    priceFrom,
    priceCurrency,
    urgency,
    durationType,
    openingHours,
    images,
    imagePreviews,
    existingImages,
    validExistingImages,
    totalImagesCount,

    // chyby
    error,
    setError,
    detailedError,
    locationError,
    experienceError,
    priceError,

    // pomocné stavy
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
    canRemoveExistingImages,

    // settre pre modaly a polia
    setIsDescriptionModalOpen,
    setIsDetailedDescriptionModalOpen,
    setIsTagsModalOpen,
    setIsLocationModalOpen,
    setIsExperienceModalOpen,
    setIsPriceModalOpen,
    setIsOpeningHoursModalOpen,
    setIsUrgencyModalOpen,
    setIsDurationModalOpen,
    setPriceCurrency,
    setExperienceUnit,
    setOpeningHours,

    // handlery
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
    handleUrgencySave,
    handleUrgencyBack,
    handleDurationSave,
    handleDurationBack,
    handleOpeningHoursSave,
    handleOpeningHoursBack,
    handleImageInputChange,
    handleRemoveExistingImageClick,
    handleRemoveNewImage,
  };
}

export type SkillsDescriptionScreenState = ReturnType<typeof useSkillsDescriptionScreenState>;


