'use client';

import React from 'react';
import { User } from '../../../types';
import { api } from '../../../lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

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
  
  // Handle functions
  const handleSaveName = async () => {
    try {
      const response = await api.patch('/auth/profile/', {
        first_name: firstName,
        last_name: lastName,
      });
      setOriginalFirstName(firstName);
      setOriginalLastName(lastName);
      setIsNameModalOpen(false);
      if (onUserUpdate && response.data?.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error) {
      console.error('Chyba pri ukladaní mena:', error);
    }
  };

  const handleCancelName = () => {
    setFirstName(originalFirstName);
    setLastName(originalLastName);
    setIsNameModalOpen(false);
  };

  const handleSaveBio = async () => {
    try {
      const response = await api.patch('/auth/profile/', {
        bio: bio,
      });
      setOriginalBio(bio);
      setIsBioModalOpen(false);
      if (onUserUpdate && response.data?.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error) {
      console.error('Chyba pri ukladaní bio:', error);
    }
  };

  const handleCancelBio = () => {
    setBio(originalBio);
    setIsBioModalOpen(false);
  };

  const handleSaveLocation = async () => {
    try {
      const response = await api.patch('/auth/profile/', {
        location: location,
      });
      setOriginalLocation(location);
      setIsLocationModalOpen(false);
      if (onUserUpdate && response.data?.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error) {
      console.error('Chyba pri ukladaní lokality:', error);
    }
  };

  const handleCancelLocation = () => {
    setLocation(originalLocation);
    setIsLocationModalOpen(false);
  };

  const handleSaveContact = async () => {
    try {
      const response = await api.patch('/auth/profile/', {
        phone: phone,
        phone_visible: phoneVisible,
      });
      setOriginalPhone(phone);
      setOriginalPhoneVisible(phoneVisible);
      setIsContactModalOpen(false);
      if (onUserUpdate && response.data?.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error) {
      console.error('Chyba pri ukladaní kontaktu:', error);
    }
  };

  const handleCancelContact = () => {
    setPhone(originalPhone);
    setPhoneVisible(originalPhoneVisible);
    setIsContactModalOpen(false);
  };

  const handleSaveIco = async () => {
    try {
      // Odstránenie medzier z IČO pre validáciu
      const icoCleaned = ico.replace(/\s/g, '').trim();
      // Klientská validácia: povolené je prázdne alebo 8 až 14 číslic
      if (icoCleaned && (icoCleaned.length < 8 || icoCleaned.length > 14)) {
        console.error('IČO musí mať 8 až 14 číslic');
        return;
      }
      const response = await api.patch('/auth/profile/', {
        ico: icoCleaned,
        ico_visible: icoVisible,
      });
      setOriginalIco(icoCleaned);
      setOriginalIcoVisible(icoVisible);
      setIsIcoModalOpen(false);
      if (onUserUpdate && response.data?.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error) {
      console.error('Chyba pri ukladaní IČO:', error);
    }
  };

  const handleCancelIco = () => {
    setIco(originalIco);
    setIcoVisible(originalIcoVisible);
    setIsIcoModalOpen(false);
  };

  const handleSaveContactEmail = async () => {
    try {
      const response = await api.patch('/auth/profile/', {
        contact_email: contactEmail,
      });
      setOriginalContactEmail(contactEmail);
      setIsContactEmailModalOpen(false);
      if (onUserUpdate && response.data?.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error) {
      console.error('Chyba pri ukladaní kontaktného emailu:', error);
    }
  };

  const handleCancelContactEmail = () => {
    setContactEmail(originalContactEmail);
    setIsContactEmailModalOpen(false);
  };

  const handleSaveProfession = async () => {
    try {
      const response = await api.patch('/auth/profile/', {
        job_title: profession,
        job_title_visible: professionVisible,
      });
      setOriginalProfession(profession);
      setOriginalProfessionVisible(professionVisible);
      setIsProfessionModalOpen(false);
      if (onUserUpdate && response.data?.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error) {
      console.error('Chyba pri ukladaní profese:', error);
    }
  };

  const handleCancelProfession = () => {
    setProfession(originalProfession);
    setProfessionVisible(originalProfessionVisible);
    setIsProfessionModalOpen(false);
  };

  const handleSaveWebsite = async () => {
    try {
      const main = (website || '').trim();
      // filter empties
      let extras = (additionalWebsites || []).filter(w => (w || '').trim());
      // enforce max 5 total
      const mainCount = main ? 1 : 0;
      const allowedAdditional = Math.max(0, 5 - mainCount);
      if (extras.length > allowedAdditional) {
        extras = extras.slice(0, allowedAdditional);
        setAdditionalWebsites(extras);
      }
      const response = await api.patch('/auth/profile/', {
        website: main,
        additional_websites: extras,
      });
      setOriginalWebsite(main);
      setOriginalAdditionalWebsites(extras);
      setIsWebsiteModalOpen(false);
      if (onUserUpdate && response.data?.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error) {
      console.error('Chyba pri ukladaní webu:', error);
    }
  };

  const handleCancelWebsite = () => {
    setWebsite(originalWebsite);
    setAdditionalWebsites(originalAdditionalWebsites);
    setIsWebsiteModalOpen(false);
  };

  const handleSaveInstagram = async () => {
    try {
      const response = await api.patch('/auth/profile/', {
        instagram: instagram,
      });
      setOriginalInstagram(instagram);
      setIsInstagramModalOpen(false);
      if (onUserUpdate && response.data?.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error) {
      console.error('Chyba pri ukladaní Instagramu:', error);
    }
  };

  const handleCancelInstagram = () => {
    setInstagram(originalInstagram);
    setIsInstagramModalOpen(false);
  };

  const handleSaveFacebook = async () => {
    try {
      const response = await api.patch('/auth/profile/', {
        facebook: facebook,
      });
      setOriginalFacebook(facebook);
      setIsFacebookModalOpen(false);
      if (onUserUpdate && response.data?.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error) {
      console.error('Chyba pri ukladaní Facebooku:', error);
    }
  };

  const handleCancelFacebook = () => {
    setFacebook(originalFacebook);
    setIsFacebookModalOpen(false);
  };

  const handleSaveLinkedin = async () => {
    try {
      const response = await api.patch('/auth/profile/', {
        linkedin: linkedin,
      });
      setOriginalLinkedin(linkedin);
      setIsLinkedinModalOpen(false);
      if (onUserUpdate && response.data?.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error) {
      console.error('Chyba pri ukladaní LinkedIn:', error);
    }
  };

  const handleCancelLinkedin = () => {
    setLinkedin(originalLinkedin);
    setIsLinkedinModalOpen(false);
  };

  const handleSaveGender = async () => {
    try {
      const response = await api.patch('/auth/profile/', {
        gender: gender,
      });
      setOriginalGender(gender);
      setIsGenderModalOpen(false);
      if (onUserUpdate && response.data?.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error) {
      console.error('Chyba pri ukladaní pohlavia:', error);
    }
  };

  const handleCancelGender = () => {
    setGender(originalGender);
    setIsGenderModalOpen(false);
  };

  return (
    <>
      {/* Modal pre úpravu mena */}
      {isNameModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex flex-col">
          {/* Horná lišta */}
          <div className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
            {/* Šipka späť */}
            <button
              onClick={handleCancelName}
              className="p-2 -ml-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            
            {/* Nadpis v strede */}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('profile.fullName', 'Meno')}</h2>
            
            {/* Fajka (uložiť) */}
            <button
              onClick={handleSaveName}
              className="p-2 -mr-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </button>
          </div>
          
          {/* Obsah modalu */}
          <div className="flex-1 bg-white dark:bg-black p-4">
            <div>
              {/* Meno (jeden input – rozdelíme na meno/priezvisko) */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('profile.fullName', 'Meno')}
                </label>
                <input
                  type="text"
                  value={`${firstName} ${lastName}`.trim()}
                  onChange={(e) => {
                    const value = e.target.value || '';
                    const parts = value.trim().split(/\s+/).filter(Boolean);
                    if (parts.length === 0) {
                      setFirstName('');
                      setLastName('');
                    } else if (parts.length === 1) {
                      setFirstName(parts[0]);
                      setLastName('');
                    } else {
                      setFirstName(parts.slice(0, -1).join(' '));
                      setLastName(parts[parts.length - 1]);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
                  placeholder={t('profile.enterName', 'Zadajte svoje meno a priezvisko')}
                />
              </div>
              {/* Priezvisko zrušené – unified v jednom vstupe */}
              
              {/* Popisný text */}
              <div className="mt-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('profile.fullNameDescription', 'Tu si môžete upraviť svoje meno a priezvisko. Vaše meno sa bude zobrazovať ostatným používateľom a zároveň podľa neho budete vyhľadateľní. Odporúčame použiť svoje skutočné meno, aby vás ostatní ľahšie našli a rozpoznali.')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal pre úpravu bio */}
      {isBioModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex flex-col">
          {/* Horná lišta */}
          <div className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
            {/* Šipka späť */}
            <button
              onClick={handleCancelBio}
              className="p-2 -ml-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            
            {/* Nadpis v strede */}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('profile.bio', 'Bio')}</h2>
            
            {/* Fajka (uložiť) */}
            <button
              onClick={handleSaveBio}
              className="p-2 -mr-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </button>
          </div>
          
          {/* Obsah modalu */}
          <div className="flex-1 bg-white dark:bg-black p-4">
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('profile.bio', 'Bio')}
                </label>
                <div className="relative">
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    maxLength={150}
                    className="w-full px-3 py-2 pr-16 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent resize-none"
                    placeholder={t('profile.writeAboutYourself', 'Napíšte niečo o sebe...')}
                  />
                  <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                    {bio.length}/150
                  </div>
                </div>
              </div>
              
              {/* Popisný text */}
              <div className="mt-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('profile.bioDescription', 'Napíšte krátky popis o sebe, vašich záujmoch, zručnostiach alebo čomkoľvek, čo by mohlo zaujať ostatných používateľov. Môžete napísať až 150 znakov.')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal pre úpravu lokality */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex flex-col">
          {/* Horná lišta */}
          <div className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
            {/* Šipka späť */}
            <button
              onClick={handleCancelLocation}
              className="p-2 -ml-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            
            {/* Nadpis v strede */}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('profile.location', 'Lokalita')}</h2>
            
            {/* Fajka (uložiť) */}
            <button
              onClick={handleSaveLocation}
              className="p-2 -mr-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </button>
          </div>
          
          {/* Obsah modalu */}
          <div className="flex-1 bg-white dark:bg-black p-4">
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('profile.location', 'Lokalita')}
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  maxLength={100}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
                  placeholder={t('profile.enterLocation', 'Zadajte svoje mesto alebo obec')}
                />
              </div>
              
              {/* Popisný text */}
              <div className="mt-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('profile.locationDescription', 'Zadajte mesto alebo obec, kde sa nachádzate. Táto informácia pomôže ostatným používateľom lepšie vás nájsť a môže byť užitočná pri plánovaní stretnutí alebo výmeny zručností.')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal pre úpravu kontaktu */}
      {isContactModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex flex-col">
          {/* Horná lišta */}
          <div className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
            {/* Šipka späť */}
            <button
              onClick={handleCancelContact}
              className="p-2 -ml-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            
            {/* Nadpis v strede */}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('profile.contact', 'Kontakt')}</h2>
            
            {/* Fajka (uložiť) */}
            <button
              onClick={handleSaveContact}
              className="p-2 -mr-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </button>
          </div>
          
          {/* Obsah modalu */}
          <div className="flex-1 bg-white dark:bg-black p-4">
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('profile.phoneNumber', 'Telefónne číslo')}
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={150}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
                  placeholder={t('profile.phoneNumber', 'Tel. číslo')}
                />
              </div>
              
              {/* Popisný text */}
              <div className="mt-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('profile.contactDescription', 'Zadajte svoje telefónne číslo. Viditeľnosť kontaktu môžete nastaviť pomocou prepínača v hlavnom zobrazení.')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal pre úpravu IČO */}
      {isIcoModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex flex-col">
          {/* Horná lišta */}
          <div className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
            {/* Šipka späť */}
            <button
              onClick={handleCancelIco}
              className="p-2 -ml-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            
            {/* Nadpis v strede */}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">IČO</h2>
            
            {/* Fajka (uložiť) */}
            <button
              onClick={handleSaveIco}
              className="p-2 -mr-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </button>
          </div>
          
          {/* Obsah modalu */}
          <div className="flex-1 bg-white dark:bg-black p-4">
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  IČO
                </label>
                <input
                  type="text"
                  value={ico}
                  onChange={(e) => {
                    // Povoliť iba číslice
                    const value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 14) {
                      setIco(value);
                    }
                  }}
                  maxLength={14}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
                  placeholder="12345678901234"
                />
              </div>

              {/* Prepínač pre zobrazenie IČO */}
              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={() => setIcoVisible(!icoVisible)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                    icoVisible ? 'bg-purple-400 border border-purple-400' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`absolute h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200 ease-in-out ${
                      icoVisible ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
                <span className="text-xs text-gray-500 dark:text-gray-400">Zobraziť IČO verejne</span>
              </div>
              
              {/* Popisný text */}
              <div className="mt-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Zadajte svoje IČO (Identifikačné číslo organizácie). Musí mať presne 14 číslic.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal pre úpravu kontaktného emailu */}
      {isContactEmailModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex flex-col">
          {/* Horná lišta */}
          <div className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
            {/* Šipka späť */}
            <button
              onClick={handleCancelContactEmail}
              className="p-2 -ml-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            
            {/* Nadpis v strede */}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Email</h2>
            
            {/* Fajka (uložiť) */}
            <button
              onClick={handleSaveContactEmail}
              className="p-2 -mr-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </button>
          </div>
          
          {/* Obsah modalu */}
          <div className="flex-1 bg-white dark:bg-black p-4">
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  maxLength={150}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
                  placeholder="Pridať email"
                />
              </div>
              
              {/* Popisný text */}
              <div className="mt-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Zadajte kontaktný email pre vašu firmu alebo organizáciu.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal pre úpravu profese */}
      {isProfessionModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex flex-col">
          {/* Horná lišta */}
          <div className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
            {/* Šipka späť */}
            <button
              onClick={handleCancelProfession}
              className="p-2 -ml-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            
            {/* Nadpis v strede */}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('profile.profession', 'Profesia')}</h2>
            
            {/* Fajka (uložiť) */}
            <button
              onClick={handleSaveProfession}
              className="p-2 -mr-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </button>
          </div>
          
          {/* Obsah modalu */}
          <div className="flex-1 bg-white dark:bg-black p-4">
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('profile.profession', 'Profesia')}
                </label>
                <input
                  type="text"
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  maxLength={100}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
                  placeholder={t('profile.enterProfession', 'Zadajte svoju profesiu')}
                />
              </div>
              
              {/* Popisný text */}
              <div className="mt-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('profile.professionDescription', 'Zadajte svoju profesiu alebo pracovné zaradenie. Viditeľnosť profesie môžete nastaviť pomocou prepínača v hlavnom zobrazení.')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal pre úpravu webu */}
      {isWebsiteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex flex-col">
          {/* Horná lišta */}
          <div className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
            {/* Šipka späť */}
            <button
              onClick={handleCancelWebsite}
              className="p-2 -ml-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            
            {/* Nadpis v strede */}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('profile.website', 'Web')}</h2>
            
            {/* Fajka (uložiť) */}
            <button
              onClick={handleSaveWebsite}
              className="p-2 -mr-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </button>
          </div>
          
          {/* Obsah modalu */}
          <div className="flex-1 bg-white dark:bg-black p-4">
            <div>
              {/* Hlavný web */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('profile.website', 'Web')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    maxLength={255}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
                    placeholder="https://example.com"
                  />
                  <button
                    onClick={() => {
                      const mainCount = (website || '').trim() ? 1 : 0;
                      const total = mainCount + additionalWebsites.length;
                      if (total >= 5) return;
                      setAdditionalWebsites([...additionalWebsites, ''])
                    }}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Dodatočné weby */}
              {additionalWebsites.map((additionalWebsite, index) => (
                <div key={index} className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Web {index + 2}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={additionalWebsite}
                      onChange={(e) => {
                        const newWebsites = [...additionalWebsites];
                        newWebsites[index] = e.target.value;
                        setAdditionalWebsites(newWebsites);
                      }}
                      maxLength={255}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
                      placeholder="https://example.com"
                    />
                    <button
                      onClick={() => {
                        const newWebsites = additionalWebsites.filter((_, i) => i !== index);
                        setAdditionalWebsites(newWebsites);
                      }}
                      className="p-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              
              {/* Popisný text */}
              <div className="mt-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('profile.websiteDescription', 'Zadajte URL vašej webovej stránky, portfólia alebo ľubovoľného odkazu, ktorý chcete zdieľať s ostatnými používateľmi.')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal pre úpravu Instagramu */}
      {isInstagramModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex flex-col">
          <div className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
            <button onClick={handleCancelInstagram} className="p-2 -ml-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('profile.instagram', 'Instagram')}</h2>
            <button onClick={handleSaveInstagram} className="p-2 -mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </button>
          </div>
          <div className="flex-1 bg-white dark:bg-black p-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('profile.instagram', 'Instagram')}</label>
              <input
                type="url"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                maxLength={255}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
                placeholder={t('profile.enterInstagramUrl', 'https://instagram.com/username')}
              />
            </div>
            <div className="mt-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('profile.instagramDescription', 'Zadajte URL vašej Instagram stránky.')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal pre úpravu Facebooku */}
      {isFacebookModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex flex-col">
          <div className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
            <button onClick={handleCancelFacebook} className="p-2 -ml-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('profile.facebook', 'Facebook')}</h2>
            <button onClick={handleSaveFacebook} className="p-2 -mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </button>
          </div>
          <div className="flex-1 bg-white dark:bg-black p-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('profile.facebook', 'Facebook')}</label>
              <input
                type="url"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                maxLength={255}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
                placeholder={t('profile.enterFacebookUrl', 'https://facebook.com/username')}
              />
            </div>
            <div className="mt-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('profile.facebookDescription', 'Zadajte URL vašej Facebook stránky.')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal pre úpravu LinkedIn */}
      {isLinkedinModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex flex-col">
          <div className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
            <button onClick={handleCancelLinkedin} className="p-2 -ml-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('profile.linkedin', 'LinkedIn')}</h2>
            <button onClick={handleSaveLinkedin} className="p-2 -mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </button>
          </div>
          <div className="flex-1 bg-white dark:bg-black p-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('profile.linkedin', 'LinkedIn')}</label>
              <input
                type="url"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                maxLength={255}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
                placeholder={t('profile.enterLinkedinUrl', 'https://linkedin.com/in/username')}
              />
            </div>
            <div className="mt-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('profile.linkedinDescription', 'Zadajte URL vašej LinkedIn stránky.')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal pre úpravu pohlavia */}
      {isGenderModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex flex-col">
          <div className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
            <button onClick={handleCancelGender} className="p-2 -ml-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('profile.gender', 'Pohlavie')}</h2>
            <button onClick={handleSaveGender} className="p-2 -mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </button>
          </div>
          <div className="flex-1 bg-white dark:bg-black p-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('profile.gender', 'Pohlavie')}</label>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={gender === 'male'}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-4 h-4 text-purple-600 bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-700 focus:ring-purple-500"
                  />
                  <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">{t('profile.male', 'Muž')}</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={gender === 'female'}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-4 h-4 text-purple-600 bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-700 focus:ring-purple-500"
                  />
                  <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">{t('profile.female', 'Žena')}</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="gender"
                    value="other"
                    checked={gender === 'other'}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-4 h-4 text-purple-600 bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-700 focus:ring-purple-500"
                  />
                  <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">{t('profile.other', 'Iné')}</span>
                </label>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('profile.genderDescription', 'Vyberte svoje pohlavie. Táto informácia pomôže ostatným používateľom lepšie vás identifikovať.')}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
