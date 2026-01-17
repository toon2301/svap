'use client';

import { useCallback, useState, useRef } from 'react';
import { api, endpoints } from '../../../lib/api';

export type OpeningHours = {
  monday?: { enabled: boolean; from: string; to: string };
  tuesday?: { enabled: boolean; from: string; to: string };
  wednesday?: { enabled: boolean; from: string; to: string };
  thursday?: { enabled: boolean; from: string; to: string };
  friday?: { enabled: boolean; from: string; to: string };
  saturday?: { enabled: boolean; from: string; to: string };
  sunday?: { enabled: boolean; from: string; to: string };
};

export type DashboardSkill = {
  id?: number;
  category: string;
  subcategory: string;
  description?: string;
  detailed_description?: string;
  experience?: { value: number; unit: 'years' | 'months' };
  tags?: string[];
  images?: Array<{ id: number; image_url?: string | null; image?: string | null; order?: number }>;
  price_from?: number | null;
  price_currency?: string;
  district?: string;
  location?: string;
  opening_hours?: OpeningHours;
  is_seeking?: boolean;
  urgency?: 'low' | 'medium' | 'high' | '';
  duration_type?: 'one_time' | 'long_term' | 'project' | '' | null;
  is_hidden?: boolean;
};

export interface UseSkillsModalsResult {
  selectedSkillsCategory: DashboardSkill | null;
  setSelectedSkillsCategory: React.Dispatch<React.SetStateAction<DashboardSkill | null>>;
  standardCategories: DashboardSkill[];
  setStandardCategories: React.Dispatch<React.SetStateAction<DashboardSkill[]>>;
  customCategories: DashboardSkill[];
  setCustomCategories: React.Dispatch<React.SetStateAction<DashboardSkill[]>>;
  isSkillsCategoryModalOpen: boolean;
  setIsSkillsCategoryModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isSkillDescriptionModalOpen: boolean;
  setIsSkillDescriptionModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isAddCustomCategoryModalOpen: boolean;
  setIsAddCustomCategoryModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editingCustomCategoryIndex: number | null;
  setEditingCustomCategoryIndex: React.Dispatch<React.SetStateAction<number | null>>;
  editingStandardCategoryIndex: number | null;
  setEditingStandardCategoryIndex: React.Dispatch<React.SetStateAction<number | null>>;
  toLocalSkill: (skill: any) => DashboardSkill;
  applySkillUpdate: (updated: DashboardSkill | null) => void;
  loadSkills: () => Promise<void>;
  fetchSkillDetail: (id: number) => Promise<DashboardSkill>;
  handleRemoveSkillImage: (skillId: number, imageId: number) => Promise<any[]>;
  removeStandardCategory: (index: number) => Promise<void>;
  removeCustomCategory: (index: number) => Promise<void>;
}

export function useSkillsModals(): UseSkillsModalsResult {
  const [selectedSkillsCategory, setSelectedSkillsCategory] = useState<DashboardSkill | null>(null);
  const [standardCategories, setStandardCategories] = useState<DashboardSkill[]>([]);
  const [customCategories, setCustomCategories] = useState<DashboardSkill[]>([]);
  const [isSkillsCategoryModalOpen, setIsSkillsCategoryModalOpen] = useState(false);
  const [isSkillDescriptionModalOpen, setIsSkillDescriptionModalOpen] = useState(false);
  const [isAddCustomCategoryModalOpen, setIsAddCustomCategoryModalOpen] = useState(false);
  const [editingCustomCategoryIndex, setEditingCustomCategoryIndex] = useState<number | null>(null);
  const [editingStandardCategoryIndex, setEditingStandardCategoryIndex] = useState<number | null>(null);

  const toLocalSkill = useCallback((s: any): DashboardSkill => {
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
      opening_hours:
        s.opening_hours && typeof s.opening_hours === 'object'
          ? (s.opening_hours as OpeningHours)
          : undefined,
      is_seeking: s.is_seeking === true,
      urgency:
        typeof s.urgency === 'string' && s.urgency.trim() !== ''
          ? (s.urgency.trim() as 'low' | 'medium' | 'high' | '')
          : '',
      duration_type: s.duration_type || null,
      is_hidden: s.is_hidden === true,
    };
  }, []);

  const applySkillUpdate = useCallback((updated: DashboardSkill | null) => {
    if (!updated?.id) return;
    if (updated.category === updated.subcategory) {
      setCustomCategories((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } else {
      setStandardCategories((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    }
  }, []);

  // Request deduplication a cooldown pre loadSkills
  const loadSkillsInFlightRef = useRef<Promise<void> | null>(null);
  const loadSkillsLastTimeRef = useRef<number>(0);
  const LOAD_SKILLS_COOLDOWN_MS = 2000; // 2 sekundy cooldown

  const loadSkills = useCallback(async () => {
    const now = Date.now();
    
    // Cooldown check - ak sa request volal nedávno, nevolať ho znova
    if (now - loadSkillsLastTimeRef.current < LOAD_SKILLS_COOLDOWN_MS) {
      // Ak existuje in-flight request, počkaj naň
      if (loadSkillsInFlightRef.current) {
        return loadSkillsInFlightRef.current;
      }
      // Inak nevolať nový request
      return;
    }

    // Ak už existuje in-flight request, použij ho
    if (loadSkillsInFlightRef.current) {
      return loadSkillsInFlightRef.current;
    }

    // Vytvor nový request
    loadSkillsLastTimeRef.current = now;
    const request = (async () => {
      try {
        const { data } = await api.get(endpoints.skills.list);
        const skills: any[] = Array.isArray(data) ? data : [];
        // Namapuj a zorad podľa ID zostupne – nové karty budú vždy hore
        const localSkills = skills
          .map(toLocalSkill)
          .sort((a, b) => (b.id ?? 0) - (a.id ?? 0));

        const standard = localSkills.filter((s) => s.category !== s.subcategory);
        const custom = localSkills.filter((s) => s.category === s.subcategory);

        setStandardCategories(standard);
        setCustomCategories(custom);
      } catch {
        // silently ignore – dashboard can work without backend data
      } finally {
        // Vyčisti in-flight request po dokončení
        loadSkillsInFlightRef.current = null;
      }
    })();

    loadSkillsInFlightRef.current = request;
    return request;
  }, [toLocalSkill]);

  const fetchSkillDetail = useCallback(
    async (id: number) => {
      const { data } = await api.get(endpoints.skills.detail(id));
      return toLocalSkill(data);
    },
    [toLocalSkill]
  );

  const handleRemoveSkillImage = useCallback(
    async (skillId: number, imageId: number) => {
      try {
        await api.delete(endpoints.skills.imageDetail(skillId, imageId));
        const refreshed = await fetchSkillDetail(skillId);
        setSelectedSkillsCategory(refreshed);
        if (refreshed.category === refreshed.subcategory) {
          setCustomCategories((prev) => prev.map((item) => (item.id === refreshed.id ? refreshed : item)));
        } else {
          setStandardCategories((prev) => prev.map((item) => (item.id === refreshed.id ? refreshed : item)));
        }
        return refreshed.images ?? [];
      } catch (error: any) {
        const msg = error?.response?.data?.error || error?.response?.data?.detail || 'Odstránenie obrázka zlyhalo';
        alert(msg);
        throw error;
      }
    },
    [fetchSkillDetail]
  );

  const removeStandardCategory = useCallback(
    async (index: number) => {
      const item = standardCategories[index];
      try {
        if (item?.id) {
          await api.delete(endpoints.skills.detail(item.id));
        }
      } catch {
        // ignore
      } finally {
        setStandardCategories((prev) => prev.filter((_, i) => i !== index));
      }
    },
    [standardCategories]
  );

  const removeCustomCategory = useCallback(
    async (index: number) => {
      const skill = customCategories[index];
      try {
        if (skill?.id) {
          await api.delete(endpoints.skills.detail(skill.id));
        }
      } catch {
        // ignore
      } finally {
        setCustomCategories((prev) => prev.filter((_, i) => i !== index));
      }
    },
    [customCategories]
  );

  return {
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
    removeStandardCategory,
    removeCustomCategory,
  };
}

