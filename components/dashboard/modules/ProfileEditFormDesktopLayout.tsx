'use client';

import React from 'react';
import type { User } from '../../../types';

import HeaderCard from './profile-edit/desktop/HeaderCard';
import WebsitesField from './profile-edit/desktop/WebsitesField';
import BioField from './profile-edit/desktop/fields/BioField';
import LocationField from './profile-edit/desktop/fields/LocationField';
import SocialMediaInputs from './SocialMediaInputs';
import UserAvatar from './profile/UserAvatar';

import type { UseProfileEditFormDesktopLegacyReturn } from './useProfileEditFormDesktopLegacy';

interface ProfileEditFormDesktopLayoutProps {
  user: User;
  t: (key: string, defaultValue: string) => string;
  accountType: 'personal' | 'business';
  onUserUpdate?: (user: User) => void;
  onEditProfileClick?: () => void;
  form: UseProfileEditFormDesktopLegacyReturn;
}

export function ProfileEditFormDesktopLayout({
  user,
  t,
  accountType,
  onUserUpdate,
  onEditProfileClick,
  form,
}: ProfileEditFormDesktopLayoutProps) {
  return (
    <>
      <div className="pt-4 pb-8 pl-0 text-[var(--foreground)] max-w-2xl">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6">
          {t('profile.editProfile', 'Upraviť profil')}
        </h2>

        {/* Fotka, meno, email a tlačidlo v bielom paneli */}
        <HeaderCard
          user={user}
          firstName={form.firstName}
          lastName={form.lastName}
          isUploading={form.isUploading}
          onPhotoUploadClick={form.handlePhotoUploadClick}
          onAvatarClick={form.handleAvatarClick}
          accountType={accountType}
        />

        {/* Formulár pre úpravu profilu */}
        <div className="space-y-3">
          {/* Meno (celé meno v jednom vstupe) */}
          <div className="mb-4">
            <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
              {accountType === 'business' ? 'Meno / Názov' : t('profile.fullName', 'Meno')}
            </label>
            <input
              id="fullName"
              type="text"
              value={`${form.firstName} ${form.lastName}`.trim()}
              onChange={(e) => {
                const value = e.target.value || '';
                const parts = value.trim().split(/\s+/).filter(Boolean);
                if (parts.length === 0) {
                  form.setFirstName('');
                  form.setLastName('');
                } else if (parts.length === 1) {
                  form.setFirstName(parts[0]);
                  form.setLastName('');
                } else {
                  form.setFirstName(parts.slice(0, -1).join(' '));
                  form.setLastName(parts[parts.length - 1]);
                }
              }}
              onBlur={form.handleFullNameSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  form.handleFullNameSave();
                }
              }}
              pattern="[a-zA-ZáčďéěíĺľňóôŕšťúýžÁČĎÉĚÍĹĽŇÓÔŔŠŤÚÝŽ\\s-]*"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
              placeholder={t('profile.enterName', 'Zadajte svoje meno a priezvisko')}
            />
          </div>
          {/* Priezvisko zrušené – unified v jednom vstupe */}

          {/* Bio */}
          <BioField bio={form.bio} setBio={form.setBio} onSave={form.handleBioSave} />

          {/* Lokalita */}
          <LocationField
            location={form.location}
            setLocation={form.setLocation}
            onSave={form.handleLocationSave}
          />

          {/* IČO - iba pre firemné účty */}
          {accountType === 'business' && (
            <div className="mb-4">
              <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                IČO
              </label>
              <input
                id="ico"
                type="text"
                value={form.ico}
                onChange={(e) => {
                  // Povoliť iba číslice
                  const value = e.target.value.replace(/\D/g, '');
                  if (value.length <= 14) {
                    form.setIco(value);
                  }
                }}
                onBlur={form.handleIcoSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    form.handleIcoSave();
                  }
                }}
                maxLength={14}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
                placeholder="12345678901234"
              />
              {/* Prepínač pre zobrazenie IČO */}
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={form.handleIcoVisibleToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                    form.icoVisible
                      ? 'bg-purple-400 border border-purple-400'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`absolute h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200 ease-in-out ${
                      form.icoVisible ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Zobraziť IČO verejne
                </span>
              </div>
            </div>
          )}

          {/* Kontakt */}
          <div className="mb-4">
            <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('profile.contact', 'Kontakt')}
            </label>
            <input
              id="phone"
              type="text"
              value={form.phone}
              onChange={(e) => form.setPhone(e.target.value)}
              onBlur={form.handlePhoneSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  form.handlePhoneSave();
                }
              }}
              maxLength={150}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
              placeholder={t('profile.phone', 'Tel. číslo')}
            />
            {/* Prepínač pre zobrazenie telefónu */}
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={form.handlePhoneVisibleToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                  form.phoneVisible
                    ? 'bg-purple-400 border border-purple-400'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`absolute h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200 ease-in-out ${
                    form.phoneVisible ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {t('profile.showContactPublic', 'Zobraziť kontakt verejne')}
              </span>
            </div>
          </div>

          {/* Kontaktný Email - len pre firemný účet */}
          {accountType === 'business' && (
            <div className="mb-4">
              <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                id="contactEmail"
                type="email"
                value={form.contactEmail}
                onChange={(e) => form.setContactEmail(e.target.value)}
                onBlur={form.handleContactEmailSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    form.handleContactEmailSave();
                  }
                }}
                maxLength={255}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
                placeholder="kontakt@firma.sk"
              />
            </div>
          )}

          {/* Profesia - len pre osobný účet */}
          {accountType === 'personal' && (
            <div className="mb-4">
              <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('profile.profession', 'Profesia')}
              </label>
              <input
                id="profession"
                type="text"
                value={form.profession}
                onChange={(e) => form.setProfession(e.target.value)}
                onBlur={form.handleProfessionSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    form.handleProfessionSave();
                  }
                }}
                maxLength={100}
                className="w-full px-3 py-2 bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
                placeholder={t('profile.enterProfession', 'Zadajte svoju profesiu')}
              />
              {/* Prepínač pre zobrazenie profese */}
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={form.handleProfessionVisibleToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                    form.professionVisible
                      ? 'bg-purple-400 border border-purple-400'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`absolute h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200 ease-in-out ${
                      form.professionVisible ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {t('profile.showProfessionPublic', 'Zobraziť profesiu verejne')}
                </span>
              </div>
            </div>
          )}

          {/* Web */}
          <WebsitesField
            user={user}
            website={form.website}
            additionalWebsites={form.additionalWebsites}
            setWebsite={form.setWebsite}
            setAdditionalWebsites={form.setAdditionalWebsites}
            onUserUpdate={onUserUpdate}
          />

          {/* Sociálne siete */}
          <SocialMediaInputs user={user} onUserUpdate={onUserUpdate} />

          {/* Pohlavie - iba pre osobné účty */}
          {accountType !== 'business' && (
            <div className="mb-4">
              <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('profile.gender', 'Pohlavie')}
              </label>
              <select
                id="gender"
                value={form.gender}
                onChange={(e) => form.handleGenderChange(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent appearance-none cursor-pointer"
              >
                <option value="">{t('profile.selectGender', 'Vyberte pohlavie')}</option>
                <option value="male">{t('profile.male', 'Muž')}</option>
                <option value="female">{t('profile.female', 'Žena')}</option>
                <option value="other">{t('profile.other', 'Iné')}</option>
              </select>
            </div>
          )}
        </div>

        {/* Tlačidlo Uložiť */}
        <div className="flex justify-center mt-8">
          <button
            onClick={() => {
              // Logika pre uloženie zmien
              // eslint-disable-next-line no-console
              console.log('Uložiť zmeny');
              // Informuj dashboard, aby zobrazil profil
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('goToProfile'));
              }
              // Zatvor pravú navigáciu ak je k dispozícii handler
              if (onEditProfileClick) {
                onEditProfileClick();
              }
            }}
            className="px-32 py-2 bg-purple-100 text-purple-800 border border-purple-200 rounded-2xl hover:bg-purple-200 transition-colors"
          >
            {t('common.save', 'Uložiť')}
          </button>
        </div>
      </div>

      {/* Avatar Actions Modal */}
      {form.isActionsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 lg:bg-transparent"
          onClick={() => form.setIsActionsOpen(false)}
        >
          <div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-[32rem] max-w-[90vw] lg:top-32 lg:translate-y-0 lg:ml-0 xl:ml-[-6rem] 2xl:ml-[-12rem]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-2xl bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] shadow-xl overflow-hidden">
              {/* Avatar v modale */}
              <div className="flex justify-center py-6">
                <UserAvatar
                  user={user}
                  size="large"
                  onPhotoUpload={form.handlePhotoUploadClick}
                  isUploading={form.isUploading}
                  onAvatarClick={form.handleAvatarClick}
                />
              </div>
              <div className="px-2 space-y-3 pb-6">
                <button
                  onClick={() => {
                    form.setIsActionsOpen(false);
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e: any) => {
                      const file = e.target.files?.[0];
                      if (file) form.handlePhotoUpload(file);
                    };
                    input.click();
                  }}
                  className="w-full py-4 text-lg rounded-lg bg-[var(--muted)] text-[var(--foreground)] hover:bg-gray-200 dark:hover:bg-[#141414]"
                >
                  {t('profile.changePhoto', 'Zmeniť fotku')}
                </button>
                <button
                  onClick={form.handleRemoveAvatar}
                  className="w-full py-4 text-lg rounded-lg bg-[var(--muted)] text-[var(--foreground)] hover:bg-gray-200 dark:hover:bg-[#141414]"
                  disabled={form.isUploading}
                >
                  {t('profile.removePhoto', 'Odstrániť fotku')}
                </button>
                <button
                  onClick={() => form.setIsActionsOpen(false)}
                  className="w-full py-4 text-lg rounded-lg bg-[var(--muted)] text-[var(--foreground)] hover:bg-gray-200 dark:hover:bg-[#141414]"
                >
                  {t('common.cancel', 'Zrušiť')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

