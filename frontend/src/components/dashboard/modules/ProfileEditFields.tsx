'use client';

import React from 'react';
import { User } from '../../../types';
import { api } from '../../../lib/api';

interface ProfileEditFieldsProps {
  user: User;
  onUserUpdate?: (user: User) => void;
  
  // Modal setters
  setIsNameModalOpen: (value: boolean) => void;
  setIsBioModalOpen: (value: boolean) => void;
  setIsLocationModalOpen: (value: boolean) => void;
  setIsContactModalOpen: (value: boolean) => void;
  setIsProfessionModalOpen: (value: boolean) => void;
  setIsWebsiteModalOpen: (value: boolean) => void;
}

export default function ProfileEditFields({
  user,
  onUserUpdate,
  setIsNameModalOpen,
  setIsBioModalOpen,
  setIsLocationModalOpen,
  setIsContactModalOpen,
  setIsProfessionModalOpen,
  setIsWebsiteModalOpen,
}: ProfileEditFieldsProps) {
  
  return (
    <div className="border-t border-gray-200 border-b border-gray-200">
      <div 
        className="flex justify-between items-center py-2 px-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setIsNameModalOpen(true)}
      >
        <span className="text-gray-900 font-medium">Meno</span>
        <span className="text-gray-600 text-sm truncate max-w-[200px]">{`${user.first_name} ${user.last_name}`.trim()}</span>
      </div>
      
      <div 
        className="flex justify-between items-center py-2 px-4 cursor-pointer hover:bg-gray-50 border-t border-gray-100"
        onClick={() => setIsBioModalOpen(true)}
      >
        <span className="text-gray-900 font-medium">Bio</span>
        <span className="text-gray-600 text-sm truncate max-w-[200px]">
          {user.bio || 'Pridať bio'}
        </span>
      </div>
      
      <div 
        className="flex justify-between items-center py-2 px-4 cursor-pointer hover:bg-gray-50 border-t border-gray-100"
        onClick={() => setIsLocationModalOpen(true)}
      >
        <span className="text-gray-900 font-medium">Lokalita</span>
        <span className="text-gray-600 text-sm truncate max-w-[200px]">
          {user.location || 'Pridať lokalitu'}
        </span>
      </div>
      
      <div 
        className="py-2 px-4 border-t border-gray-100"
      >
        <div 
          className="flex justify-between items-center cursor-pointer hover:bg-gray-50 -mx-4 px-4 py-1"
          onClick={() => setIsContactModalOpen(true)}
        >
          <span className="text-gray-900 font-medium">Kontakt</span>
          <span className="text-gray-600 text-sm truncate max-w-[200px]">
            {user.phone || 'Pridať kontakt'}
          </span>
        </div>
        
        {/* Prepínač pre zobrazenie kontaktu */}
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={async (e) => {
              e.stopPropagation();
              const newVisibility = !user.phone_visible;
              try {
                const response = await api.patch('/auth/profile/', {
                  phone_visible: newVisibility,
                });
                if (onUserUpdate && response.data?.user) {
                  onUserUpdate(response.data.user);
                }
              } catch (error) {
                console.error('Chyba pri ukladaní viditeľnosti kontaktu:', error);
              }
            }}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 ${
              user.phone_visible ? 'bg-purple-100 border border-purple-200' : 'bg-gray-200'
            }`}
          >
            <span
              className={`absolute h-3 w-3 rounded-full bg-white shadow-sm transition-all duration-200 ease-in-out ${
                user.phone_visible ? 'left-5' : 'left-1'
              }`}
            />
          </button>
          <span className="text-xs text-gray-500">Zobraziť verejne</span>
        </div>
      </div>
      
      <div 
        className="py-2 px-4 border-t border-gray-100"
      >
        <div 
          className="flex justify-between items-center cursor-pointer hover:bg-gray-50 -mx-4 px-4 py-1"
          onClick={() => setIsProfessionModalOpen(true)}
        >
          <span className="text-gray-900 font-medium">Profesia</span>
          <span className="text-gray-600 text-sm truncate max-w-[200px]">
            {user.job_title || 'Pridať profesiu'}
          </span>
        </div>
        
        {/* Prepínač pre zobrazenie profese */}
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={async (e) => {
              e.stopPropagation();
              const newVisibility = !user.job_title_visible;
              try {
                const response = await api.patch('/auth/profile/', {
                  job_title_visible: newVisibility,
                });
                if (onUserUpdate && response.data?.user) {
                  onUserUpdate(response.data.user);
                }
              } catch (error) {
                console.error('Chyba pri ukladaní viditeľnosti profese:', error);
              }
            }}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 ${
              user.job_title_visible ? 'bg-purple-100 border border-purple-200' : 'bg-gray-200'
            }`}
          >
            <span
              className={`absolute h-3 w-3 rounded-full bg-white shadow-sm transition-all duration-200 ease-in-out ${
                user.job_title_visible ? 'left-5' : 'left-1'
              }`}
            />
          </button>
          <span className="text-xs text-gray-500">Zobraziť verejne</span>
        </div>
      </div>
      
      <div 
        className="flex justify-between items-center py-2 px-4 cursor-pointer hover:bg-gray-50 border-t border-gray-100"
        onClick={() => setIsWebsiteModalOpen(true)}
      >
        <span className="text-gray-900 font-medium">Web</span>
        <span className="text-gray-600 text-sm truncate max-w-[200px]">
          {user.website || 'Pridať web'}
        </span>
      </div>
    </div>
  );
}
