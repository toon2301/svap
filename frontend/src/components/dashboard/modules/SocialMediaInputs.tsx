'use client';

import React, { useState, useEffect } from 'react';
import { User } from '../../../types';
import { api } from '../../../lib/api';

interface SocialMediaInputsProps {
  user: User;
  onUserUpdate?: (updatedUser: User) => void;
}

export default function SocialMediaInputs({ user, onUserUpdate }: SocialMediaInputsProps) {
  const [instagram, setInstagram] = useState(user.instagram || '');
  const [facebook, setFacebook] = useState(user.facebook || '');
  const [linkedin, setLinkedin] = useState(user.linkedin || '');
  const [showInstagramInput, setShowInstagramInput] = useState(false);
  const [showFacebookInput, setShowFacebookInput] = useState(false);
  const [showLinkedinInput, setShowLinkedinInput] = useState(false);

  // Update social media values when user changes
  useEffect(() => {
    setInstagram(user.instagram || '');
    setFacebook(user.facebook || '');
    setLinkedin(user.linkedin || '');
  }, [user.instagram, user.facebook, user.linkedin]);

  const handleInstagramSave = async () => {
    // Always hide input
    setShowInstagramInput(false);
    
    if (instagram.trim() === user.instagram) return; // No change
    
    try {
      const response = await api.patch('/auth/profile/', {
        instagram: instagram.trim()
      });
      
      if (onUserUpdate && response.data.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error: any) {
      console.error('Error saving instagram:', error);
      // Revert on error
      setInstagram(user.instagram || '');
    }
  };

  const handleFacebookSave = async () => {
    // Always hide input
    setShowFacebookInput(false);
    
    if (facebook.trim() === user.facebook) return; // No change
    
    try {
      const response = await api.patch('/auth/profile/', {
        facebook: facebook.trim()
      });
      
      if (onUserUpdate && response.data.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error: any) {
      console.error('Error saving facebook:', error);
      // Revert on error
      setFacebook(user.facebook || '');
    }
  };

  const handleLinkedinSave = async () => {
    // Always hide input
    setShowLinkedinInput(false);
    
    if (linkedin.trim() === user.linkedin) return; // No change
    
    try {
      const response = await api.patch('/auth/profile/', {
        linkedin: linkedin.trim()
      });
      
      if (onUserUpdate && response.data.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error: any) {
      console.error('Error saving linkedin:', error);
      // Revert on error
      setLinkedin(user.linkedin || '');
    }
  };

  return (
    <div className="mb-4">
      <label className="block text-base font-medium text-gray-700 mb-2">
        Sociálne siete
      </label>
      <div className="flex gap-4 mt-3">
        {/* Instagram */}
        <button 
          onClick={() => setShowInstagramInput(!showInstagramInput)}
          className="p-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
        </button>
        {/* Facebook */}
        <button 
          onClick={() => setShowFacebookInput(!showFacebookInput)}
          className="p-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        </button>
        {/* LinkedIn */}
        <button 
          onClick={() => setShowLinkedinInput(!showLinkedinInput)}
          className="p-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
        </button>
      </div>
      
      {/* Instagram Input */}
      {showInstagramInput && (
        <div className="mt-3">
          <input
            type="url"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            onBlur={handleInstagramSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleInstagramSave();
              }
            }}
            maxLength={255}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent bg-white dark:bg-black text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            placeholder="https://instagram.com/username"
            autoFocus
          />
        </div>
      )}
      
      {/* Facebook Input */}
      {showFacebookInput && (
        <div className="mt-3">
          <input
            type="url"
            value={facebook}
            onChange={(e) => setFacebook(e.target.value)}
            onBlur={handleFacebookSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleFacebookSave();
              }
            }}
            maxLength={255}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent bg-white dark:bg-black text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            placeholder="https://facebook.com/username"
            autoFocus
          />
        </div>
      )}
      
      {/* LinkedIn Input */}
      {showLinkedinInput && (
        <div className="mt-3">
          <input
            type="url"
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
            onBlur={handleLinkedinSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleLinkedinSave();
              }
            }}
            maxLength={255}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent bg-white dark:bg-black text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            placeholder="https://linkedin.com/in/username"
            autoFocus
          />
        </div>
      )}
    </div>
  );
}
