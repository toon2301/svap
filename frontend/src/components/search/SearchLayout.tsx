'use client';

import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/dashboard/Sidebar';
import SearchModule from '@/components/dashboard/modules/SearchModule';
import { RequestsNotificationsProvider } from '@/components/dashboard/contexts/RequestsNotificationsContext';

interface SearchLayoutProps {
  children: React.ReactNode;
}

export function SearchLayout({ children }: SearchLayoutProps) {
  const router = useRouter();
  const { logout: authLogout, user } = useAuth();
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(true);

  const handleItemClick = useCallback(
    (itemId: string) => {
      if (itemId === 'search') return;
      let url: string;
      if (itemId === 'home') url = '/dashboard';
      else if (itemId === 'favorites') url = '/dashboard/favorites';
      else if (itemId === 'requests') url = '/dashboard/requests';
      else if (itemId === 'profile') {
        const identifier = user?.slug || (user ? String(user.id) : '');
        url = identifier ? `/dashboard/users/${identifier}` : '/dashboard';
      } else if (itemId === 'settings') url = '/dashboard/settings';
      else return;
      router.push(url);
    },
    [router, user],
  );

  const handleSidebarSearchClick = useCallback(() => setIsSearchPanelOpen((prev) => !prev), []);

  const handleLogout = useCallback(() => {
    authLogout();
    router.push('/');
  }, [authLogout, router]);

  const handleViewUserProfile = useCallback(
    (userId: number, slug?: string | null, _summary?: unknown) => {
      const identifier = slug || String(userId);
      router.push(`/dashboard/users/${identifier}`);
    },
    [router],
  );

  const handleViewUserSkill = useCallback(
    (userId: number, skillId: number, slug?: string | null) => {
      const identifier = slug || String(userId);
      router.push(`/dashboard/users/${identifier}?highlight=${skillId}`);
    },
    [router],
  );

  const handleCloseSearchPanel = useCallback(() => setIsSearchPanelOpen(false), []);

  const gridColsClassName = isSearchPanelOpen
    ? 'lg:grid-cols-[280px_280px_1fr] xl:grid-cols-[384px_384px_1fr]'
    : 'lg:grid-cols-[280px_0px_1fr] xl:grid-cols-[384px_0px_1fr]';

  return (
    <RequestsNotificationsProvider>
      <div className="h-screen bg-[var(--background)] text-[var(--foreground)] overflow-hidden">
        <div className={`h-full grid grid-cols-1 ${gridColsClassName}`}>
          {/* Left Sidebar - Desktop only */}
          <div className="hidden lg:block h-screen overflow-hidden" data-sidebar="left">
            <Sidebar
              activeItem="search"
              onItemClick={handleItemClick}
              onLogout={handleLogout}
              onSearchClick={handleSidebarSearchClick}
            />
          </div>

          {/* Search panel - Desktop only */}
          <div
            className={[
              'hidden lg:flex h-screen flex-col overflow-hidden bg-[var(--background)] transition-opacity duration-200',
              isSearchPanelOpen ? 'opacity-100 pointer-events-auto border-r border-gray-200 dark:border-gray-800' : 'opacity-0 pointer-events-none border-r-0',
            ].join(' ')}
            aria-hidden={!isSearchPanelOpen}
          >
            {user ? (
              <SearchModule
                user={user}
                onUserClick={handleViewUserProfile}
                onSkillClick={handleViewUserSkill}
                isOverlay
                onClose={handleCloseSearchPanel}
              />
            ) : null}
          </div>

          {/* Main Content - rovnaká šírka ako profil */}
          <main className="relative h-screen overflow-y-auto elegant-scrollbar">
            <div className="py-4 lg:py-8 px-4 sm:px-6 lg:px-8">
              <div className="w-full mx-auto max-w-7xl">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </RequestsNotificationsProvider>
  );
}
