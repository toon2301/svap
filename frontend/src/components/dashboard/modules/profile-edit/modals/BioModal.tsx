'use client';

import React from 'react';
import toast from 'react-hot-toast';
import { User } from '@/types';
import { api } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileFullScreenModal from '../shared/MobileFullScreenModal';
import { getApiErrorMessage } from '../../requests/requestsApi';

interface BioModalProps {
  isOpen: boolean;
  bio: string;
  originalBio: string;
  setBio: (v: string) => void;
  setOriginalBio?: (v: string) => void;
  onClose: () => void;
  onUserUpdate?: (u: User) => void;
  onEditableUserUpdate?: (partial: Partial<User>) => void;
}

export default function BioModal({ isOpen, bio, originalBio, setBio, setOriginalBio, onClose, onUserUpdate, onEditableUserUpdate }: BioModalProps) {
  const { t } = useLanguage();

  const handleSave = async () => {
    if (onEditableUserUpdate) {
      onEditableUserUpdate({ bio });
      setOriginalBio?.(bio);
      onClose();
      return;
    }
    try {
      const response = await api.patch('/auth/profile/', { bio });
      onUserUpdate && response.data?.user && onUserUpdate(response.data.user);
      setOriginalBio && setOriginalBio(bio);
      onClose();
    } catch (e: any) {
      const data = e?.response?.data;
      const details = data?.details;
      const bioMsg = typeof details?.bio?.[0] === 'string' ? details.bio[0] : null;
      const message = bioMsg ?? getApiErrorMessage(e, t('profile.bioSaveFailed', 'Bio sa nepodarilo uložiť.'));
      toast.error(message);
    }
  };

  const handleBack = () => {
    setBio(originalBio);
    onClose();
  };

  return (
    <MobileFullScreenModal isOpen={isOpen} title={t('profile.bio', 'Bio')} onBack={handleBack} onSave={handleSave}>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('profile.bio', 'Bio')}</label>
        <div className="relative">
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            maxLength={150}
            className="w-full px-3 py-2 pr-16 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent resize-none"
            placeholder={t('profile.writeAboutYourself', 'Napíšte niečo o sebe...')}
          />
          <div className="absolute bottom-2 right-2 text-xs text-gray-400">{bio.length}/150</div>
        </div>
      </div>
      <div className="mt-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('profile.bioDescription', 'Napíšte krátky popis o sebe, vašich záujmoch, zručnostiach alebo čomkoľvek, čo by mohlo zaujať ostatných používateľov. Môžete napísať až 150 znakov.')}
        </p>
      </div>
    </MobileFullScreenModal>
  );
}


