'use client';

import React from 'react';
import toast from 'react-hot-toast';
import { User } from '@/types';
import { api } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileFullScreenModal from '../shared/MobileFullScreenModal';
import { getApiErrorMessage } from '../../requests/requestsApi';

interface ContactEmailModalProps {
  isOpen: boolean;
  contactEmail: string;
  contactEmailVisible: boolean;
  originalContactEmail: string;
  originalContactEmailVisible: boolean;
  setContactEmail: (v: string) => void;
  setContactEmailVisible: (v: boolean) => void;
  setOriginalContactEmail?: (v: string) => void;
  setOriginalContactEmailVisible?: (v: boolean) => void;
  onClose: () => void;
  onUserUpdate?: (u: User) => void;
  onEditableUserUpdate?: (partial: Partial<User>) => void;
}

export default function ContactEmailModal({
  isOpen,
  contactEmail,
  contactEmailVisible,
  originalContactEmail,
  originalContactEmailVisible,
  setContactEmail,
  setContactEmailVisible,
  setOriginalContactEmail,
  setOriginalContactEmailVisible,
  onClose,
  onUserUpdate,
  onEditableUserUpdate,
}: ContactEmailModalProps) {
  const { t } = useLanguage();

  const handleSave = async () => {
    if (onEditableUserUpdate) {
      onEditableUserUpdate({ contact_email: contactEmail, contact_email_visible: contactEmailVisible });
      setOriginalContactEmail?.(contactEmail);
      setOriginalContactEmailVisible?.(contactEmailVisible);
      onClose();
      return;
    }
    try {
      const response = await api.patch('/auth/profile/', {
        contact_email: contactEmail,
        contact_email_visible: contactEmailVisible,
      });
      onUserUpdate && response.data?.user && onUserUpdate(response.data.user);
      setOriginalContactEmail && setOriginalContactEmail(contactEmail);
      setOriginalContactEmailVisible && setOriginalContactEmailVisible(contactEmailVisible);
      onClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { details?: { contact_email?: string[] } } } };
      const msg = err?.response?.data?.details?.contact_email?.[0];
      const message = typeof msg === 'string' ? msg : getApiErrorMessage(e, t('profile.contactEmailSaveFailed', 'Kontaktný email sa nepodarilo uložiť.'));
      toast.error(message);
    }
  };

  const handleBack = () => {
    setContactEmail(originalContactEmail);
    setContactEmailVisible(originalContactEmailVisible);
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
      <div className="flex items-center gap-2 mt-4">
        <button
          onClick={async () => {
            const newVal = !contactEmailVisible;
            setContactEmailVisible(newVal);
            if (onEditableUserUpdate) {
              onEditableUserUpdate({ contact_email_visible: newVal });
              setOriginalContactEmailVisible?.(newVal);
              return;
            }
            try {
              const response = await api.patch('/auth/profile/', {
                contact_email_visible: newVal,
              });
              if (onUserUpdate && response?.data?.user) onUserUpdate(response.data.user);
              setOriginalContactEmailVisible?.(newVal);
            } catch (e: unknown) {
              const err = e as { response?: { data?: { details?: Record<string, string[]> } } };
              const msg = err?.response?.data?.details?.contact_email_visible?.[0] ?? err?.response?.data?.details?.contact_email?.[0];
              toast.error(typeof msg === 'string' ? msg : getApiErrorMessage(e, t('profile.contactEmailSaveFailed', 'Kontaktný email sa nepodarilo uložiť.')));
              setContactEmailVisible(contactEmailVisible);
            }
          }}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
            !contactEmailVisible ? 'bg-purple-400 border border-purple-400' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <span className={`absolute h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200 ease-in-out ${!contactEmailVisible ? 'left-6' : 'left-1'}`} />
        </button>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {t('profile.hideContactEmailPublic', 'Skryť kontaktný email verejne')}
        </span>
      </div>
      <div className="mt-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">Zadajte kontaktný email pre vašu firmu alebo organizáciu.</p>
      </div>
    </MobileFullScreenModal>
  );
}


