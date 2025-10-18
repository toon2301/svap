'use client';

import React, { useState } from 'react';
import { User } from '../../../types';
import UserAvatar from './profile/UserAvatar';
import ProfileEditFields from './ProfileEditFields';
import ProfileEditModals from './ProfileEditModals';

interface ProfileEditFormMobileProps {
  user: User;
  onUserUpdate?: (user: User) => void;
  onEditProfileClick?: () => void;
  onPhotoUpload?: (file: File) => void;
  isUploading?: boolean;
  onAvatarClick?: () => void;
}

export default function ProfileEditFormMobile({ 
  user, 
  onUserUpdate, 
  onEditProfileClick,
  onPhotoUpload,
  isUploading,
  onAvatarClick
}: ProfileEditFormMobileProps) {
  // Modal states
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [isBioModalOpen, setIsBioModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isProfessionModalOpen, setIsProfessionModalOpen] = useState(false);
  const [isWebsiteModalOpen, setIsWebsiteModalOpen] = useState(false);
  const [isInstagramModalOpen, setIsInstagramModalOpen] = useState(false);
  const [isFacebookModalOpen, setIsFacebookModalOpen] = useState(false);
  const [isLinkedinModalOpen, setIsLinkedinModalOpen] = useState(false);
  const [isGenderModalOpen, setIsGenderModalOpen] = useState(false);
  
  // Field values
  const [firstName, setFirstName] = useState(user.first_name || '');
  const [lastName, setLastName] = useState(user.last_name || '');
  const [bio, setBio] = useState(user.bio || '');
  const [location, setLocation] = useState(user.location || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [phoneVisible, setPhoneVisible] = useState(user.phone_visible || false);
  const [profession, setProfession] = useState(user.job_title || '');
  const [professionVisible, setProfessionVisible] = useState(user.job_title_visible || false);
  const [website, setWebsite] = useState(user.website || '');
  const [instagram, setInstagram] = useState(user.instagram || '');
  const [facebook, setFacebook] = useState(user.facebook || '');
  const [linkedin, setLinkedin] = useState(user.linkedin || '');
  const [gender, setGender] = useState(user.gender || '');
  
  // Original values for cancel functionality
  const [originalFirstName, setOriginalFirstName] = useState(user.first_name || '');
  const [originalLastName, setOriginalLastName] = useState(user.last_name || '');
  const [originalBio, setOriginalBio] = useState(user.bio || '');
  const [originalLocation, setOriginalLocation] = useState(user.location || '');
  const [originalPhone, setOriginalPhone] = useState(user.phone || '');
  const [originalPhoneVisible, setOriginalPhoneVisible] = useState(user.phone_visible || false);
  const [originalProfession, setOriginalProfession] = useState(user.job_title || '');
  const [originalProfessionVisible, setOriginalProfessionVisible] = useState(user.job_title_visible || false);
  const [originalWebsite, setOriginalWebsite] = useState(user.website || '');
  const [originalInstagram, setOriginalInstagram] = useState(user.instagram || '');
  const [originalFacebook, setOriginalFacebook] = useState(user.facebook || '');
  const [originalLinkedin, setOriginalLinkedin] = useState(user.linkedin || '');
  const [originalGender, setOriginalGender] = useState(user.gender || '');

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
        setIsNameModalOpen={setIsNameModalOpen}
        setIsBioModalOpen={setIsBioModalOpen}
        setIsLocationModalOpen={setIsLocationModalOpen}
        setIsContactModalOpen={setIsContactModalOpen}
        setIsProfessionModalOpen={setIsProfessionModalOpen}
        setIsWebsiteModalOpen={setIsWebsiteModalOpen}
        setIsInstagramModalOpen={setIsInstagramModalOpen}
        setIsFacebookModalOpen={setIsFacebookModalOpen}
        setIsLinkedinModalOpen={setIsLinkedinModalOpen}
        setIsGenderModalOpen={setIsGenderModalOpen}
      />

      {/* Modaly */}
      <ProfileEditModals
        user={user}
        onUserUpdate={onUserUpdate}
        isNameModalOpen={isNameModalOpen}
        isBioModalOpen={isBioModalOpen}
        isLocationModalOpen={isLocationModalOpen}
        isContactModalOpen={isContactModalOpen}
        isProfessionModalOpen={isProfessionModalOpen}
        isWebsiteModalOpen={isWebsiteModalOpen}
        isInstagramModalOpen={isInstagramModalOpen}
        isFacebookModalOpen={isFacebookModalOpen}
        isLinkedinModalOpen={isLinkedinModalOpen}
        isGenderModalOpen={isGenderModalOpen}
        firstName={firstName}
        lastName={lastName}
        bio={bio}
        location={location}
        phone={phone}
        phoneVisible={phoneVisible}
        profession={profession}
        professionVisible={professionVisible}
        website={website}
        instagram={instagram}
        facebook={facebook}
        linkedin={linkedin}
        gender={gender}
        originalFirstName={originalFirstName}
        originalLastName={originalLastName}
        originalBio={originalBio}
        originalLocation={originalLocation}
        originalPhone={originalPhone}
        originalPhoneVisible={originalPhoneVisible}
        originalProfession={originalProfession}
        originalProfessionVisible={originalProfessionVisible}
        originalWebsite={originalWebsite}
        originalInstagram={originalInstagram}
        originalFacebook={originalFacebook}
        originalLinkedin={originalLinkedin}
        originalGender={originalGender}
        setFirstName={setFirstName}
        setLastName={setLastName}
        setBio={setBio}
        setLocation={setLocation}
        setPhone={setPhone}
        setPhoneVisible={setPhoneVisible}
        setProfession={setProfession}
        setProfessionVisible={setProfessionVisible}
        setWebsite={setWebsite}
        setInstagram={setInstagram}
        setFacebook={setFacebook}
        setLinkedin={setLinkedin}
        setGender={setGender}
        setOriginalFirstName={setOriginalFirstName}
        setOriginalLastName={setOriginalLastName}
        setOriginalBio={setOriginalBio}
        setOriginalLocation={setOriginalLocation}
        setOriginalPhone={setOriginalPhone}
        setOriginalPhoneVisible={setOriginalPhoneVisible}
        setOriginalProfession={setOriginalProfession}
        setOriginalProfessionVisible={setOriginalProfessionVisible}
        setOriginalWebsite={setOriginalWebsite}
        setOriginalInstagram={setOriginalInstagram}
        setOriginalFacebook={setOriginalFacebook}
        setOriginalLinkedin={setOriginalLinkedin}
        setOriginalGender={setOriginalGender}
        setIsNameModalOpen={setIsNameModalOpen}
        setIsBioModalOpen={setIsBioModalOpen}
        setIsLocationModalOpen={setIsLocationModalOpen}
        setIsContactModalOpen={setIsContactModalOpen}
        setIsProfessionModalOpen={setIsProfessionModalOpen}
        setIsWebsiteModalOpen={setIsWebsiteModalOpen}
        setIsInstagramModalOpen={setIsInstagramModalOpen}
        setIsFacebookModalOpen={setIsFacebookModalOpen}
        setIsLinkedinModalOpen={setIsLinkedinModalOpen}
        setIsGenderModalOpen={setIsGenderModalOpen}
      />
      
      {/* Overenie profilu - placeholder */}
      <div className="mt-6 px-4">
        <span className="text-sm text-purple-600 font-medium">
          Overenie profilu
        </span>
      </div>
    </div>
  );
}