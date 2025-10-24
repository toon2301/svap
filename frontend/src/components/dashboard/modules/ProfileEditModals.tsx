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
  isProfessionModalOpen: boolean;
  isWebsiteModalOpen: boolean;
  isInstagramModalOpen: boolean;
  isFacebookModalOpen: boolean;
  isLinkedinModalOpen: boolean;
  isGenderModalOpen: boolean;
  
  // Field values
  firstName: string;
  lastName: string;
  bio: string;
  location: string;
  phone: string;
  phoneVisible: boolean;
  profession: string;
  professionVisible: boolean;
  website: string;
  instagram: string;
  facebook: string;
  linkedin: string;
  gender: string;
  
  // Original values for cancel
  originalFirstName: string;
  originalLastName: string;
  originalBio: string;
  originalLocation: string;
  originalPhone: string;
  originalPhoneVisible: boolean;
  originalProfession: string;
  originalProfessionVisible: boolean;
  originalWebsite: string;
  originalInstagram: string;
  originalFacebook: string;
  originalLinkedin: string;
  originalGender: string;
  
  // Setters
  setFirstName: (value: string) => void;
  setLastName: (value: string) => void;
  setBio: (value: string) => void;
  setLocation: (value: string) => void;
  setPhone: (value: string) => void;
  setPhoneVisible: (value: boolean) => void;
  setProfession: (value: string) => void;
  setProfessionVisible: (value: boolean) => void;
  setWebsite: (value: string) => void;
  setInstagram: (value: string) => void;
  setFacebook: (value: string) => void;
  setLinkedin: (value: string) => void;
  setGender: (value: string) => void;
  
  // Original setters
  setOriginalFirstName: (value: string) => void;
  setOriginalLastName: (value: string) => void;
  setOriginalBio: (value: string) => void;
  setOriginalLocation: (value: string) => void;
  setOriginalPhone: (value: string) => void;
  setOriginalPhoneVisible: (value: boolean) => void;
  setOriginalProfession: (value: string) => void;
  setOriginalProfessionVisible: (value: boolean) => void;
  setOriginalWebsite: (value: string) => void;
  setOriginalInstagram: (value: string) => void;
  setOriginalFacebook: (value: string) => void;
  setOriginalLinkedin: (value: string) => void;
  setOriginalGender: (value: string) => void;
  
  // Modal setters
  setIsNameModalOpen: (value: boolean) => void;
  setIsBioModalOpen: (value: boolean) => void;
  setIsLocationModalOpen: (value: boolean) => void;
  setIsContactModalOpen: (value: boolean) => void;
  setIsProfessionModalOpen: (value: boolean) => void;
  setIsWebsiteModalOpen: (value: boolean) => void;
  setIsInstagramModalOpen: (value: boolean) => void;
  setIsFacebookModalOpen: (value: boolean) => void;
  setIsLinkedinModalOpen: (value: boolean) => void;
  setIsGenderModalOpen: (value: boolean) => void;
}

export default function ProfileEditModals({
  user,
  onUserUpdate,
  isNameModalOpen,
  isBioModalOpen,
  isLocationModalOpen,
  isContactModalOpen,
  isProfessionModalOpen,
  isWebsiteModalOpen,
  isInstagramModalOpen,
  isFacebookModalOpen,
  isLinkedinModalOpen,
  isGenderModalOpen,
  firstName,
  lastName,
  bio,
  location,
  phone,
  phoneVisible,
  profession,
  professionVisible,
  website,
  instagram,
  facebook,
  linkedin,
  gender,
  originalFirstName,
  originalLastName,
  originalBio,
  originalLocation,
  originalPhone,
  originalPhoneVisible,
  originalProfession,
  originalProfessionVisible,
  originalWebsite,
  originalInstagram,
  originalFacebook,
  originalLinkedin,
  originalGender,
  setFirstName,
  setLastName,
  setBio,
  setLocation,
  setPhone,
  setPhoneVisible,
  setProfession,
  setProfessionVisible,
  setWebsite,
  setInstagram,
  setFacebook,
  setLinkedin,
  setGender,
  setOriginalFirstName,
  setOriginalLastName,
  setOriginalBio,
  setOriginalLocation,
  setOriginalPhone,
  setOriginalPhoneVisible,
  setOriginalProfession,
  setOriginalProfessionVisible,
  setOriginalWebsite,
  setOriginalInstagram,
  setOriginalFacebook,
  setOriginalLinkedin,
  setOriginalGender,
  setIsNameModalOpen,
  setIsBioModalOpen,
  setIsLocationModalOpen,
  setIsContactModalOpen,
  setIsProfessionModalOpen,
  setIsWebsiteModalOpen,
  setIsInstagramModalOpen,
  setIsFacebookModalOpen,
  setIsLinkedinModalOpen,
  setIsGenderModalOpen,
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
      const response = await api.patch('/auth/profile/', {
        website: website,
      });
      setOriginalWebsite(website);
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
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('profile.website', 'Web')}
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  maxLength={255}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
                  placeholder="https://example.com"
                />
              </div>
              
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
