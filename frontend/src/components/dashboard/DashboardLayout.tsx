'use client';

import React, { useEffect, useRef } from 'react';
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
  onSidebarPrivacyClick?: () => void;
  isSearchOpen?: boolean;
  onSidebarSearchClick?: () => void;
  onSearchClose?: () => void;
  searchOverlay?: React.ReactNode;
  subcategory?: string | null;
  onSkillSaveClick?: () => void;
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
  onSidebarPrivacyClick,
  isSearchOpen,
  onSidebarSearchClick,
  onSearchClose,
  searchOverlay,
  subcategory,
  onSkillSaveClick,
  children,
}: DashboardLayoutProps) {
  const isProfileEditMode =
    isRightSidebarOpen && activeModule === 'profile' && activeRightItem === 'edit-profile';

  const isSkillsModule =
    activeModule === 'skills-offer' || activeModule === 'skills-search';

  const isMobileEditMode = isProfileEditMode;

  const activeSidebarItem = isSearchOpen ? 'search' : activeModule;
  const searchPanelRef = useRef<HTMLDivElement>(null);

  // Zatvor vyhľadávací panel pri kliknutí mimo neho alebo pri stlačení Esc
  useEffect(() => {
    if (!isSearchOpen || !onSearchClose) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Ak klikneme na vyhľadávací panel alebo jeho obsah, nič nerob
      if (searchPanelRef.current && searchPanelRef.current.contains(target)) {
        return;
      }

      // Ak klikneme na ľavú navigáciu (Sidebar), zatvor vyhľadávanie
      const leftSidebar = document.querySelector('[data-sidebar="left"]');
      if (leftSidebar && leftSidebar.contains(target)) {
        onSearchClose();
        return;
      }

      // Inak zatvor vyhľadávanie (kliknutie kdekoľvek inde)
      onSearchClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // Esc - zatvor search panel (len ak nie je otvorený filter modal)
      if (event.key === 'Escape') {
        const target = event.target as HTMLElement;
        const isInFilterModal = target.closest('[role="dialog"]') !== null || 
                                 document.body.classList.contains('filter-modal-open');
        
        // Ak nie sme v filter modale, zatvor search panel
        if (!isInFilterModal) {
          event.preventDefault();
          onSearchClose();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSearchOpen, onSearchClose]);

  const searchPanelWidthClasses = isRightSidebarOpen
    ? 'w-[240px] xl:w-[280px] 2xl:w-[384px]'
    : 'w-[280px] xl:w-[384px]';

  return (
    <div className="h-screen bg-[var(--background)] text-[var(--foreground)] overflow-hidden">
      {/* Mobile Top Bar - skryť pre search modul */}
      {activeModule !== 'search' && (
        <MobileTopBar
          onMenuClick={onMobileMenuOpen}
          isEditMode={isMobileEditMode}
          onBackClick={onMobileBack}
          onProfileClick={onMobileProfileClick}
          activeModule={activeModule}
          activeRightItem={activeRightItem}
          subcategory={subcategory}
          onSaveClick={onSkillSaveClick}
        />
      )}

      {/* Mobile Bottom Nav */}
      {!(isRightSidebarOpen && activeModule === 'profile') && activeModule !== 'skills-describe' && activeModule !== 'user-profile' && (
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
        onPrivacyClick={onSidebarPrivacyClick}
        onSearchClick={onSidebarSearchClick}
      />

      {/* Desktop Layout - CSS Grid */}
      <div className={`h-full grid grid-cols-1 ${
        isRightSidebarOpen 
          ? 'lg:grid-cols-[240px_1fr_240px] xl:grid-cols-[280px_1fr_280px] 2xl:grid-cols-[384px_1fr_384px]'
          : 'lg:grid-cols-[280px_1fr] xl:grid-cols-[384px_1fr]'
      }`}>
        {/* Left Sidebar - Desktop only */}
        <div className="hidden lg:block h-screen overflow-hidden" data-sidebar="left">
          <Sidebar
            activeItem={activeSidebarItem}
            onItemClick={onModuleChange}
            onLogout={onLogout}
            onSearchClick={onSidebarSearchClick}
          />
        </div>

        {/* Main Content */}
        <main className={`relative h-screen overflow-y-auto pb-24 lg:pt-0 lg:pb-0 elegant-scrollbar ${
          activeModule === 'search' ? 'pt-0' : 'pt-16'
        }`}>
          <div
            className={`py-4 lg:py-8 ${
              activeModule === 'search'
                ? 'px-0 sm:px-2 lg:px-8' // mobil: ešte menší padding, maximálne rozšírený obsah pre vyhľadávanie
                : activeModule === 'requests'
                  ? 'px-2 sm:px-4 lg:px-8' // mobil: menší padding pre žiadosti (viac šírky pre zoznam)
                  : 'px-4 sm:px-6 lg:px-8'
            }`}
          >
            <div
              className={`w-full mx-auto ${
                (activeModule === 'profile' && !isProfileEditMode) ||
                activeModule === 'user-profile' ||
                activeModule === 'requests' ||
                isSkillsModule
                  ? 'max-w-7xl'
                  : 'max-w-4xl'
              }`}
            >
              {children}
            </div>
          </div>

          {/* Desktop search panel overlay – vysunutý vedľa ľavej navigácie */}
          {isSearchOpen && searchOverlay && (
            <div className="hidden lg:block absolute inset-y-0 left-0 z-30 pointer-events-none">
              <div 
                ref={searchPanelRef}
                className={`h-full max-w-full pointer-events-auto bg-[var(--background)] border-r border-gray-800/60 shadow-2xl ${searchPanelWidthClasses}`}
              >
                {searchOverlay}
              </div>
            </div>
          )}
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

