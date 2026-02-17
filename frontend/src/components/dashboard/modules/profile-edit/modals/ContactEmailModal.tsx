'use client';

import React from 'react';
import { User } from '@/types';
import { api } from '@/lib/api';
import MobileFullScreenModal from '../shared/MobileFullScreenModal';

interface ContactEmailModalProps {
  isOpen: boolean;
  contactEmail: string;
  originalContactEmail: string;
  setContactEmail: (v: string) => void;
  setOriginalContactEmail?: (v: string) => void;
  onClose: () => void;
  onUserUpdate?: (u: User) => void;
}

export default function ContactEmailModal({ isOpen, contactEmail, originalContactEmail, setContactEmail, setOriginalContactEmail, onClose, onUserUpdate }: ContactEmailModalProps) {
  const handleSave = async () => {
    try {
      const response = await api.patch('/auth/profile/', { contact_email: contactEmail });
      onUserUpdate && response.data?.user && onUserUpdate(response.data.user);
      setOriginalContactEmail && setOriginalContactEmail(contactEmail);
      onClose();
    } catch (e) {
      console.error('Chyba pri ukladaní kontaktného emailu:', e);
    }
  };

  const handleBack = () => {
    setContactEmail(originalContactEmail);
    onClose();
  };

  return (
    <MobileFullScreenModal isOpen={isOpen} title="Email" onBack={handleBack} onSave={handleSave}>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
        <input
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          maxLength={50}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
          placeholder="Pridať email"
        />
      </div>
      <div className="mt-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">Zadajte kontaktný email pre vašu firmu alebo organizáciu.</p>
      </div>
    </MobileFullScreenModal>
  );
}


