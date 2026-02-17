'use client';

import React from 'react';
import type { User } from '@/types';
import type { UseProfileEditFormDesktopReturn } from '../../profile/useProfileEditFormDesktop';

import HeaderCard from './HeaderCard';
import WebsitesField from './WebsitesField';
import BioField from './fields/BioField';
import LocationField from './fields/LocationField';
import FullNameField from './fields/FullNameField';
import PhoneField from './fields/PhoneField';
import ProfessionField from './fields/ProfessionField';
import BusinessFieldsSection from './sections/BusinessFieldsSection';

import SocialMediaInputs from '../../SocialMediaInputs';
import ProfileAvatarActionsModal from '../../profile/ProfileAvatarActionsModal';

interface ProfileEditFormDesktopLayoutProps {
  user: User;
  accountType: 'personal' | 'business';
  t: (key: string, defaultValue: string) => string;
  onUserUpdate?: (user: User) => void;
  form: UseProfileEditFormDesktopReturn;
}

export function ProfileEditFormDesktopLayout({
  user,
  accountType,
  t,
  onUserUpdate,
  form,
}: ProfileEditFormDesktopLayoutProps) {
  return (
    <>
      <div className="pt-4 pb-8 pl-0 text-[var(--foreground)] profile-edit-column">
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
          <FullNameField
            user={user}
            accountType={accountType}
            firstName={form.firstName}
            lastName={form.lastName}
            setFirstName={form.setFirstName}
            setLastName={form.setLastName}
            onUserUpdate={onUserUpdate}
          />
          {/* Priezvisko zrušené – unified v jednom vstupe */}

          {/* Bio */}
          <BioField bio={form.bio} setBio={form.setBio} onSave={form.handleBioSave} />

          {/* Lokalita + okres (rovnaká logika ako pri kartách zručností) */}
          <LocationField
            location={form.location}
            district={form.district || ''}
            setLocation={form.setLocation}
            setDistrict={form.setDistrict}
            onSave={form.handleLocationSave}
          />

          {accountType === 'business' && (
            <BusinessFieldsSection
              ico={form.ico}
              setIco={form.setIco}
              icoVisible={form.icoVisible}
              onIcoSave={form.handleIcoSave}
              onIcoVisibleToggle={form.handleIcoVisibleToggle}
              contactEmail={form.contactEmail}
              setContactEmail={form.setContactEmail}
              onContactEmailSave={form.handleContactEmailSave}
            />
          )}

          <PhoneField
            phone={form.phone}
            setPhone={form.setPhone}
            phoneVisible={form.phoneVisible}
            onSave={form.handlePhoneSave}
            onVisibleToggle={form.handlePhoneVisibleToggle}
          />

          {/* Profesia - len pre osobný účet */}
          {accountType === 'personal' && (
            <ProfessionField
              profession={form.profession}
              setProfession={form.setProfession}
              professionVisible={form.professionVisible}
              onSave={form.handleProfessionSave}
              onVisibleToggle={form.handleProfessionVisibleToggle}
            />
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
        </div>
      </div>

      <ProfileAvatarActionsModal
        open={form.isActionsOpen}
        user={user}
        isUploading={form.isUploading}
        onClose={() => form.setIsActionsOpen(false)}
        onPhotoUpload={form.handlePhotoUpload}
        onRemoveAvatar={form.handleRemoveAvatar}
      />
    </>
  );
}

