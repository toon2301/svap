'use client';

import React from 'react';
import { User } from '../../../types';
import { useLanguage } from '@/contexts/LanguageContext';
import NameModal from './profile-edit/modals/NameModal';
import BioModal from './profile-edit/modals/BioModal';
import LocationModal from './profile-edit/modals/LocationModal';
import ContactModal from './profile-edit/modals/ContactModal';
import IcoModal from './profile-edit/modals/IcoModal';
import ContactEmailModal from './profile-edit/modals/ContactEmailModal';
import ProfessionModal from './profile-edit/modals/ProfessionModal';
import WebsiteModal from './profile-edit/modals/WebsiteModal';
import InstagramModal from './profile-edit/modals/InstagramModal';
import FacebookModal from './profile-edit/modals/FacebookModal';
import LinkedinModal from './profile-edit/modals/LinkedinModal';
import GenderModal from './profile-edit/modals/GenderModal';

interface ProfileEditModalsProps {
  user: User;
  onUserUpdate?: (user: User) => void;
  
  // Modal states
  isNameModalOpen: boolean;
  isBioModalOpen: boolean;
  isLocationModalOpen: boolean;
  isContactModalOpen: boolean;
  isContactEmailModalOpen: boolean;
  isProfessionModalOpen: boolean;
  isWebsiteModalOpen: boolean;
  isInstagramModalOpen: boolean;
  isFacebookModalOpen: boolean;
  isLinkedinModalOpen: boolean;
  isGenderModalOpen: boolean;
  isIcoModalOpen: boolean;
  
  // Field values
  firstName: string;
  lastName: string;
  bio: string;
  location: string;
  district: string;
  ico: string;
  icoVisible: boolean;
  phone: string;
  phoneVisible: boolean;
  contactEmail: string;
  profession: string;
  professionVisible: boolean;
  website: string;
  additionalWebsites: string[];
  instagram: string;
  facebook: string;
  linkedin: string;
  gender: string;
  
  // Original values for cancel
  originalFirstName: string;
  originalLastName: string;
  originalBio: string;
  originalLocation: string;
  originalDistrict: string;
  originalIco: string;
  originalIcoVisible: boolean;
  originalPhone: string;
  originalPhoneVisible: boolean;
  originalContactEmail: string;
  originalProfession: string;
  originalProfessionVisible: boolean;
  originalWebsite: string;
  originalAdditionalWebsites: string[];
  originalInstagram: string;
  originalFacebook: string;
  originalLinkedin: string;
  originalGender: string;
  
  // Setters
  setFirstName: (value: string) => void;
  setLastName: (value: string) => void;
  setBio: (value: string) => void;
  setLocation: (value: string) => void;
  setDistrict: (value: string) => void;
  setIco: (value: string) => void;
  setIcoVisible: (value: boolean) => void;
  setPhone: (value: string) => void;
  setPhoneVisible: (value: boolean) => void;
  setContactEmail: (value: string) => void;
  setProfession: (value: string) => void;
  setProfessionVisible: (value: boolean) => void;
  setWebsite: (value: string) => void;
  setAdditionalWebsites: (value: string[]) => void;
  setInstagram: (value: string) => void;
  setFacebook: (value: string) => void;
  setLinkedin: (value: string) => void;
  setGender: (value: string) => void;
  
  // Original setters
  setOriginalFirstName: (value: string) => void;
  setOriginalLastName: (value: string) => void;
  setOriginalBio: (value: string) => void;
  setOriginalLocation: (value: string) => void;
  setOriginalDistrict: (value: string) => void;
  setOriginalIco: (value: string) => void;
  setOriginalIcoVisible: (value: boolean) => void;
  setOriginalPhone: (value: string) => void;
  setOriginalPhoneVisible: (value: boolean) => void;
  setOriginalContactEmail: (value: string) => void;
  setOriginalProfession: (value: string) => void;
  setOriginalProfessionVisible: (value: boolean) => void;
  setOriginalWebsite: (value: string) => void;
  setOriginalAdditionalWebsites: (value: string[]) => void;
  setOriginalInstagram: (value: string) => void;
  setOriginalFacebook: (value: string) => void;
  setOriginalLinkedin: (value: string) => void;
  setOriginalGender: (value: string) => void;
  
  // Modal setters
  setIsNameModalOpen: (value: boolean) => void;
  setIsBioModalOpen: (value: boolean) => void;
  setIsLocationModalOpen: (value: boolean) => void;
  setIsContactModalOpen: (value: boolean) => void;
  setIsContactEmailModalOpen: (value: boolean) => void;
  setIsProfessionModalOpen: (value: boolean) => void;
  setIsWebsiteModalOpen: (value: boolean) => void;
  setIsInstagramModalOpen: (value: boolean) => void;
  setIsFacebookModalOpen: (value: boolean) => void;
  setIsLinkedinModalOpen: (value: boolean) => void;
  setIsGenderModalOpen: (value: boolean) => void;
  setIsIcoModalOpen: (value: boolean) => void;
}

export default function ProfileEditModals({
  user,
  onUserUpdate,
  isNameModalOpen,
  isBioModalOpen,
  isLocationModalOpen,
  isContactModalOpen,
  isContactEmailModalOpen,
  isProfessionModalOpen,
  isWebsiteModalOpen,
  isInstagramModalOpen,
  isFacebookModalOpen,
  isLinkedinModalOpen,
  isGenderModalOpen,
  isIcoModalOpen,
  firstName,
  lastName,
  bio,
  location,
  district,
  ico,
  icoVisible,
  phone,
  phoneVisible,
  contactEmail,
  profession,
  professionVisible,
  website,
  additionalWebsites,
  instagram,
  facebook,
  linkedin,
  gender,
  originalFirstName,
  originalLastName,
  originalBio,
  originalLocation,
  originalDistrict,
  originalIco,
  originalIcoVisible,
  originalPhone,
  originalPhoneVisible,
  originalContactEmail,
  originalProfession,
  originalProfessionVisible,
  originalWebsite,
  originalAdditionalWebsites,
  originalInstagram,
  originalFacebook,
  originalLinkedin,
  originalGender,
  setFirstName,
  setLastName,
  setBio,
  setLocation,
  setDistrict,
  setIco,
  setIcoVisible,
  setPhone,
  setPhoneVisible,
  setContactEmail,
  setProfession,
  setProfessionVisible,
  setWebsite,
  setAdditionalWebsites,
  setInstagram,
  setFacebook,
  setLinkedin,
  setGender,
  setOriginalFirstName,
  setOriginalLastName,
  setOriginalBio,
  setOriginalLocation,
  setOriginalDistrict,
  setOriginalIco,
  setOriginalIcoVisible,
  setOriginalPhone,
  setOriginalPhoneVisible,
  setOriginalContactEmail,
  setOriginalProfession,
  setOriginalProfessionVisible,
  setOriginalWebsite,
  setOriginalAdditionalWebsites,
  setOriginalInstagram,
  setOriginalFacebook,
  setOriginalLinkedin,
  setOriginalGender,
  setIsNameModalOpen,
  setIsBioModalOpen,
  setIsLocationModalOpen,
  setIsContactModalOpen,
  setIsContactEmailModalOpen,
  setIsProfessionModalOpen,
  setIsWebsiteModalOpen,
  setIsInstagramModalOpen,
  setIsFacebookModalOpen,
  setIsLinkedinModalOpen,
  setIsGenderModalOpen,
  setIsIcoModalOpen,
}: ProfileEditModalsProps) {
  const { t } = useLanguage();

  return (
    <>
      <NameModal
        isOpen={isNameModalOpen}
        firstName={firstName}
        lastName={lastName}
        originalFirstName={originalFirstName}
        originalLastName={originalLastName}
        setFirstName={setFirstName}
        setLastName={setLastName}
        setOriginalFirstName={setOriginalFirstName}
        setOriginalLastName={setOriginalLastName}
        onClose={() => setIsNameModalOpen(false)}
        onUserUpdate={onUserUpdate}
      />

      {/* Modal pre úpravu bio */}
      <BioModal
        isOpen={isBioModalOpen}
        bio={bio}
        originalBio={originalBio}
        setBio={setBio}
        setOriginalBio={setOriginalBio}
        onClose={() => setIsBioModalOpen(false)}
        onUserUpdate={onUserUpdate}
      />

      {/* Modal pre úpravu lokality */}
      <LocationModal
        isOpen={isLocationModalOpen}
        location={location}
        district={district}
        originalLocation={originalLocation}
        originalDistrict={originalDistrict}
        setLocation={setLocation}
        setDistrict={setDistrict}
        setOriginalLocation={setOriginalLocation}
        setOriginalDistrict={setOriginalDistrict}
        onClose={() => setIsLocationModalOpen(false)}
        onUserUpdate={onUserUpdate}
      />

      {/* Modal pre úpravu kontaktu */}
      <ContactModal
        isOpen={isContactModalOpen}
        phone={phone}
        phoneVisible={phoneVisible}
        originalPhone={originalPhone}
        originalPhoneVisible={originalPhoneVisible}
        setPhone={setPhone}
        setPhoneVisible={setPhoneVisible}
        setOriginalPhone={setOriginalPhone}
        setOriginalPhoneVisible={setOriginalPhoneVisible}
        onClose={() => setIsContactModalOpen(false)}
        onUserUpdate={onUserUpdate}
      />

      {/* Modal pre úpravu IČO */}
      <IcoModal
        isOpen={isIcoModalOpen}
        ico={ico}
        icoVisible={icoVisible}
        originalIco={originalIco}
        originalIcoVisible={originalIcoVisible}
        setIco={setIco}
        setIcoVisible={setIcoVisible}
        setOriginalIco={setOriginalIco}
        setOriginalIcoVisible={setOriginalIcoVisible}
        onClose={() => setIsIcoModalOpen(false)}
        onUserUpdate={onUserUpdate}
      />

      {/* Modal pre úpravu kontaktného emailu */}
      <ContactEmailModal
        isOpen={isContactEmailModalOpen}
        contactEmail={contactEmail}
        originalContactEmail={originalContactEmail}
        setContactEmail={setContactEmail}
        setOriginalContactEmail={setOriginalContactEmail}
        onClose={() => setIsContactEmailModalOpen(false)}
        onUserUpdate={onUserUpdate}
      />

      {/* Modal pre úpravu profese */}
      <ProfessionModal
        isOpen={isProfessionModalOpen}
        profession={profession}
        originalProfession={originalProfession}
        professionVisible={professionVisible}
        originalProfessionVisible={originalProfessionVisible}
        setProfession={setProfession}
        setProfessionVisible={setProfessionVisible}
        setOriginalProfession={setOriginalProfession}
        setOriginalProfessionVisible={setOriginalProfessionVisible}
        onClose={() => setIsProfessionModalOpen(false)}
        onUserUpdate={onUserUpdate}
      />

      {/* Modal pre úpravu webu */}
      <WebsiteModal
        isOpen={isWebsiteModalOpen}
        website={website}
        additionalWebsites={additionalWebsites}
        originalWebsite={originalWebsite}
        originalAdditionalWebsites={originalAdditionalWebsites}
        setWebsite={setWebsite}
        setAdditionalWebsites={setAdditionalWebsites}
        setOriginalWebsite={setOriginalWebsite}
        setOriginalAdditionalWebsites={setOriginalAdditionalWebsites}
        onClose={() => setIsWebsiteModalOpen(false)}
        onUserUpdate={onUserUpdate}
      />

      {/* Modal pre úpravu Instagramu */}
      <InstagramModal
        isOpen={isInstagramModalOpen}
        instagram={instagram}
        originalInstagram={originalInstagram}
        setInstagram={setInstagram}
        setOriginalInstagram={setOriginalInstagram}
        onClose={() => setIsInstagramModalOpen(false)}
        onUserUpdate={onUserUpdate}
      />

      {/* Modal pre úpravu Facebooku */}
      <FacebookModal
        isOpen={isFacebookModalOpen}
        facebook={facebook}
        originalFacebook={originalFacebook}
        setFacebook={setFacebook}
        setOriginalFacebook={setOriginalFacebook}
        onClose={() => setIsFacebookModalOpen(false)}
        onUserUpdate={onUserUpdate}
      />

      {/* Modal pre úpravu LinkedIn */}
      <LinkedinModal
        isOpen={isLinkedinModalOpen}
        linkedin={linkedin}
        originalLinkedin={originalLinkedin}
        setLinkedin={setLinkedin}
        setOriginalLinkedin={setOriginalLinkedin}
        onClose={() => setIsLinkedinModalOpen(false)}
        onUserUpdate={onUserUpdate}
      />

      {/* Modal pre úpravu pohlavia */}
      <GenderModal
        isOpen={isGenderModalOpen}
        gender={gender}
        originalGender={originalGender}
        setGender={setGender}
        setOriginalGender={setOriginalGender}
        onClose={() => setIsGenderModalOpen(false)}
        onUserUpdate={onUserUpdate}
      />
    </>
  );
}
