'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, clearAuthTokens } from '../../utils/auth';
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
import MobileTopNav from './MobileTopNav';
import MobileTopBar from './MobileTopBar';

interface DashboardProps {
  initialUser?: User;
}

export default function Dashboard({ initialUser }: DashboardProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(initialUser || null);
  const [isLoading, setIsLoading] = useState(!initialUser);
  const [activeModule, setActiveModule] = useState(() => {
    if (typeof window !== 'undefined') {
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
    setIsRightSidebarOpen(!isRightSidebarOpen);
  };

  const handleRightItemClick = (itemId: string) => {
    setActiveRightItem(itemId);
  };

  const handleUserUpdate = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const renderModule = () => {
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
      case 'home':
      default:
        return (
          <div className="text-center py-20">
            <h2 className="text-2xl font-semibold text-gray-600 mb-4">
              Vitaj v Swaply!
            </h2>
            <p className="text-gray-500">
              Vyber si sekciu z navigácie pre pokračovanie.
            </p>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Načítavam dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          activeItem={activeModule}
          onItemClick={handleModuleChange}
          onLogout={handleLogout}
        />
      </div>

      {/* Mobile Top Bar */}
      <MobileTopBar 
        onMenuClick={() => setIsMobileMenuOpen(true)}
      />

      {/* Mobile Bottom Navigation */}
      <MobileTopNav 
        activeItem={activeModule}
        onItemClick={handleModuleChange}
      />

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
      <div className="flex-1 lg:ml-0 flex">
        {/* Content Area */}
        <main className="flex-1 p-6 pt-16 pb-24 lg:p-8 lg:pt-8">
          {renderModule()}
        </main>
        
        {/* Right Sidebar */}
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
