'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { isAuthenticated, clearAuthTokens } from '@/utils/auth';
import { api, endpoints } from '@/lib/api';
import { User } from '@/types';

// Import modules
import Sidebar from './Sidebar';
import HomeModule from './modules/HomeModule';
import SearchModule from './modules/SearchModule';
import FavoritesModule from './modules/FavoritesModule';
import ProfileModule from './modules/ProfileModule';
import SettingsModule from './modules/SettingsModule';

// Import icons
import { Bars3Icon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

interface DashboardProps {
  initialUser?: User;
}

export default function Dashboard({ initialUser }: DashboardProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(initialUser || null);
  const [isLoading, setIsLoading] = useState(!initialUser);
  const [activeModule, setActiveModule] = useState('home');
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
  };

  const renderModule = () => {
    switch (activeModule) {
      case 'home':
        return <HomeModule user={user!} />;
      case 'search':
        return <SearchModule />;
      case 'favorites':
        return <FavoritesModule />;
      case 'profile':
        return <ProfileModule user={user!} />;
      case 'settings':
        return <SettingsModule user={user!} />;
      default:
        return <HomeModule user={user!} />;
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
        />
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Bars3Icon className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-purple-800">Swaply</h1>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowRightOnRectangleIcon className="w-6 h-6 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <Sidebar
        activeItem={activeModule}
        onItemClick={handleModuleChange}
        isMobile={true}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 lg:ml-0">
        {/* Desktop Header */}
        <div className="hidden lg:block bg-white border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-700">
                  Vitaj, {user.first_name}!
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleLogout}
                  className="flex items-center px-4 py-2 text-gray-700 hover:text-red-600 transition-colors"
                >
                  <ArrowRightOnRectangleIcon className="w-4 h-4 mr-2" />
                  Odhlásiť sa
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <main className="p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderModule()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
