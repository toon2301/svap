'use client';

import React, { useState, useRef } from 'react';
import { CameraIcon } from '@heroicons/react/24/outline';

interface PhotoUploadProps {
  onPhotoSelect: (file: File) => void;
  isUploading?: boolean;
}

export default function PhotoUpload({ onPhotoSelect, isUploading = false }: PhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) return;

    // Validácia typu súboru
    if (!file.type.startsWith('image/')) {
      setError('Prosím vyber obrázok (JPG, PNG, GIF)');
      return;
    }

    // Validácia veľkosti (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Obrázok je príliš veľký. Maximálna veľkosť je 5MB.');
      return;
    }

    setError('');
    onPhotoSelect(file);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={isUploading}
        className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-full shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Pridať fotku"
      >
        {isUploading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        ) : (
          <CameraIcon className="w-4 h-4" />
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {error && (
        <div className="absolute top-full mt-2 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
