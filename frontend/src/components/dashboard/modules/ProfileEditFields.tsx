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
  setIsInstagramModalOpen: (value: boolean) => void;
  setIsFacebookModalOpen: (value: boolean) => void;
  setIsLinkedinModalOpen: (value: boolean) => void;
  setIsGenderModalOpen: (value: boolean) => void;
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
  setIsInstagramModalOpen,
  setIsFacebookModalOpen,
  setIsLinkedinModalOpen,
  setIsGenderModalOpen,
}: ProfileEditFieldsProps) {
  
  return (
    <div className="border-t border-gray-200 border-b border-gray-200">
      <div 
        className="flex items-center py-4 px-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setIsNameModalOpen(true)}
      >
        <span className="text-gray-900 font-medium w-40">Meno</span>
        <div className="flex items-center flex-1 ml-4">
          <div className="w-px h-4 bg-gray-300 mr-3"></div>
          <span className="text-gray-600 text-sm truncate">{`${user.first_name} ${user.last_name}`.trim()}</span>
        </div>
      </div>
      
      <div 
        className="flex items-center py-4 px-4 cursor-pointer hover:bg-gray-50 border-t border-gray-100"
        onClick={() => setIsBioModalOpen(true)}
      >
        <span className="text-gray-900 font-medium w-40">Bio</span>
        <div className="flex items-center flex-1 ml-4">
          <div className="w-px h-4 bg-gray-300 mr-3"></div>
          <span className="text-gray-600 text-sm truncate">
            Bio
          </span>
        </div>
      </div>
      
      <div 
        className="flex items-center py-4 px-4 cursor-pointer hover:bg-gray-50 border-t border-gray-100"
        onClick={() => setIsLocationModalOpen(true)}
      >
        <span className="text-gray-900 font-medium w-40">Lokalita</span>
        <div className="flex items-center flex-1 ml-4">
          <div className="w-px h-4 bg-gray-300 mr-3"></div>
          <span className="text-gray-600 text-sm truncate">
            {user.location || 'Pridať lokalitu'}
          </span>
        </div>
      </div>
      
      <div 
        className="py-4 px-4 border-t border-gray-100"
      >
        <div 
          className="flex items-center cursor-pointer hover:bg-gray-50 -mx-4 px-4 py-1"
          onClick={() => setIsContactModalOpen(true)}
        >
          <span className="text-gray-900 font-medium w-40">Kontakt</span>
          <div className="flex items-center flex-1 ml-4">
            <div className="w-px h-4 bg-gray-300 mr-3"></div>
            <span className="text-gray-600 text-sm truncate">
              {user.phone || 'Pridať kontakt'}
            </span>
          </div>
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
        className="py-4 px-4 border-t border-gray-100"
      >
        <div 
          className="flex items-center cursor-pointer hover:bg-gray-50 -mx-4 px-4 py-1"
          onClick={() => setIsProfessionModalOpen(true)}
        >
          <span className="text-gray-900 font-medium w-40">Profesia</span>
          <div className="flex items-center flex-1 ml-4">
            <div className="w-px h-4 bg-gray-300 mr-3"></div>
            <span className="text-gray-600 text-sm truncate">
              {user.job_title || 'Pridať profesiu'}
            </span>
          </div>
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
        className="flex items-center py-4 px-4 cursor-pointer hover:bg-gray-50 border-t border-gray-100"
        onClick={() => setIsWebsiteModalOpen(true)}
      >
        <span className="text-gray-900 font-medium w-40">Web</span>
        <div className="flex items-center flex-1 ml-4">
          <div className="w-px h-4 bg-gray-300 mr-3"></div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600 text-sm">
              Web
            </span>
            {user.website && (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            )}
          </div>
        </div>
      </div>
      
      {/* Sociálne siete */}
      <div className="flex items-center py-4 px-4 border-t border-gray-100">
        <span className="text-gray-900 font-medium w-40">Sociálne siete</span>
        <div className="flex items-center flex-1 ml-4">
          <div className="w-px h-4 bg-gray-300 mr-3"></div>
          <div className="flex items-center gap-3">
          {/* Instagram */}
          <button
            onClick={() => setIsInstagramModalOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </button>
          
          {/* Facebook */}
          <button
            onClick={() => setIsFacebookModalOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </button>
          
          {/* LinkedIn */}
          <button
            onClick={() => setIsLinkedinModalOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </button>
          </div>
        </div>
      </div>
      
      {/* Pohlavie */}
      <div 
        className="flex items-center py-4 px-4 cursor-pointer hover:bg-gray-50 border-t border-gray-100"
        onClick={() => setIsGenderModalOpen(true)}
      >
        <span className="text-gray-900 font-medium w-40">Pohlavie</span>
        <div className="flex items-center flex-1 ml-4">
          <div className="w-px h-4 bg-gray-300 mr-3"></div>
          <span className="text-gray-600 text-sm">
            {user.gender === 'male' ? 'Muž' : user.gender === 'female' ? 'Žena' : user.gender === 'other' ? 'Iné' : 'Pohlavie'}
          </span>
        </div>
      </div>
    </div>
  );
}
