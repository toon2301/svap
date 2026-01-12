'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User } from '../../../../types';
import { useLanguage } from '@/contexts/LanguageContext';
import UserAvatar from './UserAvatar';
import UserInfo from './UserInfo';
import WebsitesRow from './view/WebsitesRow';
import ProfileEditFormDesktop from '../ProfileEditFormDesktop';
import ProfileOffersSection from './ProfileOffersSection';
import type { ProfileTab } from './profileTypes';

interface ProfileDesktopViewProps {
  user: User;
  displayUser: User;
  isEditMode: boolean;
  accountType?: 'personal' | 'business';
  isUploading: boolean;
  onUserUpdate?: (updatedUser: User) => void;
  onEditProfileClick?: () => void;
  onPhotoUpload: (file: File) => void;
  onAvatarClick: () => void;
  onSkillsClick?: () => void;
  activeTab: ProfileTab;
  onChangeTab: (tab: ProfileTab) => void;
  onTabsKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onOpenAllWebsitesModal: () => void;
  offersOwnerId?: number;
  isOtherUserProfile?: boolean;
  onSendMessage?: () => void;
  onAddToFavorites?: () => void;
  highlightedSkillId?: number | null;
}

export default function ProfileDesktopView({
  user,
  displayUser,
  isEditMode,
  accountType = 'personal',
  isUploading,
  onUserUpdate,
  onEditProfileClick,
  onPhotoUpload,
  onAvatarClick,
  onSkillsClick,
  activeTab,
  onChangeTab,
  onTabsKeyDown,
  onOpenAllWebsitesModal,
  offersOwnerId,
  isOtherUserProfile = false,
  onSendMessage,
  onAddToFavorites,
  highlightedSkillId,
}: ProfileDesktopViewProps) {
  const { t } = useLanguage();
  const [isHamburgerModalOpen, setIsHamburgerModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Debug logy pre diagnostiku
  useEffect(() => {
    if (isOtherUserProfile) {
      console.log('🔍 ProfileDesktopView DEBUG (cudzí profil):', {
        'displayUser.user_type': displayUser.user_type,
        'accountType prop': accountType,
        'isOtherUserProfile': isOtherUserProfile,
        'displayUser.ico': displayUser.ico,
        'displayUser.contact_email': displayUser.contact_email,
        'displayUser.job_title': displayUser.job_title,
        'Očakávaný typ (company=business)': displayUser.user_type === 'company' ? 'business' : 'personal',
      });
    }
  }, [isOtherUserProfile, displayUser.user_type, accountType, displayUser.ico, displayUser.contact_email, displayUser.job_title]);

  return (
    <div className="hidden lg:block w-full">
      <div className="flex flex-col items-stretch w-full gap-[clamp(1rem,2vw,1.5rem)]">
        {/* Pôvodný desktop obsah */}
        <div className="w-full">
          {isEditMode ? (
            // Edit mode - show ProfileEditFormDesktop
            <ProfileEditFormDesktop
              user={user}
              onUserUpdate={onUserUpdate}
              onEditProfileClick={onEditProfileClick}
              onPhotoUpload={onPhotoUpload}
              isUploadingFromParent={isUploading}
              onAvatarClick={onAvatarClick}
              accountType={accountType}
            />
          ) : (
            // Normal profile view
            <>
              <div className="flex flex-col gap-[clamp(1rem,2vw,1.5rem)] mb-[clamp(1rem,2vw,1.5rem)]">
                <div className="flex flex-col items-start w-full">
                  <div 
                    className="flex gap-[clamp(1rem,2vw,2rem)] items-start lg:items-center w-full"
                  >
                    <div className="flex-shrink-0">
                      <UserAvatar
                        user={displayUser}
                        size="large"
                        onPhotoUpload={onPhotoUpload}
                        isUploading={isUploading}
                        onAvatarClick={onAvatarClick}
                      />
                    </div>
                    <div className="flex flex-col flex-grow min-w-0">
                      {/* Meno používateľa a sociálne siete v jednom riadku (len v cudzom profile) */}
                      {isOtherUserProfile ? (
                        <div className="flex items-center gap-20 mb-2">
                          <h2 className="text-[clamp(1.25rem,2vw,1.75rem)] font-semibold text-gray-900 dark:text-white">
                            {[displayUser.first_name, displayUser.last_name].filter(Boolean).join(' ').trim() || displayUser.username}
                          </h2>
                          {/* Sociálne siete - hneď vedľa mena */}
                          {(() => {
                            const hasSocialMedia = displayUser.instagram || displayUser.facebook || displayUser.linkedin || displayUser.youtube || displayUser.whatsapp;
                            if (!hasSocialMedia) return null;

                            // Pre WhatsApp, ak nie je URL, vytvoríme wa.me link
                            const getWhatsAppUrl = (whatsapp: string | undefined) => {
                              if (!whatsapp) return null;
                              if (whatsapp.startsWith('http')) return whatsapp;
                              const cleaned = whatsapp.replace(/[^\d+]/g, '');
                              return cleaned ? `https://wa.me/${cleaned}` : null;
                            };

                            return (
                              <div className="flex items-center gap-2">
                                {displayUser.instagram && (
                                  <a
                                    href={displayUser.instagram}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    aria-label="Instagram"
                                  >
                                    <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                    </svg>
                                  </a>
                                )}
                                {displayUser.facebook && (
                                  <a
                                    href={displayUser.facebook}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    aria-label="Facebook"
                                  >
                                    <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                    </svg>
                                  </a>
                                )}
                                {displayUser.linkedin && (
                                  <a
                                    href={displayUser.linkedin}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    aria-label="LinkedIn"
                                  >
                                    <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                    </svg>
                                  </a>
                                )}
                                {displayUser.youtube && (
                                  <a
                                    href={displayUser.youtube}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    aria-label="YouTube"
                                  >
                                    <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                    </svg>
                                  </a>
                                )}
                                {displayUser.whatsapp && (() => {
                                  const whatsappUrl = getWhatsAppUrl(displayUser.whatsapp);
                                  if (!whatsappUrl) return null;
                                  return (
                                    <a
                                      href={whatsappUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                      aria-label="WhatsApp"
                                    >
                                      <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                      </svg>
                                    </a>
                                  );
                                })()}
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <h2 className="text-[clamp(1.25rem,2vw,1.75rem)] font-semibold text-gray-900 dark:text-white mb-2">
                          {[displayUser.first_name, displayUser.last_name].filter(Boolean).join(' ').trim() || displayUser.username}
                        </h2>
                      )}
                      {/* Email intentionally not shown here (kept in edit views) */}
                      {/* Lokalita - zobrazí mesto/dedinu ak je, inak okres ak je */}
                      {(displayUser.location || displayUser.district) && (
                        <p className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="size-4 text-gray-500 dark:text-gray-400"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                            />
                          </svg>
                          {displayUser.location || displayUser.district}
                        </p>
                      )}
                      {/* IČO - iba pre firemné účty */}
                      {accountType === 'business' && displayUser.ico && (!isOtherUserProfile || !displayUser.ico_visible) && (
                        <p className="text-gray-600 dark:text-gray-300 text-sm">IČO: {displayUser.ico}</p>
                      )}
                      {/* Telefónne číslo */}
                      {displayUser.phone && (!isOtherUserProfile || !displayUser.phone_visible) && (
                        <p className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="size-4 text-gray-500 dark:text-gray-400"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
                            />
                          </svg>
                          {displayUser.phone}
                        </p>
                      )}
                      {/* Kontaktný Email - len pre firemný účet */}
                      {accountType === 'business' && displayUser.contact_email && (
                        <p className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="size-4 text-gray-500 dark:text-gray-400"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                            />
                          </svg>
                          {displayUser.contact_email}
                        </p>
                      )}

                      {/* Profesia - len pre osobný účet */}
                      {accountType === 'personal' && displayUser.job_title && (!isOtherUserProfile || !displayUser.job_title_visible) && (
                        <p className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="size-4 text-gray-500 dark:text-gray-400"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z"
                            />
                          </svg>
                          {displayUser.job_title}
                        </p>
                      )}
                      {/* Webová stránka + "a ďalší" (desktop) */}
                      <WebsitesRow user={displayUser} onOpenAll={onOpenAllWebsitesModal} />
                    </div>
                  </div>
                  {/* BIO - pod sociálnymi sieťami, nad tlačidlami */}
                  {displayUser.bio && displayUser.bio.trim() && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                        {displayUser.bio}
                      </p>
                    </div>
                  )}
                  {/* Tlačidlá pod fotkou */}
                  <div className="flex gap-[clamp(0.5rem,1vw,0.5rem)] mt-[clamp(0.75rem,1.5vw,0.75rem)]">
                    <button
                      onClick={() => {
                        if (isOtherUserProfile && onSendMessage) {
                          onSendMessage();
                        } else if (onEditProfileClick) {
                          onEditProfileClick();
                        } else {
                          // eslint-disable-next-line no-console
                          console.log(isOtherUserProfile ? 'Poslať správu' : 'Upraviť profil');
                        }
                      }}
                      className="flex-1 px-[clamp(4rem,8vw,8rem)] xl:px-16 2xl:px-32 py-2 text-sm bg-purple-100 text-purple-800 border border-purple-200 rounded-2xl transition-colors hover:bg-purple-200 whitespace-nowrap min-w-[200px]"
                    >
                      {isOtherUserProfile
                        ? t('profile.sendMessage', 'Poslať správu')
                        : t('profile.editProfile')}
                    </button>
                    {isOtherUserProfile ? (
                      <>
                        <button
                          onClick={() => {
                            if (onAddToFavorites) {
                              onAddToFavorites();
                            }
                          }}
                          className="flex-1 px-[clamp(4rem,8vw,8rem)] xl:px-16 2xl:px-32 py-2 text-sm bg-purple-100 text-purple-800 border border-purple-200 rounded-2xl transition-colors hover:bg-purple-200 whitespace-nowrap min-w-[200px]"
                        >
                          {t('profile.addToFavorites', '+ Pridať k obľúbeným')}
                        </button>
                        <button
                          onClick={() => setIsHamburgerModalOpen(true)}
                          className="px-3 py-2 bg-purple-100 text-purple-800 border border-purple-200 rounded-2xl transition-colors hover:bg-purple-200 flex items-center justify-center"
                          aria-label="Menu"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 6h16M4 12h16M4 18h16"
                            />
                          </svg>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          // Desktop: prepnúť na prázdny screen Zručnosti
                          if (typeof onSkillsClick === 'function') {
                            onSkillsClick();
                          } else {
                            // eslint-disable-next-line no-console
                            console.log('Zručnosti');
                          }
                        }}
                        className="flex-1 px-[clamp(4rem,8vw,8rem)] xl:px-16 2xl:px-32 py-2 text-sm bg-purple-100 text-purple-800 border border-purple-200 rounded-2xl transition-colors hover:bg-purple-200 whitespace-nowrap min-w-[200px]"
                      >
                        {t('profile.skills', 'Ponúkam/Hľadám')}
                      </button>
                    )}
                  </div>
                </div>
                {/* Ikonová navigácia sekcií profilu */}
                <div 
                  className="mt-[clamp(0.75rem,2vw,1.5rem)] w-full lg:pb-[clamp(0.5rem,1.5vw,1rem)]"
                >
                  <div
                    role="tablist"
                    aria-label="Sekcie profilu"
                    className="w-full"
                    tabIndex={0}
                    onKeyDown={onTabsKeyDown}
                  >
                    <div className="flex w-full items-stretch rounded-2xl border-b border-gray-200 bg-white/60 dark:bg-[#0f0f10] dark:border-gray-800 shadow-sm overflow-hidden">
                      {/* Tab: Ponúkam/Hľadám */}
                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'offers'}
                        onClick={() => onChangeTab('offers')}
                        aria-label="Ponúkam / Hľadám"
                        title="Ponúkam / Hľadám"
                        className={[
                          'relative group flex-1 py-[clamp(0.5rem,1vw,0.75rem)] transition-all flex items-center justify-center min-w-[clamp(60px,8vw,72px)]',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60',
                          activeTab === 'offers'
                            ? 'bg-gradient-to-t from-purple-100 to-transparent text-purple-700 dark:from-purple-100 dark:to-purple-100/40 dark:text-purple-800'
                            : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#111214]',
                        ].join(' ')}
                      >
                        {/* Icon: handshake */}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          className="w-[clamp(1rem,1.5vw,1.25rem)] h-[clamp(1rem,1.5vw,1.25rem)]"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m7.875 14.25 1.214 1.942a2.25 2.25 0 0 0 1.908 1.058h2.006c.776 0 1.497-.4 1.908-1.058l1.214-1.942M2.41 9h4.636a2.25 2.25 0 0 1 1.872 1.002l.164.246a2.25 2.25 0 0 0 1.872 1.002h2.092a2.25 2.25 0 0 0 1.872-1.002l.164-.246A2.25 2.25 0 0 1 16.954 9h4.636M2.41 9a2.25 2.25 0 0 0-.16.832V12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 12V9.832c0-.287-.055-.57-.16-.832M2.41 9a2.25 2.25 0 0 1 .382-.632l3.285-3.832a2.25 2.25 0 0 1 1.708-.786h8.43c.657 0 1.281.287 1.709.786l3.284 3.832c.163.19.291.404.382.632M4.5 20.25h15A2.25 2.25 0 0 0 21.75 18v-2.625c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125V18a2.25 2.25 0 0 0 2.25 2.25Z"
                          />
                        </svg>
                        {/* Tooltip */}
                        <div className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                          Ponúkam / Hľadám
                        </div>
                      </button>

                      {/* Tab: Portfólio */}
                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'portfolio'}
                        onClick={() => onChangeTab('portfolio')}
                        aria-label="Portfólio"
                        title="Portfólio"
                        className={[
                          'relative group flex-1 py-[clamp(0.5rem,1vw,0.75rem)] transition-all flex items-center justify-center min-w-[clamp(60px,8vw,72px)]',
                          'border-l border-gray-200 dark:border-gray-800',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60',
                          activeTab === 'portfolio'
                            ? 'bg-gradient-to-t from-purple-100 to-transparent text-purple-700 dark:from-purple-100 dark:to-purple-100/40 dark:text-purple-800'
                            : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#111214]',
                        ].join(' ')}
                      >
                        {/* Icon: briefcase */}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          className="w-[clamp(1.125rem,1.8vw,1.5rem)] h-[clamp(1.125rem,1.8vw,1.5rem)]"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M21 13.5V9.75A2.25 2.25 0 0018.75 7.5H5.25A2.25 2.25 0 003 9.75V13.5m18 0v4.5A2.25 2.25 0 0118.75 20.25H5.25A2.25 2.25 0 013 18v-4.5m18 0H3m12-6V4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 00-.75.75V7.5m6 0H9"
                          />
                        </svg>
                        <div className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                          Portfólio
                        </div>
                      </button>

                      {/* Tab: Príspevky */}
                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'posts'}
                        onClick={() => onChangeTab('posts')}
                        aria-label="Príspevky"
                        title="Príspevky"
                        className={[
                          'relative group flex-1 py-[clamp(0.5rem,1vw,0.75rem)] transition-all flex items-center justify-center min-w-[clamp(60px,8vw,72px)]',
                          'border-l border-gray-200 dark:border-gray-800',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60',
                          activeTab === 'posts'
                            ? 'bg-gradient-to-t from-purple-100 to-transparent text-purple-700 dark:from-purple-100 dark:to-purple-100/40 dark:text-purple-800'
                            : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#111214]',
                        ].join(' ')}
                      >
                        {/* Icon: squares-2x2 */}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          className="w-[clamp(1.125rem,1.8vw,1.5rem)] h-[clamp(1.125rem,1.8vw,1.5rem)]"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3.75 3.75h7.5v7.5h-7.5zM12.75 3.75h7.5v7.5h-7.5zM3.75 12.75h7.5v7.5h-7.5zM12.75 12.75h7.5v7.5h-7.5z"
                          />
                        </svg>
                        <div className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                          Príspevky
                        </div>
                      </button>

                      {/* Tab: Označený */}
                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'tagged'}
                        onClick={() => onChangeTab('tagged')}
                        aria-label="Označený"
                        title="Označený"
                        className={[
                          'relative group flex-1 py-[clamp(0.5rem,1vw,0.75rem)] transition-all flex items-center justify-center min-w-[clamp(60px,8vw,72px)]',
                          'border-l border-gray-200 dark:border-gray-800',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60',
                          activeTab === 'tagged'
                            ? 'bg-gradient-to-t from-purple-100 to-transparent text-purple-700 dark:from-purple-100 dark:to-purple-100/40 dark:text-purple-800'
                            : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#111214]',
                        ].join(' ')}
                      >
                        {/* Icon: at-symbol */}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          className="w-[clamp(1.125rem,1.8vw,1.5rem)] h-[clamp(1.125rem,1.8vw,1.5rem)]"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16.5 12a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0v1.5a2.25 2.25 0 0 0 4.5 0V12a9 9 0 1 0-3.515 7.082"
                          />
                        </svg>
                        <div className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                          Označený
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              {/* Obsah sekcií */}
              <ProfileOffersSection
                activeTab={activeTab}
                accountType={accountType}
                ownerUserId={offersOwnerId ?? displayUser.id}
                highlightedSkillId={highlightedSkillId ?? null}
                isOtherUserProfile={isOtherUserProfile}
              />
              <div className="w-full">
                <UserInfo user={displayUser} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Hamburger Menu Modal - len na cudzom profile */}
      {isOtherUserProfile && mounted && isHamburgerModalOpen && typeof document !== 'undefined' && createPortal(
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-[70] bg-black/45"
            onClick={() => setIsHamburgerModalOpen(false)}
          />
          {/* Modal */}
          <div
            className="fixed inset-0 z-[71] flex items-center justify-center px-4"
            onClick={() => setIsHamburgerModalOpen(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl bg-white dark:bg-black border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 space-y-2">
                <button
                  onClick={() => {
                    // Zablokovať - TODO: implementovať funkcionalitu
                  }}
                  className="w-full text-center px-4 py-3 text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  {t('profile.block', 'Zablokovať')}
                </button>
                <button
                  onClick={() => {
                    // Nahlásiť - TODO: implementovať funkcionalitu
                  }}
                  className="w-full text-center px-4 py-3 text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  {t('profile.report', 'Nahlásiť')}
                </button>
                <button
                  onClick={() => {
                    // Zdieľať - TODO: implementovať funkcionalitu
                  }}
                  className="w-full text-center px-4 py-3 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  {t('profile.share', 'Zdieľať')}
                </button>
                <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                <button
                  onClick={() => setIsHamburgerModalOpen(false)}
                  className="w-full text-center px-4 py-3 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  {t('common.cancel', 'Zrušiť')}
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}


