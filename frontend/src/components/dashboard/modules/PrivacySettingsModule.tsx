'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { User } from '../../../types';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '../../../lib/api';

interface PrivacySettingsModuleProps {
  user: User;
  onUserUpdate: (updatedUser: User) => void;
}

export default function PrivacySettingsModule({ user, onUserUpdate }: PrivacySettingsModuleProps) {
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
      // V prípade chyby necháme modal otvorený
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
      // V prípade chyby necháme modal otvorený
    }
  };

  const handlePublicCancel = () => {
    setIsPublicAccountModalOpen(false);
  };

  return (
    <div className="text-[var(--foreground)]">
      <div className="hidden lg:flex items-start justify-center">
        <div className="flex flex-col items-start w-full profile-edit-column pt-4 pb-8">
          <div className="w-full">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6">
              {t('rightSidebar.privacy', 'Nastavenia súkromia')}
            </h2>
          </div>

          {/* Divider */}
          <div className="w-full mt-[clamp(1rem,2vw,1.5rem)]">
            <div className="border-t border-gray-200 dark:border-gray-700" />
          </div>

          {/* Súkromný účet – prvá možnosť */}
          <div className="w-full mt-[clamp(1rem,3vw,2rem)]">
            <div className="space-y-4">
              <div className="w-full py-4 px-6 rounded-lg border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-black relative">
                <div className="absolute top-4 right-6">
                  <button
                    type="button"
                    onClick={handlePrivateToggle}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
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
                <div className="text-left pr-16">
                  <div className="font-semibold text-lg mb-2 text-gray-800 dark:text-white">
                    {t('privacy.privateAccountTitle', 'Súkromný účet')}
                  </div>
                  <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                    {t(
                      'privacy.privateAccountDescription',
                      'Keď si nastavíte súkromný účet, váš profil nebude viditeľný ani vyhľadateľný pre ostatných používateľov Svaply. Nikto vás nebude môcť nájsť vo vyhľadávaní ani zobraziť váš profil. Budú skryté všetky informácie vrátane profilovej fotografie, príspevkov, ponúkaných a hľadaných zručností, portfólia, kontaktných údajov, mena, lokality a ďalších informácií o profile. Toto nastavenie je vhodné, ak chcete mať svoj účet úplne súkromný a dočasne sa nezviditeľňovať v aplikácii.'
                    )}
                  </p>
                </div>
              </div>

              {/* Verejný účet – druhá možnosť */}
              <div className="w-full py-4 px-6 rounded-lg border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-black relative">
                <div className="absolute top-4 right-6">
                  <button
                    type="button"
                    onClick={handlePublicToggle}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
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
                <div className="text-left pr-16">
                  <div className="font-semibold text-lg mb-2 text-gray-800 dark:text-white">
                    {t('privacy.publicAccountTitle', 'Verejný účet')}
                  </div>
                  <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                    {t(
                      'privacy.publicAccountDescription',
                      'Pri verejnom účte môžu ostatní používatelia váš profil nájsť vo vyhľadávaní podľa mena, ponúkaných alebo hľadaných zručností a kategórií. Zobrazujú sa všetky informácie vo vašom profile vrátane profilovej fotografie, osobných údajov, príspevkov, portfólia, kontaktov a kompletného prehľadu toho, čo ponúkate alebo hľadáte. Verejný účet je vhodný, ak chcete byť viditeľní, osloviť ostatných používateľov a aktívne sa zapájať do komunity Svaply.'
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal pre prepnutie na súkromný účet */}
      {isPrivateAccountModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
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
          </div>,
          document.getElementById('app-root') ?? document.body
        )}

      {/* Modal pre prepnutie na verejný účet */}
      {isPublicAccountModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
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
          </div>,
          document.getElementById('app-root') ?? document.body
        )}
    </div>
  );
}

