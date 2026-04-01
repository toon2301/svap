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
  desktopRightRail?: React.ReactNode;
  subcategory?: string | null;
  onSkillSaveClick?: () => void;
  mobileAccountName?: string;
  mobileMessagePeerName?: string;
  mobileMessagePeerAvatarUrl?: string | null;
  isMobileMessageConversationOpen?: boolean;
  onMobileMessagesBack?: () => void;
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
  desktopRightRail,
  subcategory,
  onSkillSaveClick,
  mobileAccountName,
  mobileMessagePeerName,
  mobileMessagePeerAvatarUrl,
  isMobileMessageConversationOpen,
  onMobileMessagesBack,
  children,
}: DashboardLayoutProps) {
  const isProfileEditMode =
    isRightSidebarOpen && activeModule === 'profile' && activeRightItem === 'edit-profile';

  const isSkillsModule =
    activeModule === 'skills-offer' || activeModule === 'skills-search';

  const isMobileEditMode = isProfileEditMode;

  const activeSidebarItem = isSearchOpen ? 'search' : activeModule;
  const searchPanelRef = useRef<HTMLDivElement>(null);
  const hasAuxiliaryRightRail = !isRightSidebarOpen && Boolean(desktopRightRail);
  const hasDesktopRightColumn = isRightSidebarOpen || hasAuxiliaryRightRail;

  // Zatvor vyhľadávací panel pri kliknutí mimo neho alebo pri stlačení Esc
  useEffect(() => {
    if (!isSearchOpen || !onSearchClose) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // Otvorený filter modal (SearchModule) – nezatváraj panel pri kliknutí do overlay
      if (typeof document !== 'undefined' && document.body.classList.contains('filter-modal-open')) {
        return;
      }

      // Ak klikneme na vyhľadávací panel alebo jeho obsah, nič nerob
      if (searchPanelRef.current && searchPanelRef.current.contains(target)) {
        return;
      }

      // Ak klikneme na ľavú navigáciu (Sidebar), zatvor vyhľadávanie
      const leftSidebar = document.querySelector('[data-sidebar="left"]');
      if (leftSidebar && leftSidebar.contains(target)) {
        // Tlačidlo „Vyhľadávanie“ – necháme iba onClick (toggle), nie mousedown-close
        const el = target as HTMLElement;
        if (el.closest?.('[data-sidebar-nav-item="search"]')) {
          return;
        }
        onSearchClose();
        return;
      }

      // Klik na hlavný obsah (výsledky) alebo inde mimo panelu – zatvor panel
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

  // Desktop grid: search column always exists in DOM.
  // When closed, its width is 0px; to avoid visual shift of main content, we apply a matching left padding to <main>.
  const gridColsClassName = hasDesktopRightColumn
    ? isSearchOpen
      ? 'lg:grid-cols-[240px_240px_1fr_240px] xl:grid-cols-[280px_280px_1fr_280px] 2xl:grid-cols-[384px_384px_1fr_384px]'
      : 'lg:grid-cols-[240px_0px_1fr_240px] xl:grid-cols-[280px_0px_1fr_280px] 2xl:grid-cols-[384px_0px_1fr_384px]'
    : isSearchOpen
      ? 'lg:grid-cols-[280px_280px_1fr] xl:grid-cols-[384px_384px_1fr]'
      : 'lg:grid-cols-[280px_0px_1fr] xl:grid-cols-[384px_0px_1fr]';

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
          accountName={mobileAccountName}
          messagePeerName={mobileMessagePeerName}
          messagePeerAvatarUrl={mobileMessagePeerAvatarUrl}
          isMessageConversationOpen={isMobileMessageConversationOpen}
          onMessagesBackClick={onMobileMessagesBack}
        />
      )}

      {/* Mobile Bottom Nav */}
      {!(isRightSidebarOpen && activeModule === 'profile') &&
        activeModule !== 'skills-describe' &&
        activeModule !== 'user-profile' &&
        !(activeModule === 'messages' && isMobileMessageConversationOpen) && (
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
      <div
        className={`h-full grid grid-cols-1 ${gridColsClassName}`}
        data-search-open={isSearchOpen ? 'true' : 'false'}
        data-right-sidebar-open={isRightSidebarOpen ? 'true' : 'false'}
        data-profile-edit={isProfileEditMode ? 'true' : 'false'}
      >
        {/* Left Sidebar - Desktop only */}
        <div className="hidden lg:block h-screen overflow-hidden" data-sidebar="left">
          <Sidebar
            activeItem={activeSidebarItem}
            onItemClick={onModuleChange}
            onLogout={onLogout}
            onSearchClick={onSidebarSearchClick}
          />
        </div>

        {/* Desktop search panel – samostatný stĺpec v gride (vedľa ľavej navigácie) */}
        <div
          ref={searchPanelRef}
          className={[
            'hidden lg:flex h-screen flex-col overflow-hidden bg-[var(--background)]',
            // Keep in DOM; when closed, width is 0 via grid template columns.
            // Hide interaction + visuals without translate.
            isSearchOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
            // Only show separator/shadow when the column is visible
            isSearchOpen ? 'border-r border-gray-800/60 shadow-2xl' : 'border-r-0 shadow-none',
            'transition-opacity duration-200 ease-out',
          ].join(' ')}
          aria-hidden={!isSearchOpen}
        >
          {searchOverlay}
        </div>

        {/* Main Content - data attr pre scroll preservation */}
        <main
          data-dashboard-main
          className={`relative h-screen pb-24 lg:pt-0 lg:pb-0 elegant-scrollbar ${
            activeModule === 'messages'
              ? isMobileMessageConversationOpen
                ? 'overflow-hidden lg:overflow-hidden'
                : 'overflow-y-auto lg:overflow-hidden'
              : 'overflow-y-auto'
          } ${
          activeModule === 'search'
            ? 'pt-0'
            : activeModule === 'messages'
              ? 'pt-12 lg:pt-0' // mobil: h-12 = výška vrchnej lišty, bez extra medzery
            : activeModule === 'offer-reviews'
              ? 'pt-12 lg:pt-0' // mobil: h-12 = výška lišty, žiadna medzera; desktop bez pt
              : 'pt-16'
        }`}>
          <div
            className={`${
              activeModule === 'offer-reviews'
                ? 'pt-0 pb-4 lg:py-8' // recenzie: žiadna medzera medzi hornou lištou a tabmi
                : activeModule === 'messages'
                  ? 'pt-0 pb-2 lg:py-0' // správy: na mobile bez medzery pod vrchnou lištou
                  : 'py-4 lg:py-8'
            } ${
              activeModule === 'search'
                ? 'px-0 sm:px-2 lg:px-8' // mobil: ešte menší padding, maximálne rozšírený obsah pre vyhľadávanie
                : activeModule === 'messages'
                  ? 'px-0'
                : activeModule === 'requests'
                  ? 'px-2 sm:px-4 lg:px-8' // mobil: menší padding pre žiadosti (viac šírky pre zoznam)
                : activeModule === 'offer-reviews'
                  ? 'px-0' // žiadny padding pre recenzie (taby sú od kraja po kraj)
                  : 'px-4 sm:px-6 lg:px-8'
            } ${activeModule === 'messages' ? 'lg:h-full' : ''}`}
          >
            <div
              className={`w-full ${
                activeModule === 'offer-reviews'
                  ? '' // žiadne centrovanie pre recenzie
                  : 'mx-auto'
              } ${
                (activeModule === 'profile' && !isProfileEditMode) ||
                activeModule === 'user-profile' ||
                activeModule === 'requests' ||
                activeModule === 'messages' ||
                isSkillsModule
                  ? 'max-w-7xl'
                  : activeModule === 'offer-reviews'
                    ? '' // žiadne max-width pre recenzie
                    : 'max-w-4xl'
              } ${activeModule === 'messages' ? 'h-full min-h-0' : ''}`}
            >
              {children}
            </div>
          </div>
        </main>

        {/* Right rail - Desktop only, shows in grid when open */}
        {hasDesktopRightColumn && (
          <div className="svap-right-sidebar-col hidden lg:block h-screen overflow-hidden">
            {isRightSidebarOpen ? (
              <RightSidebar
                isOpen={isRightSidebarOpen}
                onClose={onRightSidebarClose}
                activeItem={activeRightItem}
                onItemClick={onRightItemClick}
                isMobile={false}
              />
            ) : (
              desktopRightRail
            )}
          </div>
        )}
      </div>
    </div>
  );
}
