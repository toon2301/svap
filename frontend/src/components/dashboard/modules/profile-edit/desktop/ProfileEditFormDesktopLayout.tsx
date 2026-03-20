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
  editableUser: User;
  accountType: 'personal' | 'business';
  t: (key: string, defaultValue: string) => string;
  onEditableUserUpdate: (partial: Partial<User>) => void;
  form: UseProfileEditFormDesktopReturn;
}

export function ProfileEditFormDesktopLayout({
  user,
  editableUser,
  accountType,
  t,
  onEditableUserUpdate,
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
            editableUser={editableUser}
            accountType={accountType}
            firstName={form.firstName}
            lastName={form.lastName}
            setFirstName={form.setFirstName}
            setLastName={form.setLastName}
            onEditableUserUpdate={onEditableUserUpdate}
            onBlur={form.handleFullNameBlur}
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
              contactEmailVisible={form.contactEmailVisible}
              onContactEmailSave={form.handleContactEmailSave}
              onContactEmailVisibleToggle={form.handleContactEmailVisibleToggle}
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
            editableUser={editableUser}
            website={form.website}
            additionalWebsites={form.additionalWebsites}
            setWebsite={form.setWebsite}
            setAdditionalWebsites={form.setAdditionalWebsites}
            onEditableUserUpdate={onEditableUserUpdate}
          />

          {/* Sociálne siete */}
          <SocialMediaInputs editableUser={editableUser} onEditableUserUpdate={onEditableUserUpdate} />

          {/* Save / Cancel */}
          <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 w-full">
            {form.onEditCancel ? (
                <button
                  type="button"
                  onClick={form.onEditCancel}
                  className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium"
                >
                  {t('common.cancel', 'Zrušiť')}
                </button>
            ) : null}
            {form.handleSave ? (
              <button
                type="button"
                onClick={form.handleSave}
                disabled={form.isSaving}
                className="flex-1 py-3 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
              >
                {form.isSaving ? t('common.loading', 'Ukladám...') : t('common.save', 'Uložiť')}
              </button>
            ) : null}
          </div>
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

