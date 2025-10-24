'use client';

import React, { useState, useEffect } from 'react';
import { User } from '../../../types';
import { api } from '../../../lib/api';
import UserAvatar from './profile/UserAvatar';
import SocialMediaInputs from './SocialMediaInputs';

interface ProfileEditFormProps {
  user: User;
  onUserUpdate?: (updatedUser: User) => void;
  onEditProfileClick?: () => void;
}

export default function ProfileEditForm({ user, onUserUpdate, onEditProfileClick }: ProfileEditFormProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [firstName, setFirstName] = useState(user.first_name || '');
  const [lastName, setLastName] = useState(user.last_name || '');
  const [bio, setBio] = useState(user.bio || '');
  const [website, setWebsite] = useState(user.website || '');
  const [location, setLocation] = useState(user.location || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [phoneVisible, setPhoneVisible] = useState(user.phone_visible || false);
  const [profession, setProfession] = useState(user.job_title || '');
  const [professionVisible, setProfessionVisible] = useState(user.job_title_visible || false);
  const [gender, setGender] = useState(user.gender || '');

  // Update firstName, bio, website, location, phone, phoneVisible, profession, professionVisible and gender when user changes
  useEffect(() => {
    setFirstName(user.first_name || '');
    setLastName(user.last_name || '');
    setBio(user.bio || '');
    setWebsite(user.website || '');
    setLocation(user.location || '');
    setPhone(user.phone || '');
    setPhoneVisible(user.phone_visible || false);
    setProfession(user.job_title || '');
    setProfessionVisible(user.job_title_visible || false);
    setGender(user.gender || '');
  }, [user.first_name, user.bio, user.website, user.location, user.phone, user.phone_visible, user.job_title, user.job_title_visible, user.gender]);

  const handleFullNameSave = async () => {
    const currentFirst = (user.first_name || '').trim();
    const currentLast = (user.last_name || '').trim();
    const f = (firstName || '').trim();
    const l = (lastName || '').trim();
    const payload: Record<string, string> = {};
    if (f !== currentFirst) payload.first_name = f;
    if (l !== currentLast) payload.last_name = l;
    if (Object.keys(payload).length === 0) return;
    try {
      const response = await api.patch('/auth/profile/', payload);
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
    if (bio.trim() === user.bio) return; // No change
    
    try {
      const response = await api.patch('/auth/profile/', {
        bio: bio.trim()
      });
      
      if (onUserUpdate && response.data.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error: any) {
      console.error('Error saving bio:', error);
      // Revert on error
      setBio(user.bio || '');
    }
  };

  const handleWebsiteSave = async () => {
    if (website.trim() === user.website) return; // No change
    
    try {
      const response = await api.patch('/auth/profile/', {
        website: website.trim()
      });
      
      if (onUserUpdate && response.data.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error: any) {
      console.error('Error saving website:', error);
      // Revert on error
      setWebsite(user.website || '');
    }
  };

  const handleLocationSave = async () => {
    if (location.trim() === user.location) return; // No change
    
    try {
      const response = await api.patch('/auth/profile/', {
        location: location.trim()
      });
      
      if (onUserUpdate && response.data.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error: any) {
      console.error('Error saving location:', error);
      // Revert on error
      setLocation(user.location || '');
    }
  };

  const handlePhoneSave = async () => {
    if (phone.trim() === user.phone) return; // No change
    
    try {
      const response = await api.patch('/auth/profile/', {
        phone: phone.trim()
      });
      
      if (onUserUpdate && response.data.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error: any) {
      console.error('Error saving phone:', error);
      // Revert on error
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
      // Revert on error
      setPhoneVisible(user.phone_visible || false);
    }
  };

  const handleProfessionSave = async () => {
    console.log('handleProfessionSave called with:', profession);
    if (profession.trim() === user.job_title) return; // No change
    
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
      // Revert on error
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
      // Revert on error
      setProfessionVisible(user.job_title_visible || false);
    }
  };

  const handleGenderChange = async (newGender: string) => {
    if (newGender === user.gender) return; // No change
    
    setGender(newGender);
    
    try {
      const response = await api.patch('/auth/profile/', {
        gender: newGender
      });
      
      if (onUserUpdate && response.data.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error: any) {
      console.error('Error saving gender:', error);
      // Revert on error
      setGender(user.gender || '');
    }
  };

  const handlePhotoUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError('');
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await api.patch('/auth/profile/', formData);

      console.log('Upload response:', response.data);
      if (onUserUpdate && response.data.user) {
        console.log('Updated user:', response.data.user);
        onUserUpdate(response.data.user);
      }

      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (error: any) {
      console.error('Photo upload error:', error);
      setUploadError(
        error.response?.data?.error || 
        'Nepodarilo sa nahrať fotku. Skús to znova.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleAvatarClick = () => {
    // Always open actions modal (for upload or change)
    setIsActionsOpen(true);
  };

  const handleRemoveAvatar = async () => {
    try {
      setIsUploading(true);
      setUploadError('');
      // Clear avatar by sending JSON null
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
      <div className="pt-4 pb-8 pl-12">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">
          Upraviť profil
        </h2>
        
        {/* Fotka, meno, email a tlačidlo v bielom paneli */}
        <div className="bg-white rounded-lg px-6 py-1 mb-6 shadow-sm">
          <div className="flex items-center gap-6">
            <UserAvatar 
              user={user} 
              size="medium" 
              onPhotoUpload={handlePhotoUpload}
              isUploading={isUploading}
              onAvatarClick={handleAvatarClick}
            />
            <div className="text-base text-gray-800 flex-1">
              <div className="font-bold text-gray-800">{`${firstName || user.first_name} ${lastName || user.last_name}`.trim()}</div>
              <div className="text-gray-600">{user.email}</div>
              {user.location && (
                <div className="text-gray-600 text-sm flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                  </svg>
                  {user.location}
                </div>
              )}
              {user.phone && (
                <div className="text-gray-600 text-sm flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                  </svg>
                  {user.phone}
                </div>
              )}
              {user.job_title && (
                <div className="text-gray-600 text-sm flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z" />
                  </svg>
                  {user.job_title}
                </div>
              )}
            </div>
            <button
              onClick={() => setIsActionsOpen(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
            >
              Zmeniť fotku
            </button>
          </div>
        </div>
        
        {/* Meno (celé meno v jednom vstupe) */}
        <div className="mb-4">
          <label htmlFor="first_name" className="block text-base font-medium text-gray-700 mb-2">
            Meno
          </label>
          <input
            id="first_name"
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
                // Preserve existing last name when only one token is provided
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
            maxLength={18}
            pattern="[a-zA-ZáčďéěíĺľňóôŕšťúýžÁČĎÉĚÍĹĽŇÓÔŔŠŤÚÝŽ\s-]*"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent"
            placeholder="Zadajte svoje meno a priezvisko"
          />
        </div>
        {/* Priezvisko zrušené – unified v jednom vstupe */}
        
        {/* Bio */}
        <div className="mb-4">
          <label htmlFor="bio" className="block text-base font-medium text-gray-700 mb-2">
            Bio
          </label>
          <div className="relative">
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              onBlur={handleBioSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) { // Ctrl+Enter for new line, Enter for save
                  handleBioSave();
                }
              }}
              maxLength={150}
              className="w-full px-3 py-2 pr-16 border border-gray-300 rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent"
              placeholder="Napíšte niečo o sebe..."
              rows={2}
            />
            <div className="absolute bottom-2 right-2 text-xs text-gray-400">
              {bio.length}/150
            </div>
          </div>
        </div>
        
        {/* Lokalita podnadpis */}
        <div className="mb-4">
          <label className="block text-base font-medium text-gray-700 mb-2">
            Lokalita
          </label>
          <input
            id="location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onBlur={handleLocationSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleLocationSave();
              }
            }}
            maxLength={100}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent"
            placeholder="Zadajte svoje mesto alebo obec"
          />
        </div>
        
        {/* Kontakt podnadpis */}
        <div className="mb-4">
          <label className="block text-base font-medium text-gray-700 mb-2">
            Kontakt
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent"
            placeholder="Tel. číslo"
          />
          {/* Prepínač pre zobrazenie telefónu */}
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handlePhoneVisibleToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                phoneVisible ? 'bg-purple-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`absolute h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200 ease-in-out ${
                  phoneVisible ? 'left-6' : 'left-1'
                }`}
              />
            </button>
            <span className="text-xs text-gray-500">{t('profile.showContactPublic', 'Show contact publicly')}</span>
          </div>
        </div>
        
        {/* Profesia */}
        <div className="mb-4">
          <label className="block text-base font-medium text-gray-700 mb-2">
            Profesia
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
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent"
            placeholder="Zadajte svoju profesiu"
          />
          {/* Prepínač pre zobrazenie profese */}
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleProfessionVisibleToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                professionVisible ? 'bg-purple-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`absolute h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200 ease-in-out ${
                  professionVisible ? 'left-6' : 'left-1'
                }`}
              />
            </button>
            <span className="text-xs text-gray-500">Zobraziť profesiu verejne</span>
          </div>
        </div>
        
        {/* Web */}
        <div className="mb-4">
          <label htmlFor="website" className="block text-base font-medium text-gray-700 mb-2">
            Web
          </label>
          <input
            id="website"
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            onBlur={handleWebsiteSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleWebsiteSave();
              }
            }}
            maxLength={255}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent"
            placeholder="https://example.com"
          />
        </div>
        
        {/* Sociálne siete */}
        <SocialMediaInputs 
          user={user}
          onUserUpdate={onUserUpdate}
        />
        
        {/* Pohlavie */}
        <div className="mb-4">
          <label className="block text-base font-medium text-gray-700 mb-2">
            Pohlavie
          </label>
          <div className="relative">
            <select
              id="gender"
              value={gender}
              onChange={(e) => handleGenderChange(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent appearance-none cursor-pointer"
            >
              <option value="">Vyberte pohlavie</option>
              <option value="male">Muž</option>
              <option value="female">Žena</option>
            </select>
            {/* Custom dropdown arrow */}
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Toto nie je súčasťou verejného profilu.
          </p>
        </div>
        
        {/* Button Uložiť */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => {
              // Informuj dashboard, aby zobrazil profil
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('goToProfile'));
              }
              // Close right sidebar and return to normal profile view
              if (onEditProfileClick) {
                onEditProfileClick();
              }
            }}
            className="w-3/5 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Uložiť
          </button>
        </div>
      </div>
      
      {/* Success message */}
      {uploadSuccess && (
        <div className="mt-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          ✓ Fotka bola úspešne nahraná!
        </div>
      )}
      
      {/* Error message */}
      {uploadError && (
        <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {uploadError}
        </div>
      )}
      
      {/* Avatar Actions Modal */}
      {isActionsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 lg:bg-transparent" onClick={() => setIsActionsOpen(false)}>
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-[32rem] max-w-[90vw] lg:top-32 lg:translate-y-0 lg:ml-[-12rem]" onClick={(e) => e.stopPropagation()}>
            <div className="rounded-2xl bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] shadow-xl overflow-hidden">
              {/* Avatar v modale */}
              <div className="flex justify-center py-6">
                <UserAvatar 
                  user={user} 
                  size="large" 
                  onPhotoUpload={handlePhotoUpload}
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
                  Zmeniť fotku
                </button>
                <button
                  onClick={handleRemoveAvatar}
                  className="w-full py-4 text-lg rounded-lg bg-[var(--muted)] text-[var(--foreground)] hover:bg-gray-200 dark:hover:bg-[#141414]"
                  disabled={isUploading}
                >
                  Odstrániť fotku
                </button>
                <button
                  onClick={() => setIsActionsOpen(false)}
                  className="w-full py-4 text-lg rounded-lg bg-[var(--muted)] text-[var(--foreground)] hover:bg-gray-200 dark:hover:bg-[#141414]"
                >
                  Zrušiť
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
