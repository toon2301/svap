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
  const isProfileEditMode =
    isRightSidebarOpen && activeModule === 'profile' && activeRightItem === 'edit-profile';

  const isSkillsModule =
    activeModule === 'skills-offer' || activeModule === 'skills-search';

  const isMobileEditMode = isProfileEditMode;

  return (
    <div className="h-screen bg-[var(--background)] text-[var(--foreground)] overflow-hidden">
      {/* Mobile Top Bar */}
      <MobileTopBar
        onMenuClick={onMobileMenuOpen}
        isEditMode={isMobileEditMode}
        onBackClick={onMobileBack}
        onProfileClick={onMobileProfileClick}
        activeModule={activeModule}
        activeRightItem={activeRightItem}
      />

      {/* Mobile Bottom Nav */}
      {!(isRightSidebarOpen && activeModule === 'profile') && (
        <MobileTopNav activeItem={activeModule} onItemClick={onModuleChange} />
      )}

      {/* Mobile Sidebar (overlay) */}
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

      {/* Desktop Layout - CSS Grid */}
      <div className={`h-full grid grid-cols-1 ${
        isRightSidebarOpen 
          ? 'lg:grid-cols-[240px_1fr_240px] xl:grid-cols-[280px_1fr_280px] 2xl:grid-cols-[384px_1fr_384px]'
          : 'lg:grid-cols-[280px_1fr] xl:grid-cols-[384px_1fr]'
      }`}>
        {/* Left Sidebar - Desktop only */}
        <div className="hidden lg:block h-screen overflow-hidden">
          <Sidebar activeItem={activeModule} onItemClick={onModuleChange} onLogout={onLogout} />
        </div>

        {/* Main Content */}
        <main className="h-screen overflow-y-auto pt-16 pb-24 lg:pt-0 lg:pb-0 elegant-scrollbar">
          <div className="px-4 sm:px-6 lg:px-8 py-4 lg:py-8">
            <div
              className={`w-full mx-auto ${
                activeModule === 'profile' && !isProfileEditMode 
                  ? 'max-w-7xl' 
                  : isSkillsModule 
                  ? 'max-w-7xl' 
                  : 'max-w-4xl'
              }`}
            >
              {children}
            </div>
          </div>
        </main>

        {/* Right Sidebar - Desktop only, shows in grid when open */}
        {isRightSidebarOpen && (
          <div className="hidden lg:block h-screen overflow-hidden">
            <RightSidebar
              isOpen={isRightSidebarOpen}
              onClose={onRightSidebarClose}
              activeItem={activeRightItem}
              onItemClick={onRightItemClick}
              isMobile={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}

