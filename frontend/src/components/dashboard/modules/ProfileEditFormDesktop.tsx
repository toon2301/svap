'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { User } from '../../../types';
import { api } from '../../../lib/api';
import HeaderCard from './profile-edit/desktop/HeaderCard';
import WebsitesField from './profile-edit/desktop/WebsitesField';
import BioField from './profile-edit/desktop/fields/BioField';
import LocationField from './profile-edit/desktop/fields/LocationField';
import SocialMediaInputs from './SocialMediaInputs';
import ProfileAvatarActionsModal from './profile/ProfileAvatarActionsModal';
import { useProfileEditFormDesktop } from './profile/useProfileEditFormDesktop';

interface ProfileEditFormDesktopProps {
  user: User;
  onUserUpdate?: (user: User) => void;
  onEditProfileClick?: () => void;
  onPhotoUpload?: (file: File) => void;
  isUploadingFromParent?: boolean;
  onAvatarClick?: () => void;
  accountType?: 'personal' | 'business';
}

export default function ProfileEditFormDesktop({ 
  user, 
  onUserUpdate, 
  onEditProfileClick,
  onPhotoUpload,
  isUploadingFromParent,
  onAvatarClick,
  accountType = 'personal'
}: ProfileEditFormDesktopProps) {
  const { t } = useLanguage();
  const {
    firstName,
    lastName,
    bio,
    location,
    district,
    ico,
    icoVisible,
    phone,
    phoneVisible,
    profession,
    professionVisible,
    website,
    additionalWebsites,
    contactEmail,
    gender,
    isUploading,
    isActionsOpen,
    // uploadError,
    setFirstName,
    setLastName,
    setBio,
    setLocation,
    setDistrict,
    setIco,
    setPhone,
    setProfession,
    setWebsite,
    setAdditionalWebsites,
    setContactEmail,
    setIsActionsOpen,
    handleFullNameSave,
    handleBioSave,
    handleLocationSave,
    handleIcoSave,
    handleIcoVisibleToggle,
    handlePhoneSave,
    handlePhoneVisibleToggle,
    handleProfessionSave,
    handleProfessionVisibleToggle,
    handleContactEmailSave,
    handleGenderChange,
    handlePhotoUpload,
    handlePhotoUploadClick,
    handleAvatarClick,
    handleRemoveAvatar,
  } = useProfileEditFormDesktop({ user, onUserUpdate });

  // Lokálny state pre input hodnotu mena - zachová medzery počas písania
  const [fullNameInput, setFullNameInput] = useState('');

  // Synchronizovať lokálny state s firstName a lastName
  useEffect(() => {
    const fullName = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || '';
    setFullNameInput(fullName);
  }, [firstName, lastName]);

  // Wrapper pre handleFullNameSave, ktorý parsuje input hodnotu pred uložením
  const handleFullNameSaveWithParse = async () => {
    const trimmedValue = fullNameInput.trim();
    const parts = trimmedValue.split(/\s+/).filter(Boolean);
    let newFirstName = '';
    let newLastName = '';
    
    if (parts.length === 0) {
      newFirstName = '';
      newLastName = '';
    } else if (parts.length === 1) {
      newFirstName = parts[0];
      newLastName = '';
    } else {
      newFirstName = parts.slice(0, -1).join(' ');
      newLastName = parts[parts.length - 1];
    }
    
    // Porovnať s aktuálnymi hodnotami
    const f = newFirstName.trim();
    const l = newLastName.trim();
    if (f === (user.first_name || '').trim() && l === (user.last_name || '').trim()) {
      // Žiadna zmena - len aktualizovať lokálny state
      setFirstName(newFirstName);
      setLastName(newLastName);
      return;
    }
    
    try {
      // Volať API priamo s novými hodnotami
      const response = await api.patch('/auth/profile/', {
        first_name: f,
        last_name: l,
      });
      
      // Aktualizovať state
      setFirstName(newFirstName);
      setLastName(newLastName);
      
      if (onUserUpdate && response.data?.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error: any) {
      console.error('Error saving full name:', error);
      // Revert na pôvodné hodnoty
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setFullNameInput(firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || '');
    }
  };

  return (
    <>
      <div 
        className="pt-4 pb-8 pl-0 text-[var(--foreground)] profile-edit-column"
      >
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6">
          {t('profile.editProfile', 'Upraviť profil')}
        </h2>
        
        {/* Fotka, meno, email a tlačidlo v bielom paneli */}
        <HeaderCard
          user={user}
          firstName={firstName}
          lastName={lastName}
          isUploading={isUploading}
          onPhotoUploadClick={handlePhotoUploadClick}
          onAvatarClick={handleAvatarClick}
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
                value={fullNameInput}
                onChange={(e) => {
                  setFullNameInput(e.target.value);
                }}
                onBlur={handleFullNameSaveWithParse}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleFullNameSaveWithParse();
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
                placeholder={t('profile.enterName', 'Zadajte svoje meno a priezvisko')}
              />
            </div>
            {/* Priezvisko zrušené – unified v jednom vstupe */}

            {/* Bio */}
            <BioField bio={bio} setBio={setBio} onSave={handleBioSave} />

            {/* Lokalita + okres (rovnaká logika ako pri kartách zručností) */}
            <LocationField
              location={location}
              district={district || ''}
              setLocation={setLocation}
              setDistrict={setDistrict}
              onSave={handleLocationSave}
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
                  value={ico}
                  onChange={(e) => {
                    // Povoliť iba číslice
                    const value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 14) {
                      setIco(value);
                    }
                  }}
                  onBlur={handleIcoSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleIcoSave();
                    }
                  }}
                  maxLength={14}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
                  placeholder="12345678901234"
                />
                {/* Prepínač pre zobrazenie IČO */}
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={handleIcoVisibleToggle}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                      icoVisible ? 'bg-purple-400 border border-purple-400' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                    style={{
                      transform: 'scaleY(0.8)',
                      transformOrigin: 'left center',
                    }}
                  >
                    <span
                      className={`absolute h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200 ease-in-out ${
                        icoVisible ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Zobraziť IČO verejne</span>
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
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={handlePhoneSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handlePhoneSave();
                  }
                }}
                maxLength={15}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
                placeholder={t('profile.phone', 'Tel. číslo')}
              />
              {/* Prepínač pre zobrazenie telefónu */}
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={handlePhoneVisibleToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                    phoneVisible ? 'bg-purple-400 border border-purple-400' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  style={{
                    transform: 'scaleY(0.8)',
                    transformOrigin: 'left center',
                  }}
                >
                  <span
                    className={`absolute h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200 ease-in-out ${
                      phoneVisible ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
                <span className="text-xs text-gray-500 dark:text-gray-400">{t('profile.showContactPublic', 'Zobraziť kontakt verejne')}</span>
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
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  onBlur={handleContactEmailSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleContactEmailSave();
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
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                onBlur={handleProfessionSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleProfessionSave();
                  }
                }}
                maxLength={100}
                className="w-full px-3 py-2 bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
                placeholder={t('profile.enterProfession', 'Zadajte svoju profesiu')}
              />
              {/* Prepínač pre zobrazenie profese */}
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={handleProfessionVisibleToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                    professionVisible ? 'bg-purple-400 border border-purple-400' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  style={{
                    transform: 'scaleY(0.8)',
                    transformOrigin: 'left center',
                  }}
                >
                  <span
                    className={`absolute h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200 ease-in-out ${
                      professionVisible ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
                <span className="text-xs text-gray-500 dark:text-gray-400">{t('profile.showProfessionPublic', 'Zobraziť profesiu verejne')}</span>
              </div>
            </div>
            )}

            {/* Web */}
            <WebsitesField
              user={user}
              website={website}
              additionalWebsites={additionalWebsites}
              setWebsite={setWebsite}
              setAdditionalWebsites={setAdditionalWebsites}
              onUserUpdate={onUserUpdate}
            />

            {/* Sociálne siete */}
            <SocialMediaInputs
              user={user}
              onUserUpdate={onUserUpdate}
            />

            {/* Pohlavie - iba pre osobné účty */}
            {accountType !== 'business' && (
            <div className="mb-4">
              <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('profile.gender', 'Pohlavie')}
              </label>
              <select
                id="gender"
                value={gender}
                onChange={(e) => handleGenderChange(e.target.value)}
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
      </div>

      <ProfileAvatarActionsModal
        open={isActionsOpen}
        user={user}
        isUploading={isUploading}
        onClose={() => setIsActionsOpen(false)}
        onPhotoUpload={handlePhotoUpload}
        onRemoveAvatar={handleRemoveAvatar}
      />
    </>
  );
}
