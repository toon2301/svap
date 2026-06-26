'use client';

import React from 'react';
import AccountTypeModal from './modules/accountType/AccountTypeModal';
import PersonalAccountModal from './modules/accountType/PersonalAccountModal';
import SkillsCategoryModal from './modules/skills/SkillsCategoryModal';
import SkillDescriptionModal from './modules/skills/SkillDescriptionModal';
import AddCustomCategoryModal from './modules/skills/AddCustomCategoryModal';
import { skillsCategories } from '@/constants/skillsCategories';
import { api, endpoints } from '../../lib/api';
import { uploadOfferImage } from '../../lib/offerImageUpload';
import type { DashboardSkill, UseSkillsModalsResult } from './hooks/useSkillsModals';
import { startBoundedImageRefresh } from './hooks/offerImageRefresh';
import { dispatchProfileOffersRefresh } from './modules/profile/profileOfferEvents';
import type { User } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { getApiErrorMessage } from '@/lib/apiError';

type Translator = (key: string, fallback: string) => string;

interface DashboardModalsProps {
  accountType: 'personal' | 'business';
  setAccountType: (type: 'personal' | 'business') => void;
  isAccountTypeModalOpen: boolean;
  setIsAccountTypeModalOpen: (value: boolean) => void;
  isPersonalAccountModalOpen: boolean;
  setIsPersonalAccountModalOpen: (value: boolean) => void;
  skillsState: UseSkillsModalsResult;
  activeModule?: string;
  t: Translator;
  user: User | null;
  onUserUpdate?: (updatedUser: User) => void;
  onCreatedSkillSaved?: () => void;
}

export default function DashboardModals({
  accountType,
  setAccountType,
  isAccountTypeModalOpen,
  setIsAccountTypeModalOpen,
  isPersonalAccountModalOpen,
  setIsPersonalAccountModalOpen,
  skillsState,
  activeModule,
  t,
  user,
  onUserUpdate,
  onCreatedSkillSaved,
}: DashboardModalsProps) {
  const { refreshUser } = useAuth();
  const {
    selectedSkillsCategory,
    setSelectedSkillsCategory,
    setStandardCategories,
    customCategories,
    setCustomCategories,
    isSkillsCategoryModalOpen,
    setIsSkillsCategoryModalOpen,
    isSkillDescriptionModalOpen,
    setIsSkillDescriptionModalOpen,
    isAddCustomCategoryModalOpen,
    setIsAddCustomCategoryModalOpen,
    editingCustomCategoryIndex,
    setEditingCustomCategoryIndex,
    setEditingStandardCategoryIndex,
    toLocalSkill,
    applySkillUpdate,
    loadSkills,
    fetchSkillDetail,
    handleRemoveSkillImage,
  } = skillsState;
  const isSelectedSkillSeeking = selectedSkillsCategory?.id
    ? selectedSkillsCategory.is_seeking === true
    : activeModule === 'skills-search';

  const handleSkillLocationSave = async (location: string) => {
    if (!selectedSkillsCategory?.id) return;
    const trimmed = location.trim();
    try {
      const { data } = await api.patch(endpoints.skills.detail(selectedSkillsCategory.id), {
        location: trimmed,
      });
      const updated = toLocalSkill(data);
      applySkillUpdate(updated);
      setSelectedSkillsCategory(updated);
    } catch (err: unknown) {
      throw new Error(
        getApiErrorMessage(err, t('skills.locationSaveError', 'Miesto sa nepodarilo uložiť. Skús to znova.')),
      );
    }
  };

  const uploadImagesIfNeeded = async (skillId: number, images: File[]) => {
    if (!images.length) return;
    for (let i = 0; i < images.length; i += 1) {
      const file = images[i];
      try {
        await uploadOfferImage(skillId, file);
      } catch (imgError: unknown) {
        const imgMsg = getApiErrorMessage(imgError, 'Nahrávanie obrázka zlyhalo');
        alert(`Chyba pri nahrávaní obrázka ${i + 1}: ${imgMsg}`);
        throw imgError;
      }
    }
  };

  const handleSkillSave = async (
    description: string,
    experience?: { value: number; unit: 'years' | 'months' },
    tags?: string[],
    images?: File[],
    priceFrom?: number | null,
    priceCurrency?: string,
    priceNegotiable?: boolean,
    locationValue?: string,
    detailedDescription?: string,
    openingHours?: { [key: string]: { enabled: boolean; from: string; to: string } },
    district?: string,
    countryCode?: string,
    districtCode?: string,
    urgency?: 'low' | 'medium' | 'high' | '',
    durationType?: 'one_time' | 'long_term' | 'project' | '' | null,
    isHidden?: boolean,
  ) => {
    const trimmedLocation = typeof locationValue === 'string' ? locationValue.trim() : '';
    const trimmedDistrict = typeof district === 'string' ? district.trim() : '';
    const trimmedCountryCode =
      typeof countryCode === 'string' ? countryCode.trim().toUpperCase() : '';
    const trimmedDistrictCode =
      typeof districtCode === 'string' ? districtCode.trim().toLowerCase() : '';
    const detailedText = typeof detailedDescription === 'string' ? detailedDescription.trim() : '';
    const pricePayload =
      priceNegotiable === true
        ? { price_from: null, price_currency: '', price_negotiable: true }
        : typeof priceFrom === 'number' && !Number.isNaN(priceFrom)
          ? { price_from: priceFrom, price_currency: priceCurrency || '€', price_negotiable: false }
          : { price_from: null, price_currency: '', price_negotiable: false };
    const buildPayload = () => {
      const payload: Record<string, unknown> = {
        category: selectedSkillsCategory?.category,
        subcategory: selectedSkillsCategory?.subcategory,
        description: description || '',
        detailed_description: detailedText,
        tags: Array.isArray(tags) ? tags : [],
        is_seeking: isSelectedSkillSeeking,
        // Ak príde hodnota z modalu, použijeme ju; inak fallback na uloženú hodnotu alebo default
        urgency: urgency || selectedSkillsCategory?.urgency || 'low',
        duration_type:
          durationType !== undefined
            ? durationType
            : selectedSkillsCategory?.duration_type || null,
        is_hidden: isHidden !== undefined ? isHidden : (selectedSkillsCategory?.is_hidden || false),
      };
      if (experience && typeof experience.value === 'number' && experience.unit) {
        payload.experience_value = experience.value;
        payload.experience_unit = experience.unit;
      } else {
        payload.experience_value = null;
        payload.experience_unit = '';
      }
      Object.assign(payload, pricePayload);
      payload.country_code = trimmedCountryCode;
      payload.district_code = trimmedDistrictCode;
      payload.district = trimmedDistrict;
      payload.location = trimmedLocation;
      if (openingHours && Object.keys(openingHours).length > 0) {
        payload.opening_hours = openingHours;
      } else {
        payload.opening_hours = null;
      }
      return payload;
    };

    const imageFiles = Array.isArray(images) ? images : [];
    let didCreateSkill = false;

    try {
      if (editingCustomCategoryIndex !== null) {
        const current = customCategories[editingCustomCategoryIndex];
        if (current?.id) {
          const { data } = await api.patch(endpoints.skills.detail(current.id), {
            description: description || '',
            detailed_description: detailedText,
            tags: Array.isArray(tags) ? tags : [],
            ...(experience && typeof experience.value === 'number' && experience.unit
              ? { experience_value: experience.value, experience_unit: experience.unit }
              : { experience_value: null, experience_unit: '' }),
            ...pricePayload,
            country_code: trimmedCountryCode,
            district_code: trimmedDistrictCode,
            district: trimmedDistrict,
            location: trimmedLocation,
            opening_hours: openingHours && Object.keys(openingHours).length > 0 ? openingHours : null,
            urgency: urgency || selectedSkillsCategory?.urgency || 'low',
            duration_type: durationType !== undefined ? durationType : selectedSkillsCategory?.duration_type || null,
            is_hidden: isHidden !== undefined ? isHidden : (selectedSkillsCategory?.is_hidden || false),
          });
          let updatedLocal = toLocalSkill(data);
          if (imageFiles.length && data?.id) {
            await uploadImagesIfNeeded(data.id, imageFiles);
            updatedLocal = await fetchSkillDetail(data.id);
            if ((updatedLocal.images ?? []).some((img) => img.status === 'pending')) {
              startBoundedImageRefresh(data.id, fetchSkillDetail, applySkillUpdate);
            }
          }
          setCustomCategories((prev) => {
            const updated = [...prev];
            updated[editingCustomCategoryIndex] = updatedLocal;
            return updated;
          });
        } else {
          const payload = buildPayload();
          const { data } = await api.post(endpoints.skills.list, payload);
          let created = toLocalSkill(data);
          if (imageFiles.length && data?.id) {
            await uploadImagesIfNeeded(data.id, imageFiles);
            created = await fetchSkillDetail(data.id);
            if ((created.images ?? []).some((img) => img.status === 'pending')) {
              startBoundedImageRefresh(data.id, fetchSkillDetail, applySkillUpdate);
            }
          }
          didCreateSkill = true;
          setCustomCategories((prev) => {
            const updated = [...prev];
            updated[editingCustomCategoryIndex] = created;
            return updated;
          });
        }
        setEditingCustomCategoryIndex(null);
        setSelectedSkillsCategory(null);
      } else if (selectedSkillsCategory) {
        if (selectedSkillsCategory.id) {
          const { data } = await api.patch(endpoints.skills.detail(selectedSkillsCategory.id), {
            description: description || '',
            detailed_description: detailedText,
            tags: Array.isArray(tags) ? tags : [],
            ...(experience && typeof experience.value === 'number' && experience.unit
              ? { experience_value: experience.value, experience_unit: experience.unit }
              : { experience_value: null, experience_unit: '' }),
            ...pricePayload,
            country_code: trimmedCountryCode,
            district_code: trimmedDistrictCode,
            district: trimmedDistrict,
            location: trimmedLocation,
            opening_hours: openingHours && Object.keys(openingHours).length > 0 ? openingHours : null,
            urgency: urgency || selectedSkillsCategory?.urgency || 'low',
            duration_type: durationType !== undefined ? durationType : selectedSkillsCategory?.duration_type || null,
            is_hidden: isHidden !== undefined ? isHidden : (selectedSkillsCategory?.is_hidden || false),
          });
          let updated = toLocalSkill(data);
          if (imageFiles.length && data?.id) {
            await uploadImagesIfNeeded(data.id, imageFiles);
            updated = await fetchSkillDetail(data.id);
            if ((updated.images ?? []).some((img) => img.status === 'pending')) {
              startBoundedImageRefresh(data.id, fetchSkillDetail, applySkillUpdate);
            }
          }
          applySkillUpdate(updated);
          setEditingCustomCategoryIndex(null);
          setEditingStandardCategoryIndex(null);
          setSelectedSkillsCategory(null);
        } else if (selectedSkillsCategory.category === selectedSkillsCategory.subcategory) {
          // Vytvorenie novej vlastnej karty – limit kontroluje backend podľa is_seeking
          const payload = buildPayload();
          const { data } = await api.post(endpoints.skills.list, payload);
          let created = toLocalSkill(data);
          if (imageFiles.length && data?.id) {
            await uploadImagesIfNeeded(data.id, imageFiles);
            created = await fetchSkillDetail(data.id);
            if ((created.images ?? []).some((img) => img.status === 'pending')) {
              startBoundedImageRefresh(data.id, fetchSkillDetail, applySkillUpdate);
            }
          }
          didCreateSkill = true;
          setCustomCategories((prev) => [created, ...prev]);
          setSelectedSkillsCategory(null);
        } else {
          // Vytvorenie novej štandardnej karty – limit kontroluje backend podľa is_seeking
          const payload = buildPayload();
          const { data } = await api.post(endpoints.skills.list, payload);
          let created = toLocalSkill(data);
          if (imageFiles.length && data?.id) {
            await uploadImagesIfNeeded(data.id, imageFiles);
            created = await fetchSkillDetail(data.id);
            if ((created.images ?? []).some((img) => img.status === 'pending')) {
              startBoundedImageRefresh(data.id, fetchSkillDetail, applySkillUpdate);
            }
          }
          didCreateSkill = true;
          setStandardCategories((prev) => [created, ...prev]);
          setSelectedSkillsCategory(null);
        }
      }

      try {
        await loadSkills();
      } catch (loadError) {
        console.error('Failed to refresh skills after save:', loadError);
      }

      try {
        // Invalidovať cache ponúk, aby sa pri návrate na profil načítali nové dáta
        const { invalidateOffersCache } = await import('./modules/profile/profileOffersCache');
        invalidateOffersCache(user?.id);
        dispatchProfileOffersRefresh({ ownerUserId: user?.id });
      } catch (cacheError) {
        console.error('Failed to invalidate profile offers cache after skill save:', cacheError);
      }

      setIsSkillDescriptionModalOpen(false);
      if (didCreateSkill) {
        onCreatedSkillSaved?.();
      }
    } catch (e: unknown) {
      const msg = getApiErrorMessage(e, 'Ukladanie zručnosti zlyhalo');
      alert(msg);
      return;
    }
  };

  return (
    <>
      <AccountTypeModal
        isOpen={isAccountTypeModalOpen}
        onClose={() => setIsAccountTypeModalOpen(false)}
        onConfirm={async () => {
          try {
            // Odoslať zmenu user_type na backend (cookie auth – user nemusí byť v state)
            const response = await api.patch('/auth/profile/', { user_type: 'company' });
            if (response.data?.user) onUserUpdate?.(response.data.user);
            setIsAccountTypeModalOpen(false);
            // /me je zdroj pravdy pri reload – vynúť refresh identity
            await refreshUser({ force: true });
            // Best-effort immediate UI sync
            setAccountType('business');
          } catch (error: unknown) {
            console.error('Error changing account type to business:', error);
            alert(getApiErrorMessage(error, 'Nepodarilo sa zmeniť typ účtu. Skús to znova.'));
          }
        }}
      />

      <PersonalAccountModal
        isOpen={isPersonalAccountModalOpen}
        onClose={() => setIsPersonalAccountModalOpen(false)}
        onConfirm={async () => {
          try {
            // Odoslať zmenu user_type na backend (cookie auth – user nemusí byť v state)
            const response = await api.patch('/auth/profile/', { user_type: 'individual' });
            if (response.data?.user) onUserUpdate?.(response.data.user);
            setIsPersonalAccountModalOpen(false);
            // /me je zdroj pravdy pri reload – vynúť refresh identity
            await refreshUser({ force: true });
            // Best-effort immediate UI sync
            setAccountType('personal');
          } catch (error: unknown) {
            console.error('Error changing account type to personal:', error);
            alert(getApiErrorMessage(error, 'Nepodarilo sa zmeniť typ účtu. Skús to znova.'));
          }
        }}
      />

      <SkillsCategoryModal
        isOpen={isSkillsCategoryModalOpen}
        onClose={() => setIsSkillsCategoryModalOpen(false)}
        categories={skillsCategories}
        selected={selectedSkillsCategory?.subcategory || null}
        onSelect={(category, subcategory) => {
          setIsSkillsCategoryModalOpen(false);
          setSelectedSkillsCategory({
            category,
            subcategory,
            price_from: null,
            country_code: 'SK',
            district_code: '',
            price_currency: '€',
            price_negotiable: false,
            district: '',
            location: '',
          });
          setIsSkillDescriptionModalOpen(true);
        }}
      />

      {selectedSkillsCategory && (
        <SkillDescriptionModal
          isOpen={isSkillDescriptionModalOpen}
          onClose={() => {
            setIsSkillDescriptionModalOpen(false);
            if (!selectedSkillsCategory.description) {
              setSelectedSkillsCategory(null);
              setEditingCustomCategoryIndex(null);
              setEditingStandardCategoryIndex(null);
            }
          }}
          category={selectedSkillsCategory.category}
          subcategory={selectedSkillsCategory.subcategory}
          initialDescription={selectedSkillsCategory.description}
          initialExperience={selectedSkillsCategory.experience}
          initialTags={selectedSkillsCategory.tags}
          initialImages={selectedSkillsCategory.images}
          initialPriceFrom={selectedSkillsCategory.price_from ?? null}
          initialCountryCode={selectedSkillsCategory.country_code ?? ''}
          initialDistrictCode={selectedSkillsCategory.district_code ?? ''}
          initialPriceCurrency={selectedSkillsCategory.price_currency ?? '€'}
          initialPriceNegotiable={selectedSkillsCategory.price_negotiable === true}
          initialDistrict={selectedSkillsCategory.district ?? ''}
          initialLocation={selectedSkillsCategory.location ?? ''}
          initialDetailedDescription={selectedSkillsCategory.detailed_description || ''}
          initialOpeningHours={selectedSkillsCategory.opening_hours}
          accountType={accountType}
          isSeeking={isSelectedSkillSeeking}
          initialUrgency={selectedSkillsCategory.urgency || 'low'}
          initialDurationType={selectedSkillsCategory.duration_type || null}
          initialIsHidden={selectedSkillsCategory.is_hidden || false}
          onRemoveExistingImage={
            selectedSkillsCategory.id
              ? (imageId) => handleRemoveSkillImage(selectedSkillsCategory.id!, imageId)
              : undefined
          }
          onLocationSave={
            selectedSkillsCategory.id
              ? async (loc) => {
                  await handleSkillLocationSave(loc);
                }
              : undefined
          }
          onSave={handleSkillSave}
        />
      )}

      <AddCustomCategoryModal
        isOpen={isAddCustomCategoryModalOpen}
        onClose={() => setIsAddCustomCategoryModalOpen(false)}
        onSave={(categoryName) => {
          setSelectedSkillsCategory({
            category: categoryName,
            subcategory: categoryName,
            country_code: 'SK',
            district_code: '',
            district: '',
            location: '',
          } as DashboardSkill);
          setEditingCustomCategoryIndex(null);
          setIsAddCustomCategoryModalOpen(false);
          setIsSkillDescriptionModalOpen(true);
        }}
      />
    </>
  );
}

