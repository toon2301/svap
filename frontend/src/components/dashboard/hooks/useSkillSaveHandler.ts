'use client';

import { useCallback } from 'react';
import { api, endpoints } from '@/lib/api';
import { uploadOfferImage } from '@/lib/offerImageUpload';
import { isValidOfferDistrictSelection } from '@/shared/districtRegistry';
import { dispatchProfileOffersRefresh } from '../modules/profile/profileOfferEvents';
import type { DashboardSkill } from './useSkillsModals';

type Translator = (key: string, fallback: string) => string;

type SkillSaveHandlerParams = {
  selectedSkillsCategory: DashboardSkill | null;
  activeModule: string;
  setActiveModule: (m: string) => void;
  toLocalSkill: (apiSkill: unknown) => DashboardSkill;
  applySkillUpdate: (skill: DashboardSkill) => void;
  loadSkills: () => Promise<void> | void;
  t: Translator;
  ownerUserIdForOffersCache?: number;
  onCreatedSkillSaved?: () => void;
};

type ApiErrorLike = {
  response?: {
    data?: {
      error?: unknown;
      detail?: unknown;
    };
  };
  message?: unknown;
};

type SkillSavePayload = Record<string, unknown>;
type DashboardSkillImage = NonNullable<DashboardSkill['images']>[number];
type UploadedOfferImage = Partial<DashboardSkillImage>;

function getApiErrorMessage(error: unknown, fallback: string): string {
  const apiError = error as ApiErrorLike;
  const rawMessage =
    apiError.response?.data?.error ?? apiError.response?.data?.detail ?? apiError.message;
  return typeof rawMessage === 'string' && rawMessage.trim() !== ''
    ? rawMessage
    : fallback;
}

function getSkillsDescribeReturnModule(): 'profile' | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('skillsDescribeReturnModule') === 'profile' ? 'profile' : null;
}

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
  onCreatedSkillSaved,
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
    const returnModule = getSkillsDescribeReturnModule();
    const nextModule = returnModule || targetModule;
    const draftSkill = selectedSkillsCategory;
    const trimmedDistrict = (draftSkill.district || '').trim();
    const trimmedLocation = (draftSkill.location || '').trim();
    const trimmedCountryCode = String(draftSkill.country_code || '').trim().toUpperCase();
    const trimmedDistrictCode = String(draftSkill.district_code || '').trim().toLowerCase();

    if (
      !isValidOfferDistrictSelection({
        countryCode: trimmedCountryCode,
        districtCode: trimmedDistrictCode,
        districtLabel: trimmedDistrict,
      })
    ) {
      alert(t('skills.invalidDistrict', 'Neplatný okres. Vyber z navrhovaných možností.'));
      return;
    }

    // Globálne UX (najmä mobile): zobraz stav aj po presmerovaní.
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('offer-save-start', {
            detail: { label: 'Ukladám ponuku...' },
          }),
        );
      }
    } catch {
      // ignore
    }

    // UX: hneď po kliknutí na fajku presmeruj späť na obrazovku s výberom/pridaním kategórie.
    // Ukladanie prebehne na pozadí – po dokončení sa len aktualizuje zoznam kariet.
    setActiveModule(nextModule);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('activeModule', nextModule);
        if (returnModule) {
          sessionStorage.removeItem('skillsDescribeReturnModule');
        }
      }
    } catch {
      // ignore storage errors
    }

    try {
      const skill = selectedSkillsCategory;

      // Pripraviť payload
      const detailedText = (skill.detailed_description || '').trim();

      const payload: SkillSavePayload = {
        category: skill.category,
        subcategory: skill.subcategory,
        description: skill.description || '',
        detailed_description: detailedText,
        tags: Array.isArray(skill.tags) ? skill.tags : [],
        country_code: trimmedCountryCode,
        district_code: trimmedDistrictCode,
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

      if (skill.price_negotiable === true) {
        payload.price_from = null;
        payload.price_currency = '';
        payload.price_negotiable = true;
      } else if (typeof skill.price_from === 'number' && !isNaN(skill.price_from)) {
        payload.price_from = skill.price_from;
        payload.price_currency = skill.price_currency || '€';
        payload.price_negotiable = false;
      } else {
        payload.price_from = null;
        payload.price_currency = '';
        payload.price_negotiable = false;
      }

      if (skill.opening_hours) {
        payload.opening_hours = skill.opening_hours;
      }

      let savedSkill: DashboardSkill;
      const newImages = Array.isArray(skill._newImages) ? skill._newImages : [];
      const mergeUploadedImage = (
        base: DashboardSkill,
        uploaded: UploadedOfferImage,
      ): DashboardSkill => {
        if (!uploaded || typeof uploaded.id !== 'number') return base;
        const src = uploaded.image_url ?? uploaded.image ?? null;
        const status = uploaded.status ?? (src ? 'approved' : 'pending');
        const nextImg: DashboardSkillImage = {
          id: uploaded.id,
          image_url: src,
          image: uploaded.image ?? null,
          order: typeof uploaded.order === 'number' ? uploaded.order : undefined,
          status,
          rejected_reason: uploaded.rejected_reason ?? null,
        };
        const prevImages = Array.isArray(base.images) ? base.images : [];
        const without = prevImages.filter((im) => im.id !== nextImg.id);
        const nextImages = [...without, nextImg].sort(
          (a, b) => (a.order ?? 0) - (b.order ?? 0),
        );
        return { ...base, images: nextImages };
      };
      let didCreateSkill = false;

      if (skill.id) {
        // Update existujúcej karty
        const { data } = await api.patch(endpoints.skills.detail(skill.id), payload);
        savedSkill = toLocalSkill(data);

        // UI: zobraz zmenu hneď, upload nech beží potom
        applySkillUpdate(savedSkill);

        // Nahrať nové obrázky
        if (newImages.length > 0) {
          for (let i = 0; i < newImages.length; i++) {
            const file = newImages[i];
            try {
              const uploaded = await uploadOfferImage(skill.id, file);
              savedSkill = mergeUploadedImage(savedSkill, uploaded);
              applySkillUpdate(savedSkill);
            } catch (imgError: unknown) {
              const imgMsg = getApiErrorMessage(imgError, 'Nahrávanie obrázka zlyhalo');
              alert(`Chyba pri nahrávaní obrázka ${i + 1}: ${imgMsg}`);
            }
          }
        }
      } else {
        // Vytvorenie novej karty
        const { data } = await api.post(endpoints.skills.list, payload);
        savedSkill = toLocalSkill(data);
        didCreateSkill = true;

        // UI: zobraz novú kartu hneď, upload nech beží potom
        applySkillUpdate(savedSkill);

        // Nahrať nové obrázky
        const savedSkillId = savedSkill.id;
        if (newImages.length > 0 && savedSkillId) {
          for (let i = 0; i < newImages.length; i++) {
            const file = newImages[i];
            try {
              const uploaded = await uploadOfferImage(savedSkillId, file);
              savedSkill = mergeUploadedImage(savedSkill, uploaded);
              applySkillUpdate(savedSkill);
            } catch (imgError: unknown) {
              const imgMsg = getApiErrorMessage(imgError, 'Nahrávanie obrázka zlyhalo');
              alert(`Chyba pri nahrávaní obrázka ${i + 1}: ${imgMsg}`);
            }
          }
        }
      }

      // Invalidovať cache ponúk, aby sa pri návrate na profil načítali nové dáta
      const { invalidateOffersCache } = await import('../modules/profile/profileOffersCache');
      invalidateOffersCache(ownerUserIdForOffersCache);
      dispatchProfileOffersRefresh({
        ownerUserId: ownerUserIdForOffersCache,
        offerId: savedSkill.id,
      });

      // Po úspešnom uložení, refresh skills pre aktívnu kategóriu
      await loadSkills();
      if (didCreateSkill) {
        onCreatedSkillSaved?.();
      }
    } catch (error: unknown) {
      const message = getApiErrorMessage(
        error,
        t('dashboard.skillSaveError', 'Nepodarilo sa uložiť zručnosť'),
      );
      alert(message);
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('offer-save-error', {
              detail: { message },
            }),
          );
        }
      } catch {
        // ignore
      }
    } finally {
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('offer-save-done'));
        }
      } catch {
        // ignore
      }
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
    onCreatedSkillSaved,
  ]);
}


