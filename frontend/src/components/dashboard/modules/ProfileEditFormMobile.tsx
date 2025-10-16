'use client';

import React, { useState } from 'react';
import { User } from '../../../types';
import UserAvatar from './profile/UserAvatar';

interface ProfileEditFormMobileProps {
  user: User;
  onUserUpdate?: (user: User) => void;
  onEditProfileClick?: () => void;
  onPhotoUpload?: (file: File) => void;
  isUploading?: boolean;
  onAvatarClick?: () => void;
}

export default function ProfileEditFormMobile({ 
  user, 
  onUserUpdate, 
  onEditProfileClick,
  onPhotoUpload,
  isUploading,
  onAvatarClick
}: ProfileEditFormMobileProps) {
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [firstName, setFirstName] = useState(user.first_name);
  const [lastName, setLastName] = useState(user.last_name);
  const [originalFirstName, setOriginalFirstName] = useState(user.first_name);
  const [originalLastName, setOriginalLastName] = useState(user.last_name);

  const handleSaveName = async () => {
    try {
      // Získaj token z localStorage
      const tokens = localStorage.getItem('tokens');
      if (!tokens) {
        throw new Error('Nie ste prihlásený');
      }
      
      const { access } = JSON.parse(tokens);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      
      // API call na uloženie mena a priezviska
      const response = await fetch(`${apiUrl}/profile/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access}`,
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName
        }),
      });

      if (!response.ok) {
        throw new Error('Chyba pri ukladaní mena');
      }

      const result = await response.json();
      console.log('Meno úspešne uložené:', result);
      
      // Aktualizuj pôvodné hodnoty
      setOriginalFirstName(firstName);
      setOriginalLastName(lastName);
      
      // Zatvor modal
      setIsNameModalOpen(false);
      
      // Ak máme callback, zavolaj ho s aktualizovanými údajmi
      if (onUserUpdate && result.user) {
        onUserUpdate(result.user);
      }
    } catch (error) {
      console.error('Chyba pri ukladaní mena:', error);
      // Môžeš pridať toast notifikáciu pre chybu
    }
  };

  const handleCancelName = () => {
    // Vráť pôvodné hodnoty
    setFirstName(originalFirstName);
    setLastName(originalLastName);
    
    // Zatvor modal
    setIsNameModalOpen(false);
  };

  return (
    <div className="pt-2 pb-8">
      {/* Fotka v strede */}
      <div className="flex justify-center mb-4 px-4">
        <UserAvatar 
          user={user} 
          size="medium" 
          onPhotoUpload={onPhotoUpload}
          isUploading={isUploading}
          onAvatarClick={onAvatarClick}
        />
      </div>
      
      {/* List položiek */}
      <div className="border-t border-gray-200 border-b border-gray-200">
        <div 
          className="flex justify-between items-center py-2 px-4 cursor-pointer hover:bg-gray-50"
          onClick={() => setIsNameModalOpen(true)}
        >
          <span className="text-gray-900 font-medium">Meno</span>
          <span className="text-gray-600">{user.first_name} {user.last_name}</span>
        </div>
      </div>

      {/* Modal pre úpravu mena */}
      {isNameModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex flex-col">
          {/* Horná lišta */}
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
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
            <h2 className="text-lg font-semibold text-gray-900">Meno</h2>
            
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
          <div className="flex-1 bg-white p-4">
            <div>
              {/* Meno */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meno
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent"
                  placeholder="Zadajte svoje meno"
                />
              </div>
              
              {/* Priezvisko */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priezvisko
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent"
                  placeholder="Zadajte svoje priezvisko"
                />
              </div>
              
              {/* Popisný text */}
              <div className="mt-3">
                <p className="text-xs text-gray-500">
                  Tu si môžete upraviť svoje meno a priezvisko. Vaše meno sa bude zobrazovať ostatným používateľom a zároveň podľa neho budete vyhľadateľní. Odporúčame použiť svoje skutočné meno, aby vás ostatní ľahšie našli a rozpoznali.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
