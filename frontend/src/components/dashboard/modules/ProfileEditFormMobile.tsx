'use client';

import React, { useState } from 'react';
import { User } from '../../../types';
import UserAvatar from './profile/UserAvatar';
import ProfileEditFields from './ProfileEditFields';
import ProfileEditModals from './ProfileEditModals';
import { useLanguage } from '@/contexts/LanguageContext';

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
  const [isGenderModalOpen, setIsGenderModalOpen] = useState(false);
  const [isIcoModalOpen, setIsIcoModalOpen] = useState(false);
  
  // Field values
  const [firstName, setFirstName] = useState(user.first_name || '');
  const [lastName, setLastName] = useState(user.last_name || '');
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
  const [gender, setGender] = useState(user.gender || '');
  
  // Original values for cancel functionality
  const [originalFirstName, setOriginalFirstName] = useState(user.first_name || '');
  const [originalLastName, setOriginalLastName] = useState(user.last_name || '');
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
  const [originalGender, setOriginalGender] = useState(user.gender || '');

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

  return (
    <div className="pt-2 pb-8">
      {/* Fotka v strede */}
      <div className="flex justify-center mb-4 px-4">
        <div className="relative">
          <UserAvatar
            user={user}
            size="medium"
            onAvatarClick={onAvatarClick}
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
        setIsGenderModalOpen={setIsGenderModalOpen}
        setIsIcoModalOpen={setIsIcoModalOpen}
      />

      {/* Modaly */}
      <ProfileEditModals
        user={user}
        onUserUpdate={onUserUpdate}
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
        isGenderModalOpen={isGenderModalOpen}
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
        gender={gender}
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
        originalGender={originalGender}
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
        setGender={setGender}
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
        setOriginalGender={setOriginalGender}
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
        setIsGenderModalOpen={setIsGenderModalOpen}
        setIsIcoModalOpen={setIsIcoModalOpen}
      />
      
      {/* Overenie profilu - placeholder */}
      <div className="mt-6 px-4">
        <span className="text-sm text-purple-600 font-medium">
          {t('profile.verifyProfile', 'Overenie profilu')}
        </span>
      </div>
    </div>
  );
}