'use client';

import React from 'react';
import Sidebar from './Sidebar';
import RightSidebar from './RightSidebar';
import MobileTopNav from './MobileTopNav';
import MobileTopBar from './MobileTopBar';

interface DashboardLayoutProps {
  activeModule: string;
  activeRightItem: string;
  isRightSidebarOpen: boolean;
  isMobileMenuOpen: boolean;
  onModuleChange: (moduleId: string) => void;
  onLogout: () => void;
  onRightSidebarClose: () => void;
  onRightItemClick: (itemId: string) => void;
  onMobileMenuOpen: () => void;
  onMobileMenuClose: () => void;
  onMobileBack: () => void;
  onMobileProfileClick: () => void;
  onSidebarLanguageClick: () => void;
  onSidebarAccountTypeClick: () => void;
  children: React.ReactNode;
}

export default function DashboardLayout({
  activeModule,
  activeRightItem,
  isRightSidebarOpen,
  isMobileMenuOpen,
  onModuleChange,
  onLogout,
  onRightSidebarClose,
  onRightItemClick,
  onMobileMenuOpen,
  onMobileMenuClose,
  onMobileBack,
  onMobileProfileClick,
  onSidebarLanguageClick,
  onSidebarAccountTypeClick,
  children,
}: DashboardLayoutProps) {
  const isMobileEditMode = isRightSidebarOpen && activeModule === 'profile' && activeRightItem === 'edit-profile';

  return (
    <div className="h-screen bg-[var(--background)] text-[var(--foreground)] flex overflow-hidden">
      <div className="hidden lg:block fixed left-0 top-0 h-screen z-30">
        <Sidebar activeItem={activeModule} onItemClick={onModuleChange} onLogout={onLogout} />
      </div>

      <MobileTopBar
        onMenuClick={onMobileMenuOpen}
        isEditMode={isMobileEditMode}
        onBackClick={onMobileBack}
        onProfileClick={onMobileProfileClick}
        activeModule={activeModule}
        activeRightItem={activeRightItem}
      />

      {!(isRightSidebarOpen && activeModule === 'profile') && (
        <MobileTopNav activeItem={activeModule} onItemClick={onModuleChange} />
      )}

      <Sidebar
        activeItem={activeModule}
        onItemClick={onModuleChange}
        onLogout={onLogout}
        isMobile
        isOpen={isMobileMenuOpen}
        onClose={onMobileMenuClose}
        onLanguageClick={onSidebarLanguageClick}
        onAccountTypeClick={onSidebarAccountTypeClick}
      />

      <div className="flex-1 lg:ml-1 overflow-y-auto">
        <main className="p-6 pt-16 pb-24 lg:p-8 lg:pt-8">
          {/* Pre väčšinu modulov používame spoločný kontajner,
              profil má vlastný layout vo svojom module. */}
          {activeModule === 'profile' ? (
            children
          ) : (
            <div className="w-full max-w-full lg:max-w-6xl xl:max-w-7xl mx-auto px-2">{children}</div>
          )}
        </main>
      </div>

      <div className="hidden lg:block fixed right-0 top-0 h-screen z-30">
        <RightSidebar
          isOpen={isRightSidebarOpen}
          onClose={onRightSidebarClose}
          activeItem={activeRightItem}
          onItemClick={onRightItemClick}
          isMobile={false}
        />
      </div>
    </div>
  );
}

