'use client';

import React from 'react';
import AccountTypeModal from './modules/accountType/AccountTypeModal';
import PersonalAccountModal from './modules/accountType/PersonalAccountModal';
import SkillsCategoryModal from './modules/skills/SkillsCategoryModal';
import SkillDescriptionModal from './modules/skills/SkillDescriptionModal';
import AddCustomCategoryModal from './modules/skills/AddCustomCategoryModal';
import { skillsCategories } from '@/constants/skillsCategories';
import { api, endpoints } from '../../lib/api';
import type { DashboardSkill, UseSkillsModalsResult } from './hooks/useSkillsModals';

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
}: DashboardModalsProps) {
  const {
    selectedSkillsCategory,
    setSelectedSkillsCategory,
    standardCategories,
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
    editingStandardCategoryIndex,
    setEditingStandardCategoryIndex,
    toLocalSkill,
    applySkillUpdate,
    loadSkills,
    fetchSkillDetail,
    handleRemoveSkillImage,
  } = skillsState;

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
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.detail;
      throw new Error(msg || t('skills.locationSaveError', 'Miesto sa nepodarilo uložiť. Skús to znova.'));
    }
  };

  const uploadImagesIfNeeded = async (skillId: number, images: File[]) => {
    if (!images.length) return;
    for (let i = 0; i < images.length; i += 1) {
      const file = images[i];
      try {
        const fd = new FormData();
        fd.append('image', file);
        await api.post(endpoints.skills.images(skillId), fd);
      } catch (imgError: any) {
        const imgMsg = imgError?.response?.data?.error || imgError?.response?.data?.detail || 'Nahrávanie obrázka zlyhalo';
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
    locationValue?: string,
    detailedDescription?: string,
    openingHours?: { [key: string]: { enabled: boolean; from: string; to: string } },
    district?: string,
  ) => {
    const trimmedLocation = typeof locationValue === 'string' ? locationValue.trim() : '';
    const trimmedDistrict = typeof district === 'string' ? district.trim() : '';
    const detailedText = typeof detailedDescription === 'string' ? detailedDescription.trim() : '';
    const buildPayload = () => {
      const payload: any = {
        category: selectedSkillsCategory?.category,
        subcategory: selectedSkillsCategory?.subcategory,
        description: description || '',
        detailed_description: detailedText,
        tags: Array.isArray(tags) ? tags : [],
      };
      if (experience && typeof experience.value === 'number' && experience.unit) {
        payload.experience_value = experience.value;
        payload.experience_unit = experience.unit;
      } else {
        payload.experience_value = null;
        payload.experience_unit = '';
      }
      if (typeof priceFrom === 'number' && !Number.isNaN(priceFrom)) {
        payload.price_from = priceFrom;
        payload.price_currency = priceCurrency || '€';
      } else {
        payload.price_from = null;
        payload.price_currency = '';
      }
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
            ...(typeof priceFrom === 'number' && !Number.isNaN(priceFrom)
              ? { price_from: priceFrom, price_currency: priceCurrency || '€' }
              : { price_from: null, price_currency: '' }),
            district: trimmedDistrict,
            location: trimmedLocation,
            opening_hours: openingHours && Object.keys(openingHours).length > 0 ? openingHours : null,
          });
          let updatedLocal = toLocalSkill(data);
          if (imageFiles.length && data?.id) {
            await uploadImagesIfNeeded(data.id, imageFiles);
            updatedLocal = await fetchSkillDetail(data.id);
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
          }
          setCustomCategories((prev) => {
            const updated = [...prev];
            updated[editingCustomCategoryIndex] = created;
            return updated;
          });
        }
        setEditingCustomCategoryIndex(null);
        setSelectedSkillsCategory(null);
      } else if (selectedSkillsCategory) {
        if (selectedSkillsCategory.category === selectedSkillsCategory.subcategory) {
          // Kontrola celkového počtu kariet (štandardné + vlastné) - limit 3 pre každú sekciu
          const isSeeking = activeModule === 'skills-search';
          if (standardCategories.length + customCategories.length >= 3) {
            alert(isSeeking 
              ? 'Môžeš mať maximálne 3 karty v sekcii "Hľadám".' 
              : 'Môžeš mať maximálne 3 karty v sekcii "Ponúkam".');
            return;
          }
          const payload = buildPayload();
          const { data } = await api.post(endpoints.skills.list, payload);
          let created = toLocalSkill(data);
          if (imageFiles.length && data?.id) {
            await uploadImagesIfNeeded(data.id, imageFiles);
            created = await fetchSkillDetail(data.id);
          }
          setCustomCategories((prev) => [...prev, created]);
          setSelectedSkillsCategory(null);
        } else {
          if (!selectedSkillsCategory.id) {
            // Kontrola celkového počtu kariet (štandardné + vlastné) - limit 3 pre každú sekciu
            const isSeeking = activeModule === 'skills-search';
            if (standardCategories.length + customCategories.length >= 3) {
              alert(isSeeking 
                ? 'Môžeš mať maximálne 3 karty v sekcii "Hľadám".' 
                : 'Môžeš mať maximálne 3 karty v sekcii "Ponúkam".');
              return;
            }
            const payload = buildPayload();
            const { data } = await api.post(endpoints.skills.list, payload);
            let created = toLocalSkill(data);
            if (imageFiles.length && data?.id) {
              await uploadImagesIfNeeded(data.id, imageFiles);
              created = await fetchSkillDetail(data.id);
            }
            setStandardCategories((prev) => [...prev, created]);
            setSelectedSkillsCategory(null);
          } else {
            const { data } = await api.patch(endpoints.skills.detail(selectedSkillsCategory.id), {
              description: description || '',
              detailed_description: detailedText,
              tags: Array.isArray(tags) ? tags : [],
              ...(experience && typeof experience.value === 'number' && experience.unit
                ? { experience_value: experience.value, experience_unit: experience.unit }
                : { experience_value: null, experience_unit: '' }),
              ...(typeof priceFrom === 'number' && !Number.isNaN(priceFrom)
                ? { price_from: priceFrom, price_currency: priceCurrency || '€' }
                : { price_from: null, price_currency: '' }),
              district: trimmedDistrict,
              location: trimmedLocation,
              opening_hours: openingHours && Object.keys(openingHours).length > 0 ? openingHours : null,
            });
            let updated = toLocalSkill(data);
            if (imageFiles.length && data?.id) {
              await uploadImagesIfNeeded(data.id, imageFiles);
              updated = await fetchSkillDetail(data.id);
            }
            setStandardCategories((prev) => {
              const idx = prev.findIndex((p) => p.id === updated.id);
              if (idx === -1) return prev;
              const next = [...prev];
              next[idx] = updated;
              return next;
            });
            setSelectedSkillsCategory(null);
          }
        }
      }

      await loadSkills();
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.response?.data?.detail || 'Ukladanie zručnosti zlyhalo';
      alert(msg);
      return;
    } finally {
      setIsSkillDescriptionModalOpen(false);
    }
  };

  return (
    <>
      <AccountTypeModal
        isOpen={isAccountTypeModalOpen}
        onClose={() => setIsAccountTypeModalOpen(false)}
        onConfirm={() => {
          setAccountType('business');
          setIsAccountTypeModalOpen(false);
        }}
      />

      <PersonalAccountModal
        isOpen={isPersonalAccountModalOpen}
        onClose={() => setIsPersonalAccountModalOpen(false)}
        onConfirm={() => {
          setAccountType('personal');
          setIsPersonalAccountModalOpen(false);
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
            price_currency: '€',
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
          initialPriceCurrency={selectedSkillsCategory.price_currency ?? '€'}
          initialDistrict={selectedSkillsCategory.district ?? ''}
          initialLocation={selectedSkillsCategory.location ?? ''}
          initialDetailedDescription={selectedSkillsCategory.detailed_description || ''}
          initialOpeningHours={selectedSkillsCategory.opening_hours}
          accountType={accountType}
          isSeeking={activeModule === 'skills-search'}
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

