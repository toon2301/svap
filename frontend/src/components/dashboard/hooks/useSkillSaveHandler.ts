'use client';

import { useCallback } from 'react';
import { api, endpoints } from '@/lib/api';
import type { DashboardSkill } from './useSkillsModals';

type Translator = (key: string, fallback: string) => string;

type SkillSaveHandlerParams = {
  selectedSkillsCategory: any | null;
  activeModule: string;
  setActiveModule: (m: string) => void;
  toLocalSkill: (apiSkill: any) => DashboardSkill;
  applySkillUpdate: (skill: DashboardSkill) => void;
  loadSkills: () => Promise<void> | void;
  t: Translator;
  ownerUserIdForOffersCache?: number;
};

/**
 * Vráti handler na uloženie karty (create/update + upload images) bez zmeny existujúcej logiky.
 * Zámer: držať DashboardContent kratší a prehľadnejší.
 */
export function useSkillSaveHandler({
  selectedSkillsCategory,
  activeModule,
  setActiveModule,
  toLocalSkill,
  applySkillUpdate,
  loadSkills,
  t,
  ownerUserIdForOffersCache,
}: SkillSaveHandlerParams) {
  return useCallback(async () => {
    if (!selectedSkillsCategory) return;

    // Zistiť, či ide o "Ponúkam" alebo "Hľadám"
    let isSeeking =
      selectedSkillsCategory.is_seeking === true || activeModule === 'skills-search';

    // Ak ešte nemáme is_seeking, skúsime skillsDescribeMode z localStorage
    if (!isSeeking && typeof window !== 'undefined') {
      try {
        const mode = localStorage.getItem('skillsDescribeMode');
        if (mode === 'search') {
          isSeeking = true;
        }
      } catch {
        // ignore storage errors
      }
    }

    const targetModule = isSeeking ? 'skills-search' : 'skills-offer';

    // UX: hneď po kliknutí na fajku presmeruj späť na obrazovku s výberom/pridaním kategórie.
    // Ukladanie prebehne na pozadí – po dokončení sa len aktualizuje zoznam kariet.
    setActiveModule(targetModule);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('activeModule', targetModule);
      }
    } catch {
      // ignore storage errors
    }

    try {
      const skill = selectedSkillsCategory;

      // Pripraviť payload
      const trimmedDistrict = (skill.district || '').trim();
      const trimmedLocation = (skill.location || '').trim();
      const detailedText = (skill.detailed_description || '').trim();

      const payload: any = {
        category: skill.category,
        subcategory: skill.subcategory,
        description: skill.description || '',
        detailed_description: detailedText,
        tags: Array.isArray(skill.tags) ? skill.tags : [],
        district: trimmedDistrict,
        location: trimmedLocation,
        is_seeking: isSeeking,
        urgency: skill.urgency || 'low',
        duration_type: skill.duration_type || null,
        is_hidden: skill.is_hidden || false,
      };

      if (
        skill.experience &&
        typeof skill.experience.value === 'number' &&
        skill.experience.unit
      ) {
        payload.experience_value = skill.experience.value;
        payload.experience_unit = skill.experience.unit;
      } else {
        payload.experience_value = null;
        payload.experience_unit = '';
      }

      if (typeof skill.price_from === 'number' && !isNaN(skill.price_from)) {
        payload.price_from = skill.price_from;
        payload.price_currency = skill.price_currency || '€';
      } else {
        payload.price_from = null;
        payload.price_currency = '';
      }

      if (skill.opening_hours) {
        payload.opening_hours = skill.opening_hours;
      }

      let savedSkill: DashboardSkill;
      const newImages = (skill as any)._newImages || [];

      if (skill.id) {
        // Update existujúcej karty
        const { data } = await api.patch(endpoints.skills.detail(skill.id), payload);
        savedSkill = toLocalSkill(data);

        // Nahrať nové obrázky
        if (newImages.length > 0) {
          for (let i = 0; i < newImages.length; i++) {
            const file = newImages[i];
            try {
              const fd = new FormData();
              fd.append('image', file);
              await api.post(endpoints.skills.images(skill.id), fd);
            } catch (imgError: any) {
              const imgMsg =
                imgError?.response?.data?.error ||
                imgError?.response?.data?.detail ||
                'Nahrávanie obrázka zlyhalo';
              alert(`Chyba pri nahrávaní obrázka ${i + 1}: ${imgMsg}`);
            }
          }
        }
      } else {
        // Vytvorenie novej karty
        const { data } = await api.post(endpoints.skills.list, payload);
        savedSkill = toLocalSkill(data);

        // Nahrať nové obrázky
        if (newImages.length > 0 && savedSkill.id) {
          for (let i = 0; i < newImages.length; i++) {
            const file = newImages[i];
            try {
              const fd = new FormData();
              fd.append('image', file);
              await api.post(endpoints.skills.images(savedSkill.id), fd);
            } catch (imgError: any) {
              const imgMsg =
                imgError?.response?.data?.error ||
                imgError?.response?.data?.detail ||
                'Nahrávanie obrázka zlyhalo';
              alert(`Chyba pri nahrávaní obrázka ${i + 1}: ${imgMsg}`);
            }
          }
        }
      }

      // Úspešne uložené – aktualizuj zoznam kariet
      applySkillUpdate(savedSkill);

      // Invalidovať cache ponúk, aby sa pri návrate na profil načítali nové dáta
      const { invalidateOffersCache } = await import('../modules/profile/profileOffersCache');
      invalidateOffersCache(ownerUserIdForOffersCache);

      // Po úspešnom uložení, refresh skills pre aktívnu kategóriu
      void loadSkills();
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Chyba pri ukladaní zručnosti:', error);
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.detail ||
        t('dashboard.skillSaveError', 'Nepodarilo sa uložiť zručnosť');
      alert(message);
    }
  }, [
    selectedSkillsCategory,
    activeModule,
    setActiveModule,
    toLocalSkill,
    applySkillUpdate,
    loadSkills,
    t,
    ownerUserIdForOffersCache,
  ]);
}


