'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { User } from '../../../types';
import HeaderCard from './profile-edit/desktop/HeaderCard';
import WebsitesField from './profile-edit/desktop/WebsitesField';
import BioField from './profile-edit/desktop/fields/BioField';
import LocationField from './profile-edit/desktop/fields/LocationField';
import FullNameField from './profile-edit/desktop/fields/FullNameField';
import PhoneField from './profile-edit/desktop/fields/PhoneField';
import ProfessionField from './profile-edit/desktop/fields/ProfessionField';
import GenderField from './profile-edit/desktop/fields/GenderField';
import BusinessFieldsSection from './profile-edit/desktop/sections/BusinessFieldsSection';
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

  // full name / company name logika je presunutá do FullNameField (bez zmeny správania)

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
            <FullNameField
              user={user}
              accountType={accountType}
              firstName={firstName}
              lastName={lastName}
              setFirstName={setFirstName}
              setLastName={setLastName}
              onUserUpdate={onUserUpdate}
            />
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

            {accountType === 'business' && (
              <BusinessFieldsSection
                ico={ico}
                setIco={setIco}
                icoVisible={icoVisible}
                onIcoSave={handleIcoSave}
                onIcoVisibleToggle={handleIcoVisibleToggle}
                contactEmail={contactEmail}
                setContactEmail={setContactEmail}
                onContactEmailSave={handleContactEmailSave}
              />
            )}

            <PhoneField
              phone={phone}
              setPhone={setPhone}
              phoneVisible={phoneVisible}
              onSave={handlePhoneSave}
              onVisibleToggle={handlePhoneVisibleToggle}
            />

            

            {/* Profesia - len pre osobný účet */}
            {accountType === 'personal' && (
              <ProfessionField
                profession={profession}
                setProfession={setProfession}
                professionVisible={professionVisible}
                onSave={handleProfessionSave}
                onVisibleToggle={handleProfessionVisibleToggle}
              />
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
              <GenderField gender={gender} onChange={handleGenderChange} />
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
