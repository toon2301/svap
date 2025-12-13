'use client';

import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { User } from '../../types';
import DashboardLayout from './DashboardLayout';
import ModuleRouter from './ModuleRouter';
import DashboardModals from './DashboardModals';
import { useDashboardState } from './hooks/useDashboardState';
import { useSkillsModals, type DashboardSkill } from './hooks/useSkillsModals';
import { api, endpoints } from '../../lib/api';

interface DashboardProps {
  initialUser?: User;
}

export default function Dashboard({ initialUser }: DashboardProps) {
  const { t } = useLanguage();
  const dashboardState = useDashboardState(initialUser);
  const skillsState = useSkillsModals();
  const [isInSubcategories, setIsInSubcategories] = useState(false);
  const skillsCategoryBackHandlerRef = React.useRef<(() => void) | null>(null);

  const {
    user,
    isLoading,
    activeModule,
    activeRightItem,
    isRightSidebarOpen,
    isMobileMenuOpen,
    accountType,
    handleModuleChange,
    handleRightSidebarToggle,
    handleRightItemClick,
    handleUserUpdate,
    handleLogout,
    handleMobileBack,
    setActiveModule,
    setIsRightSidebarOpen,
    setActiveRightItem,
    setIsMobileMenuOpen,
    setAccountType,
    isAccountTypeModalOpen,
    setIsAccountTypeModalOpen,
    isPersonalAccountModalOpen,
    setIsPersonalAccountModalOpen,
  } = dashboardState;

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
    removeStandardCategory,
    removeCustomCategory,
  } = skillsState;

  // Funkcia na uloženie karty
  const handleSkillSave = async () => {
    if (!selectedSkillsCategory) return;

    // Zistiť, či ide o "Ponúkam" alebo "Hľadám"
    let isSeeking =
      selectedSkillsCategory.is_seeking === true ||
      activeModule === 'skills-search';

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
      };
      
      if (skill.experience && typeof skill.experience.value === 'number' && skill.experience.unit) {
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
              const imgMsg = imgError?.response?.data?.error || imgError?.response?.data?.detail || 'Nahrávanie obrázka zlyhalo';
              alert(`Chyba pri nahrávaní obrázka ${i + 1}: ${imgMsg}`);
            }
          }
          savedSkill = await fetchSkillDetail(skill.id);
        }
        
        applySkillUpdate(savedSkill);
      } else {
        // Vytvoriť novú kartu
        // Limit kontroluje backend podľa is_seeking (3 karty pre každý typ samostatne)
        
        const { data } = await api.post(endpoints.skills.list, payload);
        savedSkill = toLocalSkill(data);
        
        // Nahrať obrázky
        if (newImages.length > 0 && savedSkill.id) {
          for (let i = 0; i < newImages.length; i++) {
            const file = newImages[i];
            try {
              const fd = new FormData();
              fd.append('image', file);
              await api.post(endpoints.skills.images(savedSkill.id), fd);
            } catch (imgError: any) {
              const imgMsg = imgError?.response?.data?.error || imgError?.response?.data?.detail || 'Nahrávanie obrázka zlyhalo';
              alert(`Chyba pri nahrávaní obrázka ${i + 1}: ${imgMsg}`);
            }
          }
          savedSkill = await fetchSkillDetail(savedSkill.id);
        }
        
        // Pridať do príslušného zoznamu (nové karty na vrchu)
        if (savedSkill.category === savedSkill.subcategory) {
          setCustomCategories((prev) => [savedSkill, ...prev]);
        } else {
          setStandardCategories((prev) => [savedSkill, ...prev]);
        }
      }

      // Po úspešnom uložení vyčisti dočasne vybranú kartu
      setSelectedSkillsCategory(null);
    } catch (error: any) {
      const msg =
        error?.response?.data?.error ||
        error?.response?.data?.detail ||
        error?.message ||
        'Uloženie karty zlyhalo';
      alert(msg);

      // Po chybe vráť správny activeModule
      let isSeekingOnError =
        selectedSkillsCategory?.is_seeking === true ||
        activeModule === 'skills-search';
      if (!isSeekingOnError && typeof window !== 'undefined') {
        try {
          const mode = localStorage.getItem('skillsDescribeMode');
          if (mode === 'search') {
            isSeekingOnError = true;
          }
        } catch {
          // ignore storage errors
        }
      }
      const target = isSeekingOnError ? 'skills-search' : 'skills-offer';
      setActiveModule(target);
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('activeModule', target);
        }
      } catch {
        // ignore storage errors
      }
    }
  };

  useEffect(() => {
    if (user) {
      loadSkills();
    }
  }, [user, loadSkills]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">{t('dashboard.loadingDashboard', 'Načítavam dashboard...')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleRightSidebarClose = () => {
          setIsRightSidebarOpen(false);
          setActiveRightItem('');
  };

  const handleMobileProfileClick = () => {
          setActiveModule('profile');
          setIsRightSidebarOpen(false);
  };

  const handleSidebarLanguageClick = () => {
    setActiveModule('profile');
    setIsRightSidebarOpen(true);
    setActiveRightItem('language');
  };

  const handleSidebarAccountTypeClick = () => {
    setActiveModule('profile');
    setIsRightSidebarOpen(true);
    setActiveRightItem('account-type');
  };

  // Custom back handler for skills-select-category
  const handleSkillsCategoryBack = () => {
    // Ak máme handler z SkillsCategoryScreen a sme v podkategóriách, volaj ho
    if (skillsCategoryBackHandlerRef.current && isInSubcategories) {
      skillsCategoryBackHandlerRef.current();
    } else {
      // Inak použi štandardnú navigáciu
      handleMobileBack(isInSubcategories);
    }
  };

  const moduleContent = (
    <ModuleRouter
      user={user}
      activeModule={activeModule}
      activeRightItem={activeRightItem}
      isRightSidebarOpen={isRightSidebarOpen}
      accountType={accountType}
      onUserUpdate={handleUserUpdate}
      handleRightSidebarToggle={handleRightSidebarToggle}
      setActiveModule={setActiveModule}
      setIsSkillsCategoryModalOpen={setIsSkillsCategoryModalOpen}
      setSelectedSkillsCategory={setSelectedSkillsCategory}
      setIsSkillDescriptionModalOpen={setIsSkillDescriptionModalOpen}
      setIsAddCustomCategoryModalOpen={setIsAddCustomCategoryModalOpen}
      setEditingCustomCategoryIndex={setEditingCustomCategoryIndex}
      setEditingStandardCategoryIndex={setEditingStandardCategoryIndex}
      standardCategories={standardCategories}
      customCategories={customCategories}
      setAccountType={setAccountType}
      setIsAccountTypeModalOpen={setIsAccountTypeModalOpen}
      setIsPersonalAccountModalOpen={setIsPersonalAccountModalOpen}
      removeStandardCategory={removeStandardCategory}
      removeCustomCategory={removeCustomCategory}
      selectedSkillsCategory={selectedSkillsCategory}
      isInSubcategories={isInSubcategories}
      setIsInSubcategories={setIsInSubcategories}
      onSkillsCategoryBackHandlerSet={(handler) => {
        skillsCategoryBackHandlerRef.current = handler;
      }}
    />
  );

  return (
    <>
      <DashboardLayout
        activeModule={activeModule}
        activeRightItem={activeRightItem}
        isRightSidebarOpen={isRightSidebarOpen}
        isMobileMenuOpen={isMobileMenuOpen}
        onModuleChange={handleModuleChange}
        onLogout={handleLogout}
        onRightSidebarClose={handleRightSidebarClose}
        onRightItemClick={handleRightItemClick}
        onMobileMenuOpen={() => setIsMobileMenuOpen(true)}
        onMobileMenuClose={() => setIsMobileMenuOpen(false)}
        onMobileBack={activeModule === 'skills-select-category' ? handleSkillsCategoryBack : handleMobileBack}
        onMobileProfileClick={handleMobileProfileClick}
        onSidebarLanguageClick={handleSidebarLanguageClick}
        onSidebarAccountTypeClick={handleSidebarAccountTypeClick}
        subcategory={activeModule === 'skills-describe' ? selectedSkillsCategory?.subcategory : null}
        onSkillSaveClick={activeModule === 'skills-describe' ? handleSkillSave : undefined}
      >
        {moduleContent}
      </DashboardLayout>

      <DashboardModals
        accountType={accountType}
        setAccountType={setAccountType}
        isAccountTypeModalOpen={isAccountTypeModalOpen}
        setIsAccountTypeModalOpen={setIsAccountTypeModalOpen}
        isPersonalAccountModalOpen={isPersonalAccountModalOpen}
        setIsPersonalAccountModalOpen={setIsPersonalAccountModalOpen}
        skillsState={{
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
        }}
        activeModule={activeModule}
        t={t}
      />
    </>
  );
}

