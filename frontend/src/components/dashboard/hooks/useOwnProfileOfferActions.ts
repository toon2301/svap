'use client';

import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import toast from 'react-hot-toast';
import { api, endpoints } from '@/lib/api';
import type { User } from '@/types';
import type { Offer } from '../modules/profile/profileOffersTypes';
import type { ProfileTab } from '../modules/profile/profileTypes';
import { dispatchProfileOffersRefresh } from '../modules/profile/profileOfferEvents';
import { invalidateOffersCache } from '../modules/profile/profileOffersCache';
import { setSkillsDescribeProfileReturn } from '../modules/skills/skillsDescribeReturnSession';
import { getSkillActionErrorMessage } from '../components/skillActionError';
import type { DashboardSkill } from './useSkillsModals';

type OwnProfileOfferActionsInput = {
  isMobile: boolean;
  t: (key: string, fallback?: string) => string;
  user: Pick<User, 'id'> | null;
  selectedSkillsCategory: Pick<DashboardSkill, 'id'> | null;
  fetchSkillDetail: (id: number) => Promise<DashboardSkill>;
  loadSkills: () => Promise<void>;
  setStandardCategories: Dispatch<SetStateAction<DashboardSkill[]>>;
  setCustomCategories: Dispatch<SetStateAction<DashboardSkill[]>>;
  setSelectedSkillsCategory: (skill: DashboardSkill | null) => void;
  setIsSkillDescriptionModalOpen: (open: boolean) => void;
  setEditingCustomCategoryIndex: (index: number | null) => void;
  setEditingStandardCategoryIndex: (index: number | null) => void;
  setActiveModule: (module: string) => void;
  setIsRightSidebarOpen: (open: boolean) => void;
  setActiveRightItem: (item: string) => void;
  setIsMobileMenuOpen: (open: boolean) => void;
  setIsSearchOpen: (open: boolean) => void;
  setIsNotificationsPanelOpen: (open: boolean) => void;
  setOwnProfileTab: (tab: ProfileTab) => void;
};

/**
 * Úprava a mazanie vlastnej karty (ponuky) z profilu. Úprava načíta detail karty a
 * otvorí ju v okne (desktop) alebo na stránke `skills-describe` (mobil). Mazanie drží
 * ponuku čakajúcu na potvrdenie; po potvrdení ju zmaže na serveri, vyhodí zo zoznamov
 * a obnoví profil. Stav potvrdzovacieho okna žije tu, samotné okno ostáva v DashboardContent.
 */
export function useOwnProfileOfferActions({
  isMobile,
  t,
  user,
  selectedSkillsCategory,
  fetchSkillDetail,
  loadSkills,
  setStandardCategories,
  setCustomCategories,
  setSelectedSkillsCategory,
  setIsSkillDescriptionModalOpen,
  setEditingCustomCategoryIndex,
  setEditingStandardCategoryIndex,
  setActiveModule,
  setIsRightSidebarOpen,
  setActiveRightItem,
  setIsMobileMenuOpen,
  setIsSearchOpen,
  setIsNotificationsPanelOpen,
  setOwnProfileTab,
}: OwnProfileOfferActionsInput) {
  const [pendingDeleteOffer, setPendingDeleteOffer] = useState<Offer | null>(null);
  const [isDeletingOwnProfileOffer, setIsDeletingOwnProfileOffer] = useState(false);

  const handleEditOwnProfileOffer = useCallback(
    async (offer: Offer) => {
      const offerId = Number.isSafeInteger(offer.id) && offer.id >= 1 ? offer.id : null;
      if (offerId === null) {
        toast.error(t('skills.cardEditFailed', 'Kartu sa nepodarilo otvoriť na úpravu. Skúste to znova.'));
        return;
      }

      setOwnProfileTab('offers');

      try {
        const skill = await fetchSkillDetail(offerId);
        const describeMode = skill.is_seeking ? 'search' : 'offer';
        setEditingCustomCategoryIndex(null);
        setEditingStandardCategoryIndex(null);
        setSelectedSkillsCategory(skill);

        try {
          localStorage.setItem('skillsDescribeMode', describeMode);
        } catch {
          // ignore storage errors
        }

        const shouldUseMobileEdit =
          isMobile ||
          (typeof window !== 'undefined' &&
            window.matchMedia('(max-width: 1023px)').matches);

        if (shouldUseMobileEdit) {
          setIsSkillDescriptionModalOpen(false);
          setActiveModule('skills-describe');
          setIsRightSidebarOpen(false);
          setActiveRightItem('');
          setIsMobileMenuOpen(false);
          setIsSearchOpen(false);
          setIsNotificationsPanelOpen(false);
          try {
            localStorage.setItem('activeModule', 'skills-describe');
          } catch {
            // ignore storage failures
          }
          setSkillsDescribeProfileReturn(offerId);
          return;
        }

        setIsSkillDescriptionModalOpen(true);
      } catch (error) {
        toast.error(
          getSkillActionErrorMessage(
            error,
            t('skills.cardEditFailed', 'Kartu sa nepodarilo otvoriť na úpravu. Skúste to znova.'),
          ),
        );
      }
    },
    [
      fetchSkillDetail,
      isMobile,
      setActiveModule,
      setActiveRightItem,
      setEditingCustomCategoryIndex,
      setEditingStandardCategoryIndex,
      setIsSkillDescriptionModalOpen,
      setIsMobileMenuOpen,
      setIsNotificationsPanelOpen,
      setIsRightSidebarOpen,
      setIsSearchOpen,
      setOwnProfileTab,
      setSelectedSkillsCategory,
      t,
    ],
  );

  const handleDeleteOwnProfileOffer = useCallback((offer: Offer) => {
    if (!Number.isSafeInteger(offer.id) || offer.id < 1) {
      toast.error(t('skills.cardDeleteFailed', 'Kartu sa nepodarilo odstrániť. Skúste to znova.'));
      return;
    }
    setPendingDeleteOffer(offer);
  }, [t]);

  const handleConfirmDeleteOwnProfileOffer = useCallback(async () => {
    if (!pendingDeleteOffer || isDeletingOwnProfileOffer) return;

    const offerId = Number.isSafeInteger(pendingDeleteOffer.id) && pendingDeleteOffer.id >= 1
      ? pendingDeleteOffer.id
      : null;
    if (offerId === null) {
      setPendingDeleteOffer(null);
      toast.error(t('skills.cardDeleteFailed', 'Kartu sa nepodarilo odstrániť. Skúste to znova.'));
      return;
    }

    setIsDeletingOwnProfileOffer(true);
    try {
      await api.delete(endpoints.skills.detail(offerId));
      setStandardCategories((prev) => prev.filter((skill) => skill.id !== offerId));
      setCustomCategories((prev) => prev.filter((skill) => skill.id !== offerId));
      if (selectedSkillsCategory?.id === offerId) {
        setSelectedSkillsCategory(null);
        setIsSkillDescriptionModalOpen(false);
      }
      invalidateOffersCache(user?.id);
      dispatchProfileOffersRefresh({ ownerUserId: user?.id, deletedOfferId: offerId });
      setPendingDeleteOffer(null);
      toast.success(t('skills.cardDeleteSuccess', 'Karta bola vymazaná.'));
      void loadSkills();
    } catch (error) {
      toast.error(
        getSkillActionErrorMessage(
          error,
          t('skills.cardDeleteFailed', 'Kartu sa nepodarilo odstrániť. Skúste to znova.'),
        ),
      );
    } finally {
      setIsDeletingOwnProfileOffer(false);
    }
  }, [
    isDeletingOwnProfileOffer,
    loadSkills,
    pendingDeleteOffer,
    selectedSkillsCategory?.id,
    setCustomCategories,
    setIsSkillDescriptionModalOpen,
    setSelectedSkillsCategory,
    setStandardCategories,
    t,
    user?.id,
  ]);

  return {
    pendingDeleteOffer,
    setPendingDeleteOffer,
    isDeletingOwnProfileOffer,
    handleEditOwnProfileOffer,
    handleDeleteOwnProfileOffer,
    handleConfirmDeleteOwnProfileOffer,
  };
}
