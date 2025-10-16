'use client';

import React, { useState, useEffect } from 'react';
import { User } from '../../../types';
import { api } from '../../../lib/api';
import UserAvatar from './profile/UserAvatar';
import SocialMediaInputs from './SocialMediaInputs';

interface ProfileEditFormDesktopProps {
  user: User;
  onUserUpdate?: (user: User) => void;
  onEditProfileClick?: () => void;
  onPhotoUpload?: (file: File) => void;
  isUploadingFromParent?: boolean;
  onAvatarClick?: () => void;
}

export default function ProfileEditFormDesktop({ 
  user, 
  onUserUpdate, 
  onEditProfileClick,
  onPhotoUpload,
  isUploadingFromParent,
  onAvatarClick
}: ProfileEditFormDesktopProps) {
  // State pre formulár
  const [firstName, setFirstName] = useState(user.first_name || '');
  const [lastName, setLastName] = useState(user.last_name || '');
  const [bio, setBio] = useState(user.bio || '');
  const [location, setLocation] = useState(user.location || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [phoneVisible, setPhoneVisible] = useState(user.phone_visible || false);
  const [profession, setProfession] = useState(user.job_title || '');
  const [professionVisible, setProfessionVisible] = useState(user.job_title_visible || false);
  const [website, setWebsite] = useState(user.website || '');
  const [gender, setGender] = useState(user.gender || '');
  const [isUploading, setIsUploading] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Aktualizácia stavu pri zmene user prop
  useEffect(() => {
    setFirstName(user.first_name || '');
    setLastName(user.last_name || '');
    setBio(user.bio || '');
    setLocation(user.location || '');
    setPhone(user.phone || '');
    setPhoneVisible(user.phone_visible || false);
    setProfession(user.job_title || '');
    setProfessionVisible(user.job_title_visible || false);
    setWebsite(user.website || '');
    setGender(user.gender || '');
  }, [user.first_name, user.bio, user.location, user.phone, user.phone_visible, user.job_title, user.job_title_visible, user.website, user.gender]);

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
              onPhotoUpload={handlePhotoUploadClick}
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
              className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
            >
              Zmeniť fotku
            </button>
          </div>
        </div>


                  {/* Formulár pre úpravu profilu */}
                  <div className="space-y-3">
            {/* Meno (celé meno v jednom vstupe) */}
            <div className="mb-4">
              <label className="block text-base font-medium text-gray-700 mb-2">
                Meno
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent"
                placeholder="Zadajte svoje meno a priezvisko"
              />
            </div>
            {/* Priezvisko zrušené – unified v jednom vstupe */}

            {/* Bio */}
            <div className="mb-4">
              <label className="block text-base font-medium text-gray-700 mb-2">
                Bio
              </label>
              <div className="relative">
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  onBlur={handleBioSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleBioSave();
                    }
                  }}
                  rows={4}
                  maxLength={150}
                  className="w-full px-3 py-2 pr-16 border border-gray-300 rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent"
                  placeholder="Napíšte niečo o sebe..."
                />
                <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                  {bio.length}/150
                </div>
              </div>
            </div>

            {/* Lokalita */}
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

            {/* Kontakt */}
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
                <span className="text-xs text-gray-500">Zobraziť kontakt verejne</span>
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
              <label className="block text-base font-medium text-gray-700 mb-2">
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
              <select
                id="gender"
                value={gender}
                onChange={(e) => handleGenderChange(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent appearance-none cursor-pointer"
              >
                <option value="">Vyberte pohlavie</option>
                <option value="male">Muž</option>
                <option value="female">Žena</option>
                <option value="other">Iné</option>
              </select>
            </div>
        </div>

        {/* Tlačidlo Uložiť */}
        <div className="flex justify-center mt-8">
          <button
            onClick={() => {
              // Logika pre uloženie zmien
              console.log('Uložiť zmeny');
              // Presmerovanie na profil
              if (onEditProfileClick) {
                onEditProfileClick();
              }
            }}
            className="px-32 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Uložiť
          </button>
        </div>
      </div>

      {/* Avatar Actions Modal */}
      {isActionsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="relative z-10 w-[32rem] max-w-[90vw] mx-4">
            <div className="rounded-2xl bg-white shadow-xl overflow-hidden">
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
                  className="w-full py-4 text-lg rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  Zmeniť fotku
                </button>
                <button
                  onClick={handleRemoveAvatar}
                  className="w-full py-4 text-lg rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                  disabled={isUploading}
                >
                  Odstrániť fotku
                </button>
                <button
                  onClick={() => setIsActionsOpen(false)}
                  className="w-full py-4 text-lg rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
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
