'use client';

import React, { useState } from 'react';
import { User } from '../../../types';
import UserAvatar from './profile/UserAvatar';
import ProfileEditFields from './ProfileEditFields';
import ProfileEditModals from './ProfileEditModals';
import ProfileAvatarActionsModal from './profile/ProfileAvatarActionsModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '../../../lib/api';

interface ProfileEditFormMobileProps {
  user: User;
  editableUser: User;
  onEditableUserUpdate?: (partial: Partial<User>) => void;
  onUserUpdate?: (user: User) => void;
  onEditProfileClick?: () => void;
  onEditCancel?: () => void;
  onEditSave?: (mergedUser?: User) => Promise<void>;
  onPhotoUpload?: (file: File) => void;
  onRemoveAvatar?: () => Promise<void>;
  isUploading?: boolean;
  onAvatarClick?: () => void;
  accountType?: 'personal' | 'business';
}

export default function ProfileEditFormMobile({
  user,
  editableUser,
  onEditableUserUpdate,
  onUserUpdate,
  onEditProfileClick,
  onEditCancel,
  onEditSave,
  onPhotoUpload,
  onRemoveAvatar,
  isUploading,
  onAvatarClick,
  accountType = 'personal',
}: ProfileEditFormMobileProps) {
  const { t } = useLanguage();
  const [isSaving, setIsSaving] = useState(false);
  // Modal states
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [isBioModalOpen, setIsBioModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isContactEmailModalOpen, setIsContactEmailModalOpen] = useState(false);
  const [isProfessionModalOpen, setIsProfessionModalOpen] = useState(false);
  const [isWebsiteModalOpen, setIsWebsiteModalOpen] = useState(false);
  const [isInstagramModalOpen, setIsInstagramModalOpen] = useState(false);
  const [isFacebookModalOpen, setIsFacebookModalOpen] = useState(false);
  const [isLinkedinModalOpen, setIsLinkedinModalOpen] = useState(false);
  const [isYouTubeModalOpen, setIsYouTubeModalOpen] = useState(false);
  const [isIcoModalOpen, setIsIcoModalOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  
  const source = editableUser;
  // Field values
  const [firstName, setFirstName] = useState(
    accountType === 'business' ? (source.company_name || '') : (source.first_name || '')
  );
  const [lastName, setLastName] = useState(
    accountType === 'business' ? '' : (source.last_name || '')
  );
  const [bio, setBio] = useState(source.bio || '');
  const [location, setLocation] = useState(source.location || '');
  const [district, setDistrict] = useState(source.district || '');
  const [ico, setIco] = useState(source.ico || '');
  const [icoVisible, setIcoVisible] = useState(source.ico_visible || false);
  const [phone, setPhone] = useState(source.phone || '');
  const [phoneVisible, setPhoneVisible] = useState(source.phone_visible || false);
  const [contactEmail, setContactEmail] = useState(source.contact_email || '');
  const [contactEmailVisible, setContactEmailVisible] = useState(source.contact_email_visible ?? false);
  const [profession, setProfession] = useState(source.job_title || '');
  const [professionVisible, setProfessionVisible] = useState(source.job_title_visible || false);
  const [website, setWebsite] = useState(source.website || '');
  const [additionalWebsites, setAdditionalWebsites] = useState<string[]>(source.additional_websites || []);
  const [instagram, setInstagram] = useState(source.instagram || '');
  const [facebook, setFacebook] = useState(source.facebook || '');
  const [linkedin, setLinkedin] = useState(source.linkedin || '');
  const [youtube, setYoutube] = useState(source.youtube || '');
  
  // Original values for cancel functionality
  const [originalFirstName, setOriginalFirstName] = useState(
    accountType === 'business' ? (source.company_name || '') : (source.first_name || '')
  );
  const [originalLastName, setOriginalLastName] = useState(
    accountType === 'business' ? '' : (source.last_name || '')
  );
  const [originalBio, setOriginalBio] = useState(source.bio || '');
  const [originalLocation, setOriginalLocation] = useState(source.location || '');
  const [originalDistrict, setOriginalDistrict] = useState(source.district || '');
  const [originalIco, setOriginalIco] = useState(source.ico || '');
  const [originalIcoVisible, setOriginalIcoVisible] = useState(source.ico_visible || false);
  const [originalPhone, setOriginalPhone] = useState(source.phone || '');
  const [originalPhoneVisible, setOriginalPhoneVisible] = useState(source.phone_visible || false);
  const [originalContactEmail, setOriginalContactEmail] = useState(source.contact_email || '');
  const [originalContactEmailVisible, setOriginalContactEmailVisible] = useState(source.contact_email_visible ?? false);
  const [originalProfession, setOriginalProfession] = useState(source.job_title || '');
  const [originalProfessionVisible, setOriginalProfessionVisible] = useState(source.job_title_visible || false);
  const [originalWebsite, setOriginalWebsite] = useState(source.website || '');
  const [originalAdditionalWebsites, setOriginalAdditionalWebsites] = useState<string[]>(source.additional_websites || []);
  const [originalInstagram, setOriginalInstagram] = useState(source.instagram || '');
  const [originalFacebook, setOriginalFacebook] = useState(source.facebook || '');
  const [originalLinkedin, setOriginalLinkedin] = useState(source.linkedin || '');
  const [originalYoutube, setOriginalYoutube] = useState(source.youtube || '');

  React.useEffect(() => {
    if (accountType === 'business') {
      const nameToUse = editableUser.first_name || editableUser.company_name || '';
      setFirstName(nameToUse);
      setLastName('');
      setOriginalFirstName(nameToUse);
      setOriginalLastName('');
    } else {
      const firstNameToUse = editableUser.first_name || editableUser.company_name || '';
      setFirstName(firstNameToUse);
      setLastName(editableUser.last_name || '');
      setOriginalFirstName(firstNameToUse);
      setOriginalLastName(editableUser.last_name || '');
    }
  }, [editableUser.company_name, editableUser.first_name, editableUser.last_name, accountType]);

  React.useEffect(() => {
    setAdditionalWebsites(editableUser.additional_websites || []);
    setOriginalAdditionalWebsites(editableUser.additional_websites || []);
  }, [editableUser.additional_websites]);

  React.useEffect(() => {
    setContactEmail(editableUser.contact_email || '');
    setOriginalContactEmail(editableUser.contact_email || '');
    if (typeof editableUser.contact_email_visible === 'boolean') {
      setContactEmailVisible(editableUser.contact_email_visible);
      setOriginalContactEmailVisible(editableUser.contact_email_visible);
    }
  }, [editableUser.contact_email, editableUser.contact_email_visible]);

  React.useEffect(() => {
    setIco(editableUser.ico || '');
    setIcoVisible(editableUser.ico_visible || false);
    setOriginalIco(editableUser.ico || '');
    setOriginalIcoVisible(editableUser.ico_visible || false);
  }, [editableUser.ico, editableUser.ico_visible]);

  React.useEffect(() => {
    setLocation(editableUser.location || '');
    setDistrict(editableUser.district || '');
    setOriginalLocation(editableUser.location || '');
    setOriginalDistrict(editableUser.district || '');
  }, [editableUser.location, editableUser.district]);

  React.useEffect(() => {
    setInstagram(editableUser.instagram || '');
    setFacebook(editableUser.facebook || '');
    setLinkedin(editableUser.linkedin || '');
    setYoutube(editableUser.youtube || '');
    setOriginalInstagram(editableUser.instagram || '');
    setOriginalFacebook(editableUser.facebook || '');
    setOriginalLinkedin(editableUser.linkedin || '');
    setOriginalYoutube(editableUser.youtube || '');
  }, [editableUser.instagram, editableUser.facebook, editableUser.linkedin, editableUser.youtube]);

  const handleAvatarClick = () => {
    setIsActionsOpen(true);
  };

  const handleRemoveAvatar = async () => {
    if (onRemoveAvatar) {
      await onRemoveAvatar();
      setIsActionsOpen(false);
    } else if (onUserUpdate) {
      try {
        const response = await api.patch('/auth/profile/', { avatar: null });
        if (response.data?.user) onUserUpdate(response.data.user);
        setIsActionsOpen(false);
      } catch (e: any) {
        console.error('Error removing avatar:', e);
      }
    }
  };

  const handlePhotoUpload = async (file: File) => {
    if (onPhotoUpload) {
      onPhotoUpload(file);
      setIsActionsOpen(false);
    } else if (onUserUpdate) {
      try {
        const formData = new FormData();
        formData.append('avatar', file);
        const response = await api.patch('/auth/profile/', formData);
        if (response.data?.user) onUserUpdate(response.data.user);
        setIsActionsOpen(false);
      } catch (e: any) {
        console.error('Error uploading photo:', e);
      }
    }
  };

  const buildMergedUser = (): User => ({
    ...editableUser,
    first_name: accountType === 'business' ? (firstName || '').trim() : (firstName || '').trim(),
    last_name: accountType === 'business' ? '' : (lastName || '').trim(),
    company_name: accountType === 'business' ? (firstName || '').trim() : `${(firstName || '').trim()} ${(lastName || '').trim()}`.trim(),
    bio: bio.trim(),
    location: location.trim(),
    district: district.trim(),
    ico: ico.replace(/\s/g, '').trim(),
    ico_visible: icoVisible,
    phone: phone.trim(),
    phone_visible: phoneVisible,
    contact_email: contactEmail.trim(),
    contact_email_visible: contactEmailVisible,
    job_title: profession.trim(),
    job_title_visible: professionVisible,
    website: website.trim(),
    additional_websites: additionalWebsites.filter((w) => (w || '').trim() !== ''),
    instagram: instagram.trim(),
    facebook: facebook.trim(),
    linkedin: linkedin.trim(),
    youtube: youtube.trim(),
  });

  return (
    <div className="pt-2 pb-8">
      {/* Fotka v strede */}
      <div className="flex justify-center mb-4 px-4">
        <div className="relative">
          <UserAvatar
            user={user}
            size="medium"
            onAvatarClick={handleAvatarClick}
            isUploading={isUploading}
          />
        </div>
      </div>

      {/* List položiek */}
      <ProfileEditFields
        user={editableUser}
        onUserUpdate={onUserUpdate}
        accountType={accountType}
        setIsNameModalOpen={setIsNameModalOpen}
        setIsBioModalOpen={setIsBioModalOpen}
        setIsLocationModalOpen={setIsLocationModalOpen}
        setIsContactModalOpen={setIsContactModalOpen}
        setIsContactEmailModalOpen={setIsContactEmailModalOpen}
        setIsProfessionModalOpen={setIsProfessionModalOpen}
        setIsWebsiteModalOpen={setIsWebsiteModalOpen}
        setIsInstagramModalOpen={setIsInstagramModalOpen}
        setIsFacebookModalOpen={setIsFacebookModalOpen}
        setIsLinkedinModalOpen={setIsLinkedinModalOpen}
        setIsYouTubeModalOpen={setIsYouTubeModalOpen}
        setIsIcoModalOpen={setIsIcoModalOpen}
      />

      {/* Modaly */}
      <ProfileEditModals
        user={editableUser}
        onUserUpdate={onUserUpdate}
        onEditableUserUpdate={onEditableUserUpdate}
        accountType={accountType}
        isNameModalOpen={isNameModalOpen}
        isBioModalOpen={isBioModalOpen}
        isLocationModalOpen={isLocationModalOpen}
        isContactModalOpen={isContactModalOpen}
        isContactEmailModalOpen={isContactEmailModalOpen}
        isProfessionModalOpen={isProfessionModalOpen}
        isWebsiteModalOpen={isWebsiteModalOpen}
        isInstagramModalOpen={isInstagramModalOpen}
        isFacebookModalOpen={isFacebookModalOpen}
        isLinkedinModalOpen={isLinkedinModalOpen}
        isYouTubeModalOpen={isYouTubeModalOpen}
        isIcoModalOpen={isIcoModalOpen}
        firstName={firstName}
        lastName={lastName}
        bio={bio}
        location={location}
        district={district}
        ico={ico}
        icoVisible={icoVisible}
        phone={phone}
        phoneVisible={phoneVisible}
        contactEmail={contactEmail}
        contactEmailVisible={contactEmailVisible}
        profession={profession}
        professionVisible={professionVisible}
        website={website}
        additionalWebsites={additionalWebsites}
        instagram={instagram}
        facebook={facebook}
        linkedin={linkedin}
        youtube={youtube}
        originalFirstName={originalFirstName}
        originalLastName={originalLastName}
        originalBio={originalBio}
        originalLocation={originalLocation}
        originalDistrict={originalDistrict}
        originalIco={originalIco}
        originalIcoVisible={originalIcoVisible}
        originalPhone={originalPhone}
        originalPhoneVisible={originalPhoneVisible}
        originalContactEmail={originalContactEmail}
        originalContactEmailVisible={originalContactEmailVisible}
        originalProfession={originalProfession}
        originalProfessionVisible={originalProfessionVisible}
        originalWebsite={originalWebsite}
        originalAdditionalWebsites={originalAdditionalWebsites}
        originalInstagram={originalInstagram}
        originalFacebook={originalFacebook}
        originalLinkedin={originalLinkedin}
        originalYoutube={originalYoutube}
        setFirstName={setFirstName}
        setLastName={setLastName}
        setBio={setBio}
        setLocation={setLocation}
        setDistrict={setDistrict}
        setIco={setIco}
        setIcoVisible={setIcoVisible}
        setPhone={setPhone}
        setPhoneVisible={setPhoneVisible}
        setProfession={setProfession}
        setProfessionVisible={setProfessionVisible}
        setWebsite={setWebsite}
        setAdditionalWebsites={setAdditionalWebsites}
        setInstagram={setInstagram}
        setFacebook={setFacebook}
        setLinkedin={setLinkedin}
        setYoutube={setYoutube}
        setOriginalFirstName={setOriginalFirstName}
        setOriginalLastName={setOriginalLastName}
        setOriginalBio={setOriginalBio}
        setOriginalLocation={setOriginalLocation}
        setOriginalDistrict={setOriginalDistrict}
        setOriginalIco={setOriginalIco}
        setOriginalIcoVisible={setOriginalIcoVisible}
        setOriginalPhone={setOriginalPhone}
        setOriginalPhoneVisible={setOriginalPhoneVisible}
        setContactEmail={setContactEmail}
        setContactEmailVisible={setContactEmailVisible}
        setOriginalContactEmail={setOriginalContactEmail}
        setOriginalContactEmailVisible={setOriginalContactEmailVisible}
        setOriginalProfession={setOriginalProfession}
        setOriginalProfessionVisible={setOriginalProfessionVisible}
        setOriginalWebsite={setOriginalWebsite}
        setOriginalAdditionalWebsites={setOriginalAdditionalWebsites}
        setOriginalInstagram={setOriginalInstagram}
        setOriginalFacebook={setOriginalFacebook}
        setOriginalLinkedin={setOriginalLinkedin}
        setOriginalYoutube={setOriginalYoutube}
        setIsNameModalOpen={setIsNameModalOpen}
        setIsBioModalOpen={setIsBioModalOpen}
        setIsLocationModalOpen={setIsLocationModalOpen}
        setIsContactModalOpen={setIsContactModalOpen}
        setIsContactEmailModalOpen={setIsContactEmailModalOpen}
        setIsProfessionModalOpen={setIsProfessionModalOpen}
        setIsWebsiteModalOpen={setIsWebsiteModalOpen}
        setIsInstagramModalOpen={setIsInstagramModalOpen}
        setIsFacebookModalOpen={setIsFacebookModalOpen}
        setIsLinkedinModalOpen={setIsLinkedinModalOpen}
        setIsYouTubeModalOpen={setIsYouTubeModalOpen}
        setIsIcoModalOpen={setIsIcoModalOpen}
      />
      
      {/* Save / Cancel */}
      {(onEditSave || onEditCancel) && (
        <div className="flex gap-3 mt-6 px-4">
          {onEditCancel && (
            <button
              type="button"
              onClick={onEditCancel}
              disabled={isSaving}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
            >
              {t('common.cancel', 'Zrušiť')}
            </button>
          )}
          {onEditSave && (
            <button
              type="button"
              onClick={async () => {
                try {
                  setIsSaving(true);
                  await onEditSave(buildMergedUser());
                } finally {
                  setIsSaving(false);
                }
              }}
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg disabled:opacity-50"
            >
              {isSaving ? t('common.loading', 'Ukladám...') : t('common.save', 'Uložiť')}
            </button>
          )}
        </div>
      )}

      {/* Overenie profilu - placeholder */}
      <div className="mt-6 px-4">
        <span className="text-sm text-purple-600 font-medium">
          {t('profile.verifyProfile', 'Overenie profilu')}
        </span>
      </div>

      {/* Avatar actions modal */}
      <ProfileAvatarActionsModal
        open={isActionsOpen}
        user={user}
        isUploading={isUploading || false}
        onClose={() => setIsActionsOpen(false)}
        onPhotoUpload={handlePhotoUpload}
        onRemoveAvatar={handleRemoveAvatar}
      />
    </div>
  );
}