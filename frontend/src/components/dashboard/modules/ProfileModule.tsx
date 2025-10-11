'use client';

import React, { useState } from 'react';
import { User } from '../../../types';
import UserAvatar from './profile/UserAvatar';
import UserInfo from './profile/UserInfo';
import { api } from '../../../lib/api';

interface ProfileModuleProps {
  user: User;
  onUserUpdate?: (updatedUser: User) => void;
}

export default function ProfileModule({ user, onUserUpdate }: ProfileModuleProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);

  const handlePhotoUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError('');
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await api.patch('/auth/profile/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Aktualizuj používateľa s novou fotkou
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
    // Open actions only if avatar exists
    if (user.avatar || user.avatar_url) {
      setIsActionsOpen(true);
    }
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
    <div className="max-w-2xl mx-auto">
      <UserAvatar 
        user={user} 
        size="large" 
        onPhotoUpload={handlePhotoUpload}
        isUploading={isUploading}
        onAvatarClick={handleAvatarClick}
      />
      <UserInfo user={user} />
      
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
    </div>
    {isActionsOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-transparent" onClick={() => setIsActionsOpen(false)} aria-hidden="true" />
        <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
          <div className="text-lg font-medium text-gray-900 mb-3">Fotka profilu</div>
          <div className="space-y-2">
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
              className="w-full px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Zmeniť fotku
            </button>
            <button
              onClick={handleRemoveAvatar}
              className="w-full px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
              disabled={isUploading}
            >
              Odstrániť fotku
            </button>
            <button
              onClick={() => setIsActionsOpen(false)}
              className="w-full px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Zrušiť
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}