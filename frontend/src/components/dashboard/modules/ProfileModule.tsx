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

  return (
    <div className="max-w-2xl mx-auto">
      <UserAvatar 
        user={user} 
        size="large" 
        onPhotoUpload={handlePhotoUpload}
        isUploading={isUploading}
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
  );
}