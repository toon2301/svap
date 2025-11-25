'use client';
import React from 'react';
import SkillsCategoryModal from './SkillsCategoryModal';
import SkillDescriptionModal from './SkillDescriptionModal';
import { skillsCategories } from '@/constants/skillsCategories';
import { api, endpoints } from '../../../../lib/api';

type Experience = { value: number; unit: 'years' | 'months' } | undefined;
type ImageItem = { id: number; image_url?: string | null; image?: string | null; order?: number } | any;

export type OpeningHours = {
  monday?: { enabled: boolean; from: string; to: string };
  tuesday?: { enabled: boolean; from: string; to: string };
  wednesday?: { enabled: boolean; from: string; to: string };
  thursday?: { enabled: boolean; from: string; to: string };
  friday?: { enabled: boolean; from: string; to: string };
  saturday?: { enabled: boolean; from: string; to: string };
  sunday?: { enabled: boolean; from: string; to: string };
};

export interface SkillItem {
  id?: number;
  category: string;
  subcategory: string;
  description?: string;
  detailed_description?: string;
  experience?: Experience;
  tags?: string[];
  images?: Array<ImageItem>;
  price_from?: number | null;
  price_currency?: string;
  district?: string;
  location?: string;
  opening_hours?: OpeningHours;
}

type Props = {
  isSkillsCategoryModalOpen: boolean;
  setIsSkillsCategoryModalOpen: (v: boolean) => void;
  isSkillDescriptionModalOpen: boolean;
  setIsSkillDescriptionModalOpen: (v: boolean) => void;
  selectedSkillsCategory: SkillItem | null;
  setSelectedSkillsCategory: (v: SkillItem | null) => void;
  editingCustomCategoryIndex: number | null;
  setEditingCustomCategoryIndex: (v: number | null) => void;
  editingStandardCategoryIndex: number | null;
  setEditingStandardCategoryIndex: (v: number | null) => void;
  standardCategories: SkillItem[];
  setStandardCategories: React.Dispatch<React.SetStateAction<SkillItem[]>>;
  customCategories: SkillItem[];
  setCustomCategories: React.Dispatch<React.SetStateAction<SkillItem[]>>;
  loadSkills: () => Promise<void>;
  handleRemoveSkillImage: (skillId: number, imageId: number) => Promise<any[]>;
};

export default function SkillModals(props: Props) {
  const {
    isSkillsCategoryModalOpen,
    setIsSkillsCategoryModalOpen,
    isSkillDescriptionModalOpen,
    setIsSkillDescriptionModalOpen,
    selectedSkillsCategory,
    setSelectedSkillsCategory,
    editingCustomCategoryIndex,
    setEditingCustomCategoryIndex,
    editingStandardCategoryIndex,
    setEditingStandardCategoryIndex,
    standardCategories,
    setStandardCategories,
    customCategories,
    setCustomCategories,
    loadSkills,
    handleRemoveSkillImage,
  } = props;

  const toLocalSkill = (s: any): SkillItem => {
    const exp =
      s.experience_value !== undefined && s.experience_value !== null && s.experience_unit
        ? { value: s.experience_value as number, unit: s.experience_unit as 'years' | 'months' }
        : undefined;
    const rawPrice = s.price_from;
    const parsedPrice =
      typeof rawPrice === 'number'
        ? rawPrice
        : typeof rawPrice === 'string' && rawPrice.trim() !== ''
          ? parseFloat(rawPrice)
          : null;
    return {
      id: s.id as number | undefined,
      category: s.category as string,
      subcategory: s.subcategory as string,
      description: (s.description || '') as string,
      detailed_description: (s.detailed_description || '') as string,
      experience: exp,
      tags: Array.isArray(s.tags) ? (s.tags as string[]) : [],
      images: Array.isArray(s.images)
        ? s.images.map((im: any) => ({
            id: im.id,
            image_url: im.image_url || im.image || null,
            order: im.order,
          }))
        : [],
      price_from: parsedPrice,
      price_currency:
        typeof s.price_currency === 'string' && s.price_currency.trim() !== ''
          ? s.price_currency
          : '€',
      district: typeof s.district === 'string' ? s.district : '',
      location: typeof s.location === 'string' ? s.location : '',
      opening_hours: (s.opening_hours && typeof s.opening_hours === 'object') ? s.opening_hours as OpeningHours : undefined,
    };
  };

  const fetchSkillDetail = async (id: number) => {
    const { data } = await api.get(endpoints.skills.detail(id));
    return toLocalSkill(data);
  };

  return (
    <>
      {/* Skills Category Modal */}
      <SkillsCategoryModal
        isOpen={isSkillsCategoryModalOpen}
        onClose={() => setIsSkillsCategoryModalOpen(false)}
        categories={skillsCategories}
        selected={selectedSkillsCategory?.subcategory || null}
        onSelect={(category, subcategory) => {
          setIsSkillsCategoryModalOpen(false);
          setSelectedSkillsCategory({ category, subcategory, price_from: null, price_currency: '€', location: '', detailed_description: '' });
          setIsSkillDescriptionModalOpen(true);
        }}
      />

      {/* Skill Description Modal */}
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
          onRemoveExistingImage={
            selectedSkillsCategory.id
              ? (imageId) => handleRemoveSkillImage(selectedSkillsCategory.id!, imageId)
              : undefined
          }
          onSave={async (description, experience, tags, images, priceFrom, priceCurrency, locationValue, detailedDescription, districtValue?: string) => {
            const trimmedLocation = typeof locationValue === 'string' ? locationValue.trim() : '';
            const trimmedDistrict = typeof districtValue === 'string' ? districtValue.trim() : '';
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
              if (typeof priceFrom === 'number' && !isNaN(priceFrom)) {
                payload.price_from = priceFrom;
                payload.price_currency = priceCurrency || '€';
              } else {
                payload.price_from = null;
                payload.price_currency = '';
              }
              payload.district = trimmedDistrict;
              payload.location = trimmedLocation;
              return payload;
            };

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
                    ...(typeof priceFrom === 'number' && !isNaN(priceFrom)
                      ? { price_from: priceFrom, price_currency: priceCurrency || '€' }
                      : { price_from: null, price_currency: '' }),
                    district: trimmedDistrict,
                    location: trimmedLocation,
                  });
                  let updatedLocal = toLocalSkill(data);
                  if (Array.isArray(images) && images.length > 0 && data?.id) {
                    for (let i = 0; i < images.length; i++) {
                      const file = images[i];
                      try {
                        const fd = new FormData();
                        fd.append('image', file);
                        await api.post(endpoints.skills.images(data.id), fd);
                      } catch (imgError: any) {
                        const imgMsg = imgError?.response?.data?.error || imgError?.response?.data?.detail || 'Nahrávanie obrázka zlyhalo';
                        alert(`Chyba pri nahrávaní obrázka ${i + 1}: ${imgMsg}`);
                        throw imgError;
                      }
                    }
                    updatedLocal = await fetchSkillDetail(data.id);
                  }
                  setCustomCategories((prev) => {
                    const updated = [...prev];
                    updated[editingCustomCategoryIndex] = updatedLocal;
                    return updated;
                  });
                } else {
                  const current = customCategories[editingCustomCategoryIndex];
                  const payload = {
                    category: current.category,
                    subcategory: current.subcategory,
                    description: description || '',
                    detailed_description: detailedText,
                    tags: Array.isArray(tags) ? tags : [],
                    ...(experience && typeof experience.value === 'number' && experience.unit
                      ? { experience_value: experience.value, experience_unit: experience.unit }
                      : { experience_value: null, experience_unit: '' }),
                    ...(typeof priceFrom === 'number' && !isNaN(priceFrom)
                      ? { price_from: priceFrom, price_currency: priceCurrency || '€' }
                      : { price_from: null, price_currency: '' }),
                    district: trimmedDistrict,
                    location: trimmedLocation,
                  };
                  const { data } = await api.post(endpoints.skills.list, payload);
                  let created = toLocalSkill(data);
                  if (Array.isArray(images) && images.length > 0 && data?.id) {
                    for (let i = 0; i < images.length; i++) {
                      const file = images[i];
                      try {
                        const fd = new FormData();
                        fd.append('image', file);
                        await api.post(endpoints.skills.images(data.id), fd);
                      } catch (imgError: any) {
                        const imgMsg = imgError?.response?.data?.error || imgError?.response?.data?.detail || 'Nahrávanie obrázka zlyhalo';
                        alert(`Chyba pri nahrávaní obrázka ${i + 1}: ${imgMsg}`);
                        throw imgError;
                      }
                    }
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
                  if (customCategories.length >= 5) {
                    alert('Môžeš pridať maximálne 5 vlastných kategórií.');
                    return;
                  }
                  const payload = buildPayload();
                  const { data } = await api.post(endpoints.skills.list, payload);
                  let created = toLocalSkill(data);
                  if (Array.isArray(images) && images.length > 0 && data?.id) {
                    for (let i = 0; i < images.length; i++) {
                      const file = images[i];
                      try {
                        const fd = new FormData();
                        fd.append('image', file);
                        await api.post(endpoints.skills.images(data.id), fd);
                      } catch (imgError: any) {
                        const imgMsg = imgError?.response?.data?.error || imgError?.response?.data?.detail || 'Nahrávanie obrázka zlyhalo';
                        alert(`Chyba pri nahrávaní obrázka ${i + 1}: ${imgMsg}`);
                        throw imgError;
                      }
                    }
                    created = await fetchSkillDetail(data.id);
                  }
                  setCustomCategories((prev) => [...prev, created]);
                  setSelectedSkillsCategory(null);
                } else {
                  if (!selectedSkillsCategory.id) {
                    if (standardCategories.length >= 5) {
                      alert('Môžeš mať maximálne 5 výberov z kategórií.');
                      return;
                    }
                    const payload = buildPayload();
                    const { data } = await api.post(endpoints.skills.list, payload);
                    let created = toLocalSkill(data);
                    if (Array.isArray(images) && images.length > 0 && data?.id) {
                      for (let i = 0; i < images.length; i++) {
                        const file = images[i];
                        try {
                          const fd = new FormData();
                          fd.append('image', file);
                          await api.post(endpoints.skills.images(data.id), fd);
                        } catch (imgError: any) {
                          const imgMsg = imgError?.response?.data?.error || imgError?.response?.data?.detail || 'Nahrávanie obrázka zlyhalo';
                          alert(`Chyba pri nahrávaní obrázka ${i + 1}: ${imgMsg}`);
                          throw imgError;
                        }
                      }
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
                      ...(typeof priceFrom === 'number' && !isNaN(priceFrom)
                        ? { price_from: priceFrom, price_currency: priceCurrency || '€' }
                        : { price_from: null, price_currency: '' }),
                      district: trimmedDistrict,
                      location: trimmedLocation,
                    });
                    let updated = toLocalSkill(data);
                    if (Array.isArray(images) && images.length > 0 && data?.id) {
                      for (let i = 0; i < images.length; i++) {
                        const file = images[i];
                        try {
                          const fd = new FormData();
                          fd.append('image', file);
                          await api.post(endpoints.skills.images(data.id), fd);
                        } catch (imgError: any) {
                          const imgMsg = imgError?.response?.data?.error || imgError?.response?.data?.detail || 'Nahrávanie obrázka zlyhalo';
                          alert(`Chyba pri nahrávaní obrázka ${i + 1}: ${imgMsg}`);
                          throw imgError;
                        }
                      }
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
          }}
        />
      )}
    </>
  );
}

