'use client';

import React from 'react';
import { User } from '@/types';
import { api } from '@/lib/api';
import MobileFullScreenModal from '../shared/MobileFullScreenModal';

interface IcoModalProps {
  isOpen: boolean;
  ico: string;
  icoVisible: boolean;
  originalIco: string;
  originalIcoVisible: boolean;
  setIco: (v: string) => void;
  setIcoVisible: (v: boolean) => void;
  setOriginalIco?: (v: string) => void;
  setOriginalIcoVisible?: (v: boolean) => void;
  onClose: () => void;
  onUserUpdate?: (u: User) => void;
}

export default function IcoModal({ isOpen, ico, icoVisible, originalIco, originalIcoVisible, setIco, setIcoVisible, setOriginalIco, setOriginalIcoVisible, onClose, onUserUpdate }: IcoModalProps) {
  const handleSave = async () => {
    try {
      const icoCleaned = ico.replace(/\s/g, '').trim();
      if (icoCleaned && (icoCleaned.length < 8 || icoCleaned.length > 14)) {
        console.error('IČO musí mať 8 až 14 číslic');
        return;
      }
      const response = await api.patch('/auth/profile/', { ico: icoCleaned, ico_visible: icoVisible });
      onUserUpdate && response.data?.user && onUserUpdate(response.data.user);
      setOriginalIco && setOriginalIco(icoCleaned);
      setOriginalIcoVisible && setOriginalIcoVisible(icoVisible);
      onClose();
    } catch (e) {
      console.error('Chyba pri ukladaní IČO:', e);
    }
  };

  const handleBack = () => {
    setIco(originalIco);
    setIcoVisible(originalIcoVisible);
    onClose();
  };

  return (
    <MobileFullScreenModal isOpen={isOpen} title="IČO" onBack={handleBack} onSave={handleSave}>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">IČO</label>
        <input
          type="text"
          value={ico}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '');
            if (value.length <= 14) setIco(value);
          }}
          maxLength={14}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
          placeholder="12345678901234"
        />
      </div>
      <div className="flex items-center gap-2 mt-4">
        <button
          onClick={() => setIcoVisible(!icoVisible)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
            icoVisible ? 'bg-purple-400 border border-purple-400' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <span className={`absolute h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200 ease-in-out ${icoVisible ? 'left-6' : 'left-1'}`} />
        </button>
        <span className="text-xs text-gray-500 dark:text-gray-400">Zobraziť IČO verejne</span>
      </div>
      <div className="mt-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">Zadajte svoje IČO (Identifikačné číslo organizácie). Musí mať 8 až 14 číslic.</p>
      </div>
    </MobileFullScreenModal>
  );
}


