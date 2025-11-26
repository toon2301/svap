'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { User } from '../../../types';
import { api } from '../../../lib/api';
import UserAvatar from './profile/UserAvatar';
import HeaderCard from './profile-edit/desktop/HeaderCard';
import WebsitesField from './profile-edit/desktop/WebsitesField';
import BioField from './profile-edit/desktop/fields/BioField';
import LocationField from './profile-edit/desktop/fields/LocationField';
import SocialMediaInputs from './SocialMediaInputs';

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
  // State pre formulár
  const [firstName, setFirstName] = useState(user.first_name || '');
  const [lastName, setLastName] = useState(user.last_name || '');
  const [bio, setBio] = useState(user.bio || '');
  const [location, setLocation] = useState(user.location || '');
  const [ico, setIco] = useState(user.ico || '');
  const [icoVisible, setIcoVisible] = useState(user.ico_visible || false);
  const [phone, setPhone] = useState(user.phone || '');
  const [phoneVisible, setPhoneVisible] = useState(user.phone_visible || false);
  const [profession, setProfession] = useState(user.job_title || '');
  const [professionVisible, setProfessionVisible] = useState(user.job_title_visible || false);
  const [website, setWebsite] = useState(user.website || '');
  const [additionalWebsites, setAdditionalWebsites] = useState<string[]>(user.additional_websites || []);
  const [contactEmail, setContactEmail] = useState(user.contact_email || '');
  
  const [gender, setGender] = useState(user.gender || '');
  const [isUploading, setIsUploading] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [mounted, setMounted] = useState(false);

  // Aktualizácia stavu pri zmene user prop
  useEffect(() => {
    setFirstName(user.first_name || '');
    setLastName(user.last_name || '');
    setBio(user.bio || '');
    setLocation(user.location || '');
    setIco(user.ico || '');
    setIcoVisible(user.ico_visible || false);
    setPhone(user.phone || '');
    setPhoneVisible(user.phone_visible || false);
    setProfession(user.job_title || '');
    setProfessionVisible(user.job_title_visible || false);
    setWebsite(user.website || '');
    setAdditionalWebsites(user.additional_websites || []);
    setContactEmail(user.contact_email || '');
    
    setGender(user.gender || '');
  }, [user.first_name, user.bio, user.location, user.ico, user.ico_visible, user.phone, user.phone_visible, user.job_title, user.job_title_visible, user.website, user.additional_websites, user.contact_email, user.gender]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Save funkcie
  const handleFullNameSave = async () => {
    const f = (firstName || '').trim();
    const l = (lastName || '').trim();
    if (f === (user.first_name || '').trim() && l === (user.last_name || '').trim()) return;
    try {
      const response = await api.patch('/auth/profile/', {
        first_name: f,
        last_name: l,
      });
      if (onUserUpdate && response.data.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error: any) {
      console.error('Error saving full name:', error);
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
    }
  };

  

  const handleBioSave = async () => {
    if (bio.trim() === user.bio) return;
    
    try {
      const response = await api.patch('/auth/profile/', {
        bio: bio.trim()
      });
      
      if (onUserUpdate && response.data.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error: any) {
      console.error('Error saving bio:', error);
      setBio(user.bio || '');
    }
  };

  const handleLocationSave = async () => {
    if (location.trim() === user.location) return;
    
    try {
      const response = await api.patch('/auth/profile/', {
        location: location.trim()
      });
      
      if (onUserUpdate && response.data.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error: any) {
      console.error('Error saving location:', error);
      setLocation(user.location || '');
    }
  };

  const handleIcoSave = async () => {
    // Odstránenie medzier z IČO pre validáciu
    const icoCleaned = ico.replace(/\s/g, '').trim();
    // Klientská validácia: povolené je prázdne alebo 8 až 14 číslic
    if (icoCleaned && (icoCleaned.length < 8 || icoCleaned.length > 14)) {
      console.error('IČO musí mať 8 až 14 číslic');
      return;
    }
    if (icoCleaned === (user.ico || '').replace(/\s/g, '')) return;
    
    try {
      const response = await api.patch('/auth/profile/', {
        ico: icoCleaned
      });
      
      if (onUserUpdate && response.data.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error: any) {
      console.error('Error saving ico:', error);
      setIco(user.ico || '');
    }
  };

  const handleIcoVisibleToggle = async () => {
    const newValue = !icoVisible;
    setIcoVisible(newValue);
    
    try {
      const response = await api.patch('/auth/profile/', {
        ico_visible: newValue
      });
      
      if (onUserUpdate && response.data.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error: any) {
      console.error('Error saving ico visibility:', error);
      setIcoVisible(user.ico_visible || false);
    }
  };

  const handlePhoneSave = async () => {
    if (phone.trim() === user.phone) return;
    
    try {
      const response = await api.patch('/auth/profile/', {
        phone: phone.trim()
      });
      
      if (onUserUpdate && response.data.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error: any) {
      console.error('Error saving phone:', error);
      setPhone(user.phone || '');
    }
  };

  const handlePhoneVisibleToggle = async () => {
    const newValue = !phoneVisible;
    setPhoneVisible(newValue);
    
    try {
      const response = await api.patch('/auth/profile/', {
        phone_visible: newValue
      });
      
      if (onUserUpdate && response.data.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error: any) {
      console.error('Error saving phone visibility:', error);
      setPhoneVisible(user.phone_visible || false);
    }
  };

  const handleProfessionSave = async () => {
    console.log('handleProfessionSave called with:', profession);
    if (profession.trim() === user.job_title) return;
    
    try {
      console.log('Saving profession:', profession.trim());
      const response = await api.patch('/auth/profile/', {
        job_title: profession.trim()
      });
      
      console.log('Profession saved successfully:', response.data);
      if (onUserUpdate && response.data.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error: any) {
      console.error('Error saving profession:', error);
      setProfession(user.job_title || '');
    }
  };

  const handleProfessionVisibleToggle = async () => {
    const newValue = !professionVisible;
    setProfessionVisible(newValue);
    
    try {
      const response = await api.patch('/auth/profile/', {
        job_title_visible: newValue
      });
      
      if (onUserUpdate && response.data.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error: any) {
      console.error('Error saving profession visibility:', error);
      setProfessionVisible(user.job_title_visible || false);
    }
  };

  const handleWebsiteSave = async () => {
    if (website.trim() === user.website) return;
    
    try {
      const response = await api.patch('/auth/profile/', {
        website: website.trim()
      });
      
      if (onUserUpdate && response.data.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error: any) {
      console.error('Error saving website:', error);
      setWebsite(user.website || '');
    }
  };

  const handleAdditionalWebsitesSave = async () => {
    // Filtrovať prázdne hodnoty a porovnať s aktuálnymi hodnotami
    let filteredWebsites = additionalWebsites.filter(site => site.trim() !== '');
    // Limit: max 5 celkovo (1 hlavný + dodatočné)
    const mainCount = (website || '').trim() ? 1 : 0;
    const allowedAdditional = Math.max(0, 5 - mainCount);
    if (filteredWebsites.length > allowedAdditional) {
      filteredWebsites = filteredWebsites.slice(0, allowedAdditional);
      setAdditionalWebsites(filteredWebsites);
    }
    const currentWebsites = user.additional_websites || [];
    
    // Porovnať arrays
    if (JSON.stringify(filteredWebsites) === JSON.stringify(currentWebsites)) return;
    
    try {
      const response = await api.patch('/auth/profile/', {
        additional_websites: filteredWebsites
      });
      
      if (onUserUpdate && response.data.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error: any) {
      console.error('Error saving additional websites:', error);
      setAdditionalWebsites(user.additional_websites || []);
    }
  };

  const handleContactEmailSave = async () => {
    if (contactEmail.trim() === user.contact_email) return;
    
    try {
      const response = await api.patch('/auth/profile/', {
        contact_email: contactEmail.trim()
      });
      
      if (onUserUpdate && response.data.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error: any) {
      console.error('Error saving contact email:', error);
      setContactEmail(user.contact_email || '');
    }
  };


  const handleGenderChange = async (value: string) => {
    if (value === user.gender) return;
    
    try {
      const response = await api.patch('/auth/profile/', {
        gender: value
      });
      
      if (onUserUpdate && response.data.user) {
        onUserUpdate(response.data.user);
      }
      setGender(value);
    } catch (error: any) {
      console.error('Error saving gender:', error);
      setGender(user.gender || '');
    }
  };

  const handlePhotoUpload = async (file: File) => {
    if (!file) return;

    setIsUploading(true);
    setUploadError('');
    
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await api.patch('/auth/profile/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (onUserUpdate && response.data.user) {
        onUserUpdate(response.data.user);
      }
      setIsActionsOpen(false);
    } catch (e: any) {
      const details = e?.response?.data?.details || e?.response?.data?.validation_errors;
      const avatarErrors: string[] | undefined = details?.avatar;
      const message = (
        avatarErrors?.[0] ||
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        'Nepodarilo sa nahrať fotku. Skúste znova.'
      );
      setUploadError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePhotoUploadClick = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (file) await handlePhotoUpload(file);
    };
    input.click();
  };

  const handleAvatarClick = () => {
    setIsActionsOpen(true);
  };

  const handleRemoveAvatar = async () => {
    setIsUploading(true);
    setUploadError('');
    try {
      const response = await api.patch('/auth/profile/', { avatar: null });
      if (onUserUpdate && response.data.user) {
        onUserUpdate(response.data.user);
      }
      setIsActionsOpen(false);
    } catch (e: any) {
      setUploadError(e.response?.data?.error || 'Nepodarilo sa odstrániť fotku. Skúste znova.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div className="pt-4 pb-8 pl-0 text-[var(--foreground)] max-w-2xl">
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
            {/* Meno (celé meno v jednom vstupe) */}
            <div className="mb-4">
              <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                {accountType === 'business' ? 'Meno / Názov' : t('profile.fullName', 'Meno')}
              </label>
              <input
                id="fullName"
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
                onBlur={handleFullNameSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleFullNameSave();
                  }
                }}
                pattern="[a-zA-ZáčďéěíĺľňóôŕšťúýžÁČĎÉĚÍĹĽŇÓÔŔŠŤÚÝŽ\s-]*"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
                placeholder={t('profile.enterName', 'Zadajte svoje meno a priezvisko')}
              />
            </div>
            {/* Priezvisko zrušené – unified v jednom vstupe */}

            {/* Bio */}
            <BioField bio={bio} setBio={setBio} onSave={handleBioSave} />

            {/* Lokalita */}
            <LocationField location={location} setLocation={setLocation} onSave={handleLocationSave} />

            {/* IČO - iba pre firemné účty */}
            {accountType === 'business' && (
              <div className="mb-4">
                <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                  IČO
                </label>
                <input
                  id="ico"
                  type="text"
                  value={ico}
                  onChange={(e) => {
                    // Povoliť iba číslice
                    const value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 14) {
                      setIco(value);
                    }
                  }}
                  onBlur={handleIcoSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleIcoSave();
                    }
                  }}
                  maxLength={14}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
                  placeholder="12345678901234"
                />
                {/* Prepínač pre zobrazenie IČO */}
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={handleIcoVisibleToggle}
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
              </div>
            )}

            {/* Kontakt */}
            <div className="mb-4">
              <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('profile.contact', 'Kontakt')}
              </label>
              <input
                id="phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={handlePhoneSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handlePhoneSave();
                  }
                }}
                maxLength={150}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
                placeholder={t('profile.phone', 'Tel. číslo')}
              />
              {/* Prepínač pre zobrazenie telefónu */}
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={handlePhoneVisibleToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                    phoneVisible ? 'bg-purple-400 border border-purple-400' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`absolute h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200 ease-in-out ${
                      phoneVisible ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
                <span className="text-xs text-gray-500 dark:text-gray-400">{t('profile.showContactPublic', 'Zobraziť kontakt verejne')}</span>
              </div>
            </div>

            {/* Kontaktný Email - len pre firemný účet */}
            {accountType === 'business' && (
              <div className="mb-4">
                <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  id="contactEmail"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  onBlur={handleContactEmailSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleContactEmailSave();
                    }
                  }}
                  maxLength={255}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
                  placeholder="kontakt@firma.sk"
                />
              </div>
            )}

            

            {/* Profesia - len pre osobný účet */}
            {accountType === 'personal' && (
            <div className="mb-4">
              <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('profile.profession', 'Profesia')}
              </label>
              <input
                id="profession"
                type="text"
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                onBlur={handleProfessionSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleProfessionSave();
                  }
                }}
                maxLength={100}
                className="w-full px-3 py-2 bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
                placeholder={t('profile.enterProfession', 'Zadajte svoju profesiu')}
              />
              {/* Prepínač pre zobrazenie profese */}
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={handleProfessionVisibleToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                    professionVisible ? 'bg-purple-400 border border-purple-400' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`absolute h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200 ease-in-out ${
                      professionVisible ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
                <span className="text-xs text-gray-500 dark:text-gray-400">{t('profile.showProfessionPublic', 'Zobraziť profesiu verejne')}</span>
              </div>
            </div>
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
            <div className="mb-4">
              <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('profile.gender', 'Pohlavie')}
              </label>
              <select
                id="gender"
                value={gender}
                onChange={(e) => handleGenderChange(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent appearance-none cursor-pointer"
              >
                <option value="">{t('profile.selectGender', 'Vyberte pohlavie')}</option>
                <option value="male">{t('profile.male', 'Muž')}</option>
                <option value="female">{t('profile.female', 'Žena')}</option>
                <option value="other">{t('profile.other', 'Iné')}</option>
              </select>
            </div>
            )}
        </div>

        {/* Tlačidlo Uložiť */}
        <div className="flex justify-center mt-8">
          <button
            onClick={() => {
              // Logika pre uloženie zmien
              console.log('Uložiť zmeny');
              // Informuj dashboard, aby zobrazil profil
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('goToProfile'));
              }
              // Zatvor pravú navigáciu ak je k dispozícii handler
              if (onEditProfileClick) {
                onEditProfileClick();
              }
            }}
            className="px-32 py-2 bg-purple-100 text-purple-800 border border-purple-200 rounded-2xl hover:bg-purple-200 transition-colors"
          >
            {t('common.save', 'Uložiť')}
          </button>
        </div>
      </div>

      {/* Avatar Actions Modal */}
      {isActionsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 lg:bg-transparent" onClick={() => setIsActionsOpen(false)}>
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-[32rem] max-w-[90vw] lg:top-32 lg:translate-y-0 lg:ml-0 xl:ml-[-6rem] 2xl:ml-[-12rem]" onClick={(e) => e.stopPropagation()}>
            <div className="rounded-2xl bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] shadow-xl overflow-hidden">
              {/* Avatar v modale */}
              <div className="flex justify-center py-6">
                <UserAvatar 
                  user={user} 
                  size="large" 
                  onPhotoUpload={handlePhotoUploadClick}
                  isUploading={isUploading}
                  onAvatarClick={handleAvatarClick}
                />
              </div>
              <div className="px-2 space-y-3 pb-6">
                <button
                  onClick={() => {
                    setIsActionsOpen(false);
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e: any) => {
                      const file = e.target.files?.[0];
                      if (file) handlePhotoUpload(file);
                    };
                    input.click();
                  }}
                  className="w-full py-4 text-lg rounded-lg bg-[var(--muted)] text-[var(--foreground)] hover:bg-gray-200 dark:hover:bg-[#141414]"
                >
                  {t('profile.changePhoto', 'Zmeniť fotku')}
                </button>
                <button
                  onClick={handleRemoveAvatar}
                  className="w-full py-4 text-lg rounded-lg bg-[var(--muted)] text-[var(--foreground)] hover:bg-gray-200 dark:hover:bg-[#141414]"
                  disabled={isUploading}
                >
                  {t('profile.removePhoto', 'Odstrániť fotku')}
                </button>
                <button
                  onClick={() => setIsActionsOpen(false)}
                  className="w-full py-4 text-lg rounded-lg bg-[var(--muted)] text-[var(--foreground)] hover:bg-gray-200 dark:hover:bg-[#141414]"
                >
                  {t('common.cancel', 'Zrušiť')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
