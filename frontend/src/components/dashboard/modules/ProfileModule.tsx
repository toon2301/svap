'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User } from '../../../types';
import UserAvatar from './profile/UserAvatar';
import { useLanguage } from '@/contexts/LanguageContext';
import UserInfo from './profile/UserInfo';
import WebsitesRow from './profile/view/WebsitesRow';
import ProfileEditFormDesktop from './ProfileEditFormDesktop';
import ProfileEditFormMobile from './ProfileEditFormMobile';
import { api, endpoints } from '../../../lib/api';
import OfferImageCarousel from './shared/OfferImageCarousel';

interface ProfileModuleProps {
  user: User;
  onUserUpdate?: (updatedUser: User) => void;
  onEditProfileClick?: () => void;
  onSkillsClick?: () => void;
  isEditMode?: boolean;
  accountType?: 'personal' | 'business';
}

// Removed inline Skill interface as profile no longer renders user's offers

export default function ProfileModule({ user, onUserUpdate, onEditProfileClick, onSkillsClick, isEditMode = false, accountType = 'personal' }: ProfileModuleProps) {
  const { t } = useLanguage();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isAllWebsitesModalOpen, setIsAllWebsitesModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'offers' | 'portfolio' | 'posts' | 'tagged'>('offers');
  // Offers for desktop tab rendering
  const [offers, setOffers] = useState<Array<{
    id: number;
    category: string;
    subcategory: string;
    description: string;
    images?: Array<{ id: number; image_url?: string | null; image?: string | null; order?: number }>;
    price_from?: number | null;
    price_currency?: string;
  }>>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleTabsKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const order: Array<'offers' | 'portfolio' | 'posts' | 'tagged'> = ['offers', 'portfolio', 'posts', 'tagged'];
    const currentIndex = order.indexOf(activeTab);
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      const next = (currentIndex + 1) % order.length;
      setActiveTab(order[next]);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      const prev = (currentIndex - 1 + order.length) % order.length;
      setActiveTab(order[prev]);
    }
  };

  // Load offers when switching to 'offers' tab (desktop focus)
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(endpoints.skills.list);
        const list = Array.isArray(data) ? data : [];
        const mapped = list.map((s: any) => {
          const rawPrice = s.price_from;
          const parsedPrice =
            typeof rawPrice === 'number'
              ? rawPrice
              : typeof rawPrice === 'string' && rawPrice.trim() !== ''
                ? parseFloat(rawPrice)
                : null;
          return {
            id: s.id,
            category: s.category,
            subcategory: s.subcategory,
            description: s.description || '',
            images: Array.isArray(s.images)
              ? s.images.map((im: any) => ({
                  id: im.id,
                  image_url: im.image_url || im.image || null,
                  order: im.order,
                }))
              : [],
            price_from: parsedPrice,
            price_currency:
              typeof s.price_currency === 'string' && s.price_currency.trim() !== ''
                ? s.price_currency
                : '€',
          };
        });
        setOffers(mapped);
      } catch (e) {
        // silent
      }
    };
    if (activeTab === 'offers') load();
  }, [activeTab]);

  const handlePhotoUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError('');
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await api.patch('/auth/profile/', formData);

      console.log('Upload response:', response.data);
      if (onUserUpdate && response.data.user) {
        console.log('Updated user:', response.data.user);
        onUserUpdate(response.data.user);
      }

      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (error: any) {
      console.error('Photo upload error:', error);
      // Pokús sa vytiahnuť konkrétnu validačnú správu z backendu
      const details = error?.response?.data?.details || error?.response?.data?.validation_errors;
      const avatarErrors: string[] | undefined = details?.avatar;
      const message = (
        avatarErrors?.[0] ||
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Nepodarilo sa nahrať fotku. Skús to znova.'
      );
      setUploadError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAvatarClick = () => {
    // Open actions only if avatar exists
    if (user.avatar || user.avatar_url) {
      setIsActionsOpen(true);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      setIsUploading(true);
      setUploadError('');
      // Clear avatar by sending JSON null
      const response = await api.patch('/auth/profile/', { avatar: null });
      if (onUserUpdate && response.data.user) {
        onUserUpdate(response.data.user);
      }
      setIsActionsOpen(false);
    } catch (e: any) {
      const details = e?.response?.data?.details || e?.response?.data?.validation_errors;
      const avatarErrors: string[] | undefined = details?.avatar;
      const message = (
        avatarErrors?.[0] ||
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        'Nepodarilo sa odstrániť fotku. Skúste znova.'
      );
      setUploadError(message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div className="max-w-2xl mx-auto text-[var(--foreground)]">
        {/* Mobile layout */}
        <div className="lg:hidden">
          {isEditMode ? (
            // Edit mode - show ProfileEditFormMobile
            <ProfileEditFormMobile 
              user={user}
              onUserUpdate={onUserUpdate}
              onEditProfileClick={onEditProfileClick}
              onPhotoUpload={handlePhotoUpload}
              isUploading={isUploading}
              onAvatarClick={handleAvatarClick}
              accountType={accountType}
            />
          ) : (
            // Normal profile view
            <>
              <div className="mb-4">
                <div className="flex gap-3 items-start">
                  <UserAvatar 
                    user={user} 
                    size="medium" 
                    onPhotoUpload={handlePhotoUpload}
                    isUploading={isUploading}
                    onAvatarClick={handleAvatarClick}
                  />
                  <div className="flex flex-col justify-center">
                    {/* Meno používateľa */}
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      {`${(user.first_name || '').trim()} ${(user.last_name || '').trim()}`.trim() || user.username}
                    </h2>
                    {/* Email intentionally not shown here (kept in edit views) */}
                    {/* Lokalita */}
                    {user.location && (
                      <p className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1 mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                        </svg>
                        {user.location}
                      </p>
                    )}
                    {/* IČO - iba pre firemné účty */}
                    {accountType === 'business' && user.ico && (
                      <p className="text-gray-600 dark:text-gray-300 text-sm">
                        {user.ico}
                      </p>
                    )}
                    {/* Telefónne číslo */}
                    {user.phone && (
                      <p className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                        </svg>
                        {user.phone}
                      </p>
                    )}
                    {/* Kontaktný Email - len pre firemný účet */}
                    {accountType === 'business' && user.contact_email && (
                      <p className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                        </svg>
                        {user.contact_email}
                      </p>
                    )}
                    
                        {/* Profesia - len pre osobný účet */}
                        {accountType === 'personal' && user.job_title && (
                          <p className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z" />
                            </svg>
                            {user.job_title}
                          </p>
                        )}
                  </div>
                </div>
                {/* Webová stránka úplne z ľavej strany NAD buttony */}
                {(() => {
                  const totalWebsites = (user.website ? 1 : 0) + (user.additional_websites ? user.additional_websites.length : 0);
                  const additionalCount = totalWebsites - 1;
                  
                  if (totalWebsites === 0) return null;
                  
                  // Zobraz prvý dostupný web
                  const firstWebsite = user.website || (user.additional_websites && user.additional_websites[0]);
                  
                  return (
                    <div className="mt-3">
                      <p className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-3 flex-shrink-0">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                        </svg>
                        {additionalCount > 0 ? (
                          // Viac webov - celý text je klikateľný na modal
                          <span 
                            className="flex items-center flex-wrap cursor-pointer"
                            onClick={() => setIsAllWebsitesModalOpen(true)}
                          >
                            <span className="text-blue-600 hover:text-blue-400 dark:text-blue-400 dark:hover:text-blue-300 transition-colors truncate max-w-[200px]">
                              {firstWebsite}
                            </span>
                            <span className="text-blue-600 dark:text-blue-400 hover:text-blue-400 dark:hover:text-blue-300 ml-1 whitespace-nowrap">
                              a ďalší ({additionalCount})
                            </span>
                          </span>
                        ) : (
                          // Jeden web - klikateľný odkaz
                          <a 
                            href={firstWebsite} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-400 dark:text-blue-400 dark:hover:text-blue-300 transition-colors truncate max-w-[200px]"
                          >
                            {firstWebsite}
                          </a>
                        )}
                      </p>
                    </div>
                  );
                })()}
                {/* Tlačidlá POD webovou stránkou */}
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => {
                      if (onEditProfileClick) {
                        onEditProfileClick();
                      } else {
                        console.log('Upraviť profil');
                      }
                    }}
                    className="flex-1 px-3 py-1.5 text-xs bg-purple-100 text-purple-800 border border-purple-200 rounded-2xl transition-colors hover:bg-purple-200"
                  >
                    {t('profile.editProfile', 'Upraviť profil')}
                  </button>
                  <button
                    onClick={() => {
                      console.log('Zručnosti');
                    }}
                    className="flex-1 px-3 py-1.5 text-xs bg-purple-100 text-purple-800 border border-purple-200 rounded-2xl transition-colors hover:bg-purple-200"
                  >
                    {t('profile.skills', 'Služby a ponuky')}
                  </button>
                </div>
                {/* Ikonová navigácia sekcií profilu (mobile) */}
                <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700 w-full">
                  <div
                    role="tablist"
                    aria-label="Sekcie profilu"
                    className="w-full"
                    tabIndex={0}
                    onKeyDown={handleTabsKeyDown}
                  >
                    <div className="flex w-full items-stretch rounded-2xl border border-gray-200 bg-white/60 dark:bg-[#0f0f10] dark:border-gray-800 shadow-sm overflow-hidden">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'offers'}
                        onClick={() => setActiveTab('offers')}
                        aria-label="Ponúkam / Hľadám"
                        title="Ponúkam / Hľadám"
                        className={[
                          'relative group flex-1 py-2.5 transition-all flex items-center justify-center min-w-[56px]',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60',
                          activeTab === 'offers'
                            ? 'bg-purple-100 text-purple-700 border border-purple-200 shadow-sm dark:bg-purple-100 dark:text-purple-800 dark:border-purple-200'
                            : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#111214]'
                        ].join(' ')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m7.875 14.25 1.214 1.942a2.25 2.25 0 0 0 1.908 1.058h2.006c.776 0 1.497-.4 1.908-1.058l1.214-1.942M2.41 9h4.636a2.25 2.25 0 0 1 1.872 1.002l.164.246a2.25 2.25 0 0 0 1.872 1.002h2.092a2.25 2.25 0 0 0 1.872-1.002l.164-.246A2.25 2.25 0 0 1 16.954 9h4.636M2.41 9a2.25 2.25 0 0 0-.16.832V12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 12V9.832c0-.287-.055-.57-.16-.832M2.41 9a2.25 2.25 0 0 1 .382-.632l3.285-3.832a2.25 2.25 0 0 1 1.708-.786h8.43c.657 0 1.281.287 1.709.786l3.284 3.832c.163.19.291.404.382.632M4.5 20.25h15A2.25 2.25 0 0 0 21.75 18v-2.625c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125V18a2.25 2.25 0 0 0 2.25 2.25Z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'portfolio'}
                        onClick={() => setActiveTab('portfolio')}
                        aria-label="Portfólio"
                        title="Portfólio"
                        className={[
                          'relative group flex-1 py-2.5 transition-all flex items-center justify-center min-w-[56px]',
                          'border-l border-gray-200 dark:border-gray-800',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60',
                          activeTab === 'portfolio'
                            ? 'bg-purple-100 text-purple-700 border border-purple-200 shadow-sm dark:bg-purple-100 dark:text-purple-800 dark:border-purple-200'
                            : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#111214]'
                        ].join(' ')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.5V9.75A2.25 2.25 0 0018.75 7.5H5.25A2.25 2.25 0 003 9.75V13.5m18 0v4.5A2.25 2.25 0 0118.75 20.25H5.25A2.25 2.25 0 013 18v-4.5m18 0H3m12-6V4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 00-.75.75V7.5m6 0H9" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'posts'}
                        onClick={() => setActiveTab('posts')}
                        aria-label="Príspevky"
                        title="Príspevky"
                        className={[
                          'relative group flex-1 py-2.5 transition-all flex items-center justify-center min-w-[56px]',
                          'border-l border-gray-200 dark:border-gray-800',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60',
                          activeTab === 'posts'
                            ? 'bg-purple-100 text-purple-700 border border-purple-200 shadow-sm dark:bg-purple-100 dark:text-purple-800 dark:border-purple-200'
                            : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#111214]'
                        ].join(' ')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75h7.5v7.5h-7.5zM12.75 3.75h7.5v7.5h-7.5zM3.75 12.75h7.5v7.5h-7.5zM12.75 12.75h7.5v7.5h-7.5z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'tagged'}
                        onClick={() => setActiveTab('tagged')}
                        aria-label="Označený"
                        title="Označený"
                        className={[
                          'relative group flex-1 py-2.5 transition-all flex items-center justify-center min-w-[56px]',
                          'border-l border-gray-200 dark:border-gray-800',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60',
                          activeTab === 'tagged'
                            ? 'bg-purple-100 text-purple-700 border border-purple-200 shadow-sm dark:bg-purple-100 dark:text-purple-800 dark:border-purple-200'
                            : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#111214]'
                        ].join(' ')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0v1.5a2.25 2.25 0 0 0 4.5 0V12a9 9 0 1 0-3.515 7.082" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <UserInfo user={user} />
            </>
          )}
        </div>

        {/* Desktop layout */}
        <div className="hidden lg:flex items-start justify-center">
          <div className="flex flex-col items-start w-full max-w-3xl mx-auto">
            {/* Pôvodný desktop obsah */}
            <div className="w-full">
          {isEditMode ? (
            // Edit mode - show ProfileEditFormDesktop
            <ProfileEditFormDesktop 
              user={user}
              onUserUpdate={onUserUpdate}
              onEditProfileClick={onEditProfileClick}
              onPhotoUpload={handlePhotoUpload}
              isUploadingFromParent={isUploading}
              onAvatarClick={handleAvatarClick}
              accountType={accountType}
            />
          ) : (
            // Normal profile view
            <>
              <div className="flex flex-col gap-6 mb-6">
                <div className="flex gap-4">
                  <div className="flex flex-col items-start">
                    <div className="flex gap-4 items-center">
                      <UserAvatar 
                        user={user} 
                        size="large" 
                        onPhotoUpload={handlePhotoUpload}
                        isUploading={isUploading}
                        onAvatarClick={handleAvatarClick}
                      />
                      <div className="flex flex-col">
                        {/* Meno používateľa */}
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                          {`${(user.first_name || '').trim()} ${(user.last_name || '').trim()}`.trim() || user.username}
                        </h2>
                        {/* Email intentionally not shown here (kept in edit views) */}
                        {/* Lokalita */}
                        {user.location && (
                          <p className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 text-gray-500 dark:text-gray-400">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                            </svg>
                            {user.location}
                          </p>
                        )}
                        {/* IČO - iba pre firemné účty */}
                        {accountType === 'business' && user.ico && (
                          <p className="text-gray-600 dark:text-gray-300 text-sm">
                            IČO: {user.ico}
                          </p>
                        )}
                        {/* Telefónne číslo */}
                        {user.phone && (
                          <p className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 text-gray-500 dark:text-gray-400">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                            </svg>
                            {user.phone}
                          </p>
                        )}
                        {/* Kontaktný Email - len pre firemný účet */}
                        {accountType === 'business' && user.contact_email && (
                          <p className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 text-gray-500 dark:text-gray-400">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                            </svg>
                            {user.contact_email}
                          </p>
                        )}
                        
                        {/* Profesia - len pre osobný účet */}
                        {accountType === 'personal' && user.job_title && (
                          <p className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 text-gray-500 dark:text-gray-400">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z" />
                            </svg>
                            {user.job_title}
                          </p>
                        )}
                        {/* Webová stránka + "a ďalší" (desktop) */}
                        <WebsitesRow user={user} onOpenAll={() => setIsAllWebsitesModalOpen(true)} />
                      </div>
                    </div>
                    {/* Tlačidlá pod fotkou */}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => {
                          if (onEditProfileClick) {
                            onEditProfileClick();
                          } else {
                            console.log('Upraviť profil');
                          }
                        }}
                        className="flex-1 px-32 py-2 text-sm bg-purple-100 text-purple-800 border border-purple-200 rounded-2xl transition-colors hover:bg-purple-200 whitespace-nowrap"
                      >
                        {t('profile.editProfile')}
                      </button>
                      <button
                        onClick={() => {
                          // Desktop: prepnúť na prázdny screen Zručnosti
                          // Ak príde callback z nadradenej komponenty, použi ho
                          // @ts-ignore - prop môže byť voliteľná
                          if (typeof onSkillsClick === 'function') {
                            // @ts-ignore
                            onSkillsClick();
                          } else {
                            console.log('Zručnosti');
                          }
                        }}
                        className="flex-1 px-32 py-2 text-sm bg-purple-100 text-purple-800 border border-purple-200 rounded-2xl transition-colors hover:bg-purple-200 whitespace-nowrap"
                      >
                        {t('profile.skills', 'Služby a ponuky')}
                      </button>
                    </div>
                    {/* Ikonová navigácia sekcií profilu */}
                    <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700 w-full lg:mt-6 lg:pt-5 lg:pb-4">
                      <div
                        role="tablist"
                        aria-label="Sekcie profilu"
                        className="w-full"
                        tabIndex={0}
                        onKeyDown={handleTabsKeyDown}
                      >
                        <div className="flex w-full items-stretch rounded-3xl border border-gray-200 bg-white/60 dark:bg-[#0f0f10] dark:border-gray-800 shadow-sm overflow-hidden">
                        {/* Tab: Ponúkam/Hľadám */}
                        <button
                          type="button"
                          role="tab"
                          aria-selected={activeTab === 'offers'}
                          onClick={() => setActiveTab('offers')}
                          aria-label="Ponúkam / Hľadám"
                          title="Ponúkam / Hľadám"
                        className={[
                          'relative group flex-1 py-3 transition-all flex items-center justify-center min-w-[72px]',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60',
                          activeTab === 'offers'
                              ? 'bg-purple-100 text-purple-700 border border-purple-200 shadow-sm dark:bg-purple-100 dark:text-purple-800 dark:border-purple-200'
                              : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#111214]'
                          ].join(' ')}
                        >
                          {/* Icon: handshake */}
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m7.875 14.25 1.214 1.942a2.25 2.25 0 0 0 1.908 1.058h2.006c.776 0 1.497-.4 1.908-1.058l1.214-1.942M2.41 9h4.636a2.25 2.25 0 0 1 1.872 1.002l.164.246a2.25 2.25 0 0 0 1.872 1.002h2.092a2.25 2.25 0 0 0 1.872-1.002l.164-.246A2.25 2.25 0 0 1 16.954 9h4.636M2.41 9a2.25 2.25 0 0 0-.16.832V12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 12V9.832c0-.287-.055-.57-.16-.832M2.41 9a2.25 2.25 0 0 1 .382-.632l3.285-3.832a2.25 2.25 0 0 1 1.708-.786h8.43c.657 0 1.281.287 1.709.786l3.284 3.832c.163.19.291.404.382.632M4.5 20.25h15A2.25 2.25 0 0 0 21.75 18v-2.625c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125V18a2.25 2.25 0 0 0 2.25 2.25Z" />
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
                          onClick={() => setActiveTab('portfolio')}
                          aria-label="Portfólio"
                          title="Portfólio"
                        className={[
                          'relative group flex-1 py-3 transition-all flex items-center justify-center min-w-[72px]',
                          'border-l border-gray-200 dark:border-gray-800',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60',
                          activeTab === 'portfolio'
                              ? 'bg-purple-100 text-purple-700 border border-purple-200 shadow-sm dark:bg-purple-100 dark:text-purple-800 dark:border-purple-200'
                              : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#111214]'
                          ].join(' ')}
                        >
                          {/* Icon: briefcase */}
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.5V9.75A2.25 2.25 0 0018.75 7.5H5.25A2.25 2.25 0 003 9.75V13.5m18 0v4.5A2.25 2.25 0 0118.75 20.25H5.25A2.25 2.25 0 013 18v-4.5m18 0H3m12-6V4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 00-.75.75V7.5m6 0H9" />
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
                          onClick={() => setActiveTab('posts')}
                          aria-label="Príspevky"
                          title="Príspevky"
                        className={[
                          'relative group flex-1 py-3 transition-all flex items-center justify-center min-w-[72px]',
                          'border-l border-gray-200 dark:border-gray-800',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60',
                          activeTab === 'posts'
                              ? 'bg-purple-100 text-purple-700 border border-purple-200 shadow-sm dark:bg-purple-100 dark:text-purple-800 dark:border-purple-200'
                              : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#111214]'
                          ].join(' ')}
                        >
                          {/* Icon: squares-2x2 */}
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75h7.5v7.5h-7.5zM12.75 3.75h7.5v7.5h-7.5zM3.75 12.75h7.5v7.5h-7.5zM12.75 12.75h7.5v7.5h-7.5z" />
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
                          onClick={() => setActiveTab('tagged')}
                          aria-label="Označený"
                          title="Označený"
                        className={[
                          'relative group flex-1 py-3 transition-all flex items-center justify-center min-w-[72px]',
                          'border-l border-gray-200 dark:border-gray-800',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60',
                          activeTab === 'tagged'
                              ? 'bg-purple-100 text-purple-700 border border-purple-200 shadow-sm dark:bg-purple-100 dark:text-purple-800 dark:border-purple-200'
                              : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#111214]'
                          ].join(' ')}
                        >
                          {/* Icon: at-symbol */}
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0v1.5a2.25 2.25 0 0 0 4.5 0V12a9 9 0 1 0-3.515 7.082" />
                          </svg>
                          <div className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                            Označený
                          </div>
                        </button>
                        </div>
                      </div>
                    </div>
                    {/* Obsah sekcií */}
                    {activeTab === 'offers' && (
                      <div className="mt-4">
                        {offers.length === 0 ? (
                          <p className="text-sm text-gray-600 dark:text-gray-400">Zatiaľ nemáš žiadne ponuky.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {offers.map((offer) => {
                              const imageAlt = (offer.description && offer.description.trim()) || offer.subcategory || offer.category || 'Ponuka';
                              const headline = (offer.description && offer.description.trim()) || offer.subcategory || 'Bez popisu';
                              const label = offer.subcategory || offer.category || '';
                              const priceLabel =
                                offer.price_from !== null && offer.price_from !== undefined
                                  ? `${Number(offer.price_from).toLocaleString('sk-SK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${offer.price_currency || '€'}`
                                  : null;
                              return (
                                <div key={offer.id} className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-[#0f0f10] shadow-sm hover:shadow transition-shadow">
                                  <div className="relative aspect-[4/3] bg-gray-100 dark:bg-[#0e0e0f] overflow-hidden">
                                    <OfferImageCarousel images={offer.images} alt={imageAlt} />
                                    {accountType === 'business' && (
                                      <span className="absolute top-2 left-2 px-1.5 py-0.5 text-[10px] font-semibold bg-black/80 text-white rounded">
                                        PRO
                                      </span>
                                    )}
                                    <button aria-label="Obľúbené" className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 dark:bg-black/70 text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-black">
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                        <path d="M11.645 20.91l-.007-.003-.022-.01a15.247 15.247 0 01-.383-.173 25.18 25.18 0 01-4.244-2.453C4.688 16.477 2.25 13.88 2.25 10.5 2.25 7.42 4.67 5 7.75 5c1.66 0 3.153.806 4.096 2.036C12.79 5.806 14.284 5 15.944 5 19.023 5 21.443 7.42 21.443 10.5c0 3.38-2.438 5.977-4.74 7.77a25.175 25.175 0 01-4.244 2.452 15.247 15.247 0 01-.383.173l-.022.01-.007.003a.75.75 0 01-.642 0z" />
                                      </svg>
                                    </button>
                                  </div>
                                  <div className="p-3 flex flex-col h-44">
                                    {label ? (
                                      <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">{label}</div>
                                    ) : null}
                                    <div className="text-xs font-semibold text-gray-900 dark:text-white whitespace-pre-wrap overflow-y-auto pr-1 flex-1" style={{ maxHeight: '5.5rem' }}>
                                      {headline}
                                    </div>
                                    {priceLabel ? (
                                      <div className="text-xs text-gray-700 dark:text-gray-300 mt-1.5">
                                        <span className="font-medium text-gray-900 dark:text-white">Cena od:&nbsp;</span>
                                        {priceLabel}
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="w-full">
                  <UserInfo user={user} />
                </div>
              </div>
            </>
          )}
            </div>
          </div>
        </div>
        
        {/* Success message */}
        {uploadSuccess && (
          <div className="mt-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            ✓ {t('profile.photoUploaded', 'Fotka bola úspešne nahraná!')}
          </div>
        )}
        
        {/* Error message */}
        {uploadError && (
          <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {uploadError}
          </div>
        )}
      </div>
      
      {/* Avatar Actions Modal */}
      {mounted && isActionsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 lg:bg-transparent" onClick={() => setIsActionsOpen(false)}>
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-[32rem] max-w-[90vw] lg:ml-[-12rem]" onClick={(e) => e.stopPropagation()}>
            <div className="rounded-2xl bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] shadow-xl overflow-hidden">
              {/* Avatar v modale */}
              <div className="flex justify-center py-6">
                <UserAvatar 
                  user={user} 
                  size="large" 
                  onPhotoUpload={handlePhotoUpload}
                  isUploading={isUploading}
                  onAvatarClick={handleAvatarClick}
                />
              </div>
              <div className="px-2 space-y-3 pb-6">
                <button
                  onClick={() => {
                    setIsActionsOpen(false);
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e: any) => {
                      const file = e.target.files?.[0];
                      if (file) handlePhotoUpload(file);
                    };
                    input.click();
                  }}
                  className="w-full py-4 text-lg rounded-lg bg-[var(--muted)] text-[var(--foreground)] hover:bg-gray-200 dark:hover:bg-[#141414]"
                >
                  {t('profile.changePhoto')}
                </button>
                <button
                  onClick={handleRemoveAvatar}
                  className="w-full py-4 text-lg rounded-lg bg-[var(--muted)] text-[var(--foreground)] hover:bg-gray-200 dark:hover:bg-[#141414]"
                  disabled={isUploading}
                >
                  {t('profile.removePhoto')}
                </button>
                <button
                  onClick={() => setIsActionsOpen(false)}
                  className="w-full py-4 text-lg rounded-lg bg-[var(--muted)] text-[var(--foreground)] hover:bg-gray-200 dark:hover:bg-[#141414]"
                >
                  {t('profile.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal pre všetky weby */}
      {isAllWebsitesModalOpen && mounted && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setIsAllWebsitesModalOpen(false)}>
          <div className="bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] rounded-2xl shadow-xl max-w-lg w-full p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-[var(--foreground)]">
                Odkazy
              </h2>
              <button
                onClick={() => setIsAllWebsitesModalOpen(false)}
                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Content */}
            <div className="p-2">
              {/* Hlavný web */}
              {user.website && (
                <a 
                  href={user.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors group"
                >
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-purple-600 dark:text-purple-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[var(--foreground)] font-medium text-sm truncate">{user.website}</div>
                  </div>
                </a>
              )}
              
              {/* Dodatočné weby */}
              {user.additional_websites && user.additional_websites.map((website, index) => (
                <a 
                  key={index}
                  href={website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors group"
                >
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-purple-600 dark:text-purple-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[var(--foreground)] font-medium text-sm truncate">{website}</div>
                  </div>
                </a>
              ))}
            </div>
            
          </div>
        </div>,
        document.body
      )}
    </>
  );
}