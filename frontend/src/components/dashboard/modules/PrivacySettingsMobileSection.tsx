'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { User } from '../../../types';
import { api } from '../../../lib/api';

interface PrivacySettingsMobileSectionProps {
  user: User;
  onUserUpdate: (updatedUser: User) => void;
}

export default function PrivacySettingsMobileSection({
  user,
  onUserUpdate,
}: PrivacySettingsMobileSectionProps) {
  const { t } = useLanguage();
  
  // Načítanie aktuálneho stavu z user.is_public
  const [privateAccountEnabled, setPrivateAccountEnabled] = useState(!user.is_public);
  const [publicAccountEnabled, setPublicAccountEnabled] = useState(user.is_public);
  const [isPublicAccountModalOpen, setIsPublicAccountModalOpen] = useState(false);
  const [isPrivateAccountModalOpen, setIsPrivateAccountModalOpen] = useState(false);

  // Aktualizácia state pri zmene user.is_public
  useEffect(() => {
    setPrivateAccountEnabled(!user.is_public);
    setPublicAccountEnabled(user.is_public);
  }, [user.is_public]);

  const handlePrivateToggle = () => {
    if (!privateAccountEnabled) {
      setIsPrivateAccountModalOpen(true);
    }
  };

  const handlePublicToggle = () => {
    if (!publicAccountEnabled) {
      setIsPublicAccountModalOpen(true);
    }
  };

  const handlePrivateConfirm = async () => {
    try {
      const response = await api.patch('/auth/profile/', { is_public: false });
      if (response.data?.user && onUserUpdate) {
        onUserUpdate(response.data.user);
      }
      setPrivateAccountEnabled(true);
      setPublicAccountEnabled(false);
      setIsPrivateAccountModalOpen(false);
    } catch (error) {
      console.error('Error saving private account setting:', error);
    }
  };

  const handlePrivateCancel = () => {
    setIsPrivateAccountModalOpen(false);
  };

  const handlePublicConfirm = async () => {
    try {
      const response = await api.patch('/auth/profile/', { is_public: true });
      if (response.data?.user && onUserUpdate) {
        onUserUpdate(response.data.user);
      }
      setPublicAccountEnabled(true);
      setPrivateAccountEnabled(false);
      setIsPublicAccountModalOpen(false);
    } catch (error) {
      console.error('Error saving public account setting:', error);
    }
  };

  const handlePublicCancel = () => {
    setIsPublicAccountModalOpen(false);
  };

  return (
    <div className="text-[var(--foreground)]">
      {/* Mobile layout */}
      <div className="block lg:hidden w-full pt-2 pb-6">
        <div className="space-y-0 -mx-8 px-4">
          {/* Súkromný účet */}
          <div className="w-full py-3 px-4">
            <div className="flex items-start justify-between mb-2">
              <div className="font-semibold text-base text-gray-900 dark:text-white">
                {t('privacy.privateAccountTitle', 'Súkromný účet')}
              </div>
              <button
                type="button"
                onClick={handlePrivateToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 flex-shrink-0 -mt-1 ${
                  privateAccountEnabled ? 'bg-purple-400 border border-purple-400' : 'bg-gray-300 dark:bg-gray-600'
                }`}
                style={{
                  transform: 'scaleY(0.8)',
                  transformOrigin: 'left center',
                }}
              >
                <span
                  className={`absolute h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200 ease-in-out ${
                    privateAccountEnabled ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              {t(
                'privacy.privateAccountMobileDescription',
                'Pri súkromnom účte nie ste viditeľní ani vyhľadateľní. Všetky informácie, fotky, príspevky, zručnosti, portfólio, kontakty, meno a lokalita sú skryté. Ideálne, ak chcete účet úplne súkromný.'
              )}
            </p>
          </div>

          {/* Verejný účet */}
          <div className="w-full py-3 px-4">
            <div className="flex items-start justify-between mb-2">
              <div className="font-semibold text-base text-gray-900 dark:text-white">
                {t('privacy.publicAccountTitle', 'Verejný účet')}
              </div>
              <button
                type="button"
                onClick={handlePublicToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 flex-shrink-0 -mt-1 ${
                  publicAccountEnabled ? 'bg-purple-400 border border-purple-400' : 'bg-gray-300 dark:bg-gray-600'
                }`}
                style={{
                  transform: 'scaleY(0.8)',
                  transformOrigin: 'left center',
                }}
              >
                <span
                  className={`absolute h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200 ease-in-out ${
                    publicAccountEnabled ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              {t(
                'privacy.publicAccountMobileDescription',
                'Pri verejnom účte vás ostatní môžu nájsť podľa mena, zručností alebo kategórií. Zobrazujú sa všetky údaje, fotky, príspevky, portfólio a kontakty. Vhodné, ak chcete byť viditeľní a aktívni v komunite Svaply.'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Modal pre prepnutie na súkromný účet */}
      {isPrivateAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={handlePrivateCancel}>
          <div className="w-full max-w-sm md:max-w-md lg:max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="rounded-2xl bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] shadow-xl overflow-hidden">
              <div className="px-6 pt-6 pb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {t('privacy.privateAccountModalTitle', 'Chcete prepnúť svoj účet na súkromný?')}
                </h2>
              </div>
              <div className="px-6 space-y-3 pb-6">
                <button
                  onClick={handlePrivateConfirm}
                  className="w-full py-3 text-base rounded-lg bg-[var(--muted)] text-purple-600 dark:text-purple-400 hover:bg-gray-200 dark:hover:bg-[#141414] font-semibold"
                >
                  {t('accountType.change', 'Zmeniť')}
                </button>
                <button
                  onClick={handlePrivateCancel}
                  className="w-full py-3 text-base rounded-lg bg-[var(--muted)] text-[var(--foreground)] hover:bg-gray-200 dark:hover:bg-[#141414]"
                >
                  {t('accountType.cancel', 'Zrušiť')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal pre prepnutie na verejný účet */}
      {isPublicAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={handlePublicCancel}>
          <div className="w-full max-w-sm md:max-w-md lg:max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="rounded-2xl bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] shadow-xl overflow-hidden">
              <div className="px-6 pt-6 pb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {t('privacy.publicAccountModalTitle', 'Chcete prepnúť svoj účet na verejný?')}
                </h2>
              </div>
              <div className="px-6 space-y-3 pb-6">
                <button
                  onClick={handlePublicConfirm}
                  className="w-full py-3 text-base rounded-lg bg-[var(--muted)] text-purple-600 dark:text-purple-400 hover:bg-gray-200 dark:hover:bg-[#141414] font-semibold"
                >
                  {t('accountType.change', 'Zmeniť')}
                </button>
                <button
                  onClick={handlePublicCancel}
                  className="w-full py-3 text-base rounded-lg bg-[var(--muted)] text-[var(--foreground)] hover:bg-gray-200 dark:hover:bg-[#141414]"
                >
                  {t('accountType.cancel', 'Zrušiť')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

