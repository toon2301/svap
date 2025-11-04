'use client';

import { useState, useEffect } from 'react';
import { skillsCategories } from '@/constants/skillsCategories';
import { useRouter } from 'next/navigation';
import { isAuthenticated, clearAuthTokens } from '../../utils/auth';
import { useLanguage } from '@/contexts/LanguageContext';
import SkillsHome from './modules/skills/SkillsHome';
import SkillsScreen from './modules/skills/SkillsScreen';
import SkillsCategoryModal from './modules/skills/SkillsCategoryModal';
import SkillDescriptionModal from './modules/skills/SkillDescriptionModal';
import AddCustomCategoryModal from './modules/skills/AddCustomCategoryModal';
import { api, endpoints } from '../../lib/api';
import type { User } from '../../types';

// Import modules
import Sidebar from './Sidebar';
import RightSidebar from './RightSidebar';
import ProfileModule from './modules/ProfileModule';
import SearchModule from './modules/SearchModule';
import CreateModule from './modules/CreateModule';
import MessagesModule from './modules/MessagesModule';
import NotificationsModule from './modules/NotificationsModule';
import LanguageModule from './modules/LanguageModule';
import AccountTypeModule from './modules/AccountTypeModule';
import MobileTopNav from './MobileTopNav';
import MobileTopBar from './MobileTopBar';

interface DashboardProps {
  initialUser?: User;
}

export default function Dashboard({ initialUser }: DashboardProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [user, setUser] = useState<User | null>(initialUser || null);
  const [isLoading, setIsLoading] = useState(!initialUser);
  const [activeModule, setActiveModule] = useState(() => {
    if (typeof window !== 'undefined') {
      // Ak existuje forceHome flag, preferuj home
      if (sessionStorage.getItem('forceHome') === '1') return 'home';
      return localStorage.getItem('activeModule') || 'home';
    }
    return 'home';
  });
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [activeRightItem, setActiveRightItem] = useState('edit-profile');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [accountType, setAccountType] = useState<'personal' | 'business'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('accountType');
      return (saved === 'business' || saved === 'personal') ? (saved as 'business' | 'personal') : 'personal';
    }
    return 'personal';
  });
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') localStorage.setItem('accountType', accountType);
    } catch {}
  }, [accountType]);
  const [isAccountTypeModalOpen, setIsAccountTypeModalOpen] = useState(false);
  const [isPersonalAccountModalOpen, setIsPersonalAccountModalOpen] = useState(false);
  const [isSkillsCategoryModalOpen, setIsSkillsCategoryModalOpen] = useState(false);
  const [selectedSkillsCategory, setSelectedSkillsCategory] = useState<{ category: string; subcategory: string; description?: string; experience?: { value: number; unit: 'years' | 'months' } } | null>(null);
  const [customCategories, setCustomCategories] = useState<{ category: string; subcategory: string; description?: string; experience?: { value: number; unit: 'years' | 'months' } }[]>([]);
  const [isSkillDescriptionModalOpen, setIsSkillDescriptionModalOpen] = useState(false);
  const [isAddCustomCategoryModalOpen, setIsAddCustomCategoryModalOpen] = useState(false);
  const [editingCustomCategoryIndex, setEditingCustomCategoryIndex] = useState<number | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      if (!isAuthenticated()) {
        router.push('/');
        return;
      }

      // Vynúť HOME po čerstvom prihlásení (aj keď boli uložené predchádzajúce preferencie)
      if (typeof window !== 'undefined' && sessionStorage.getItem('forceHome') === '1') {
        // Nastav hneď, pred načítaním usera
        setActiveModule('home');
        setIsRightSidebarOpen(false);
        try {
          localStorage.setItem('activeModule', 'home');
          sessionStorage.removeItem('forceHome');
        } catch (e) {}
      }

      if (!initialUser) {
        try {
          const response = await api.get(endpoints.auth.me);
          setUser(response.data);
        } catch (error) {
          console.error('Error fetching user data:', error);
          clearAuthTokens();
          router.push('/');
        } finally {
          setIsLoading(false);
        }
      } else {
        // Ak máme initialUser, nastav loading na false
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, initialUser]);

  // Požiadavka: umožniť komponentom vyvolať presmerovanie na profil cez custom event
  useEffect(() => {
    const goToProfileHandler = () => {
      setActiveModule('profile');
      setIsRightSidebarOpen(false);
      setActiveRightItem('');
      if (typeof window !== 'undefined') {
        localStorage.setItem('activeModule', 'profile');
      }
    };

    window.addEventListener('goToProfile', goToProfileHandler as EventListener);
    return () => {
      window.removeEventListener('goToProfile', goToProfileHandler as EventListener);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await api.post(endpoints.auth.logout, {
        refresh: localStorage.getItem('refresh_token')
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuthTokens();
      router.push('/');
    }
  };

  const handleModuleChange = (moduleId: string) => {
    // Only allow valid modules that are still available (removed: home, search, favorites, profile, settings from hamburger)
    const validModules = ['home', 'profile', 'search', 'favorites', 'settings', 'create', 'messages', 'notifications', 'language'];
    if (validModules.includes(moduleId)) {
      setActiveModule(moduleId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('activeModule', moduleId);
      }
      // Zatvor pravú navigáciu keď sa zmení hlavná sekcia
      setIsRightSidebarOpen(false);
      setActiveRightItem('');
      // Zatvor mobilnú navigáciu pri zmene modulu
      setIsMobileMenuOpen(false);
    }
  };

  const handleRightSidebarToggle = () => {
    const willOpen = !isRightSidebarOpen;
    setIsRightSidebarOpen(willOpen);
    if (willOpen) {
      // Pri otvorení z profilu nastav kontext na edit-profile
      setActiveRightItem('edit-profile');
    } else {
      // Ak sa práve zatvára pravá navigácia (po uložení), prepnime na profil
      setActiveModule('profile');
      if (typeof window !== 'undefined') {
        localStorage.setItem('activeModule', 'profile');
      }
      setActiveRightItem('');
    }
  };

  const handleRightItemClick = (itemId: string) => {
    setActiveRightItem(itemId);
    
    // Pre upozornenia zmeň activeModule na 'notifications'
    if (itemId === 'notifications') {
      setActiveModule('notifications');
      if (typeof window !== 'undefined') {
        localStorage.setItem('activeModule', 'notifications');
      }
    }
    // Pre jazyk zmeň activeModule na 'language'
    if (itemId === 'language') {
      setActiveModule('language');
      if (typeof window !== 'undefined') {
        localStorage.setItem('activeModule', 'language');
      }
    }
    // Pre account-type zmeň activeModule na 'account-type'
    if (itemId === 'account-type') {
      setActiveModule('account-type');
      if (typeof window !== 'undefined') {
        localStorage.setItem('activeModule', 'account-type');
      }
    }
    // Pre edit-profile zostáva activeModule na 'profile' ale otvorí sa edit mód
  };

  const handleUserUpdate = (updatedUser: User) => {
    setUser(updatedUser);
    
    // Po uložení profilu zostaň v edit móde (ale bez automatického otvárania modalov)
    setActiveModule('profile');
    setIsRightSidebarOpen(true);
    setActiveRightItem('edit-profile');
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeModule', 'profile');
    }
  };

  const renderModule = () => {
    // Ak je otvorená pravá navigácia a je vybrané edit-profile, zobraz edit mód
    if (isRightSidebarOpen && activeRightItem === 'edit-profile') {
      return (
        <ProfileModule 
          user={user!} 
          onUserUpdate={handleUserUpdate}
          onEditProfileClick={handleRightSidebarToggle}
          onSkillsClick={() => {
            setActiveModule('skills');
            try { localStorage.setItem('activeModule', 'skills'); } catch {}
          }}
          isEditMode={true}
          accountType={accountType}
        />
      );
    }

    // Ak je otvorená pravá navigácia a je vybrané notifications, zobraz NotificationsModule
    if (isRightSidebarOpen && activeRightItem === 'notifications') {
      return <NotificationsModule />;
    }

    // Ak je otvorená pravá navigácia a je vybrané language, zobraz LanguageModule
    if (isRightSidebarOpen && activeRightItem === 'language') {
      return <LanguageModule />;
    }

    // Ak je otvorená pravá navigácia a je vybrané account-type, zobraz AccountTypeModule
    if (isRightSidebarOpen && activeRightItem === 'account-type') {
      return <AccountTypeModule 
        accountType={accountType}
        setAccountType={setAccountType}
        setIsAccountTypeModalOpen={setIsAccountTypeModalOpen}
        setIsPersonalAccountModalOpen={setIsPersonalAccountModalOpen}
      />;
    }

    switch (activeModule) {
      case 'home':
        return (
          <div className="text-center py-20">
            <h2 className="text-2xl font-semibold text-gray-600 mb-4">
              {t('dashboard.welcomeToSwaply', 'Vitaj v Swaply!')}
            </h2>
            <p className="text-gray-500">
              {t('dashboard.selectSection', 'Vyber si sekciu z navigácie pre pokračovanie.')}
            </p>
          </div>
        );
      case 'profile':
        return (
          <ProfileModule 
            user={user!} 
            onUserUpdate={handleUserUpdate}
            onEditProfileClick={handleRightSidebarToggle}
            onSkillsClick={() => {
              setActiveModule('skills');
              try { localStorage.setItem('activeModule', 'skills'); } catch {}
            }}
            isEditMode={isRightSidebarOpen}
            accountType={accountType}
          />
        );
      case 'search':
        return <SearchModule />;
      case 'favorites':
        return <div className="text-center py-20">
          <h2 className="text-2xl font-semibold text-gray-600 mb-4">
            {t('navigation.favorites', 'Obľúbené')}
          </h2>
          <p className="text-gray-500">
            {t('dashboard.selectSection', 'Vyber si sekciu z navigácie pre pokračovanie.')}
          </p>
        </div>;
      case 'settings':
        return <div className="text-center py-20">
          <h2 className="text-2xl font-semibold text-gray-600 mb-4">
            {t('navigation.settings', 'Nastavenia')}
          </h2>
          <p className="text-gray-500">
            {t('dashboard.selectSection', 'Vyber si sekciu z navigácie pre pokračovanie.')}
          </p>
        </div>;
      case 'create':
        return <CreateModule />;
      case 'messages':
        return <MessagesModule />;
      case 'notifications':
        return <NotificationsModule />;
      case 'language':
        return <LanguageModule />;
      case 'skills':
        return (
          <SkillsHome
            onOffer={() => {
              setActiveModule('skills-offer');
              try { localStorage.setItem('activeModule', 'skills-offer'); } catch {}
            }}
            onSearch={() => {
              setActiveModule('skills-search');
              try { localStorage.setItem('activeModule', 'skills-search'); } catch {}
            }}
          />
        );
      case 'account-type':
        return (
          <div className="text-[var(--foreground)]">
            {/* Desktop layout */}
            <div className="hidden lg:flex items-start justify-center">
              <div className="flex flex-col items-start w-full max-w-3xl mx-auto">
                <div className="w-full ml-8 lg:ml-12">
                  <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">
                    {t('rightSidebar.accountType', 'Typ účtu')}
                  </h2>
                  <p className="text-gray-800 dark:text-white text-lg font-semibold mb-4">
                    {t('accountType.selectAccountType', 'Zvoľ typ účtu')}
                  </p>
                </div>
                <div className="mt-6 w-full max-w-6xl mx-auto"><div className="border-t border-gray-200 dark:border-gray-700" /></div>
                {/* Obsah sekcie Typ účtu */}
                <div className="mt-8 w-full max-w-lg mx-auto">
                  <div className="space-y-4">
                    <button onClick={() => setAccountType('personal')} className={`w-full py-4 px-6 rounded-lg transition-colors ${
                      accountType === 'personal' 
                        ? 'border-2 border-black dark:border-white' 
                        : 'border-2 border-gray-300 dark:border-gray-700'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="text-left">
                          <div className="font-semibold text-lg mb-1 text-gray-800 dark:text-white">
                            {t('accountType.personal', 'Osobný účet')}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {t('accountType.personalDesc', 'Pre jednotlivcov a osobné použitie')}
                          </div>
                        </div>
                        {accountType === 'personal' && (
                          <svg className="w-5 h-5 text-gray-800 dark:text-white flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </button>
                    <button onClick={() => setIsAccountTypeModalOpen(true)} className={`w-full py-4 px-6 rounded-lg transition-colors ${
                      accountType === 'business' 
                        ? 'border-2 border-black dark:border-white' 
                        : 'border-2 border-gray-300 dark:border-gray-700'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="text-left">
                          <div className="font-semibold text-lg mb-1 text-gray-800 dark:text-white">
                            {t('accountType.business', 'Firemný účet')}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {t('accountType.businessDesc', 'Pre firmy a profesionálne použitie')}
                          </div>
                        </div>
                        {accountType === 'business' && (
                          <svg className="w-5 h-5 text-gray-800 dark:text-white flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            {/* Mobile layout */}
            <div className="block lg:hidden px-4 pt-2 pb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {t('rightSidebar.accountType', 'Typ účtu')}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                {t('accountType.selectAccountType', 'Zvoľ typ účtu')}
              </p>
              <div className="space-y-3">
                <button onClick={() => setAccountType('personal')} className={`w-full py-4 px-6 rounded-lg transition-colors ${
                  accountType === 'personal' 
                    ? 'border-2 border-black dark:border-white' 
                    : 'border-2 border-gray-300 dark:border-gray-700'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <div className="font-semibold text-base mb-1 text-gray-800 dark:text-white">
                        {t('accountType.personal', 'Osobný účet')}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {t('accountType.personalDesc', 'Pre jednotlivcov a osobné použitie')}
                      </div>
                    </div>
                    {accountType === 'personal' && (
                      <svg className="w-4 h-4 text-gray-800 dark:text-white flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
                <button onClick={() => setAccountType('business')} className={`w-full py-4 px-6 rounded-lg transition-colors ${
                  accountType === 'business' 
                    ? 'border-2 border-black dark:border-white' 
                    : 'border-2 border-gray-300 dark:border-gray-700'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <div className="font-semibold text-base mb-1 text-gray-800 dark:text-white">
                        {t('accountType.business', 'Firemný účet')}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {t('accountType.businessDesc', 'Pre firmy a profesionálne použitie')}
                      </div>
                    </div>
                    {accountType === 'business' && (
                      <svg className="w-4 h-4 text-gray-800 dark:text-white flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              </div>
            </div>
          </div>
        );
      case 'skills-offer':
        return (
          <SkillsScreen
            title="Vyber, v čom vynikáš."
            firstOptionText="Vyber kategóriu"
            onFirstOptionClick={() => {
              // Počet uložených kategórií (s description) + custom categories
              const savedCategories = (selectedSkillsCategory && selectedSkillsCategory.description ? 1 : 0) + customCategories.length;
              if (savedCategories >= 3) {
                alert('Môžeš pridať maximálne 3 kategórie');
                return;
              }
              setIsSkillsCategoryModalOpen(true);
            }}
            selectedCategory={selectedSkillsCategory}
            onRemoveCategory={() => setSelectedSkillsCategory(null)}
            onEditDescription={() => {
              if (selectedSkillsCategory) {
                setIsSkillDescriptionModalOpen(true);
              }
            }}
            onAddCategory={() => {
              // Počet uložených kategórií (s description) + custom categories
              const savedCategories = (selectedSkillsCategory && selectedSkillsCategory.description ? 1 : 0) + customCategories.length;
              if (savedCategories >= 3) {
                alert('Môžeš pridať maximálne 3 kategórie');
                return;
              }
              setIsAddCustomCategoryModalOpen(true);
            }}
            customCategories={customCategories}
            onRemoveCustomCategory={(index) => {
              setCustomCategories((prev) => prev.filter((_, i) => i !== index));
            }}
            onEditCustomCategoryDescription={(index) => {
              setEditingCustomCategoryIndex(index);
              setSelectedSkillsCategory(customCategories[index]);
              setIsSkillDescriptionModalOpen(true);
            }}
          />
        );
      case 'skills-search':
        return <SkillsScreen title="Hľadám" />;
      default:
        return (
          <div className="text-center py-20">
            <h2 className="text-2xl font-semibold text-gray-600 mb-4">
              {t('dashboard.welcomeToSwaply', 'Vitaj v Swaply!')}
            </h2>
            <p className="text-gray-500">
              {t('dashboard.selectSection', 'Vyber si sekciu z navigácie pre pokračovanie.')}
            </p>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">{t('dashboard.loadingDashboard', 'Načítavam dashboard...')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen bg-[var(--background)] text-[var(--foreground)] flex overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 h-screen z-30">
        <Sidebar
          activeItem={activeModule}
          onItemClick={handleModuleChange}
          onLogout={handleLogout}
        />
      </div>

      {/* Mobile Top Bar */}
      <MobileTopBar 
        onMenuClick={() => setIsMobileMenuOpen(true)}
        isEditMode={isRightSidebarOpen && activeModule === 'profile' && activeRightItem === 'edit-profile'}
        onBackClick={() => {
          if (activeRightItem === 'language') {
            // Z jazyka sa vraciame do mobilnej navigácie (hamburger)
            setIsMobileMenuOpen(true);
          } else if (activeRightItem === 'account-type') {
            // Z typu účtu sa vraciame do mobilnej navigácie (hamburger)
            setIsMobileMenuOpen(true);
          } else if (activeModule === 'notifications') {
            // Z upozornení sa vraciame do mobilnej navigácie (hamburger)
            setActiveModule('');
            setIsMobileMenuOpen(true);
          }
          setIsRightSidebarOpen(false);
          setActiveRightItem('');
        }}
        onProfileClick={() => {
          setActiveModule('profile');
          setIsRightSidebarOpen(false);
        }}
        activeModule={activeModule}
        activeRightItem={activeRightItem}
      />

      {/* Mobile Bottom Navigation - skryť v edit móde */}
      {!(isRightSidebarOpen && activeModule === 'profile') && (
        <MobileTopNav 
          activeItem={activeModule}
          onItemClick={handleModuleChange}
        />
      )}

      {/* Mobile Sidebar */}
      <Sidebar
        activeItem={activeModule}
        onItemClick={handleModuleChange}
        onLogout={handleLogout}
        isMobile={true}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onLanguageClick={() => {
          setActiveModule('profile');
          setIsRightSidebarOpen(true);
          setActiveRightItem('language');
        }}
        onAccountTypeClick={() => {
          setActiveModule('profile');
          setIsRightSidebarOpen(true);
          setActiveRightItem('account-type');
        }}
      />

      {/* Main Content */}
      <div className="flex-1 lg:ml-1 overflow-y-auto">
        {/* Content Area */}
        <main className="p-6 pt-16 pb-24 lg:p-8 lg:pt-8">
          {renderModule()}
        </main>
      </div>
      
      {/* Right Sidebar - Fixed (Desktop only) */}
      <div className="hidden lg:block fixed right-0 top-0 h-screen z-30">
        <RightSidebar
          isOpen={isRightSidebarOpen}
          onClose={() => {
            setIsRightSidebarOpen(false);
            setActiveRightItem('');
          }}
          activeItem={activeRightItem}
          onItemClick={handleRightItemClick}
          isMobile={false}
        />
      </div>

      {/* Account Type Modal */}
      {isAccountTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={() => setIsAccountTypeModalOpen(false)}>
          <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="rounded-2xl bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] shadow-xl overflow-hidden">
              {/* Header */}
              <div className="px-6 pt-6 pb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {t('accountType.modalTitle', 'Prajete si prepnúť účet?')}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Firemný účet je ideálny pre podnikateľov, spoločnosti a umelecké školy na prezentáciu aktivít, propagáciu služieb a komunikáciu s klientmi alebo študentmi.
                </p>
              </div>
              
              {/* Buttons */}
              <div className="px-6 space-y-3 pb-6">
                <button
                  onClick={() => {
                    setAccountType('business');
                    setIsAccountTypeModalOpen(false);
                  }}
                  className="w-full py-3 text-base rounded-lg bg-[var(--muted)] text-purple-600 dark:text-purple-400 hover:bg-gray-200 dark:hover:bg-[#141414] font-semibold"
                >
                  {t('accountType.change', 'Zmeniť')}
                </button>
                <button
                  onClick={() => setIsAccountTypeModalOpen(false)}
                  className="w-full py-3 text-base rounded-lg bg-[var(--muted)] text-[var(--foreground)] hover:bg-gray-200 dark:hover:bg-[#141414]"
                >
                  {t('accountType.cancel', 'Zrušiť')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Personal Account Modal */}
      {isPersonalAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={() => setIsPersonalAccountModalOpen(false)}>
          <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="rounded-2xl bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] shadow-xl overflow-hidden">
              {/* Header */}
              <div className="px-6 pt-6 pb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {t('accountType.modalTitle', 'Prajete si prepnúť účet?')}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Osobný účet je určený pre bežných používateľov, ktorí nepodnikajú. Prepnutím z firemného účtu prídete o jeho rozšírené možnosti.
                </p>
              </div>
              
              {/* Buttons */}
              <div className="px-6 space-y-3 pb-6">
                <button
                  onClick={() => {
                    setAccountType('personal');
                    setIsPersonalAccountModalOpen(false);
                  }}
                  className="w-full py-3 text-base rounded-lg bg-[var(--muted)] text-purple-600 dark:text-purple-400 hover:bg-gray-200 dark:hover:bg-[#141414] font-semibold"
                >
                  {t('accountType.change', 'Zmeniť')}
                </button>
                <button
                  onClick={() => setIsPersonalAccountModalOpen(false)}
                  className="w-full py-3 text-base rounded-lg bg-[var(--muted)] text-[var(--foreground)] hover:bg-gray-200 dark:hover:bg-[#141414]"
                >
                  {t('accountType.cancel', 'Zrušiť')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Skills Category Modal */}
      <SkillsCategoryModal
        isOpen={isSkillsCategoryModalOpen}
        onClose={() => setIsSkillsCategoryModalOpen(false)}
        categories={skillsCategories}
        selected={selectedSkillsCategory?.subcategory || null}
        onSelect={(category, subcategory) => {
          // Najprv zatvor modal kategórií
          setIsSkillsCategoryModalOpen(false);
          // Nastav dočasne vybranú kategóriu a otvor modal pre popis
          setSelectedSkillsCategory({ category, subcategory });
          setIsSkillDescriptionModalOpen(true);
        }}
      />

      {/* Skill Description Modal */}
      {selectedSkillsCategory && (
        <SkillDescriptionModal
          isOpen={isSkillDescriptionModalOpen}
          onClose={() => {
            setIsSkillDescriptionModalOpen(false);
            // Ak ešte nemá description, resetovať kategóriu (zatvorené bez uloženia)
            if (!selectedSkillsCategory.description) {
              setSelectedSkillsCategory(null);
              setEditingCustomCategoryIndex(null);
            }
          }}
          category={selectedSkillsCategory.category}
          subcategory={selectedSkillsCategory.subcategory}
          initialDescription={selectedSkillsCategory.description}
          initialExperience={selectedSkillsCategory.experience}
          onSave={(description, experience) => {
            // TODO: Uložiť zručnosť do backendu
            if (editingCustomCategoryIndex !== null) {
              // Aktualizovať existujúcu vlastnú kategóriu (nie je to nová kategória, takže nepotrebujeme kontrolu)
              setCustomCategories((prev) => {
                const updated = [...prev];
                updated[editingCustomCategoryIndex] = {
                  ...updated[editingCustomCategoryIndex],
                  description,
                  experience
                };
                return updated;
              });
              setEditingCustomCategoryIndex(null);
              setSelectedSkillsCategory(null);
            } else if (selectedSkillsCategory) {
              // Skontrolovať, či je to vlastná kategóriu (category === subcategory)
              if (selectedSkillsCategory.category === selectedSkillsCategory.subcategory) {
                // Skontrolovať limit pred pridaním novej vlastnej kategórie
                const savedCategories = (selectedSkillsCategory && selectedSkillsCategory.description ? 1 : 0) + customCategories.length;
                if (savedCategories >= 3) {
                  alert('Môžeš pridať maximálne 3 kategórie');
                  return;
                }
                // Pridať novú vlastnú kategóriu do zoznamu
                setCustomCategories((prev) => [
                  ...prev,
                  {
                    category: selectedSkillsCategory.category,
                    subcategory: selectedSkillsCategory.subcategory,
                    description,
                    experience
                  }
                ]);
                setSelectedSkillsCategory(null); // Resetovať len pre vlastnú kategóriu
              } else {
                // Skontrolovať limit pred uložením kategórie vybratej cez "Vyber kategóriu"
                // Ak už má description, len aktualizujeme, nie pridávame novú kategóriu
                // Ak nemá description, pridáva sa nová kategória
                if (!selectedSkillsCategory.description) {
                  // Pridáva sa nová kategória, skontrolovať limit
                  const savedCategories = customCategories.length;
                  if (savedCategories >= 3) {
                    alert('Môžeš pridať maximálne 3 kategórie');
                    return;
                  }
                }
                // Uložiť do selectedSkillsCategory (kategória vybratá cez "Vyber kategóriu")
                setSelectedSkillsCategory((prev) => {
                  if (!prev) return null;
                  return {
                    ...prev,
                    description,
                    experience
                  };
                });
              }
            }
            setIsSkillDescriptionModalOpen(false);
          }}
        />
      )}

      {/* Add Custom Category Modal */}
      <AddCustomCategoryModal
        isOpen={isAddCustomCategoryModalOpen}
        onClose={() => setIsAddCustomCategoryModalOpen(false)}
        onSave={(categoryName) => {
          // Nastavíme dočasnú kategóriu pre modal popisu
          setSelectedSkillsCategory({ 
            category: categoryName, 
            subcategory: categoryName 
          });
          setEditingCustomCategoryIndex(null); // Nová kategória
          setIsAddCustomCategoryModalOpen(false);
          setIsSkillDescriptionModalOpen(true);
        }}
      />
    </div>
  );
}
