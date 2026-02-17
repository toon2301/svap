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
  onUserUpdate?: (user: User) => void;
  onEditProfileClick?: () => void;
  onPhotoUpload?: (file: File) => void;
  isUploading?: boolean;
  onAvatarClick?: () => void;
  accountType?: 'personal' | 'business';
}

export default function ProfileEditFormMobile({ 
  user, 
  onUserUpdate, 
  onEditProfileClick,
  onPhotoUpload,
  isUploading,
  onAvatarClick,
  accountType = 'personal'
}: ProfileEditFormMobileProps) {
  const { t } = useLanguage();
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
  
  // Field values
  // Pre firmy používame company_name, pre osobné účty first_name + last_name
  const [firstName, setFirstName] = useState(
    accountType === 'business' ? (user.company_name || '') : (user.first_name || '')
  );
  const [lastName, setLastName] = useState(
    accountType === 'business' ? '' : (user.last_name || '')
  );
  const [bio, setBio] = useState(user.bio || '');
  const [location, setLocation] = useState(user.location || '');
  const [district, setDistrict] = useState(user.district || '');
  const [ico, setIco] = useState(user.ico || '');
  const [icoVisible, setIcoVisible] = useState(user.ico_visible || false);
  const [phone, setPhone] = useState(user.phone || '');
  const [phoneVisible, setPhoneVisible] = useState(user.phone_visible || false);
  const [contactEmail, setContactEmail] = useState(user.contact_email || '');
  const [profession, setProfession] = useState(user.job_title || '');
  const [professionVisible, setProfessionVisible] = useState(user.job_title_visible || false);
  const [website, setWebsite] = useState(user.website || '');
  const [additionalWebsites, setAdditionalWebsites] = useState<string[]>(user.additional_websites || []);
  const [instagram, setInstagram] = useState(user.instagram || '');
  const [facebook, setFacebook] = useState(user.facebook || '');
  const [linkedin, setLinkedin] = useState(user.linkedin || '');
  const [youtube, setYoutube] = useState(user.youtube || '');
  
  // Original values for cancel functionality
  const [originalFirstName, setOriginalFirstName] = useState(
    accountType === 'business' ? (user.company_name || '') : (user.first_name || '')
  );
  const [originalLastName, setOriginalLastName] = useState(
    accountType === 'business' ? '' : (user.last_name || '')
  );
  const [originalBio, setOriginalBio] = useState(user.bio || '');
  const [originalLocation, setOriginalLocation] = useState(user.location || '');
  const [originalDistrict, setOriginalDistrict] = useState(user.district || '');
  const [originalIco, setOriginalIco] = useState(user.ico || '');
  const [originalIcoVisible, setOriginalIcoVisible] = useState(user.ico_visible || false);
  const [originalPhone, setOriginalPhone] = useState(user.phone || '');
  const [originalPhoneVisible, setOriginalPhoneVisible] = useState(user.phone_visible || false);
  const [originalContactEmail, setOriginalContactEmail] = useState(user.contact_email || '');
  const [originalProfession, setOriginalProfession] = useState(user.job_title || '');
  const [originalProfessionVisible, setOriginalProfessionVisible] = useState(user.job_title_visible || false);
  const [originalWebsite, setOriginalWebsite] = useState(user.website || '');
  const [originalAdditionalWebsites, setOriginalAdditionalWebsites] = useState<string[]>(user.additional_websites || []);
  const [originalInstagram, setOriginalInstagram] = useState(user.instagram || '');
  const [originalFacebook, setOriginalFacebook] = useState(user.facebook || '');
  const [originalLinkedin, setOriginalLinkedin] = useState(user.linkedin || '');
  const [originalYoutube, setOriginalYoutube] = useState(user.youtube || '');

  // Synchronizovať firstName a lastName s user objektom (pre firmy používame company_name)
  // Preferovať synchronizované meno - ak existuje first_name, použiť ho aj pre business
  React.useEffect(() => {
    if (accountType === 'business') {
      // Pre firmy používame company_name, ale ak existuje first_name (synchronizované), preferovať ho
      const nameToUse = user.first_name || user.company_name || '';
      setFirstName(nameToUse);
      setLastName('');
      setOriginalFirstName(nameToUse);
      setOriginalLastName('');
    } else {
      // Pre osobné účty používame first_name + last_name
      // Ak existuje company_name (synchronizované), použiť ho ako first_name
      const firstNameToUse = user.first_name || user.company_name || '';
      setFirstName(firstNameToUse);
      setLastName(user.last_name || '');
      setOriginalFirstName(firstNameToUse);
      setOriginalLastName(user.last_name || '');
    }
  }, [user.company_name, user.first_name, user.last_name, accountType]);

  // Update states when user prop changes
  React.useEffect(() => {
    setAdditionalWebsites(user.additional_websites || []);
    setOriginalAdditionalWebsites(user.additional_websites || []);
  }, [user.additional_websites]);

  React.useEffect(() => {
    setContactEmail(user.contact_email || '');
    setOriginalContactEmail(user.contact_email || '');
  }, [user.contact_email]);

  React.useEffect(() => {
    setIco(user.ico || '');
    setIcoVisible(user.ico_visible || false);
    setOriginalIco(user.ico || '');
    setOriginalIcoVisible(user.ico_visible || false);
  }, [user.ico, user.ico_visible]);

  React.useEffect(() => {
    setLocation(user.location || '');
    setDistrict(user.district || '');
    setOriginalLocation(user.location || '');
    setOriginalDistrict(user.district || '');
  }, [user.location, user.district]);

  React.useEffect(() => {
    setInstagram(user.instagram || '');
    setFacebook(user.facebook || '');
    setLinkedin(user.linkedin || '');
    setYoutube(user.youtube || '');
    setOriginalInstagram(user.instagram || '');
    setOriginalFacebook(user.facebook || '');
    setOriginalLinkedin(user.linkedin || '');
    setOriginalYoutube(user.youtube || '');
  }, [user.instagram, user.facebook, user.linkedin, user.youtube]);

  const handleAvatarClick = () => {
    setIsActionsOpen(true);
  };

  const handleRemoveAvatar = async () => {
    if (!onPhotoUpload) return;
    
    try {
      const response = await api.patch('/auth/profile/', { avatar: null });
      if (onUserUpdate && response.data.user) {
        onUserUpdate(response.data.user);
      }
      setIsActionsOpen(false);
    } catch (e: any) {
      console.error('Error removing avatar:', e);
    }
  };

  const handlePhotoUpload = async (file: File) => {
    if (onPhotoUpload) {
      onPhotoUpload(file);
      setIsActionsOpen(false);
    } else {
      // Fallback: implementácia uploadu priamo tu
      try {
        const formData = new FormData();
        formData.append('avatar', file);
        const response = await api.patch('/auth/profile/', formData);
        if (onUserUpdate && response.data.user) {
          onUserUpdate(response.data.user);
        }
        setIsActionsOpen(false);
      } catch (e: any) {
        console.error('Error uploading photo:', e);
      }
    }
  };

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
        user={user}
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
        user={user}
        onUserUpdate={onUserUpdate}
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
        setOriginalContactEmail={setOriginalContactEmail}
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