'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import type { User } from '../../types';
import type { ProfileTab } from './modules/profile/profileTypes';
import type { SearchUserResult } from './modules/search/types';
import DashboardLayout from './DashboardLayout';
import ModuleRouter from './ModuleRouter';
import DashboardModals from './DashboardModals';
import SearchModule from './modules/SearchModule';
import { useDashboardState } from './hooks/useDashboardState';
import { useSkillsModals, type DashboardSkill } from './hooks/useSkillsModals';
import { api, endpoints } from '../../lib/api';
import {
  getUserIdBySlug,
  getUserProfileFromCache,
  setUserProfileToCache,
} from './modules/profile/profileUserCache';

interface DashboardProps {
  initialUser?: User;
  initialRoute?: string;
  initialViewedUserId?: number | null;
  initialHighlightedSkillId?: number | null;
  initialProfileTab?: ProfileTab;
  // Pri routovaní cez slug (napr. /dashboard/users/[slug])
  initialProfileSlug?: string | null;
  // Ak je nastavený, otvorí po načítaní príslušnú sekciu pravého sidebaru na vlastnom profile
  initialRightItem?: string | null;
}

export default function Dashboard({
  initialUser,
  initialRoute,
  initialViewedUserId,
  initialHighlightedSkillId,
  initialProfileTab,
  initialProfileSlug,
  initialRightItem,
}: DashboardProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const dashboardState = useDashboardState(initialUser);
  const skillsState = useSkillsModals();
  const [isInSubcategories, setIsInSubcategories] = useState(false);
  const skillsCategoryBackHandlerRef = React.useRef<(() => void) | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [viewedUserId, setViewedUserId] = useState<number | null>(null);
  const [viewedUserSlug, setViewedUserSlug] = useState<string | null>(null);
  const [highlightedSkillId, setHighlightedSkillId] = useState<number | null>(null);
  const [viewedUserSummary, setViewedUserSummary] = useState<SearchUserResult | null>(null);
  const highlightTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialRightItemAppliedRef = React.useRef(false);

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

  // Inicializácia podľa URL (routy dashboardu)
  useEffect(() => {
    if (!initialRoute) return;

    setActiveModule(initialRoute);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('activeModule', initialRoute);
      }
    } catch {
      // ignore storage errors
    }
  }, [initialRoute, setActiveModule]);

  // Inicializácia profilu podľa slug/ID z URL
  useEffect(() => {
    // Ak máme explicitné ID z props, nastav ho a skonči
    if (initialViewedUserId) {
      setViewedUserId(initialViewedUserId);
      if (initialHighlightedSkillId != null) {
        setHighlightedSkillId(initialHighlightedSkillId);
      }
      return;
    }

    if (!initialProfileSlug) return;

    setViewedUserSlug(initialProfileSlug);

    // 1) Skús mapovanie slug -> userId z cache
    const cachedId = getUserIdBySlug(initialProfileSlug);
    if (cachedId) {
      setViewedUserId(cachedId);
      const cachedUser = getUserProfileFromCache(cachedId);
      if (!cachedUser) {
        // profil sa pri ďalšej interakcii dotiahne cez existujúce fetchy
      }
      return;
    }

    // 2) Ak nemáme ID v cache, načítaj profil podľa slugu (vyžaduje slug endpoint na backende)
    let cancelled = false;

    const loadBySlug = async () => {
      try {
        const { data } = await api.get<User>(
          endpoints.dashboard.userProfileBySlug(initialProfileSlug),
        );
        if (cancelled) return;

        setViewedUserId(data.id);
        setUserProfileToCache(data.id, data);
      } catch {
        // chyby riešia downstream komponenty (napr. jemná hláška v UI)
      }
    };

    void loadBySlug();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProfileSlug]);

  useEffect(() => {
    if (!initialViewedUserId) return;

    setViewedUserId(initialViewedUserId);
    if (initialHighlightedSkillId != null) {
      setHighlightedSkillId(initialHighlightedSkillId);
    }
  }, [initialViewedUserId, initialHighlightedSkillId]);

  // Ak aktuálny route slug patrí prihlásenému používateľovi, zobraz jeho profil (ProfileModule)
  useEffect(() => {
    if (!user || !initialProfileSlug) return;
    if (user.slug && user.slug === initialProfileSlug) {
      setActiveModule('profile');
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('activeModule', 'profile');
        }
      } catch {
        // ignore
      }
    }
  }, [user, initialProfileSlug, setActiveModule]);

  // Aplikuj počiatočný stav pravého sidebaru pre vlastný profil na základe URL (edit, account, privacy, language)
  useEffect(() => {
    if (!user || !initialProfileSlug || !initialRightItem || initialRightItemAppliedRef.current) {
      return;
    }

    if (user.slug && user.slug === initialProfileSlug) {
      initialRightItemAppliedRef.current = true;

      if (initialRightItem === 'edit-profile') {
        // Zodpovedá handleRightSidebarToggle() pri zapnutí edit módu
        setActiveModule('profile');
        setIsRightSidebarOpen(true);
        setActiveRightItem('edit-profile');
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('activeModule', 'profile');
          }
        } catch {
          // ignore
        }
      } else if (initialRightItem === 'account-type') {
        // Zodpovedá handleSidebarAccountTypeClick()
        setActiveModule('profile');
        setIsRightSidebarOpen(true);
        setActiveRightItem('account-type');
      } else if (initialRightItem === 'privacy') {
        // Zodpovedá handleSidebarPrivacyClick()
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
          setActiveModule('privacy');
          setIsRightSidebarOpen(false);
          setActiveRightItem('');
          try {
            localStorage.setItem('activeModule', 'privacy');
          } catch {
            // ignore
          }
        } else {
          setActiveModule('profile');
          setIsRightSidebarOpen(true);
          setActiveRightItem('privacy');
        }
      } else if (initialRightItem === 'language') {
        // Zodpovedá handleSidebarLanguageClick()
        setActiveModule('profile');
        setIsRightSidebarOpen(true);
        setActiveRightItem('language');
      }
    }
  }, [user, initialProfileSlug, initialRightItem, setActiveModule, setIsRightSidebarOpen, setActiveRightItem]);

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

  // Pri odchode z modulu user-profile zruš zvýraznenie a timer
  useEffect(() => {
    if (activeModule !== 'user-profile') {
      setHighlightedSkillId(null);
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = null;
      }
    }
  }, [activeModule]);

  // Vyčistenie timeru pri unmount-e Dashboardu
  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  // Global klávesová skratka "/" pre otvorenie vyhľadávania na desktop verzii
  // Musí byť pred early return, aby sa hooks volali vždy v rovnakom poradí
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignoruj, ak používateľ píše do inputu, textarey alebo je v modale
      const target = event.target as HTMLElement;
      const isInputActive = 
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable ||
        target.closest('[role="dialog"]') !== null ||
        target.closest('[role="textbox"]') !== null ||
        document.body.classList.contains('filter-modal-open');

      // "/" - otvor vyhľadávanie (len na desktop verzii)
      if (event.key === '/' && !isInputActive) {
        // Skontroluj, či sme na desktop verzii (lg a vyššie)
        if (window.innerWidth >= 1024) {
          event.preventDefault();
          // Ak už nie je otvorené, otvor ho
          if (!isSearchOpen) {
            setIsSearchOpen(true);
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSearchOpen]);

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

  const handleSidebarPrivacyClick = () => {
    // V mobilnej verzii otvor nový screen, v desktop verzii pravý sidebar
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setActiveModule('privacy');
      setIsRightSidebarOpen(false);
      setActiveRightItem('');
      try {
        localStorage.setItem('activeModule', 'privacy');
      } catch {
        // ignore
      }
    } else {
      setActiveModule('profile');
      setIsRightSidebarOpen(true);
      setActiveRightItem('privacy');
    }
  };

  const handleSidebarSearchClick = () => {
    setIsSearchOpen((prev) => !prev);
  };

  const handleSearchClose = () => {
    setIsSearchOpen(false);
  };

  const handleViewUserProfileFromSearch = (
    userId: number,
    slug?: string | null,
    summary?: SearchUserResult,
  ) => {
    // Navigácia na profil používateľa bez špecifickej karty
    setViewedUserId(userId);
    setViewedUserSlug(slug ?? null);
    setViewedUserSummary(summary ?? null);
    setHighlightedSkillId(null);
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }
    setActiveModule('user-profile');
    setIsRightSidebarOpen(false);
    setActiveRightItem('');
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('activeModule', 'user-profile');
      }
    } catch {
      // ignore
    }
    // Aktualizuj URL tak, aby profil používateľa prežil refresh
    const identifier = slug || String(userId);
    router.push(`/dashboard/users/${identifier}`);
    setIsSearchOpen(false);
  };

  const handleViewUserSkillFromSearch = (
    userId: number,
    skillId: number,
    slug?: string | null,
  ) => {
    // Navigácia na profil používateľa s konkrétnou kartou na zvýraznenie
    setViewedUserId(userId);
    setViewedUserSlug(slug ?? null);
    setViewedUserSummary(null);
    setHighlightedSkillId(skillId);
    setActiveModule('user-profile');
    setIsRightSidebarOpen(false);
    setActiveRightItem('');
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('activeModule', 'user-profile');
      }
    } catch {
      // ignore
    }
    const identifier = slug || String(userId);
    // Zatiaľ používame rovnakú route, skillId sa môže preniesť v query/hash ak bude potrebné
    router.push(`/dashboard/users/${identifier}`);
    setIsSearchOpen(false);

    // Automatické zrušenie zvýraznenia po 2 minútach
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedSkillId(null);
      highlightTimeoutRef.current = null;
    }, 2 * 60 * 1000);
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

  const handleMainModuleChange = (moduleId: string) => {
    // Pri prepnutí hlavného modulu zatvor vyhľadávací panel
    setIsSearchOpen(false);

    // Synchronizuj URL s hlavnými sekciami dashboardu
    if (moduleId === 'search') {
      router.push('/dashboard/search');
    } else if (moduleId === 'settings') {
      router.push('/dashboard/settings');
    } else if (moduleId === 'notifications') {
      router.push('/dashboard/notifications');
    } else if (moduleId === 'language') {
      router.push('/dashboard/language');
    } else if (moduleId === 'profile') {
      const identifier = user.slug || String(user.id);
      router.push(`/dashboard/users/${identifier}`);
    } else if (moduleId === 'favorites') {
      router.push('/dashboard/favorites');
    } else if (moduleId === 'messages') {
      router.push('/dashboard/messages');
    } else if (
      moduleId === 'home' ||
      moduleId === 'create'
    ) {
      // Ostatné hlavné moduly ostávajú na /dashboard
      router.push('/dashboard');
    }

    handleModuleChange(moduleId);
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
      viewedUserId={viewedUserId}
      viewedUserSummary={viewedUserSummary}
      onViewUserProfile={handleViewUserProfileFromSearch}
      highlightedSkillId={highlightedSkillId}
      onViewUserSkillFromSearch={handleViewUserSkillFromSearch}
      initialProfileTab={initialProfileTab}
    />
  );

  return (
    <>
      <DashboardLayout
        activeModule={activeModule}
        activeRightItem={activeRightItem}
        isRightSidebarOpen={isRightSidebarOpen}
        isMobileMenuOpen={isMobileMenuOpen}
        onModuleChange={handleMainModuleChange}
        onLogout={handleLogout}
        onRightSidebarClose={handleRightSidebarClose}
        onRightItemClick={handleRightItemClick}
        onMobileMenuOpen={() => setIsMobileMenuOpen(true)}
        onMobileMenuClose={() => setIsMobileMenuOpen(false)}
        onMobileBack={activeModule === 'skills-select-category' ? handleSkillsCategoryBack : handleMobileBack}
        onMobileProfileClick={handleMobileProfileClick}
        onSidebarLanguageClick={handleSidebarLanguageClick}
        onSidebarAccountTypeClick={handleSidebarAccountTypeClick}
        onSidebarPrivacyClick={handleSidebarPrivacyClick}
        isSearchOpen={isSearchOpen}
        onSidebarSearchClick={handleSidebarSearchClick}
        onSearchClose={handleSearchClose}
        searchOverlay={
          user ? (
            <SearchModule
              user={user}
              onUserClick={handleViewUserProfileFromSearch}
              onSkillClick={handleViewUserSkillFromSearch}
              isOverlay
            />
          ) : null
        }
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

