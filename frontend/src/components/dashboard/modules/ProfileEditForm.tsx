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
  const [bio, setBio] = useState(user.bio || '');
  const [website, setWebsite] = useState(user.website || '');
  const [gender, setGender] = useState(user.gender || '');

  // Update firstName, bio, website and gender when user changes
  useEffect(() => {
    setFirstName(user.first_name || '');
    setBio(user.bio || '');
    setWebsite(user.website || '');
    setGender(user.gender || '');
  }, [user.first_name, user.bio, user.website, user.gender]);

  const handleFirstNameSave = async () => {
    if (firstName.trim() === user.first_name) return; // No change
    
    try {
      const response = await api.patch('/auth/profile/', {
        first_name: firstName.trim()
      });
      
      if (onUserUpdate && response.data.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error: any) {
      console.error('Error saving first name:', error);
      // Revert on error
      setFirstName(user.first_name || '');
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
              <div className="font-bold text-gray-800">{firstName || user.first_name}</div>
              <div className="text-gray-600">{user.email}</div>
            </div>
            <button
              onClick={() => setIsActionsOpen(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
            >
              Zmeniť fotku
            </button>
          </div>
        </div>
        
        {/* Meno */}
        <div className="mb-4">
          <label htmlFor="first_name" className="block text-base font-medium text-gray-700 mb-2">
            Meno
          </label>
          <input
            id="first_name"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            onBlur={handleFirstNameSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleFirstNameSave();
              }
            }}
            maxLength={18}
            pattern="[a-zA-ZáčďéěíĺľňóôŕšťúýžÁČĎÉĚÍĹĽŇÓÔŔŠŤÚÝŽ\s]*"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent"
            placeholder="Zadajte svoje meno"
          />
        </div>
        
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
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="relative z-10 w-[32rem] max-w-[90vw] mx-4">
            <div className="rounded-2xl bg-white shadow-xl overflow-hidden">
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
