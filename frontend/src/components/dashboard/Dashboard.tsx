'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, clearAuthTokens } from '../../utils/auth';
import { useLanguage } from '@/contexts/LanguageContext';
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
    setActiveModule(moduleId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeModule', moduleId);
    }
    // Zatvor pravú navigáciu keď sa zmení hlavná sekcia
    setIsRightSidebarOpen(false);
  };

  const handleRightSidebarToggle = () => {
    const willOpen = !isRightSidebarOpen;
    setIsRightSidebarOpen(willOpen);
    // Ak sa práve zatvára pravá navigácia (po uložen í), prepnime na profil
    if (!willOpen) {
      setActiveModule('profile');
      if (typeof window !== 'undefined') {
        localStorage.setItem('activeModule', 'profile');
      }
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
    // Pre edit-profile zostáva activeModule na 'profile' ale otvorí sa edit mód
  };

  const handleUserUpdate = (updatedUser: User) => {
    setUser(updatedUser);
    
    // Po uložení profilu zostaň v edit móde (najmä na mobile)
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
          isEditMode={true}
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

    switch (activeModule) {
      case 'profile':
        return (
          <ProfileModule 
            user={user!} 
            onUserUpdate={handleUserUpdate}
            onEditProfileClick={handleRightSidebarToggle}
            isEditMode={isRightSidebarOpen}
          />
        );
      case 'search':
        return <SearchModule />;
      case 'create':
        return <CreateModule />;
      case 'messages':
        return <MessagesModule />;
      case 'notifications':
        return <NotificationsModule />;
      case 'language':
        return <LanguageModule />;
      case 'home':
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
        isEditMode={isRightSidebarOpen && activeModule === 'profile'}
        onBackClick={() => setIsRightSidebarOpen(false)}
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
          onClose={() => setIsRightSidebarOpen(false)}
          activeItem={activeRightItem}
          onItemClick={handleRightItemClick}
          isMobile={false}
        />
      </div>
    </div>
  );
}
